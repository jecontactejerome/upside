// Formatage cohérent des nombres / devises / dates.

const SYMBOLS = { USD: '$', EUR: '€', GBP: '£', GBp: 'p', CHF: 'CHF', SEK: 'kr', DKK: 'kr', NOK: 'kr' };

export function money(value, currency = 'USD') {
  if (value == null || isNaN(value)) return '—';
  // GBp = pence : on affiche en pence tel quel
  const digits = value >= 1000 ? 0 : 2;
  const n = value.toLocaleString('fr-FR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  const s = SYMBOLS[currency] || currency;
  return currency === 'USD' || currency === 'GBP' || currency === 'EUR' || currency === 'GBp'
    ? `${n} ${s}`
    : `${n} ${s}`;
}

export function pct(value, { sign = false, digits = 1 } = {}) {
  if (value == null || isNaN(value)) return '—';
  const v = value * 100;
  const str = v.toLocaleString('fr-FR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  return `${sign && v > 0 ? '+' : ''}${str} %`;
}

export function relDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  if (diff < 172800) return 'hier';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export const RATING_LABEL = {
  buy: 'Acheter',
  strong_buy: 'Achat fort',
  hold: 'Conserver',
  sell: 'Vendre',
  strong_sell: 'Vente forte',
  underperform: 'Sous-performance',
  outperform: 'Surperformance',
};
