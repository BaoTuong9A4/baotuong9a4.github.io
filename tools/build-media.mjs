// Tạo bản web cho video + ảnh đại diện + nhạc nền từ tệp gốc (tệp gốc giữ nguyên, không đưa lên repo).
// Cần ffmpeg/ffprobe. Cách dùng: npm run build:media   (thêm --force để tạo lại tất cả)
// Cấu hình: tools/media.json
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CFG = JSON.parse(await fs.readFile(path.join(ROOT, 'tools', 'media.json'), 'utf8'));
const FORCE = process.argv.includes('--force');
const abs = (p) => path.resolve(ROOT, p);
const run = (cmd, args) => execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 << 20 });
const mb = (n) => (n / 1048576).toFixed(1) + ' MB';

async function fresh(out, src) {
  if (FORCE) return false;
  try { const [o, s] = await Promise.all([fs.stat(abs(out)), fs.stat(abs(src))]); return o.mtimeMs >= s.mtimeMs; } catch { return false; }
}
function probe(file) {
  const j = JSON.parse(run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration,size:stream=codec_type,codec_name,profile,level,width,height,r_frame_rate', '-of', 'json', file]));
  const v = j.streams.find((s) => s.codec_type === 'video');
  const a = j.streams.find((s) => s.codec_type === 'audio');
  return { v, a, duration: Number(j.format.duration), size: Number(j.format.size) };
}
/** Vị trí khối moov: ở đầu tệp thì trình duyệt phát được ngay khi mới tải một phần. */
async function moovFirst(file) {
  const fh = await fs.open(file, 'r');
  try {
    let pos = 0; const buf = Buffer.alloc(16);
    for (;;) {
      const { bytesRead } = await fh.read(buf, 0, 16, pos);
      if (bytesRead < 8) return false;
      let size = buf.readUInt32BE(0); const type = buf.toString('latin1', 4, 8);
      if (size === 1) size = Number(buf.readBigUInt64BE(8));
      if (type === 'moov') return true;
      if (type === 'mdat' || size < 8) return false;
      pos += size;
    }
  } finally { await fh.close(); }
}
function loudness(file) {
  // ffmpeg ghi kết quả đo ra stderr
  const out = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 64 << 20 }).stderr;
  const summary = out.slice(out.lastIndexOf('Summary:'));
  const I = Number((/I:\s+(-?[\d.]+) LUFS/.exec(summary) || [])[1]);
  const TP = Number((/Peak:\s+(-?[\d.]+) dBFS/.exec(summary) || [])[1]);
  return { I, TP };
}

await fs.mkdir(abs('assets/media'), { recursive: true });
await fs.mkdir(abs('.tmp/video-pages'), { recursive: true });

/* ---------- VIDEO ---------- */
for (const v of CFG.videos) {
  const src = abs(v.source);
  const info = probe(src);
  console.log(`\nVideo trang ${v.page}: ${path.basename(src)} — ${info.v.codec_name} ${info.v.profile} ${info.v.width}×${info.v.height} ` +
    `@${info.v.r_frame_rate}, âm thanh ${info.a ? info.a.codec_name : 'không có'}, ${info.duration.toFixed(1)} s, ${mb(info.size)}, moov ${await moovFirst(src) ? 'ở đầu' : 'ở cuối'}`);
  const safariOk = info.v.codec_name === 'h264' && (!info.a || info.a.codec_name === 'aac');
  if (!safariOk && v.remux) throw new Error(`Video trang ${v.page} không phải H.264/AAC: cần mã hoá lại (bỏ "remux").`);

  if (await fresh(v.output, v.source)) console.log(`  ✓ ${v.output} đã mới, bỏ qua`);
  else if (v.remux) {
    run('ffmpeg', ['-hide_banner', '-v', 'error', '-y', '-i', src, '-map', '0:v:0', '-map', '0:a:0?', '-c', 'copy', '-movflags', '+faststart', abs(v.output)]);
    console.log(`  → ${v.output} (giữ nguyên hình/tiếng, chuyển chỉ mục lên đầu tệp)`);
  } else {
    const w = Math.min(v.maxWidth || 1280, info.v.width);
    run('ffmpeg', ['-hide_banner', '-v', 'error', '-y', '-i', src, '-map', '0:v:0', '-map', '0:a:0?',
      '-vf', `scale=${w}:-2:flags=lanczos`, '-c:v', 'libx264', '-preset', 'slow', '-crf', String(v.crf || 24), '-profile:v', 'high', '-level', '4.0', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', abs(v.output)]);
    console.log(`  → ${v.output} (H.264 ${w}px + AAC, tối ưu cho web)`);
  }
  const outInfo = probe(abs(v.output));
  console.log(`  bản web: ${outInfo.v.width}×${outInfo.v.height}, ${outInfo.duration.toFixed(1)} s, ${mb(outInfo.size)}, moov ${await moovFirst(abs(v.output)) ? 'ở đầu' : 'ở cuối'}`);
  if (outInfo.size > 95 * 1048576) throw new Error(`${v.output} vượt giới hạn 100 MB/tệp của GitHub.`);

  // Ảnh đại diện lấy từ chính video (độ phân giải gốc cho nét).
  run('ffmpeg', ['-hide_banner', '-v', 'error', '-y', '-ss', String(v.posterTime || 1), '-i', src, '-frames:v', '1', '-vf', `scale='min(1280,iw)':-2:flags=lanczos`, '-q:v', '3', abs(v.poster)]);
  console.log(`  ảnh đại diện: ${v.poster} (khung hình giây ${v.posterTime || 1})`);
  if (v.fillMissingPage) {
    run('ffmpeg', ['-hide_banner', '-v', 'error', '-y', '-ss', String(v.posterTime || 1), '-i', src, '-frames:v', '1', abs(`.tmp/video-pages/${v.page}.png`)]);
  }
}

/* ---------- NHẠC NỀN ---------- */
const m = CFG.music;
if (m) {
  const src = abs(m.source);
  const info = probe(src);
  const L = loudness(src);
  console.log(`\nNhạc nền: ${path.basename(src)} — ${info.a.codec_name} ${info.a.profile || ''}, ${info.duration.toFixed(1)} s, ${mb(info.size)}; độ to ${L.I} LUFS, đỉnh ${L.TP} dBTP`);
  if (await fresh(m.output, m.source)) console.log(`  ✓ ${m.output} đã mới, bỏ qua`);
  else {
    // Giảm âm lượng tuyến tính (không nén, không cắt đầu/cuối) để nghe nhẹ nhàng ngay cả trên iPhone,
    // nơi trang web không chỉnh được âm lượng bằng mã.
    let gain = m.targetLufs - L.I;
    if (L.TP + gain > m.maxTruePeak) gain = m.maxTruePeak - L.TP;
    run('ffmpeg', ['-hide_banner', '-v', 'error', '-y', '-i', src, '-map', '0:a:0', '-af', `volume=${gain.toFixed(2)}dB`, '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', abs(m.output)]);
    console.log(`  → ${m.output} (tăng/giảm ${gain.toFixed(1)} dB)`);
  }
  const L2 = loudness(abs(m.output)); const o = probe(abs(m.output));
  console.log(`  bản web: ${o.duration.toFixed(2)} s (gốc ${info.duration.toFixed(2)} s), ${mb(o.size)}; độ to ${L2.I} LUFS, đỉnh ${L2.TP} dBTP`);
}
