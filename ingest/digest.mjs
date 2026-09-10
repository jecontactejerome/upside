// Génère le "brief de la semaine en 5 points" -> table weekly_digest (onglet News).
// 1) tente Gemini Flash (tier gratuit) à partir des faits agrégés des 7 derniers jours
// 2) en cas d'erreur/quota : gabarit déterministe (jamais de brief vide)
// Cadence cible : lundi 06h UTC.
import { db } from './lib/supabase.mjs';
import { GEMINI_API_KEY } from './lib/env.mjs';

// lundi de la semaine en cours (UTC), au format YYYY-MM-DD
function mondayOf(date = new Date()) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = (d.getUTCDay() + 6) % 7; // 0 = lundi
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
}
const weekStart = mondayOf();
const sinceIso = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

// ---------- périmètre : les actions détenues (onglet Track) ----------
// Repli sur les meilleures valeurs par score si le portefeuille est vide.
const { data: held } = await db.from('holdings').select('security_id');
const holdingIds = (held || []).map((h) => h.security_id);
const scoped = holdingIds.length > 0;

// NB : la vue growth_feed expose la colonne `id` (= securities.id), pas `security_id`.
let feedQuery = db
  .from('growth_feed')
  .select('id, name, symbol_yahoo, upside_pct, num_analysts, recommendation_key, momentum, score');
if (scoped) feedQuery = feedQuery.in('id', holdingIds);
const { data: feed, error: feedErr } = await feedQuery;
if (feedErr) console.warn(`growth_feed: ${feedErr.message}`);

const movers = [...(feed || [])].sort((a, b) => (b.score ?? -9) - (a.score ?? -9)).slice(0, 8);
const revisions = [...(feed || [])].sort((a, b) => (b.momentum ?? -9) - (a.momentum ?? -9)).slice(0, 5);

let newsQuery = db
  .from('news_articles')
  .select('headline, source, published_at, securities(name)')
  .gte('published_at', sinceIso)
  .order('published_at', { ascending: false })
  .limit(40);
if (scoped) newsQuery = newsQuery.in('security_id', holdingIds);
const { data: news } = await newsQuery;

const facts = {
  semaine_du: weekStart,
  perimetre: scoped ? 'actions détenues (Track)' : 'marché (S&P 500 + STOXX 600)',
  top_potentiel: (movers || []).map((m) => ({
    valeur: m.name,
    ticker: m.symbol_yahoo,
    upside_pct: pct(m.upside_pct),
    analystes: m.num_analysts,
    reco: m.recommendation_key,
  })),
  revisions_hausse: (revisions || []).map((r) => ({
    valeur: r.name,
    ticker: r.symbol_yahoo,
    momentum_pct: pct(r.momentum),
  })),
  titres_actu_semaine: (news || []).map((n) => `${n.headline} (${n.source})`),
};

// ---------- 1) Gemini ----------
let bullets = null;
let generatedBy = 'rule';

if (GEMINI_API_KEY) {
  try {
    bullets = await geminiDigest(facts);
    if (Array.isArray(bullets) && bullets.length === 5) generatedBy = 'gemini';
    else bullets = null;
  } catch (err) {
    console.warn(`Gemini indisponible (${err.message}) — repli sur gabarit`);
  }
}

// ---------- 2) repli déterministe ----------
if (!bullets) bullets = ruleDigest(facts);

const { error } = await db
  .from('weekly_digest')
  .upsert({ week_start: weekStart, bullets, generated_by: generatedBy }, { onConflict: 'week_start' });
if (error) {
  console.error('✗ écriture weekly_digest:', error.message);
  process.exit(1);
}
console.log(`✓ weekly_digest semaine du ${weekStart} — ${bullets.length} points — source: ${generatedBy}`);
process.exit(0);

// ============================================================
function pct(x) {
  return x == null ? null : Math.round(x * 1000) / 10; // 0.1234 -> 12.3
}

async function geminiDigest(f) {
  const model = 'gemini-2.0-flash';
  const prompt = [
    "Tu es analyste marché. Les données JSON ci-dessous concernent le PÉRIMÈTRE indiqué",
    `dans le champ "perimetre" (${f.perimetre}). Rédige EXACTEMENT 5 points clés à retenir`,
    "de la SEMAINE ÉCOULÉE pour ce périmètre : mouvements notables, révisions d'objectifs,",
    "et actualités marquantes des valeurs concernées.",
    "Style sobre, factuel, en français, sans conseil personnalisé, sans emoji.",
    'Réponds UNIQUEMENT par un tableau JSON : [{"title":"...","detail":"..."}] (5 éléments,',
    "title <= 60 caractères, detail 1 à 2 phrases).",
    '',
    JSON.stringify(f, null, 2),
  ].join('\n');

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, responseMimeType: 'application/json' },
      }),
    },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const txt = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const arr = JSON.parse(txt);
  return arr
    .slice(0, 5)
    .map((b) => ({ title: String(b.title || '').slice(0, 80), detail: String(b.detail || '') }));
}

function ruleDigest(f) {
  const out = [];
  const m0 = f.top_potentiel[0];
  if (m0) {
    out.push({
      title: `Plus fort potentiel : ${m0.valeur}`,
      detail: `${m0.ticker} affiche un écart de ${m0.upside_pct}% avec l'objectif consensus (${m0.analystes ?? '?'} analystes, reco ${m0.reco ?? 'n/d'}).`,
    });
  }
  const r0 = f.revisions_hausse[0];
  if (r0 && r0.momentum_pct > 0) {
    out.push({
      title: `Objectif révisé en hausse : ${r0.valeur}`,
      detail: `${r0.ticker} : objectif moyen en progression de ${r0.momentum_pct}% sur ~30 jours.`,
    });
  }
  const names = f.top_potentiel.slice(0, 5).map((x) => x.valeur).join(', ');
  out.push({
    title: f.perimetre.startsWith('actions détenues')
      ? 'Vos positions au meilleur potentiel'
      : 'Valeurs au meilleur potentiel cette semaine',
    detail: `${names}.`,
  });
  if (f.titres_actu_semaine.length) {
    out.push({
      title: f.perimetre.startsWith('actions détenues')
        ? 'Actu de vos positions'
        : 'Actu marquante de la semaine',
      detail: f.titres_actu_semaine.slice(0, 3).join(' · '),
    });
  }
  out.push({
    title: 'Rappel méthode',
    detail: "Le score combine écart au consensus, nombre d'analystes, révisions récentes et note moyenne. Ceci n'est pas un conseil en investissement.",
  });
  while (out.length < 5) {
    out.push({ title: 'Rien de notable', detail: "Pas d'élément marquant supplémentaire cette semaine." });
  }
  return out.slice(0, 5);
}
