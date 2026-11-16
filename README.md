# baotuong9a4.github.io

Báo tường điện tử lớp 9A4 – Chào mừng ngày Nhà giáo Việt Nam 20/11.
Tập san “Người gieo nắng – Những mùa hoa” · Chi đội 9A4 · Trường THCS Hoàng Mai.

**Xem trực tuyến:** https://baotuong9a4.github.io/

Trang tĩnh thuần HTML/CSS/JS, không cần máy chủ hay tài khoản. Hiệu ứng lật trang dùng
[StPageFlip](https://github.com/Nodlik/StPageFlip) 2.0.7 (giấy phép MIT), đã đóng gói sẵn trong
`assets/vendor/` cùng phông chữ (SIL OFL) — không phụ thuộc CDN bên ngoài.

## Cấu trúc

| Đường dẫn | Nội dung |
|---|---|
| `index.html` | Trang chính (màn hình mở đầu + trình đọc) |
| `assets/js/config.js` | **Cấu hình nhạc nền và video** — tệp duy nhất cần sửa tay |
| `assets/js/manifest.js` | Danh sách trang (tự tạo, không sửa tay) |
| `assets/pages/full/` | Ảnh trang độ nét gốc (WebP) — dùng khi phóng to / màn hình lớn |
| `assets/pages/md/` | Ảnh trang rộng 1100px — dùng trên điện thoại và chế độ hai trang |
| `assets/pages/thumb/` | Ảnh thu nhỏ cho mục “Chọn trang” |
| `tools/` | Script tạo ảnh, đóng gói thư viện, tạo mã QR |

Ảnh gốc xuất từ Canva (PNG, ~143 MB) **không** đưa lên repo; chỉ đưa bản WebP đã tối ưu (~27 MB).

## Xem thử trên máy

```bash
python3 -m http.server 8080      # hoặc: npm run serve
# mở http://localhost:8080/
```

(Cần chạy qua máy chủ cục bộ; mở trực tiếp `index.html` bằng `file://` có thể bị trình duyệt chặn một số tính năng.)

## Thêm / thay trang

1. Đặt ảnh xuất từ Canva vào một thư mục, đặt tên theo số trang: `1.png`, `2.png`, … (`.png`, `.jpg`, `.webp`).
   Trang 1 luôn là bìa.
2. Chạy:

   ```bash
   npm install
   npm run build:images -- "/đường/dẫn/tới/thư-mục-ảnh"
   ```

   Mặc định script đọc `../Images/Bao-Tuong-9A4`. Script sắp xếp theo **số** (1, 2, … 10 chứ không phải 1, 10, 2),
   và **dừng lại** nếu thiếu số trang, trùng số, trùng nội dung hoặc có tệp không hỗ trợ.
3. Kiểm tra lại trên máy rồi commit thư mục `assets/pages/` và `assets/js/manifest.js`.

Số trang lẻ hay chẵn đều được: bìa đứng riêng, các trang sau ghép thành cặp; không bao giờ chèn trang trống giả.

## Thêm nhạc nền

Hiện **chưa có** tệp nhạc; trang tự chạy ở chế độ không nhạc (nút chính hiển thị “Mở sách”).

1. Chép một bản MP3 mà lớp **được phép sử dụng và phát công khai** (ví dụ bản hòa tấu “Bụi phấn” do lớp tự thu,
   hoặc bản có giấy phép rõ ràng) vào `assets/audio/nhac-nen.mp3`. Nên dưới ~8 MB (128 kbps).
2. Trong `assets/js/config.js` sửa:

   ```js
   music: { src: 'assets/audio/nhac-nen.mp3', title: 'Bụi phấn (hòa tấu)', volume: 0.3, loop: true },
   ```

Khi đã có nhạc: nút “Mở sách và nghe nhạc” và “Đọc không nhạc” xuất hiện; nhạc bắt đầu nhỏ, lặp lại nhẹ nhàng,
tự tạm dừng khi chuyển tab hoặc xem video. Trên iPhone, âm lượng chỉnh bằng phím của máy (Safari không cho chỉnh bằng mã).
Tiếng lật trang được tạo bằng Web Audio, không cần tệp, có thể tắt trong nút Âm thanh.

## Thêm video

Trong `assets/js/config.js`, gắn video vào số trang:

```js
videos: {
  12: [{ src: 'assets/video/loi-chuc.mp4', title: 'Lời chúc 20/11', poster: 'assets/video/loi-chuc.jpg' }],
  27: [{ src: 'assets/video/ky-niem-1.mp4', title: 'Kỷ niệm 1' }, { src: 'assets/video/ky-niem-2.mp4', title: 'Kỷ niệm 2' }],
},
```

- Khi người đọc đang mở trang có video, nút **“Xem video”** hiện phía dưới sách (không chèn nút lên tranh).
  Video mở trong hộp thoại với điều khiển gốc của trình duyệt (có toàn màn hình); nhạc nền tạm dừng và phát lại khi đóng.
- Dùng MP4 (H.264 + AAC) để chạy được trên iPhone. GitHub chặn tệp > 100 MB và khuyến nghị repo < 1 GB —
  nên nén mỗi video dưới ~50 MB, hoặc dùng `src` là URL trực tiếp tới tệp video lưu ở nơi khác.

## Triển khai

GitHub Pages xuất bản trực tiếp từ nhánh `main`, thư mục gốc (`/`). Tệp `.nojekyll` tắt xử lý Jekyll.
Chỉ cần commit và `git push` lên `main`; sau 1–2 phút trang cập nhật tại https://baotuong9a4.github.io/.

## Mã QR

```bash
npm run build:qr      # tạo qr/baotuong9a4-qr.png (2048px) và qr/baotuong9a4-qr.svg
```

Mã QR trỏ thẳng tới `https://baotuong9a4.github.io/` — không qua dịch vụ rút gọn hay theo dõi, không hết hạn.

## Cách đọc

- **Lật trang:** vuốt ngang, kéo góc trang, nút ‹ ›, hoặc phím ← →; Home/End về bìa / trang cuối.
- **Phóng to:** nút kính lúp, chạm đúp, chụm hai ngón hoặc nhấp đúp vào trang; kéo để di chuyển.
- **Chọn trang:** nút lưới hoặc bấm vào số trang.
- **Cuộn dọc:** nút hai thanh ngang — đọc lần lượt từ trên xuống.
- Vị trí đọc được nhớ trên máy; có thể chia sẻ một trang cụ thể bằng đường dẫn `…/#trang-12`.
