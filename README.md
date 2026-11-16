# baotuong9a4.github.io

Báo tường điện tử lớp 9A4 – Chào mừng ngày Nhà giáo Việt Nam 20/11.
Tập san “Người gieo nắng – Những mùa hoa” · Chi đội 9A4 · Trường THCS Hoàng Mai. 52 trang, 2 video, có nhạc nền.

**Xem trực tuyến:** https://baotuong9a4.github.io/

Trang tĩnh thuần HTML/CSS/JS, không cần máy chủ hay tài khoản. Hiệu ứng lật trang dùng
[StPageFlip](https://github.com/Nodlik/StPageFlip) 2.0.7 (giấy phép MIT), đã đóng gói sẵn trong
`assets/vendor/` cùng phông chữ (SIL OFL) — không phụ thuộc CDN bên ngoài.

## Cấu trúc

| Đường dẫn | Nội dung |
|---|---|
| `index.html` | Trang chính (màn hình mở đầu + trình đọc) |
| `assets/js/config.js` | **Cấu hình nhạc nền và video** (đường dẫn, tiêu đề, âm lượng, vị trí nút video) |
| `assets/js/manifest.js` | Danh sách trang (tự tạo, không sửa tay) |
| `assets/js/versions.js` | Mã phiên bản của nhạc/video (tự tạo, không sửa tay) |
| `assets/pages/{full,md,thumb}/` | Ảnh trang WebP: độ nét gốc / rộng 1100px / ảnh thu nhỏ. Tên tệp kèm mã nội dung (`p004-xxxxxxxx.webp`) |
| `assets/media/` | Nhạc nền và video bản web + ảnh đại diện video |
| `tools/media.json` | Nguồn media gốc và cách tạo bản web |
| `tools/` | Script tạo ảnh, media, gắn phiên bản, đóng gói thư viện, tạo mã QR |

Ảnh PNG gốc, video gốc và nhạc gốc **không** đưa lên repo; chỉ đưa bản đã tối ưu cho web.

## Xem thử trên máy

```bash
npm run serve        # rồi mở http://localhost:8080/
```

(Máy chủ Python không hỗ trợ tải từng đoạn nên Safari có thể không phát video khi xem thử trên máy;
GitHub Pages thì hỗ trợ đầy đủ.)

## Cập nhật nội dung (ảnh, video, nhạc)

Cần Node.js và `ffmpeg`. Đặt tệp gốc theo cấu trúc thư mục cạnh repo:

```
9A4/Images/Bao-Tuong-9A4/1.png, 2.png, …   ← ảnh trang, đặt tên theo số (bìa = 1)
9A4/video/…                                  ← video gốc (khai báo trong tools/media.json)
9A4/sound/nhac-nen-bui-phan.m4a              ← nhạc nền gốc
```

Rồi chạy:

```bash
npm install
npm run build        # = build:media → build:images → stamp
```

- `build:media`: tạo video MP4 (H.264/AAC, chỉ mục ở đầu tệp để phát ngay), ảnh đại diện từ khung hình video,
  và bản nhạc web đã **giảm âm lượng tuyến tính** về khoảng −21 LUFS (bản gốc rất to, có đỉnh vượt 0 dB).
  Thêm `--force` để tạo lại tất cả.
- `build:images`: sắp xếp ảnh theo **số** (1, 2, … 10), **dừng lại** nếu thiếu số trang, trùng số, trùng nội dung
  hoặc có tệp lạ. Riêng trang được khai báo `"fillMissingPage": true` trong `tools/media.json` (hiện là **trang 4**,
  không có ảnh gốc): trang được dựng từ khung hình thật của video, đặt trên nền xanh navy. Nếu sau này có `4.png`,
  script sẽ dùng ảnh đó.
- `stamp`: gắn mã phiên bản `?v=` theo nội dung cho CSS/JS/media → người xem cũ luôn nhận bản mới.

Sau đó commit `assets/`, `index.html` và push. Bìa đứng riêng, các trang sau ghép thành cặp; không chèn trang trống giả.

## Nhạc nền

`assets/media/nhac-nen-bui-phan.m4a` (từ `sound/nhac-nen-bui-phan.m4a`, giảm 10,1 dB, đỉnh −8,9 dBTP, không cắt bớt).

- Nhạc chỉ phát khi người đọc bấm **“Mở sách và nghe nhạc”**; **“Đọc không nhạc”** hoàn toàn im lặng (không tải tệp nhạc).
- Âm lượng mặc định 70% của bản đã giảm âm (≈ 25% độ to bản gốc), nhạc to dần trong ~2 giây; hết bài tự phát lại (`loop`).
- Trên iPhone, Safari không cho chỉnh âm lượng bằng mã → dùng phím âm lượng của máy; nhờ bản đã giảm âm nên vẫn nhẹ nhàng.
- Nhạc tạm dừng khi chuyển tab và khi xem video, chỉ phát lại nếu trước đó người đọc đang bật nhạc.
- Tiếng lật trang được tạo bằng Web Audio, không cần tệp, có thể tắt trong nút Âm thanh.

## Video

Khai báo trong `assets/js/config.js` theo **số trang** (số trong tên ảnh gốc, bìa = 1):

| Trang | Tệp gốc | Bản web |
|---|---|---|
| 4 | `video/video1-page4.mp4` (1920×1080, 75 MB, chỉ mục ở cuối tệp) | `assets/media/video-trang-04.mp4` (1280×720 H.264/AAC, ~19 MB) |
| 21 | `video/video2-page 21.mp4` (480×854, 11 MB) | `assets/media/video-trang-21.mp4` (giữ nguyên hình/tiếng) |

- Nút **“Xem video”** đặt ngay trên trang (vị trí chỉnh bằng `button: { x, y }`, tính theo % trang) và một nút
  phía dưới sách khi trang đó đang mở. Có ở cả chế độ sách lật và cuộn dọc.
- Video mở trong hộp thoại đúng tỉ lệ, có điều khiển gốc và toàn màn hình; chỉ tải khi người đọc bấm xem.
  Đóng hộp thoại thì video dừng hẳn và ngừng tải. Nhạc nền không bao giờ phát chồng lên tiếng video.
- Thêm video mới: khai báo trong `tools/media.json`, chạy `npm run build`, rồi thêm vào `config.js`.
  GitHub chặn tệp > 100 MB — script tự báo lỗi nếu bản web vượt giới hạn.

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
