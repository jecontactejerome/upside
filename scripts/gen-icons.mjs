// Génère les PNG d'icône à partir de web/public/favicon.svg.
// Nécessite `sharp` (npm i -D sharp). Lancer : node scripts/gen-icons.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const svg = readFileSync('web/public/favicon.svg');

// icône "pleine" (chart sur fond blanc, marge réduite) — pour apple-touch + 192/512
const full = svg;

// icône maskable : même dessin mais avec zone de sécurité (dessin ~66% centré)
const maskable = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
     <rect width="512" height="512" fill="#ffffff"/>
     <g transform="translate(86 86) scale(0.66)">
       <g fill="none" stroke="#0071e3" stroke-width="36" stroke-linecap="round" stroke-linejoin="round">
         <path d="M104 356 L214 250 L292 300 L410 160"/>
         <path d="M330 150 L418 150 L418 238"/>
       </g>
     </g>
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
