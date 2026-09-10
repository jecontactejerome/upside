// Étiquette de secteur (label FR court + couleur) à partir de `industry` (US, fin)
// ou à défaut de `sector` (GICS). Correspondance par mots-clés.

// bucket -> { label, bg (fond pâle), fg (texte) }
const BUCKETS = {
  semis:      { label: 'Semi-conducteurs',   bg: '#ecebfb', fg: '#4b3fb0' },
  software:   { label: 'Logiciels & Internet', bg: '#e6effc', fg: '#1f5fbf' },
  hardware:   { label: 'Matériel & Hardware', bg: '#e4f4f6', fg: '#1f7a86' },
  biotech:    { label: 'Biotech',            bg: '#f3e9fb', fg: '#7a3fb0' },
  pharma:     { label: 'Pharma',             bg: '#fbe9f4', fg: '#a5326f' },
  health:     { label: 'Santé & Medtech',    bg: '#e5f5ef', fg: '#1f7a5a' },
  bank:       { label: 'Banques',            bg: '#e7f2e9', fg: '#2f6b3f' },
  insurance:  { label: 'Assurance',          bg: '#eef3e4', fg: '#5c6b1f' },
  finance:    { label: 'Services financiers', bg: '#f0eee2', fg: '#7a6a2f' },
  realestate: { label: 'Immobilier',         bg: '#f3ece4', fg: '#8a5a2f' },
  oil:        { label: 'Pétrole & Gaz',      bg: '#ecedf0', fg: '#4a5568' },
  energy:     { label: 'Énergie',            bg: '#e7f4e7', fg: '#2f7a2f' },
  mining:     { label: 'Mines & Métaux',     bg: '#f4efe2', fg: '#8a6a1f' },
  chemicals:  { label: 'Chimie',             bg: '#f1f4e2', fg: '#6a7a1f' },
  auto:       { label: 'Automobile',         bg: '#fbeae7', fg: '#b0432f' },
  defense:    { label: 'Aéronautique & Défense', bg: '#e7ebf6', fg: '#33468f' },
  industrial: { label: 'Industrie & Machines', bg: '#eeeef0', fg: '#4a4a52' },
  transport:  { label: 'Transport & Logistique', bg: '#e4f1f4', fg: '#1f6a7a' },
  retail:     { label: 'Distribution',       bg: '#fdf0e2', fg: '#a5642f' },
  luxury:     { label: 'Luxe & Habillement', bg: '#fbeaf1', fg: '#a53f74' },
  food:       { label: 'Agroalimentaire',    bg: '#edf5e4', fg: '#4a7a2f' },
  beverage:   { label: 'Boissons',           bg: '#f8efe0', fg: '#8a5f1f' },
  telecom:    { label: 'Télécoms',           bg: '#e6f1fb', fg: '#2f6ab0' },
  media:      { label: 'Médias & Loisirs',   bg: '#f6e9f6', fg: '#8a3f8a' },
  utilities:  { label: 'Services publics',   bg: '#eaeef4', fg: '#3f5a7a' },
  other:      { label: 'Autre',              bg: '#eeeeef', fg: '#6e6e73' },
};

// mots-clés (regex, sur industry OU sector en minuscules) -> bucket
const RULES = [
  [/semiconductor|semi-conduct/, 'semis'],
  [/software|prepackaged|edp services|internet|application|saas|cloud/, 'software'],
  [/computer manufactur|computer hardware|electronic components|electronic equipment|consumer electronics|hardware/, 'hardware'],
  [/biotech|biological|in vitro|in vivo|diagnostic substances|genomic/, 'biotech'],
  [/pharmaceutic|medicinal chemical|major pharmaceut/, 'pharma'],
  [/medical|dental|health care|healthcare|hospital|nursing|life sciences|drug manufacturers/, 'health'],
  [/\bbank/, 'bank'],
  [/insur/, 'insurance'],
  [/broker|asset manag|investment bank|capital markets|consumer services|credit servic|financ/, 'finance'],
  [/real estate|reit|property/, 'realestate'],
  [/oil|gas|petroleum|oilfield|coal|drilling/, 'oil'],
  [/renewable|solar|wind|clean energy|utilities: .*power.*renew/, 'energy'],
  [/mining|metal|steel|gold|copper|aluminum|quarr|precious/, 'mining'],
  [/chemical|specialty chemicals|agricultural chemicals/, 'chemicals'],
  [/auto manufactur|motor vehicle|auto parts|automotive|automobile/, 'auto'],
  [/aerospace|defense|defence|military|weapons/, 'defense'],
  [/machinery|industrial machin|electrical product|industrial special|manufactur|engineering & construction|farm & heavy/, 'industrial'],
  [/transport|trucking|marine|air freight|delivery|railroad|airline|logistic|shipping|courier/, 'transport'],
  [/retail|stores|store|department|e-commerce|distribution/, 'retail'],
  [/apparel|clothing|shoe|footwear|luxury|textile|accessor|jewelry/, 'luxury'],
  [/food|grocery|agricultur|packaged foods|meat|dairy|farm products|package goods|cosmetics|household/, 'food'],
  [/beverage|brewer|distiller|winer|soft drink/, 'beverage'],
  [/telecom|wireless|communications equipment/, 'telecom'],
  [/media|broadcast|publishing|entertainment|television|movie|gaming|casino|advertis/, 'media'],
  [/utilit|electric power|water supply|natural gas distribut/, 'utilities'],
  [/restaurant|hotel|resort|leisure|travel|cruise|airlines/, 'media'],
  [/building product|homebuild|construction|cement|building material/, 'industrial'],
];

// fallback GICS sector -> bucket
const SECTOR_FALLBACK = [
  [/information technology|technology/, 'software'],
  [/health/, 'health'],
  [/financ/, 'finance'],
  [/energy/, 'oil'],
  [/consumer discretion|consumer cyclical/, 'retail'],
  [/consumer stap|consumer defensive/, 'food'],
  [/communication|telecom/, 'telecom'],
  [/industrial/, 'industrial'],
  [/material|basic material/, 'chemicals'],
  [/real estate/, 'realestate'],
  [/utilit/, 'utilities'],
];

// libellés proposés dans le filtre secteur (ordre lisible)
export const SECTOR_LABELS = [
  'Semi-conducteurs', 'Logiciels & Internet', 'Matériel & Hardware', 'Biotech', 'Pharma',
  'Santé & Medtech', 'Banques', 'Assurance', 'Services financiers', 'Immobilier',
  'Pétrole & Gaz', 'Énergie', 'Mines & Métaux', 'Chimie', 'Automobile',
  'Aéronautique & Défense', 'Industrie & Machines', 'Transport & Logistique', 'Distribution',
  'Luxe & Habillement', 'Agroalimentaire', 'Boissons', 'Télécoms', 'Médias & Loisirs',
  'Services publics',
];

export function sectorInfo(row) {
  const ind = (row?.industry || '').toLowerCase();
  const sec = (row?.sector || '').toLowerCase();
  if (ind) {
    for (const [re, key] of RULES) if (re.test(ind)) return BUCKETS[key];
  }
  if (sec) {
    for (const [re, key] of RULES) if (re.test(sec)) return BUCKETS[key];
    for (const [re, key] of SECTOR_FALLBACK) if (re.test(sec)) return BUCKETS[key];
  }
  return null; // pas d'étiquette plutôt qu'un "Autre" partout
}
