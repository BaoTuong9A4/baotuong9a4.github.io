// Sao chép thư viện lật trang + phông chữ (bản quyền mở) vào site, tạo biểu tượng.
// Cách dùng: npm install && npm run vendor
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NM = path.join(ROOT, 'node_modules');
const V = path.join(ROOT, 'assets', 'vendor');

await fs.mkdir(path.join(V, 'page-flip'), { recursive: true });
await fs.copyFile(path.join(NM, 'page-flip/dist/js/page-flip.browser.js'), path.join(V, 'page-flip/page-flip.browser.js'));
await fs.copyFile(path.join(NM, 'page-flip/LICENSE'), path.join(V, 'page-flip/LICENSE'));

const fonts = [
  ['playfair-display', 'Playfair Display', [['600', 'normal'], ['700', 'normal'], ['500', 'italic']]],
  ['be-vietnam-pro', 'Be Vietnam Pro', [['400', 'normal'], ['500', 'normal'], ['600', 'normal']]],
  ['dancing-script', 'Dancing Script', [['600', 'normal']]],
];
const subsets = {
  vietnamese: 'U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+1EA0-1EF9, U+20AB',
  'latin-ext': 'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF',
  latin: 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD',
};
await fs.mkdir(path.join(V, 'fonts'), { recursive: true });
let css = '/* Phông chữ tự lưu trữ từ @fontsource (SIL Open Font License 1.1). */\n';
for (const [pkg, family, variants] of fonts) {
  for (const [weight, style] of variants) {
    for (const [subset, range] of Object.entries(subsets)) {
      const file = `${pkg}-${subset}-${weight}-${style}.woff2`;
      await fs.copyFile(path.join(NM, '@fontsource', pkg, 'files', file), path.join(V, 'fonts', file));
      css += `@font-face{font-family:'${family}';font-style:${style};font-weight:${weight};font-display:swap;src:url(${file}) format('woff2');unicode-range:${range};}\n`;
    }
  }
}
await fs.writeFile(path.join(V, 'fonts', 'fonts.css'), css);
await fs.writeFile(path.join(V, 'fonts', 'LICENSE.txt'), 'Playfair Display, Be Vietnam Pro, Dancing Script — SIL Open Font License 1.1 (https://openfontlicense.org). Phân phối qua @fontsource.\n');

// Biểu tượng: cuốn sách mở màu vàng kim trên nền xanh hoàng gia (tông màu của bìa).
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe7a3"/><stop offset="1" stop-color="#d9a441"/></linearGradient>
<radialGradient id="b" cx=".5" cy=".35" r=".75"><stop offset="0" stop-color="#2c4fa8"/><stop offset="1" stop-color="#0f1f4d"/></radialGradient></defs>
<rect width="64" height="64" rx="14" fill="url(#b)"/>
<path d="M32 21c-5-4-12-5-19-4v27c7-1 14 0 19 4 5-4 12-5 19-4V17c-7-1-14 0-19 4z" fill="url(#g)"/>
<path d="M32 21v27" stroke="#0f1f4d" stroke-width="2" stroke-linecap="round"/>
<path d="M18 24c4 0 7 1 10 2.5M18 30c4 0 7 1 10 2.5M36 26.5c3-1.5 6-2.5 10-2.5M36 32.5c3-1.5 6-2.5 10-2.5" stroke="#b07a1e" stroke-width="1.6" stroke-linecap="round" opacity=".55"/>
<circle cx="48" cy="12" r="2.2" fill="#ffe7a3"/><circle cx="54" cy="20" r="1.2" fill="#ffe7a3" opacity=".8"/>
</svg>`;
await fs.mkdir(path.join(ROOT, 'assets', 'img'), { recursive: true });
await fs.writeFile(path.join(ROOT, 'favicon.svg'), svg);
await sharp(Buffer.from(svg)).resize(180, 180).png().toFile(path.join(ROOT, 'apple-touch-icon.png'));
await sharp(Buffer.from(svg)).resize(32, 32).png().toFile(path.join(ROOT, 'favicon-32.png'));
await sharp(Buffer.from(svg)).resize(512, 512).png().toFile(path.join(ROOT, 'assets', 'img', 'icon-512.png'));
console.log('Đã sao chép page-flip, phông chữ và tạo biểu tượng.');
