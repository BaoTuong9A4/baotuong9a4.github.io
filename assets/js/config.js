/*
 * CẤU HÌNH BÁO TƯỜNG 9A4 — chỉnh tệp này để đổi nhạc và video (xem README.md).
 * Tệp nhạc/video bản web nằm trong assets/media/ và được tạo bằng: npm run build:media
 */
window.BOOK_CONFIG = {
  /* ---------- NHẠC NỀN ----------
   * Bản web của “nhac-nen-bui-phan.m4a” đã được giảm âm lượng sẵn (~ −21 LUFS) để nghe nhẹ nhàng,
   * kể cả trên iPhone — nơi trang web không chỉnh được âm lượng bằng mã.
   * Khi src để trống hoặc tệp không tồn tại, trang tự chạy ở chế độ không nhạc.
   */
  music: {
    src: 'assets/media/nhac-nen-bui-phan.m4a',
    title: 'Nhạc nền: Bụi phấn',
    volume: 0.7,                  // 0 → 1 (trên máy tính/Android). 70% của bản đã giảm âm ≈ 25% âm lượng bản gốc.
    loop: true,                   // hết bài tự phát lại từ đầu
  },

  /* Tiếng lật trang rất nhẹ, được tạo trực tiếp bằng Web Audio (không cần tệp). */
  pageTurnSound: {
    volume: 0.22,
  },

  /* ---------- VIDEO ----------
   * Gắn video vào số trang (số trong tên ảnh gốc, bìa là trang 1).
   * `src`: tệp .mp4 (H.264/AAC). `poster`: ảnh đại diện. `width`/`height`: kích thước video (để khung xem đúng tỉ lệ).
   * `button`: vị trí nút “Xem video” trên trang — x, y là toạ độ TÂM nút, tính theo % chiều rộng/cao trang.
   */
  videos: {
    4: [{
      src: 'assets/media/video-trang-04.mp4', poster: 'assets/media/video-trang-04.jpg', width: 1280, height: 720,
      title: 'Video · trang 4', button: { x: 50, y: 91 },
    }],
    21: [{
      src: 'assets/media/video-trang-21.mp4', poster: 'assets/media/video-trang-21.jpg', width: 480, height: 854,
      title: 'Video · trang 21', button: { x: 53, y: 100 },  // sát mép dưới, trên hình cuốn sách trang trí
    }],
  },
};
