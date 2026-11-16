// Gắn phiên bản theo nội dung tệp để người xem cũ luôn nhận bản mới (không kẹt bộ nhớ đệm).
//  - index.html: thêm ?v=<mã> vào CSS/JS, trỏ ảnh bìa tới tệp mới trong manifest.
//  - assets/js/versions.js: mã phiên bản của nhạc/video/ảnh đại diện trong assets/media/.
// Chạy sau mỗi lần sửa mã hoặc media: npm run stamp   (build:images và build:media cũng nên chạy trước)
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const hashOf = async (rel) => crypto.createHash('sha256').update(await fs.readFile(path.join(ROOT, rel))).digest('hex').slice(0, 8);

// 1) Phiên bản media
const media = {};
for (const f of (await fs.readdir(path.join(ROOT, 'assets/media'))).sort()) {
  if (f.startsWith('.')) continue;
  media['assets/media/' + f] = await hashOf('assets/media/' + f);
}
await fs.writeFile(path.join(ROOT, 'assets/js/versions.js'),
  `// TỰ ĐỘNG TẠO bởi tools/stamp.mjs — không sửa tay.\nwindow.ASSET_VERSIONS = ${JSON.stringify(media, null, 2)};\n`);

// 2) index.html
const ctx = { window: {} };
vm.runInNewContext(await fs.readFile(path.join(ROOT, 'assets/js/manifest.js'), 'utf8'), ctx);
const cover = ctx.window.BOOK_PAGES[0].md;
let html = await fs.readFile(path.join(ROOT, 'index.html'), 'utf8');
html = html.replace(/assets\/pages\/md\/p001[^"]*\.webp/g, cover);
const refs = [...html.matchAll(/(?:href|src)="((?:assets\/(?:css|js|vendor)\/)[^"?]+\.(?:css|js))(?:\?v=[0-9a-f]+)?"/g)].map((m) => m[1]);
for (const rel of new Set(refs)) {
  const v = await hashOf(rel);
  html = html.replace(new RegExp(`(["])${rel.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}(?:\\?v=[0-9a-f]+)?"`, 'g'), `$1${rel}?v=${v}"`);
}
await fs.writeFile(path.join(ROOT, 'index.html'), html);
console.log(`Đã gắn phiên bản cho ${new Set(refs).size} tệp CSS/JS, ${Object.keys(media).length} tệp media; bìa: ${cover}`);
