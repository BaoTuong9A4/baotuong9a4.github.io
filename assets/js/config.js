/*
 * CẤU HÌNH BÁO TƯỜNG 9A4 — chỉnh tệp này để thêm nhạc và video (xem README.md).
 */
window.BOOK_CONFIG = {
  /* ---------- NHẠC NỀN ----------
   * 1) Chép tệp MP3 (đã được phép sử dụng) vào assets/audio/nhac-nen.mp3
   * 2) Điền src: 'assets/audio/nhac-nen.mp3' ở dưới.
   * Khi src để trống hoặc tệp không tồn tại, trang tự chạy ở chế độ không nhạc:
   * nút “Mở sách và nghe nhạc” đổi thành “Mở sách”, không hiện trình phát lỗi.
   */
  music: {
    src: '',                      // ví dụ: 'assets/audio/nhac-nen.mp3'
    title: 'Nhạc nền',            // ví dụ: 'Bụi phấn (hòa tấu)'
    volume: 0.3,                  // 0 → 1, mặc định nhỏ nhẹ
    loop: true,
  },

  /* Tiếng lật trang rất nhẹ, được tạo trực tiếp bằng Web Audio (không cần tệp). */
  pageTurnSound: {
    volume: 0.22,
  },

  /* ---------- VIDEO ----------
   * Gắn video vào số trang (1 → 53). Mỗi trang có thể có một hoặc nhiều video.
   * Khi người đọc đang xem trang có video, nút “Xem video” xuất hiện phía dưới sách.
   * `src`: đường dẫn tệp .mp4 (H.264/AAC) trong repo hoặc một URL tệp video trực tiếp.
   * `poster` (không bắt buộc): ảnh đại diện. `title`: tên hiển thị.
   *
   * Ví dụ:
   * videos: {
   *   12: [{ src: 'assets/video/loi-chuc.mp4', title: 'Lời chúc 20/11', poster: 'assets/video/loi-chuc.jpg' }],
   *   27: [{ src: 'assets/video/ky-niem-1.mp4', title: 'Kỷ niệm 1' }, { src: 'assets/video/ky-niem-2.mp4', title: 'Kỷ niệm 2' }],
   * },
   */
  videos: {},
};
