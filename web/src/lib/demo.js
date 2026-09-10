// Mode démo : données fictives réalistes pour prévisualiser l'UI sans backend.
// Actif si VITE_DEMO === '1' ou si l'URL Supabase n'est pas configurée.
export function isDemo() {
  const url = import.meta.env.VITE_SUPABASE_URL || '';
  return import.meta.env.VITE_DEMO === '1' || !url || url.includes('xxxx') || url.includes('demo.supabase');
}

function walk(start, n, drift, vol) {
  const out = [start];
  for (let i = 1; i < n; i++) {
    out.push(Math.max(1, out[i - 1] * (1 + drift + (Math.random() - 0.5) * vol)));
  }
  return out.map((v) => Math.round(v * 100) / 100);
}

const RAW = [
  ['Airbus', 'AIR.PA', 'Euronext Paris', 'EU', 'EUR', 'Industrials', 196.34, -2.17, 231.0, 268, 180, 23, 1.83, 'buy'],
  ['ASML Holding', 'ASML.AS', 'Euronext Amsterdam', 'EU', 'EUR', 'Information Technology', 612.4, 0.9, 812.5, 1050, 640, 31, 1.7, 'buy'],
  ['Novo Nordisk', 'NOVO-B.CO', 'Nasdaq Copenhagen', 'EU', 'DKK', 'Health Care', 402.1, 1.4, 585.0, 720, 430, 28, 1.6, 'buy'],
  ['Schneider Electric', 'SU.PA', 'Euronext Paris', 'EU', 'EUR', 'Industrials', 214.7, -0.6, 262.0, 300, 220, 25, 2.0, 'buy'],
  ['SAP', 'SAP.DE', 'XETRA', 'EU', 'EUR', 'Information Technology', 182.86, 0.64, 215.0, 255, 175, 24, 1.9, 'buy'],
  ['Nvidia', 'NVDA', 'NASDAQ', 'US', 'USD', 'Information Technology', 122.5, 2.1, 178.0, 220, 130, 51, 1.4, 'strong_buy'],
  ['Alphabet', 'GOOGL', 'NASDAQ', 'US', 'USD', 'Communication Services', 168.2, 0.3, 210.0, 240, 175, 46, 1.6, 'buy'],
  ['Eli Lilly', 'LLY', 'NYSE', 'US', 'USD', 'Health Care', 812.0, -1.1, 990.0, 1150, 820, 22, 1.8, 'buy'],
  ['ServiceNow', 'NOW', 'NYSE', 'US', 'USD', 'Information Technology', 842.5, 1.7, 1080.0, 1250, 900, 33, 1.7, 'buy'],
  ['Shell', 'SHEL.L', 'London SE', 'EU', 'GBp', 'Energy', 2680, 0.4, 3250, 3800, 2700, 19, 2.1, 'buy'],
  ['TotalEnergies', 'TTE.PA', 'Euronext Paris', 'EU', 'EUR', 'Energy', 54.2, -0.9, 68.5, 80, 55, 21, 1.9, 'buy'],
  ['Advanced Micro Devices', 'AMD', 'NASDAQ', 'US', 'USD', 'Information Technology', 138.4, 3.2, 175.0, 230, 120, 40, 1.9, 'buy'],
  ['Adyen', 'ADYEN.AS', 'Euronext Amsterdam', 'EU', 'EUR', 'Financials', 1420, 1.1, 1850, 2200, 1500, 26, 1.8, 'buy'],
  ['Intuitive Surgical', 'ISRG', 'NASDAQ', 'US', 'USD', 'Health Care', 452.0, 0.2, 540.0, 620, 470, 24, 2.0, 'buy'],
];

export const DEMO_SECURITIES = RAW.map((r, i) => {
  const [name, sym, exchange, region, currency, sector, price, chg, tmean, thigh, tlow, n, rec, key] = r;
  const upside = (tmean - price) / price;
  const confidence = Math.min(1, n / 15);
  const momentum = (Math.random() - 0.3) * 0.12;
  const ratingFactor = Math.max(0.6, Math.min(1.2, 1.2 - (rec - 1) * 0.15));
  return {
    id: `demo-${i}`,
    symbol_yahoo: sym,
    name,
    exchange,
    region,
    currency,
    sector,
    market_cap: null,
    index_membership: region === 'US' ? ['SP500'] : ['STOXX600'],
    price,
    change_pct_day: chg,
    price_as_of: new Date().toISOString(),
    target_mean: tmean,
    target_high: thigh,
    target_low: tlow,
    num_analysts: n,
    recommendation_mean: rec,
    recommendation_key: key,
    target_as_of: new Date(Date.now() - 6 * 3600e3).toISOString(),
    upside_pct: upside,
    confidence,
    momentum,
    score: upside * (0.4 + 0.6 * confidence) * (1 + momentum) * ratingFactor,
    computed_at: new Date().toISOString(),
    _spark: walk(price * 0.82, 90, upside / 260, 0.02),
  };
});

export const DEMO_SECTORS = [...new Set(DEMO_SECURITIES.map((s) => s.sector))].sort();

export const DEMO_NEWS = [
  ['Nvidia dévoile une nouvelle génération de puces IA pour data centers', 'Reuters', 'NVDA', 'Nvidia'],
  ['Airbus relève ses cadences de production sur l’A320', 'Bloomberg', 'AIR.PA', 'Airbus'],
  ['ASML : les commandes rebondissent au T3, portées par l’Asie', 'Financial Times', 'ASML.AS', 'ASML Holding'],
  ['Eli Lilly obtient une extension d’indication pour son traitement', 'CNBC', 'LLY', 'Eli Lilly'],
  ['Alphabet investit dans de nouveaux centres de données européens', 'Les Échos', 'GOOGL', 'Alphabet'],
  ['AMD gagne des parts de marché sur les serveurs', 'Yahoo Finance', 'AMD', 'Advanced Micro Devices'],
  ['Novo Nordisk augmente ses capacités de production au Danemark', 'Reuters', 'NOVO-B.CO', 'Novo Nordisk'],
  ['SAP accélère sur le cloud, la marge opérationnelle progresse', 'Handelsblatt', 'SAP.DE', 'SAP'],
].map((a, i) => ({
  id: `demo-news-${i}`,
  headline: a[0],
  url: 'https://finance.yahoo.com/',
  source: a[1],
  image_url: null,
  published_at: new Date(Date.now() - (i + 1) * 5400e3).toISOString(),
  security_id: `demo-${DEMO_SECURITIES.findIndex((s) => s.symbol_yahoo === a[2])}`,
  securities: { name: a[3], symbol_yahoo: a[2] },
}));

export const DEMO_DIGEST = {
  d: new Date().toISOString().slice(0, 10),
  generated_by: 'gemini',
  bullets: [
    { title: 'Les semi-conducteurs tirent la cote', detail: 'Nvidia (+2,1 %) et AMD (+3,2 %) profitent d’un regain d’appétit pour l’IA ; les objectifs de cours restent nettement au-dessus des niveaux actuels.' },
    { title: 'Airbus : plus fort écart au consensus du jour', detail: 'À 196 €, le titre affiche +17,6 % de potentiel vs l’objectif moyen (231 €) sur 23 analystes.' },
    { title: 'Santé : Eli Lilly et Novo Nordisk bien orientés', detail: 'Les deux valeurs conservent une recommandation « acheter » et un potentiel supérieur à 20 %.' },
    { title: 'Énergie sous pression', detail: 'Shell et TotalEnergies reculent légèrement ; le potentiel reste positif mais le momentum des révisions faiblit.' },
    { title: 'Rappel méthode', detail: 'Le score combine écart au consensus, nombre d’analystes, révisions récentes et note moyenne. Ceci n’est pas un conseil en investissement.' },
  ],
};
