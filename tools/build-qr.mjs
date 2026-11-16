// Tạo mã QR tĩnh trỏ thẳng tới trang báo tường (PNG độ phân giải cao + SVG vector).
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const URL = process.argv[2] || 'https://baotuong9a4.github.io/';
const OUT = path.join(ROOT, 'qr');
await fs.mkdir(OUT, { recursive: true });
const opts = { errorCorrectionLevel: 'H', margin: 4, color: { dark: '#0b1638', light: '#ffffff' } };
await QRCode.toFile(path.join(OUT, 'baotuong9a4-qr.png'), URL, { ...opts, width: 2048 });
await fs.writeFile(path.join(OUT, 'baotuong9a4-qr.svg'), await QRCode.toString(URL, { ...opts, type: 'svg' }));
console.log('Đã tạo qr/baotuong9a4-qr.png và qr/baotuong9a4-qr.svg →', URL);
