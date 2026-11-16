// Tạo ảnh web (WebP) + ảnh thu nhỏ + manifest từ thư mục ảnh xuất Canva.
// Cách dùng: npm run build:images -- [đường-dẫn-thư-mục-ảnh]
// Mặc định: ../Images/Bao-Tuong-9A4 (tính từ thư mục repo).
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.resolve(process.argv[2] || path.join(ROOT, '..', 'Images', 'Bao-Tuong-9A4'));
const OUT = path.join(ROOT, 'assets', 'pages');
const SIZES = { full: { width: null, quality: 86 }, md: { width: 1100, quality: 82 }, thumb: { width: 360, quality: 72 } };
const OK_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp']);
const pad = (n) => String(n).padStart(3, '0');

const entries = (await fs.readdir(SRC, { withFileTypes: true })).filter((e) => e.isFile() && !e.name.startsWith('.'));
const pages = new Map();
const problems = [];
for (const e of entries) {
  const ext = path.extname(e.name).toLowerCase();
  const base = path.basename(e.name, path.extname(e.name));
  if (!OK_EXT.has(ext)) { problems.push(`Tệp không hỗ trợ: ${e.name}`); continue; }
  if (!/^\d+$/.test(base)) { problems.push(`Tên tệp không phải số trang: ${e.name}`); continue; }
  const n = Number(base);
  if (pages.has(n)) { problems.push(`Trùng số trang ${n}: ${pages.get(n)} và ${e.name}`); continue; }
  pages.set(n, e.name);
}
const nums = [...pages.keys()].sort((a, b) => a - b); // sắp xếp theo SỐ, không theo chữ
const max = nums.at(-1) || 0;
for (let i = 1; i <= max; i++) if (!pages.has(i)) problems.push(`Thiếu trang ${i}`);

const hashes = new Map();
for (const n of nums) {
  const h = crypto.createHash('sha256').update(await fs.readFile(path.join(SRC, pages.get(n)))).digest('hex');
  if (hashes.has(h)) problems.push(`Nội dung trùng lặp: trang ${hashes.get(h)} và trang ${n}`);
  else hashes.set(h, n);
}
if (problems.length) { console.error('Dừng lại vì phát hiện vấn đề:\n - ' + problems.join('\n - ')); process.exit(1); }
console.log(`Nguồn: ${SRC}\nTìm thấy ${nums.length} trang (1 → ${max}), không thiếu, không trùng.`);

for (const dir of Object.keys(SIZES)) {
  await fs.mkdir(path.join(OUT, dir), { recursive: true });
  for (const f of await fs.readdir(path.join(OUT, dir))) if (/^p\d{3}\.webp$/.test(f)) await fs.unlink(path.join(OUT, dir, f));
}

const manifest = [];
for (const n of nums) {
  const src = path.join(SRC, pages.get(n));
  const meta = await sharp(src).metadata();
  const item = { n, w: meta.width, h: meta.height, source: pages.get(n) };
  for (const [dir, cfg] of Object.entries(SIZES)) {
    const file = `assets/pages/${dir}/p${pad(n)}.webp`;
    let img = sharp(src).rotate();
    if (cfg.width && meta.width > cfg.width) img = img.resize({ width: cfg.width });
    const info = await img.webp({ quality: cfg.quality, effort: 5, smartSubsample: true }).toFile(path.join(ROOT, file));
    item[dir] = file;
    item[dir + 'Bytes'] = info.size;
  }
  manifest.push(item);
  process.stdout.write(`\r  đã xử lý trang ${n}/${max}`);
}
console.log();

const js = `// TỰ ĐỘNG TẠO bởi tools/build-images.mjs — không sửa tay.\n// Thứ tự trang theo số: 1 → ${max}.\nwindow.BOOK_PAGES = ${JSON.stringify(manifest.map(({ n, w, h, full, md, thumb }) => ({ n, w, h, full, md, thumb })), null, 0).replace(/},{/g, '},\n  {')};\n`;
await fs.writeFile(path.join(ROOT, 'assets', 'js', 'manifest.js'), js);

// Ảnh chia sẻ mạng xã hội (1200×630) và biểu tượng, lấy từ bìa thật.
const cover = path.join(SRC, pages.get(nums[0]));
await fs.mkdir(path.join(ROOT, 'assets', 'img'), { recursive: true });
const bg = await sharp(cover).resize(1200, 630, { fit: 'cover' }).blur(28).modulate({ brightness: 0.55 }).toBuffer();
const fg = await sharp(cover).resize({ height: 590 }).toBuffer();
await sharp(bg).composite([{ input: fg, gravity: 'center' }]).jpeg({ quality: 84, mozjpeg: true }).toFile(path.join(ROOT, 'assets', 'img', 'og-cover.jpg'));

const sum = (k) => manifest.reduce((s, m) => s + m[k], 0) / 1048576;
console.log(`Dung lượng: full ${sum('fullBytes').toFixed(1)} MB · md ${sum('mdBytes').toFixed(1)} MB · thumb ${sum('thumbBytes').toFixed(1)} MB`);
console.log('Đã ghi assets/js/manifest.js và assets/img/og-cover.jpg');
