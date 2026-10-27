// Génère les icônes PWA à partir du logo vectoriel (à relancer si le logo change).
import sharp from "sharp";
import { writeFile } from "node:fs/promises";

const mark = (bg, pad) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<rect width="512" height="512" ${pad ? "" : 'rx="144"'} fill="${bg}"/>
<g transform="translate(${pad ? 96 : 0} ${pad ? 96 : 0}) scale(${pad ? 0.625 : 1})">
<path d="M256 400V264m0 0c0-57.6 41.6-96 104-96 0 57.6-43.2 96-104 96Zm0 0c0-44.8-32-75.2-80-75.2 0 44.8 32 75.2 80 75.2Z"
 fill="none" stroke="#FFFFFF" stroke-width="35" stroke-linecap="round" stroke-linejoin="round"/>
<circle cx="256" cy="403" r="26" fill="#F08A5D"/></g></svg>`;

const out = [
  ["icon-192.png", 192, false],
  ["icon-512.png", 512, false],
  ["icon-maskable-512.png", 512, true],
  ["apple-touch-icon.png", 180, true],
];
for (const [name, size, maskable] of out) {
  await sharp(Buffer.from(mark("#0B5D46", maskable))).resize(size, size).png({ compressionLevel: 9 }).toFile(`public/icons/${name}`);
}
await writeFile("src/app/icon.svg", mark("#0B5D46", false));
console.log("icônes générées");
