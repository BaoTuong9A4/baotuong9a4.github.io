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
// Trang thiếu trong thư mục ảnh nhưng được gắn video với "fillMissingPage" (tools/media.json):
// dựng trang từ khung hình thật của video (npm run build:media tạo sẵn .tmp/video-pages/N.png).
const MEDIA = JSON.parse(await fs.readFile(path.join(ROOT, 'tools', 'media.json'), 'utf8'));
const videoPages = new Map((MEDIA.videos || []).filter((v) => v.fillMissingPage).map((v) => [v.page, path.join(ROOT, '.tmp', 'video-pages', v.page + '.png')]));

// Ảnh nối thêm cuối sách theo danh sách tường minh (tools/pages.json), không theo thứ tự tên tệp.
const APPEND = JSON.parse(await fs.readFile(path.join(ROOT, 'tools', 'pages.json'), 'utf8')).append || [];
const norm = (s) => s.normalize('NFC');
const appendSet = new Set(APPEND.map(norm));
const entries = (await fs.readdir(SRC, { withFileTypes: true })).filter((e) => e.isFile() && !e.name.startsWith('.'));
const appendFound = new Map(entries.filter((e) => appendSet.has(norm(e.name))).map((e) => [norm(e.name), e.name]));
for (const a of APPEND) if (!appendFound.has(norm(a))) { console.error(`Không tìm thấy ảnh nối thêm: ${a}`); process.exit(1); }
const pages = new Map();
const problems = [];
for (const e of entries) {
  if (appendSet.has(norm(e.name))) continue; // xử lý riêng ở cuối
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
const filled = [];
for (let i = 1; i <= max; i++) {
  if (pages.has(i)) continue;
  if (videoPages.has(i)) {
    try { await fs.access(videoPages.get(i)); filled.push(i); } catch { problems.push(`Thiếu trang ${i} (có video nhưng chưa chạy npm run build:media)`); }
  } else problems.push(`Thiếu trang ${i}`);
}

const hashes = new Map();
const appendNames = APPEND.map((a) => appendFound.get(norm(a)));
for (const [label, file] of [...nums.map((n) => [n, pages.get(n)]), ...appendNames.map((f) => [f, f])]) {
  const h = crypto.createHash('sha256').update(await fs.readFile(path.join(SRC, file))).digest('hex');
  if (hashes.has(h)) problems.push(`Nội dung trùng lặp: ${hashes.get(h)} và ${label}`);
  else hashes.set(h, label);
}
if (problems.length) { console.error('Dừng lại vì phát hiện vấn đề:\n - ' + problems.join('\n - ')); process.exit(1); }
console.log(`Nguồn: ${SRC}\nTìm thấy ${nums.length} ảnh trang (số ${nums[0]} → ${max}), không trùng.`);
if (filled.length) console.log(`Trang không có ảnh, dựng từ khung hình video: ${filled.join(', ')}`);

/** Trang video: khung hình thật của video đặt giữa nền mờ cùng khung hình, đúng khổ trang. */
async function videoPageImage(frame, W, H) {
  // Nền xanh navy + viền vàng mảnh, cùng tông với giao diện báo tường.
  const bi = Math.round(W * 0.022);
  const bg = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs><radialGradient id="g" cx="50%" cy="45%" r="75%"><stop offset="0" stop-color="#22397f"/><stop offset=".6" stop-color="#14245a"/><stop offset="1" stop-color="#0a1433"/></radialGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <rect x="${bi}" y="${bi}" width="${W - bi * 2}" height="${H - bi * 2}" rx="${bi * 0.6}" fill="none" stroke="#e7b95e" stroke-opacity=".55" stroke-width="3"/>
  </svg>`)).png().toBuffer();
  const fw = Math.round(W * 0.84); const meta = await sharp(frame).metadata(); const fh = Math.round(fw * meta.height / meta.width);
  const r = Math.round(W * 0.014);
  const mask = Buffer.from(`<svg width="${fw}" height="${fh}"><rect width="${fw}" height="${fh}" rx="${r}" ry="${r}"/></svg>`);
  const fg = await sharp(frame).resize(fw, fh).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
  const pad = 40;
  const shadow = await sharp({ create: { width: fw + pad * 2, height: fh + pad * 2, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: Buffer.from(`<svg width="${fw + pad * 2}" height="${fh + pad * 2}"><rect x="${pad}" y="${pad + 14}" width="${fw}" height="${fh}" rx="${r}" fill="rgba(0,0,0,.55)"/></svg>`) }])
    .blur(18).png().toBuffer();
  const left = Math.round((W - fw) / 2); const top = Math.round((H - fh) / 2);
  return sharp(bg).composite([{ input: shadow, left: left - pad, top: top - pad }, { input: fg, left, top }]).png().toBuffer();
}
const first = await sharp(path.join(SRC, pages.get(nums[0]))).metadata();
for (const n of filled) pages.set(n, { buffer: await videoPageImage(videoPages.get(n), first.width, first.height), label: `khung hình video trang ${n}` });
const allNums = [...pages.keys()].sort((a, b) => a - b);
appendNames.forEach((f, k) => { const n = max + 1 + k; pages.set(n, f); allNums.push(n); console.log(`Nối thêm trang ${n}: ${f}`); });

/** Ảnh khác tỉ lệ trang: giữ NGUYÊN ảnh (không cắt, không kéo), đặt giữa khung đúng tỉ lệ trang;
 *  phần dư là chính ảnh đó kéo giãn + làm mờ để chuyển màu liền mạch. */
async function fitToPage(src, meta) {
  const R = first.width / first.height; const r = meta.width / meta.height;
  if (Math.abs(r - R) < 0.01) return null;
  const W = r > R ? meta.width : Math.round(meta.height * R);
  const H = r > R ? Math.round(meta.width / R) : meta.height;
  const bg = await sharp(src).resize(W, H, { fit: 'fill' }).blur(24).toBuffer();
  const buf = await sharp(bg).composite([{ input: await sharp(src).toBuffer(), left: Math.round((W - meta.width) / 2), top: Math.round((H - meta.height) / 2) }]).png().toBuffer();
  return { buf, W, H };
}

for (const dir of Object.keys(SIZES)) {
  await fs.mkdir(path.join(OUT, dir), { recursive: true });
  for (const f of await fs.readdir(path.join(OUT, dir))) if (/^p\d{3}(-[0-9a-f]{8})?\.webp$/.test(f)) await fs.unlink(path.join(OUT, dir, f));
}

const manifest = [];
for (const n of allNums) {
  const entry = pages.get(n);
  let src = typeof entry === 'string' ? path.join(SRC, entry) : entry.buffer;
  let meta = await sharp(src).metadata();
  const fitted = await fitToPage(src, meta);
  if (fitted) { console.log(`\n  trang ${n}: ảnh ${meta.width}×${meta.height} giữ nguyên, đặt giữa khung ${fitted.W}×${fitted.H} (đúng tỉ lệ trang)`); src = fitted.buf; meta = await sharp(src).metadata(); }
  const item = { n, w: meta.width, h: meta.height, source: typeof entry === 'string' ? entry : entry.label };
  if (typeof entry !== 'string') item.videoPage = true;
  for (const [dir, cfg] of Object.entries(SIZES)) {
    let img = sharp(src).rotate();
    if (cfg.width && meta.width > cfg.width) img = img.resize({ width: cfg.width });
    const buf = await img.webp({ quality: cfg.quality, effort: 5, smartSubsample: true }).toBuffer();
    // Tên tệp kèm mã nội dung: ảnh đổi thì tên đổi, người xem cũ không bị kẹt ảnh cũ trong bộ nhớ đệm.
    const hash = crypto.createHash('sha256').update(buf).digest('hex').slice(0, 8);
    const file = `assets/pages/${dir}/p${pad(n)}-${hash}.webp`;
    await fs.writeFile(path.join(ROOT, file), buf);
    item[dir] = file;
    item[dir + 'Bytes'] = buf.length;
  }
  manifest.push(item);
  process.stdout.write(`\r  đã xử lý trang ${n}/${allNums.at(-1)}`);
}
console.log();

const js = `// TỰ ĐỘNG TẠO bởi tools/build-images.mjs — không sửa tay.\n// Thứ tự trang theo số: 1 → ${allNums.at(-1)}${appendNames.length ? ` (trang ${max + 1}+ nối thêm từ tools/pages.json)` : ''}.\nwindow.BOOK_PAGES = ${JSON.stringify(manifest.map(({ n, w, h, full, md, thumb, videoPage }) => ({ n, w, h, full, md, thumb, ...(videoPage ? { videoPage } : {}) })), null, 0).replace(/},{/g, '},\n  {')};\n`;
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
