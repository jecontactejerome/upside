// Génère les PNG d'icône à partir de web/public/favicon.svg.
// Nécessite `sharp` (npm i -D sharp). Lancer : node scripts/gen-icons.mjs
// Design : fond quasi-noir, chevron ascendant blanc (esprit Trade Republic).
import { readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const full = readFileSync('web/public/favicon.svg');

// maskable : chevron plus petit pour rester dans la zone de sécurité
const maskable = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
     <rect width="512" height="512" fill="#0a0a0a"/>
     <path d="M164 292 L256 194 L348 292" fill="none" stroke="#ffffff"
           stroke-width="46" stroke-linecap="round" stroke-linejoin="round"/>
   </svg>`,
);

const jobs = [
  ['web/public/apple-touch-icon.png', full, 180],
  ['web/public/icons/icon-192.png', full, 192],
  ['web/public/icons/icon-512.png', full, 512],
  ['web/public/icons/icon-maskable-512.png', maskable, 512],
];

for (const [out, buf, size] of jobs) {
  const png = await sharp(buf).resize(size, size).png().toBuffer();
  writeFileSync(out, png);
  console.log(`✓ ${out} (${size}px, ${png.length} o)`);
}
