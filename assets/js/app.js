/* Báo tường 9A4 — trình đọc sách lật. Không cần máy chủ, không thư viện ngoài ngoài StPageFlip (MIT). */
(() => {
  'use strict';

  const CFG = window.BOOK_CONFIG || {};
  const PAGES = window.BOOK_PAGES || [];
  const TOTAL = PAGES.length;
  const RATIO = TOTAL ? PAGES[0].w / PAGES[0].h : 1491 / 1055;
  const STORE = 'bt9a4:';
  const $ = (id) => document.getElementById(id);
  // Gắn phiên bản theo nội dung (tools/stamp.mjs) để người xem cũ nhận đúng tệp mới.
  const VERS = window.ASSET_VERSIONS || {};
  const ver = (src) => (src && VERS[src] ? src + (src.includes('?') ? '&' : '?') + 'v=' + VERS[src] : src);
  const mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const reduced = () => mqReduce.matches;
  const coarse = window.matchMedia('(pointer: coarse)').matches;

  const store = {
    get(k, d = null) { try { const v = localStorage.getItem(STORE + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(STORE + k, JSON.stringify(v)); } catch { /* bộ nhớ bị chặn: bỏ qua */ } },
  };

  const el = {
    intro: $('intro'), introCover: $('introCover'), btnOpenMusic: $('btnOpenMusic'), btnOpenMusicLabel: $('btnOpenMusicLabel'),
    btnOpenSilent: $('btnOpenSilent'), introResume: $('introResume'),
    reader: $('reader'), stage: $('stage'), shell: $('bookShell'), base: $('bookBase'), edgeL: $('edgeL'), edgeR: $('edgeR'),
    btnFirst: $('btnFirst'), btnPrev: $('btnPrev'), btnNext: $('btnNext'), btnLast: $('btnLast'),
    pageLabel: $('pageLabel'), pageLabelText: $('pageLabelText'), pageLabelTotal: $('pageLabelTotal'), progress: $('progress'), live: $('liveStatus'),
    btnThumbs: $('btnThumbs'), btnZoom: $('btnZoom'), btnScroll: $('btnScroll'), btnLayout: $('btnLayout'),
    btnMusic: $('btnMusic'), btnSound: $('btnSound'), btnFullscreen: $('btnFullscreen'),
    soundPanel: $('soundPanel'), musicRow: $('musicRow'), musicTitle: $('musicTitle'), swMusic: $('swMusic'), volRow: $('volRow'), volMusic: $('volMusic'),
    volNote: $('volNote'), swFlip: $('swFlip'), swFx: $('swFx'), musicMissing: $('musicMissing'),
    btnVideo: $('btnVideo'), videoPillLabel: $('videoPillLabel'),
    dlgThumbs: $('dlgThumbs'), thumbGrid: $('thumbGrid'),
    dlgZoom: $('dlgZoom'), zoomViewport: $('zoomViewport'), zoomImg: $('zoomImg'), zoomTitle: $('zoomTitle'), zoomLoading: $('zoomLoading'),
    zPrev: $('zPrev'), zNext: $('zNext'), zIn: $('zIn'), zOut: $('zOut'), zReset: $('zReset'),
    dlgVideo: $('dlgVideo'), videoEl: $('videoEl'), videoTitle: $('videoTitle'), videoList: $('videoList'),
    scrollView: $('scrollView'), scrollList: $('scrollList'), scrollPos: $('scrollPos'), btnBackToBook: $('btnBackToBook'),
    toast: $('toast'), toastText: $('toastText'), toastAction: $('toastAction'), toastClose: $('toastClose'),
  };

  if (!TOTAL || !window.St || !window.St.PageFlip) {
    console.error('Thiếu manifest trang hoặc thư viện StPageFlip.');
    return;
  }
  el.pageLabelTotal.textContent = '/ ' + TOTAL;

  /* ------------------------------------------------------------------ */
  /* Thông báo nhỏ                                                       */
  /* ------------------------------------------------------------------ */
  let toastTimer = 0;
  function toast(text, action, ms = 6000) {
    clearTimeout(toastTimer);
    el.toastText.textContent = text;
    el.toastAction.hidden = !action;
    el.toastAction.onclick = null;
    if (action) {
      el.toastAction.textContent = action.label;
      el.toastAction.onclick = () => { hideToast(); action.run(); };
    }
    el.toast.hidden = false;
    if (ms) toastTimer = setTimeout(hideToast, ms);
  }
  function hideToast() { el.toast.hidden = true; clearTimeout(toastTimer); }
  el.toastClose.addEventListener('click', hideToast);

  /* ------------------------------------------------------------------ */
  /* Lấp lánh trang trí (nhẹ, nằm sau sách)                              */
  /* ------------------------------------------------------------------ */
  (function sparkles() {
    if (reduced()) return;
    const box = $('sparkles');
    const rnd = (a, b) => a + Math.random() * (b - a);
    for (let i = 0; i < 16; i++) {
      const s = document.createElement('span');
      s.style.left = rnd(2, 98) + '%';
      s.style.top = rnd(4, 92) + '%';
      s.style.animationDelay = rnd(0, 6).toFixed(2) + 's';
      s.style.animationDuration = rnd(4.5, 8).toFixed(2) + 's';
      box.appendChild(s);
    }
  })();

  /* ------------------------------------------------------------------ */
  /* Cánh hoa rơi: một canvas, số hạt cố định, một vòng requestAnimationFrame */
  /* ------------------------------------------------------------------ */
  const Petals = (() => {
    const cv = $('petals');
    const ctx = cv.getContext && cv.getContext('2d');
    const rnd = (a, b) => a + Math.random() * (b - a);
    const P = []; const SPRITES = [];
    let W = 0, H = 0, dpr = 1, raf = 0, last = 0, rectAt = 0, content = null, enabled = store.get('effects', true);
    let scale = 1, slow = 0, frames = 0; // tự giảm số hạt nếu máy yếu
    // Màu hợp với báo tường: hồng hoa đào, hồng phấn, kem, vàng mai, đào.
    const COLORS = [['#ffe1ec', '#f39bb8'], ['#fff0f5', '#f7b6cb'], ['#fff8ec', '#f3d9b0'], ['#fff3c8', '#f2c25e'], ['#ffe4d6', '#f0a184']];

    function sprite([c1, c2], size) {
      const s = document.createElement('canvas'); const px = Math.ceil(size * 2);
      s.width = px; s.height = px;
      const g = s.getContext('2d'); g.translate(px / 2, px / 2);
      const w = size * 0.62, h = size;
      const grad = g.createLinearGradient(-w, -h, w, h); grad.addColorStop(0, c1); grad.addColorStop(1, c2);
      g.fillStyle = grad;
      g.beginPath(); // cánh hoa: tròn ở đầu, khía nhẹ ở ngọn
      g.moveTo(0, h * 0.5);
      g.bezierCurveTo(w, h * 0.25, w * 0.9, -h * 0.45, w * 0.18, -h * 0.5);
      g.lineTo(0, -h * 0.38); g.lineTo(-w * 0.18, -h * 0.5);
      g.bezierCurveTo(-w * 0.9, -h * 0.45, -w, h * 0.25, 0, h * 0.5);
      g.fill();
      g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = Math.max(0.6, size / 18);
      g.beginPath(); g.moveTo(0, h * 0.42); g.quadraticCurveTo(w * 0.1, 0, 0, -h * 0.3); g.stroke();
      return s;
    }
    function speck() { // hạt sáng nhỏ như tuyết (điểm nhấn phụ)
      const s = document.createElement('canvas'); s.width = s.height = 24;
      const g = s.getContext('2d'); const r = g.createRadialGradient(12, 12, 0, 12, 12, 12);
      r.addColorStop(0, 'rgba(255,250,235,1)'); r.addColorStop(.35, 'rgba(255,236,190,.6)'); r.addColorStop(1, 'rgba(255,228,163,0)');
      g.fillStyle = r; g.fillRect(0, 0, 24, 24); return s;
    }

    /** Số hạt theo diện tích màn hình (có giới hạn), ít hơn khi đang đọc. */
    function target() {
      const area = W * H; const intro = !el.intro.hidden && el.reader.hidden;
      const base = Math.max(20, Math.min(40, Math.round(area / 26000) + 10));
      return { petals: Math.round(base * (intro ? 1 : 0.8) * scale), specks: Math.round(base * 0.25 * scale) };
    }
    function reset(p, initial) {
      const r = content;
      // Khi đang đọc trên màn hình rộng, ưu tiên rơi ở hai bên sách.
      if (r && !p.speck && r.width < W * 0.8 && Math.random() < 0.6) {
        const left = Math.random() < 0.5; p.x = left ? rnd(-10, r.left) : rnd(r.right, W + 10);
      } else p.x = rnd(-20, W + 20);
      p.y = initial ? rnd(-H * 0.1, H) : rnd(-60, -15);
      const depth = Math.random(); // xa → nhỏ, chậm, mờ; gần → to, nhanh
      p.z = depth;
      p.size = p.speck ? rnd(5, 10) : 10 + depth * 16;
      p.vy = (p.speck ? rnd(14, 30) : 26 + depth * 46) * rnd(0.85, 1.15);
      p.vx = rnd(-8, 4);
      p.amp = rnd(10, 38); p.freq = rnd(0.25, 0.7); p.ph = rnd(0, Math.PI * 2);
      p.rot = rnd(0, Math.PI * 2); p.vr = rnd(-1.4, 1.4);
      p.flip = rnd(0, Math.PI * 2); p.vf = rnd(0.8, 2.6);
      p.alpha = p.speck ? rnd(0.4, 0.8) : 0.7 + depth * 0.3;
      p.img = p.speck ? SPRITES.speck : SPRITES[Math.floor(Math.random() * SPRITES.length)];
    }
    function populate() {
      const t = target(); let petals = 0, specks = 0;
      P.forEach((p) => (p.speck ? specks++ : petals++));
      while (petals < t.petals) { const p = { speck: false }; reset(p, true); P.push(p); petals++; }
      while (specks < t.specks) { const p = { speck: true }; reset(p, true); P.push(p); specks++; }
      // Bớt hạt dư (ví dụ khi chuyển từ màn hình mở đầu sang đọc): đánh dấu để rơi hết rồi bỏ.
      let extraP = petals - t.petals, extraS = specks - t.specks;
      P.forEach((p) => { p.retire = false; if (!p.speck && extraP > 0) { p.retire = true; extraP--; } else if (p.speck && extraS > 0) { p.retire = true; extraS--; } });
    }
    function resize() {
      if (!ctx) return;
      dpr = Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2);
      W = window.innerWidth; H = window.innerHeight;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!SPRITES.length) { COLORS.forEach((c) => SPRITES.push(sprite(c, 20 * dpr))); SPRITES.speck = speck(); }
      if (P.length) populate();
    }
    function contentRect() {
      let node = null;
      if (!el.reader.hidden && !el.reader.classList.contains('is-entering')) node = el.shell;
      else if (!el.scrollView.hidden) node = el.scrollList;
      if (!node) return null;
      const r = node.getBoundingClientRect();
      return { left: Math.max(0, r.left), right: Math.min(W, r.right), top: Math.max(0, r.top), bottom: Math.min(H, r.bottom), width: r.width };
    }
    function frame(now) {
      raf = 0;
      if (!running()) return;
      const raw = now - (last || now); const dt = Math.min(0.05, raw / 1000); last = now;
      if (raw > 0 && raw < 500) { frames++; if (raw > 26) slow++; }
      if (frames >= 120) { if (slow > 40 && scale > 0.4) { scale -= 0.25; populate(); } frames = slow = 0; }
      if (now - rectAt > 300) { content = contentRect(); rectAt = now; }
      ctx.clearRect(0, 0, W, H);
      const r = content; const t = now / 1000;
      for (let i = P.length - 1; i >= 0; i--) {
        const p = P[i];
        p.y += p.vy * dt; p.x += p.vx * dt; p.rot += p.vr * dt; p.flip += p.vf * dt;
        const x = p.x + Math.sin(t * p.freq * Math.PI * 2 + p.ph) * p.amp;
        if (p.y > H + 30 || x < -60 || x > W + 60) {
          if (p.retire) { P.splice(i, 1); continue; }
          reset(p, false); continue;
        }
        let a = p.alpha, s = p.size;
        // Trên trang sách: ít, nhỏ và trong suốt để không che chữ và ảnh.
        if (r && x > r.left && x < r.right && p.y > r.top && p.y < r.bottom) {
          if (p.speck || p.z > 0.45) continue;
          a *= 0.3; s *= 0.6;
        }
        const k = s / (20 * dpr); // tỉ lệ so với sprite gốc
        const fx = Math.cos(p.flip); // lật 3D: cánh hoa xoay nghiêng tự nhiên
        ctx.globalAlpha = a * (p.speck ? 1 : 0.75 + 0.25 * Math.abs(fx));
        ctx.setTransform(dpr * k * (p.speck ? 1 : Math.max(0.35, Math.abs(fx))) * Math.cos(p.rot), dpr * k * Math.sin(p.rot) * (p.speck ? 1 : Math.max(0.35, Math.abs(fx))),
          -dpr * k * Math.sin(p.rot), dpr * k * Math.cos(p.rot), x * dpr, p.y * dpr);
        const img = p.img; ctx.drawImage(img, -img.width / 2, -img.height / 2);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    }
    const dialogs = () => [el.dlgThumbs, el.dlgZoom, el.dlgVideo].some((d) => d.open);
    function running() { return !!ctx && enabled && !reduced() && !document.hidden && !dialogs(); }
    /** Bật/tắt vòng lặp theo trạng thái (tab ẩn, hộp thoại mở, giảm chuyển động, người đọc tắt). */
    function sync() {
      const on = running();
      cv.hidden = !enabled || reduced() || !ctx;
      if (on && !raf) { if (!W) resize(); if (!P.length) populate(); last = 0; raf = requestAnimationFrame(frame); }
      else if (!on && raf) { cancelAnimationFrame(raf); raf = 0; }
    }
    function setEnabled(v) {
      enabled = v; store.set('effects', v);
      if (!v) { if (ctx) ctx.clearRect(0, 0, W, H); P.length = 0; }
      sync();
    }
    window.addEventListener('resize', () => { if (W) resize(); });
    document.addEventListener('visibilitychange', sync);
    if (mqReduce.addEventListener) mqReduce.addEventListener('change', sync);
    if ('MutationObserver' in window) {
      const mo = new MutationObserver(sync);
      [el.dlgThumbs, el.dlgZoom, el.dlgVideo].forEach((d) => mo.observe(d, { attributes: true, attributeFilter: ['open'] }));
    }
    return { sync, setEnabled, populate: () => { if (P.length) populate(); }, get enabled() { return enabled; }, get count() { return P.length; }, get running() { return !!raf; } };
  })();

  /* ------------------------------------------------------------------ */
  /* Âm thanh: nhạc nền (thẻ <audio>) + tiếng lật trang (Web Audio)       */
  /* ------------------------------------------------------------------ */
  const Music = {
    available: false, audio: null, wanted: false, playing: false, pausedForHidden: false, pausedForVideo: false,
    volume: Math.min(1, Math.max(0, store.get('vol2', CFG.music && CFG.music.volume != null ? CFG.music.volume : 0.3))),
    volumeSettable: true, fadeRaf: 0, listeners: new Set(),

    async probe() {
      const src = CFG.music && CFG.music.src;
      if (!src) return false;
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 4000);
        const r = await fetch(ver(src), { method: 'HEAD', cache: 'no-store', signal: ctrl.signal });
        clearTimeout(t);
        const type = r.headers.get('content-type') || '';
        if (!r.ok || /text\/html/i.test(type)) return false;
      } catch {
        // file:// hoặc mạng lỗi: thử nạp siêu dữ liệu trực tiếp
        const ok = await new Promise((res) => {
          const a = new Audio();
          const done = (v) => { a.removeAttribute('src'); res(v); };
          a.preload = 'metadata';
          a.onloadedmetadata = () => done(true);
          a.onerror = () => done(false);
          setTimeout(() => done(false), 4000);
          a.src = ver(src);
        });
        if (!ok) return false;
      }
      return true;
    },

    ensure() {
      if (this.audio) return this.audio;
      const a = new Audio();
      a.src = ver(CFG.music.src);
      // Tự phát lại từ đầu khi hết bài.
      a.loop = CFG.music.loop !== false;
      a.preload = 'auto';
      a.volume = 0;
      // iOS không cho chỉnh âm lượng bằng mã: phát hiện để hiện ghi chú phù hợp.
      a.volume = 0.5;
      this.volumeSettable = Math.abs(a.volume - 0.5) < 0.01;
      a.volume = 0;
      a.addEventListener('pause', () => { this.playing = false; this.emit(); });
      // Dự phòng: nếu trình duyệt bỏ qua thuộc tính loop, tự quay về đầu bài.
      a.addEventListener('ended', () => {
        if (a.loop && this.wanted && !this.blocked()) { a.currentTime = 0; a.play().catch(() => {}); }
      });
      a.addEventListener('playing', () => { this.playing = true; this.emit(); });
      a.addEventListener('error', () => {
        this.playing = false; this.wanted = false; this.emit();
        toast('Không phát được tệp nhạc nền.', null, 5000);
      });
      this.audio = a;
      return a;
    },

    fadeTo(target, ms, then) {
      cancelAnimationFrame(this.fadeRaf);
      const a = this.audio;
      if (!a) return;
      if (!this.volumeSettable || reduced() || ms <= 0) { if (this.volumeSettable) a.volume = target; then && then(); return; }
      const from = a.volume; const t0 = performance.now();
      const step = (now) => {
        const k = Math.min(1, (now - t0) / ms);
        a.volume = Math.max(0, Math.min(1, from + (target - from) * k * k * (3 - 2 * k)));
        if (k < 1) this.fadeRaf = requestAnimationFrame(step); else then && then();
      };
      this.fadeRaf = requestAnimationFrame(step);
    },

    /** Nhạc không bao giờ phát chồng lên tiếng video. */
    blocked() { return el.dlgVideo.open; },

    /** Gọi trực tiếp trong sự kiện bấm của người dùng để trình duyệt cho phép phát. */
    play() {
      if (!this.available) return Promise.resolve(false);
      if (this.blocked()) { this.wanted = true; this.pausedForVideo = true; this.emit(); return Promise.resolve(false); }
      const a = this.ensure();
      this.wanted = true;
      this.pausedForHidden = false;
      if (this.volumeSettable) a.volume = 0;
      let p;
      try { p = a.play(); } catch (e) { p = Promise.reject(e); }
      return Promise.resolve(p).then(() => {
        if (this.blocked()) { a.pause(); return false; }
        this.fadeTo(this.volume, 2200);
        this.emit();
        return true;
      }).catch((err) => {
        this.playing = false;
        this.emit();
        if (err && err.name === 'AbortError') return false;
        toast('Trình duyệt chưa cho phép phát nhạc.', { label: 'Thử lại', run: () => Music.play() }, 9000);
        return false;
      });
    },

    pause(userInitiated = true, instant = false) {
      if (userInitiated) this.wanted = false;
      const a = this.audio;
      if (!a || a.paused) { cancelAnimationFrame(this.fadeRaf); this.emit(); return; }
      if (instant) { cancelAnimationFrame(this.fadeRaf); a.pause(); return; }
      this.fadeTo(0, 450, () => a.pause());
    },

    setVolume(v) {
      this.volume = v;
      store.set('vol2', v);
      if (this.audio && this.volumeSettable && this.playing) { cancelAnimationFrame(this.fadeRaf); this.audio.volume = v; }
    },

    on(fn) { this.listeners.add(fn); },
    emit() { this.listeners.forEach((fn) => fn(this)); },
  };

  const FlipSound = {
    enabled: false, ctx: null, buffer: null,
    init() {
      if (this.ctx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try {
        this.ctx = new AC();
        // Tạo tiếng "sột soạt" giấy: nhiễu được lọc với đường bao mềm.
        const sr = this.ctx.sampleRate; const len = Math.floor(sr * 0.42);
        const buf = this.ctx.createBuffer(1, len, sr); const d = buf.getChannelData(0);
        let last = 0;
        for (let i = 0; i < len; i++) {
          const t = i / len;
          const env = Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.15)), 1.6) * (1 - t * 0.55);
          const white = Math.random() * 2 - 1;
          last = last * 0.82 + white * 0.18; // làm mềm
          const crackle = Math.random() < 0.004 ? (Math.random() - 0.5) * 0.8 : 0;
          d[i] = (last * 0.9 + crackle) * env;
        }
        this.buffer = buf;
      } catch { this.ctx = null; }
    },
    play() {
      if (!this.enabled || !this.ctx || !this.buffer || document.hidden) return;
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      const src = this.ctx.createBufferSource(); src.buffer = this.buffer;
      src.playbackRate.value = 0.9 + Math.random() * 0.25;
      const bp = this.ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2400 + Math.random() * 900; bp.Q.value = 0.7;
      const g = this.ctx.createGain(); g.gain.value = (CFG.pageTurnSound && CFG.pageTurnSound.volume) || 0.22;
      src.connect(bp).connect(g).connect(this.ctx.destination);
      src.start();
    },
    setEnabled(v) { this.enabled = v; store.set('flipSound', v); if (v) { this.init(); this.ctx && this.ctx.resume().catch(() => {}); } renderSound(); },
  };

  function renderSound() {
    const avail = Music.available;
    el.btnMusic.hidden = !avail;
    el.musicRow.hidden = !avail;
    el.volRow.hidden = !avail || !Music.volumeSettable;
    el.volNote.hidden = !avail || Music.volumeSettable || !Music.audio;
    el.musicMissing.hidden = true;
    const on = avail && (Music.playing || (Music.wanted && !Music.pausedForHidden && !Music.pausedForVideo && Music.audio && !Music.audio.paused));
    el.btnMusic.setAttribute('aria-pressed', String(!!on));
    el.btnMusic.setAttribute('aria-label', on ? 'Tắt nhạc nền' : 'Bật nhạc nền');
    el.btnMusic.querySelector('use').setAttribute('href', on ? '#i-music' : '#i-music-off');
    el.swMusic.setAttribute('aria-checked', String(!!on));
    el.swFlip.setAttribute('aria-checked', String(FlipSound.enabled));
    el.swFx.setAttribute('aria-checked', String(Petals.enabled));
    el.volMusic.value = Math.round(Music.volume * 100);
  }
  Music.on(renderSound);

  el.btnMusic.addEventListener('click', () => { (Music.playing ? Music.pause() : Music.play()); });
  el.swMusic.addEventListener('click', () => { (Music.playing ? Music.pause() : Music.play()); });
  el.swFlip.addEventListener('click', () => FlipSound.setEnabled(!FlipSound.enabled));
  el.swFx.addEventListener('click', () => { Petals.setEnabled(!Petals.enabled); renderSound(); });
  el.volMusic.addEventListener('input', () => Music.setVolume(el.volMusic.value / 100));

  function toggleSoundPanel(force) {
    const open = force != null ? force : el.soundPanel.hidden;
    el.soundPanel.hidden = !open;
    el.btnSound.setAttribute('aria-expanded', String(open));
    if (open) renderSound();
  }
  el.btnSound.addEventListener('click', (e) => { e.stopPropagation(); toggleSoundPanel(); });
  document.addEventListener('pointerdown', (e) => {
    if (!el.soundPanel.hidden && !el.soundPanel.contains(e.target) && !el.btnSound.contains(e.target)) toggleSoundPanel(false);
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (Music.audio && !Music.audio.paused) { Music.pausedForHidden = true; cancelAnimationFrame(Music.fadeRaf); Music.audio.pause(); }
    } else if (Music.pausedForHidden) {
      Music.pausedForHidden = false;
      if (Music.wanted && !Music.pausedForVideo && !Music.blocked()) Music.play();
    }
  });

  /* ------------------------------------------------------------------ */
  /* Sách lật                                                            */
  /* ------------------------------------------------------------------ */
  const state = {
    pf: null, bookEl: null, pages: [], index: 0, landscape: false, pw: 0, ph: 0, layoutPref: store.get('layout', 'auto'),
    flipping: false, pendingRebuild: false, opened: false, variant: 'md',
  };

  function measure() {
    const cs = getComputedStyle(el.stage);
    const sw = el.stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const sh = el.stage.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const fit = (w, h) => { let pw = Math.min(w, h * RATIO); return { pw: Math.floor(pw), ph: Math.floor(pw / RATIO) }; };
    const spread = fit(sw / 2, sh);
    const single = fit(sw, sh);
    const spreadPossible = sw >= 700 && spread.ph >= 240;
    let landscape;
    if (state.layoutPref === 'single') landscape = false;
    else if (state.layoutPref === 'spread') landscape = spreadPossible;
    else landscape = sw >= 900 && spread.ph >= 340;
    const dims = landscape ? spread : single;
    return { ...dims, landscape, spreadPossible };
  }

  function chooseVariant(pw) {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    return pw * dpr > 1150 ? 'full' : 'md';
  }

  function makePage(i) {
    const p = PAGES[i];
    const div = document.createElement('div');
    div.className = 'page';
    div.dataset.index = i;
    if (i === 0) div.dataset.density = 'hard';
    const img = document.createElement('img');
    img.className = 'page__img';
    img.alt = i === 0 ? 'Trang 1 — bìa tập san' : 'Trang ' + p.n;
    img.decoding = 'async';
    img.draggable = false;
    img.width = p.w; img.height = p.h;
    img.addEventListener('load', () => { img.classList.add('is-loaded'); div.classList.add('is-ready'); });
    const shade = document.createElement('div');
    shade.className = 'page__shade';
    div.append(img, shade);
    if (p.videoPage) { div.classList.add('page--video'); img.alt = 'Trang ' + p.n + ' — video (khung hình mở đầu)'; }
    const vids = videosFor(p.n);
    if (vids.length) div.appendChild(videoButton(vids, p.n));
    return div;
  }

  /** Nút “Xem video” đặt ngay trên trang (vị trí lấy từ config: x, y tính theo % khổ trang). */
  function videoButton(vids, n) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'page-video';
    const pos = vids[0].button || {};
    b.style.setProperty('--x', (pos.x != null ? pos.x : 50) + '%');
    b.style.setProperty('--y', (pos.y != null ? pos.y : 92) + '%');
    b.setAttribute('aria-label', vids.length > 1 ? `Xem ${vids.length} video của trang ${n}` : `Xem video: ${vids[0].title || 'trang ' + n}`);
    b.innerHTML = '<span class="page-video__icon" aria-hidden="true"><svg class="icon"><use href="#i-play"/></svg></span><span class="page-video__text">' +
      (vids.length > 1 ? `Xem ${vids.length} video` : 'Xem video') + '</span>';
    // Bấm nút không được kích hoạt lật trang, vuốt hay phóng to của sách.
    ['pointerdown', 'mousedown', 'touchstart'].forEach((t) => b.addEventListener(t, (e) => e.stopPropagation(), { passive: true }));
    b.addEventListener('dblclick', (e) => e.stopPropagation());
    b.addEventListener('click', (e) => { e.stopPropagation(); openVideos(vids.map((v) => ({ ...v, page: n })), b); });
    return b;
  }

  /** Chỉ giữ ảnh ở gần trang đang đọc để tiết kiệm bộ nhớ trên điện thoại. */
  function loadAround(center, keepOthers) {
    const LOAD = 4, KEEP = 9;
    const order = [];
    for (let d = 0; d <= LOAD; d++) { order.push(center + d); if (d) order.push(center - d); }
    order.forEach((i) => {
      if (i < 0 || i >= TOTAL) return;
      const img = state.pages[i] && state.pages[i].querySelector('img');
      const want = PAGES[i][state.variant];
      if (img && img.getAttribute('src') !== want) {
        img.fetchPriority = Math.abs(i - center) <= 1 ? 'high' : 'low';
        img.src = want;
      }
    });
    if (keepOthers) return;
    state.pages.forEach((pg, i) => {
      if (Math.abs(i - center) > KEEP) {
        const img = pg.querySelector('img');
        if (img.hasAttribute('src')) { img.removeAttribute('src'); img.classList.remove('is-loaded'); pg.classList.remove('is-ready'); }
      }
    });
  }

  function buildBook(startIndex) {
    const m = measure();
    if (state.pf) { try { state.pf.destroy(); } catch (e) { /* đã huỷ */ } state.pf = null; }
    state.landscape = m.landscape; state.pw = m.pw; state.ph = m.ph;
    state.variant = chooseVariant(m.pw);

    const book = document.createElement('div');
    book.className = 'book';
    book.style.width = (m.landscape ? m.pw * 2 : m.pw) + 'px';
    book.style.height = m.ph + 'px';
    el.shell.style.width = book.style.width;
    el.shell.style.height = book.style.height;
    el.shell.appendChild(book);
    state.bookEl = book;
    state.pages = PAGES.map((_, i) => makePage(i));

    const pf = new window.St.PageFlip(book, {
      width: m.pw, height: m.ph, size: 'fixed', autoSize: false,
      showCover: true, usePortrait: true, startPage: Math.max(0, Math.min(TOTAL - 1, startIndex)),
      drawShadow: true, maxShadowOpacity: 0.42, flippingTime: reduced() ? 120 : 850,
      mobileScrollSupport: true, swipeDistance: 30, showPageCorners: !coarse && !reduced(),
      disableFlipByClick: true, useMouseEvents: true, clickEventForward: true, startZIndex: 0,
    });
    state.pf = pf;
    // Vuốt và lệnh lật bằng mã đều đi qua các hàm này: bỏ qua kiểm tra "chỉ góc trang" vốn chỉ dành cho cú nhấp.
    ['flipNext', 'flipPrev', 'flip'].forEach((name) => {
      const orig = pf[name].bind(pf);
      pf[name] = (...args) => programmatic(() => orig(...args));
    });
    pf.on('flip', (e) => { state.index = e.data; onPageChange(); });
    pf.on('changeState', (e) => {
      const s = e.data;
      state.flipping = s !== 'read';
      if (s === 'flipping' || s === 'user_fold') {
        if (s === 'flipping') FlipSound.play();
        // Khi rời trang bìa, đưa sách về giữa ngay trong lúc lật.
        el.shell.classList.add('is-turning');
        if (state.landscape && state.index === 0) setCoverShift(false);
        loadAround(state.index + 2, true);
      }
      if (s === 'read') {
        el.shell.classList.remove('is-turning');
        state.index = pf.getCurrentPageIndex();
        updateShift();
        if (state.pendingRebuild) { state.pendingRebuild = false; scheduleRebuild(0); }
      }
    });
    pf.loadFromHTML(state.pages);
    state.index = pf.getCurrentPageIndex();
    el.shell.classList.toggle('is-portrait', !m.landscape);
    updateShift(true);
    onPageChange(true);
    renderLayoutButton(m);
  }

  function setCoverShift(on, instant) {
    if (instant) el.shell.style.transition = 'none';
    el.shell.style.transform = on ? `translateX(${-state.pw / 2}px)` : '';
    el.shell.classList.toggle('at-cover', on);
    if (instant) { void el.shell.offsetWidth; el.shell.style.transition = ''; }
  }
  function updateShift(instant) { setCoverShift(state.landscape && state.index === 0, instant); }

  /** Các trang đang hiển thị (0-based). */
  function visiblePages() {
    const i = state.index;
    if (!state.landscape || i === 0) return [i];
    const left = i % 2 === 1 ? i : i - 1;
    return left + 1 < TOTAL ? [left, left + 1] : [left];
  }

  function onPageChange(initial) {
    const vis = visiblePages();
    const nums = vis.map((i) => PAGES[i].n);
    const label = vis[0] === 0 ? 'Bìa' : (nums.length > 1 ? `${nums[0]}–${nums[1]}` : String(nums[0]));
    el.pageLabelText.textContent = label;
    el.pageLabel.setAttribute('aria-label', `Đang xem ${vis[0] === 0 ? 'bìa, trang 1' : 'trang ' + nums.join(' và ')} trên ${TOTAL}. Mở danh sách trang`);
    const atStart = vis[0] === 0;
    const atEnd = vis[vis.length - 1] >= TOTAL - 1;
    el.btnFirst.disabled = el.btnPrev.disabled = atStart;
    el.btnLast.disabled = el.btnNext.disabled = atEnd;
    el.progress.style.width = (TOTAL > 1 ? (vis[vis.length - 1] / (TOTAL - 1)) * 100 : 100) + '%';
    // Mép giấy hai bên dày/mỏng theo tiến độ đọc.
    const leftFrac = vis[0] / (TOTAL - 1);
    el.edgeL.style.width = (atStart ? 0 : 2 + leftFrac * 6) + 'px';
    el.edgeR.style.width = (atEnd ? 0 : 2 + (1 - leftFrac) * 6) + 'px';
    loadAround(state.index);
    store.set('page', PAGES[state.index].n);
    try { history.replaceState(null, '', vis[0] === 0 ? location.pathname + location.search : '#trang-' + nums[0]); } catch { /* bỏ qua */ }
    if (!initial) el.live.textContent = vis[0] === 0 ? 'Bìa' : 'Trang ' + nums.join(' và ') + ' trên ' + TOTAL;
    renderVideoPill(nums);
  }

  /* Điều hướng */
  // StPageFlip áp cờ disableFlipByClick cả cho lệnh lật bằng mã (lỗi ở chế độ một trang): tạm tắt khi gọi.
  function programmatic(fn) {
    const set = state.pf.getSettings();
    const prev = set.disableFlipByClick;
    set.disableFlipByClick = false;
    try { fn(); } finally { set.disableFlipByClick = prev; }
  }
  function go(dir) {
    const pf = state.pf; if (!pf || state.flipping) return;
    if (reduced()) { dir > 0 ? pf.turnToNextPage() : pf.turnToPrevPage(); state.index = pf.getCurrentPageIndex(); updateShift(); onPageChange(); return; }
    dir > 0 ? pf.flipNext('bottom') : pf.flipPrev('bottom');
  }
  function goTo(index, animate = true) {
    const pf = state.pf; if (!pf) return;
    index = Math.max(0, Math.min(TOTAL - 1, index));
    const vis = visiblePages();
    if (vis.includes(index)) return;
    if (animate && !reduced() && !state.flipping) { loadAround(index, true); pf.flip(index, 'bottom'); return; }
    pf.turnToPage(index);
    state.index = pf.getCurrentPageIndex();
    updateShift(true);
    onPageChange();
  }
  el.btnPrev.addEventListener('click', () => go(-1));
  el.btnNext.addEventListener('click', () => go(1));
  el.btnFirst.addEventListener('click', () => goTo(0));
  el.btnLast.addEventListener('click', () => goTo(TOTAL - 1));
  el.pageLabel.addEventListener('click', openThumbs);

  function anyDialogOpen() { return [el.dlgThumbs, el.dlgZoom, el.dlgVideo].some((d) => d.open); }
  document.addEventListener('keydown', (e) => {
    if (!state.opened || anyDialogOpen() || !el.scrollView.hidden) return;
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const k = e.key;
    if (k === 'ArrowRight' || k === 'PageDown') { e.preventDefault(); go(1); }
    else if (k === 'ArrowLeft' || k === 'PageUp') { e.preventDefault(); go(-1); }
    else if (k === 'Home') { e.preventDefault(); goTo(0); }
    else if (k === 'End') { e.preventDefault(); goTo(TOTAL - 1); }
    else if (k === 'Escape' && !el.soundPanel.hidden) toggleSoundPanel(false);
  });

  /* Đổi kích thước / xoay màn hình: dựng lại sách tại đúng trang đang đọc. */
  let rebuildTimer = 0;
  function scheduleRebuild(delay = 160) {
    clearTimeout(rebuildTimer);
    rebuildTimer = setTimeout(() => {
      if (!state.opened || el.reader.hidden) return;
      if (state.flipping) { state.pendingRebuild = true; return; }
      const m = measure();
      if (m.landscape === state.landscape && Math.abs(m.pw - state.pw) < 2 && Math.abs(m.ph - state.ph) < 2) { renderLayoutButton(m); return; }
      buildBook(state.index);
    }, delay);
  }
  if ('ResizeObserver' in window) new ResizeObserver(() => scheduleRebuild()).observe(el.stage);
  window.addEventListener('resize', () => scheduleRebuild());
  window.addEventListener('orientationchange', () => scheduleRebuild(300));

  function renderLayoutButton(m) {
    el.btnLayout.hidden = !m.spreadPossible;
    const isSpread = state.landscape;
    el.btnLayout.setAttribute('aria-label', isSpread ? 'Chuyển sang xem một trang' : 'Chuyển sang xem hai trang');
    el.btnLayout.title = isSpread ? 'Xem một trang (lớn hơn)' : 'Xem hai trang';
    el.btnLayout.querySelector('use').setAttribute('href', isSpread ? '#i-single' : '#i-spread');
  }
  el.btnLayout.addEventListener('click', () => {
    state.layoutPref = state.landscape ? 'single' : 'spread';
    store.set('layout', state.layoutPref);
    buildBook(state.index);
  });

  /* Chạm đúp / chụm hai ngón / nhấp đúp trên sách để phóng to. */
  function pageIndexAt(x, y) {
    const hit = document.elementsFromPoint(x, y).find((n) => n.classList && n.classList.contains('page'));
    if (hit) return Number(hit.dataset.index);
    const vis = visiblePages();
    if (vis.length === 1) return vis[0];
    const r = el.shell.getBoundingClientRect();
    return x < r.left + r.width / 2 ? vis[0] : vis[1];
  }
  el.stage.addEventListener('dblclick', (e) => { if (!state.flipping && !e.target.closest('.page-video')) openZoom(pageIndexAt(e.clientX, e.clientY)); });
  let pinch = null; let lastTap = null; let tapStart = null;
  const dist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  el.stage.addEventListener('touchstart', (e) => {
    if (e.touches.length >= 2) {
      const ui = state.pf && (state.pf.getUI ? state.pf.getUI() : state.pf.ui);
      if (ui) ui.touchPoint = null; // huỷ nhận diện vuốt của thư viện
      pinch = { d0: dist(e.touches), mx: (e.touches[0].clientX + e.touches[1].clientX) / 2, my: (e.touches[0].clientY + e.touches[1].clientY) / 2, done: false };
      tapStart = null;
      e.stopPropagation();
    } else {
      tapStart = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() };
    }
  }, { capture: true, passive: true });
  const stopIfPinch = (e) => { if (pinch) e.stopPropagation(); };
  window.addEventListener('touchmove', (e) => {
    if (!pinch) return;
    e.stopPropagation();
    if (e.cancelable) e.preventDefault();
    if (!pinch.done && e.touches.length >= 2 && dist(e.touches) / pinch.d0 > 1.18) {
      pinch.done = true;
      openZoom(pageIndexAt(pinch.mx, pinch.my));
    }
  }, { capture: true, passive: false });
  window.addEventListener('touchend', (e) => {
    if (pinch) { stopIfPinch(e); if (e.touches.length === 0) pinch = null; return; }
    if (!tapStart || !el.stage.contains(e.target)) return;
    if (e.target.closest && e.target.closest('.page-video')) { tapStart = null; lastTap = null; return; }
    const t = e.changedTouches[0];
    const moved = Math.hypot(t.clientX - tapStart.x, t.clientY - tapStart.y);
    const quick = Date.now() - tapStart.t < 300;
    tapStart = null;
    if (moved > 12 || !quick) { lastTap = null; return; }
    const now = Date.now();
    if (lastTap && now - lastTap.t < 330 && Math.hypot(t.clientX - lastTap.x, t.clientY - lastTap.y) < 40 && !state.flipping) {
      lastTap = null;
      openZoom(pageIndexAt(t.clientX, t.clientY));
    } else lastTap = { t: now, x: t.clientX, y: t.clientY };
  }, { capture: true });
  window.addEventListener('touchcancel', () => { pinch = null; tapStart = null; }, { capture: true });
  // Safari: chặn phóng to cả trang khi chụm trên sách (đã có trình phóng to riêng).
  el.stage.addEventListener('gesturestart', (e) => e.preventDefault());

  /* ------------------------------------------------------------------ */
  /* Danh sách trang (ảnh thu nhỏ)                                       */
  /* ------------------------------------------------------------------ */
  const videosFor = (n) => {
    const v = CFG.videos && (CFG.videos[n] || CFG.videos[String(n)]);
    return Array.isArray(v) ? v.filter((x) => x && x.src) : (v && v.src ? [v] : []);
  };
  let thumbsBuilt = false;
  function buildThumbs() {
    if (thumbsBuilt) return;
    thumbsBuilt = true;
    const frag = document.createDocumentFragment();
    PAGES.forEach((p, i) => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'thumb'; b.dataset.index = i;
      const hasVideo = videosFor(p.n).length > 0;
      b.setAttribute('aria-label', `Trang ${p.n}${i === 0 ? ' (bìa)' : ''}${hasVideo ? ', có video' : ''}`);
      b.innerHTML = `<img loading="lazy" decoding="async" alt="" width="${p.w}" height="${p.h}"><span>${i === 0 ? 'Bìa · 1' : p.n}</span>` +
        (hasVideo ? '<i class="thumb__video" aria-hidden="true"><svg class="icon"><use href="#i-play"/></svg></i>' : '');
      b.querySelector('img').src = p.thumb;
      b.addEventListener('click', () => { el.dlgThumbs.close(); goTo(i, Math.abs(i - state.index) <= 4); });
      li.appendChild(b);
      frag.appendChild(li);
    });
    el.thumbGrid.appendChild(frag);
  }
  function openThumbs() {
    buildThumbs();
    const vis = visiblePages();
    let cur = null;
    el.thumbGrid.querySelectorAll('.thumb').forEach((b) => {
      const on = vis.includes(Number(b.dataset.index));
      b.setAttribute('aria-current', String(on));
      if (on && !cur) cur = b;
    });
    el.dlgThumbs.showModal();
    if (cur) { cur.scrollIntoView({ block: 'center' }); cur.focus({ preventScroll: true }); }
  }
  el.btnThumbs.addEventListener('click', openThumbs);

  document.querySelectorAll('dialog [data-close]').forEach((b) => b.addEventListener('click', () => b.closest('dialog').close()));
  [el.dlgThumbs, el.dlgVideo].forEach((d) => d.addEventListener('click', (e) => { if (e.target === d) d.close(); }));

  /* ------------------------------------------------------------------ */
  /* Trình phóng to (pinch, kéo, lăn chuột, chạm đúp)                    */
  /* ------------------------------------------------------------------ */
  const Z = { i: 0, s: 1, x: 0, y: 0, bw: 0, bh: 0, cw: 0, ch: 0, ptrs: new Map(), gesture: null, lastTap: null, loadToken: 0, min: 1, max: 5 };

  function zApply() {
    el.zoomImg.style.transform = `translate3d(${Z.x}px, ${Z.y}px, 0) scale(${Z.s})`;
    el.zReset.textContent = Math.round(Z.s * 100) + '%';
    el.zOut.disabled = Z.s <= Z.min + 0.001;
    el.zIn.disabled = Z.s >= Z.max - 0.001;
  }
  function zClamp() {
    const w = Z.bw * Z.s, h = Z.bh * Z.s;
    Z.x = w <= Z.cw ? (Z.cw - w) / 2 : Math.min(0, Math.max(Z.cw - w, Z.x));
    Z.y = h <= Z.ch ? (Z.ch - h) / 2 : Math.min(0, Math.max(Z.ch - h, Z.y));
  }
  function zFit() {
    Z.cw = el.zoomViewport.clientWidth; Z.ch = el.zoomViewport.clientHeight;
    const pad = Z.cw < 600 ? 0 : 16;
    Z.bw = Math.min(Z.cw - pad * 2, (Z.ch - pad * 2) * RATIO); Z.bh = Z.bw / RATIO;
    el.zoomImg.style.width = Z.bw + 'px'; el.zoomImg.style.height = Z.bh + 'px';
    Z.s = 1; zClamp(); zApply();
  }
  function zZoomAt(ns, cx, cy, animate) {
    ns = Math.max(Z.min, Math.min(Z.max, ns));
    Z.x = cx - (cx - Z.x) * (ns / Z.s);
    Z.y = cy - (cy - Z.y) * (ns / Z.s);
    Z.s = ns; zClamp();
    el.zoomImg.style.transition = animate && !reduced() ? 'transform .25s ease' : 'none';
    zApply();
  }
  function zShow(i) {
    Z.i = Math.max(0, Math.min(TOTAL - 1, i));
    const p = PAGES[Z.i];
    el.zoomTitle.textContent = Z.i === 0 ? `Bìa · trang 1 / ${TOTAL}` : `Trang ${p.n} / ${TOTAL}`;
    el.zoomImg.alt = 'Trang ' + p.n + ' (phóng to)';
    el.zPrev.disabled = Z.i === 0; el.zNext.disabled = Z.i === TOTAL - 1;
    const token = ++Z.loadToken;
    el.zoomImg.src = p.md; // thường đã có sẵn trong bộ nhớ đệm
    if (p.full !== p.md) {
      el.zoomLoading.hidden = false;
      const hi = new Image();
      hi.decoding = 'async';
      hi.onload = () => { if (token === Z.loadToken) { el.zoomImg.src = p.full; el.zoomLoading.hidden = true; } };
      hi.onerror = () => { if (token === Z.loadToken) el.zoomLoading.hidden = true; };
      hi.src = p.full;
    }
    zFit();
  }
  function openZoom(i) {
    if (i == null || Number.isNaN(i)) i = visiblePages()[0];
    el.dlgZoom.showModal();
    requestAnimationFrame(() => zShow(i));
  }
  el.btnZoom.addEventListener('click', () => openZoom(visiblePages()[0]));
  el.dlgZoom.addEventListener('close', () => {
    Z.loadToken++;
    el.zoomImg.removeAttribute('src');
    // Đồng bộ sách với trang vừa xem khi phóng to.
    if (!el.scrollView.hidden) return;
    if (!visiblePages().includes(Z.i)) goTo(Z.i, false);
  });
  el.zPrev.addEventListener('click', () => zShow(Z.i - 1));
  el.zNext.addEventListener('click', () => zShow(Z.i + 1));
  el.zIn.addEventListener('click', () => zZoomAt(Z.s * 1.6, Z.cw / 2, Z.ch / 2, true));
  el.zOut.addEventListener('click', () => zZoomAt(Z.s / 1.6, Z.cw / 2, Z.ch / 2, true));
  el.zReset.addEventListener('click', () => { el.zoomImg.style.transition = reduced() ? 'none' : 'transform .25s ease'; Z.s = 1; zClamp(); zApply(); });
  el.dlgZoom.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' && Z.s === 1) { e.preventDefault(); zShow(Z.i + 1); }
    else if (e.key === 'ArrowLeft' && Z.s === 1) { e.preventDefault(); zShow(Z.i - 1); }
    else if (e.key === '+' || e.key === '=') zZoomAt(Z.s * 1.4, Z.cw / 2, Z.ch / 2, true);
    else if (e.key === '-') zZoomAt(Z.s / 1.4, Z.cw / 2, Z.ch / 2, true);
    else if (Z.s > 1 && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
      const step = 80;
      if (e.key === 'ArrowUp') Z.y += step; if (e.key === 'ArrowDown') Z.y -= step;
      if (e.key === 'ArrowLeft') Z.x += step; if (e.key === 'ArrowRight') Z.x -= step;
      zClamp(); el.zoomImg.style.transition = 'none'; zApply();
    }
  });
  window.addEventListener('resize', () => { if (el.dlgZoom.open) zFit(); });

  const vp = el.zoomViewport;
  const local = (e) => { const r = vp.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  vp.addEventListener('pointerdown', (e) => {
    vp.setPointerCapture(e.pointerId);
    Z.ptrs.set(e.pointerId, local(e));
    el.zoomImg.style.transition = 'none';
    if (Z.ptrs.size === 1) {
      const p = local(e);
      Z.gesture = { type: 'pan', sx: p.x, sy: p.y, ox: Z.x, oy: Z.y, t: Date.now(), moved: 0 };
    } else if (Z.ptrs.size === 2) {
      const [a, b] = [...Z.ptrs.values()];
      Z.gesture = { type: 'pinch', d0: Math.hypot(a.x - b.x, a.y - b.y), s0: Z.s, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, ox: Z.x, oy: Z.y };
    }
    vp.classList.add('is-dragging');
  });
  vp.addEventListener('pointermove', (e) => {
    if (!Z.ptrs.has(e.pointerId) || !Z.gesture) return;
    Z.ptrs.set(e.pointerId, local(e));
    const g = Z.gesture;
    if (g.type === 'pan' && Z.ptrs.size === 1) {
      const p = local(e);
      g.moved = Math.max(g.moved, Math.hypot(p.x - g.sx, p.y - g.sy));
      if (Z.s > 1) { Z.x = g.ox + (p.x - g.sx); Z.y = g.oy + (p.y - g.sy); zClamp(); zApply(); }
    } else if (g.type === 'pinch' && Z.ptrs.size >= 2) {
      const [a, b] = [...Z.ptrs.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const ns = Math.max(Z.min, Math.min(Z.max, g.s0 * d / g.d0));
      // phóng quanh trung điểm ban đầu, đồng thời kéo theo trung điểm hiện tại
      Z.x = mx - (g.mx - g.ox) * (ns / g.s0);
      Z.y = my - (g.my - g.oy) * (ns / g.s0);
      Z.s = ns; zClamp(); zApply();
    }
  });
  function endPointer(e) {
    if (!Z.ptrs.has(e.pointerId)) return;
    const g = Z.gesture;
    Z.ptrs.delete(e.pointerId);
    if (g && g.type === 'pan' && Z.ptrs.size === 0 && e.type === 'pointerup') {
      const p = local(e);
      const dx = p.x - g.sx, dy = p.y - g.sy, dt = Date.now() - g.t;
      if (Z.s <= 1.01 && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5 && dt < 600) {
        zShow(Z.i + (dx < 0 ? 1 : -1));
      } else if (g.moved < 10 && dt < 300) {
        const now = Date.now();
        if (Z.lastTap && now - Z.lastTap.t < 320 && Math.hypot(p.x - Z.lastTap.x, p.y - Z.lastTap.y) < 40) {
          Z.lastTap = null;
          zZoomAt(Z.s > 1.2 ? 1 : 2.6, p.x, p.y, true);
        } else Z.lastTap = { t: now, x: p.x, y: p.y };
      }
    }
    if (Z.ptrs.size === 1) {
      const [only] = [...Z.ptrs.values()];
      Z.gesture = { type: 'pan', sx: only.x, sy: only.y, ox: Z.x, oy: Z.y, t: Date.now(), moved: 99 };
    } else if (Z.ptrs.size === 0) { Z.gesture = null; vp.classList.remove('is-dragging'); }
  }
  vp.addEventListener('pointerup', endPointer);
  vp.addEventListener('pointercancel', endPointer);
  vp.addEventListener('wheel', (e) => {
    e.preventDefault();
    const p = local(e);
    if (e.ctrlKey || Math.abs(e.deltaY) >= Math.abs(e.deltaX)) {
      if (!e.ctrlKey && Z.s > 1 && e.deltaMode === 0 && Math.abs(e.deltaY) < 40 && !e.ctrlKey) {
        // bàn di chuột: cuộn hai ngón để di chuyển khi đã phóng to
        Z.x -= e.deltaX; Z.y -= e.deltaY; zClamp(); el.zoomImg.style.transition = 'none'; zApply(); return;
      }
      const k = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0022));
      zZoomAt(Z.s * k, p.x, p.y, false);
    } else if (Z.s > 1) { Z.x -= e.deltaX; zClamp(); zApply(); }
  }, { passive: false });
  el.zoomViewport.addEventListener('gesturestart', (e) => e.preventDefault());

  /* ------------------------------------------------------------------ */
  /* Chế độ cuộn dọc                                                     */
  /* ------------------------------------------------------------------ */
  let scrollBuilt = false; let scrollIO = null; let posIO = null; let scrollCurrent = 0;
  function buildScroll() {
    if (scrollBuilt) return;
    scrollBuilt = true;
    const frag = document.createDocumentFragment();
    PAGES.forEach((p, i) => {
      const li = document.createElement('li');
      li.id = 'cuon-' + p.n; li.dataset.index = i;
      li.innerHTML = `<button type="button" class="scrollview__zoom" aria-label="Phóng to trang ${p.n}"><img alt="Trang ${p.n}" decoding="async" width="${p.w}" height="${p.h}"></button><p>Trang ${p.n} / ${TOTAL}</p>`;
      li.querySelector('button').addEventListener('click', () => openZoom(i));
      const vids = videosFor(p.n);
      if (vids.length) {
        const wrap = document.createElement('div');
        wrap.className = 'scrollview__page';
        const zoomBtn = li.querySelector('button');
        li.insertBefore(wrap, zoomBtn); wrap.append(zoomBtn, videoButton(vids, p.n));
      }
      frag.appendChild(li);
    });
    el.scrollList.appendChild(frag);
    // Nạp ảnh khi sắp tới, gỡ ảnh khi đã đi xa để giữ bộ nhớ ổn định.
    scrollIO = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        const img = en.target.querySelector('img');
        const i = Number(en.target.dataset.index);
        if (en.isIntersecting) { if (!img.getAttribute('src')) img.src = PAGES[i].md; }
        else if (img.hasAttribute('src')) img.removeAttribute('src');
      });
    }, { rootMargin: '250% 0px' });
    posIO = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { scrollCurrent = Number(en.target.dataset.index); el.scrollPos.textContent = `Trang ${PAGES[scrollCurrent].n} / ${TOTAL}`; store.set('page', PAGES[scrollCurrent].n); } });
    }, { rootMargin: '-45% 0px -45% 0px' });
    el.scrollList.querySelectorAll('li').forEach((li) => { scrollIO.observe(li); posIO.observe(li); });
  }
  function enterScroll() {
    buildScroll();
    const start = visiblePages()[0];
    el.reader.hidden = true;
    el.scrollView.hidden = false;
    document.body.classList.add('is-scroll');
    const target = el.scrollList.children[start];
    requestAnimationFrame(() => { target.scrollIntoView({ block: 'start' }); window.scrollBy(0, -64); el.btnBackToBook.focus({ preventScroll: true }); });
    scrollCurrent = start;
    el.scrollPos.textContent = `Trang ${PAGES[start].n} / ${TOTAL}`;
  }
  function exitScroll() {
    el.scrollView.hidden = true;
    document.body.classList.remove('is-scroll');
    window.scrollTo(0, 0);
    el.reader.hidden = false;
    el.scrollList.querySelectorAll('img[src]').forEach((img) => img.removeAttribute('src'));
    buildBook(scrollCurrent);
    el.btnScroll.focus({ preventScroll: true });
  }
  el.btnScroll.addEventListener('click', enterScroll);
  el.btnBackToBook.addEventListener('click', exitScroll);

  /* ------------------------------------------------------------------ */
  /* Video (cấu hình trong config.js)                                    */
  /* ------------------------------------------------------------------ */
  let pillVideos = [];
  let videoOpener = null;
  function renderVideoPill(nums) {
    pillVideos = [];
    nums.forEach((n) => videosFor(n).forEach((v) => pillVideos.push({ ...v, page: n })));
    el.btnVideo.hidden = pillVideos.length === 0;
    if (pillVideos.length) {
      const pages = [...new Set(pillVideos.map((v) => v.page))];
      el.videoPillLabel.textContent = pillVideos.length === 1 ? `Xem video · trang ${pages[0]}` : `Xem ${pillVideos.length} video`;
      el.btnVideo.setAttribute('aria-label', pillVideos.length === 1 ? `Xem video của trang ${pages[0]}` : `Xem ${pillVideos.length} video của trang ${pages.join(', ')}`);
    }
  }
  function playVideo(v) {
    const vid = el.videoEl;
    el.videoTitle.textContent = v.title || `Video trang ${v.page}`;
    vid.pause();
    // Khung hình đúng tỉ lệ video để xem lớn nhất có thể trên mọi màn hình.
    const ar = v.width && v.height ? v.width / v.height : 16 / 9;
    el.dlgVideo.style.setProperty('--ar', String(ar));
    el.dlgVideo.classList.toggle('is-portrait', ar < 1);
    if (v.poster) vid.poster = ver(v.poster); else vid.removeAttribute('poster');
    vid.controls = true;
    vid.preload = 'metadata';
    vid.src = ver(v.src);
    vid.load();
    el.videoList.querySelectorAll('button').forEach((b) => b.setAttribute('aria-current', String(b.dataset.src === v.src)));
    vid.play().catch(() => { /* người dùng tự bấm phát bằng nút gốc */ });
  }
  function openVideos(list, opener) {
    list = list && list.length ? list : pillVideos;
    if (!list.length || el.dlgVideo.open) return;
    videoOpener = opener || document.activeElement;
    // Dừng nhạc ngay lập tức (không chờ nhỏ dần) để không chồng lên tiếng video.
    Music.pausedForVideo = !!(Music.wanted && Music.audio && !Music.audio.paused);
    Music.pause(false, true);
    hideToast();
    el.videoList.innerHTML = '';
    el.videoList.hidden = list.length < 2;
    list.forEach((v, k) => {
      const b = document.createElement('button');
      b.type = 'button'; b.dataset.src = v.src; b.textContent = v.title || `Video ${k + 1}`;
      b.addEventListener('click', () => playVideo(v));
      el.videoList.appendChild(b);
    });
    el.dlgVideo.showModal();
    playVideo(list[0]);
  }
  el.btnVideo.addEventListener('click', () => openVideos(pillVideos, el.btnVideo));
  el.videoEl.addEventListener('play', () => {
    if (Music.audio && !Music.audio.paused) { Music.pausedForVideo = Music.pausedForVideo || Music.wanted; Music.pause(false, true); }
  });
  el.videoEl.addEventListener('error', () => { if (el.dlgVideo.open && el.videoEl.getAttribute('src')) toast('Không mở được video này. Vui lòng thử lại sau.', null, 6000); });
  el.dlgVideo.addEventListener('close', () => {
    const vid = el.videoEl;
    // Dừng hẳn video và ngừng tải dữ liệu.
    vid.pause(); vid.removeAttribute('src'); vid.removeAttribute('poster'); vid.load(); vid.controls = false;
    const wfs = document.webkitFullscreenElement || document.fullscreenElement;
    if (wfs === vid) { try { (document.exitFullscreen || document.webkitExitFullscreen).call(document); } catch { /* bỏ qua */ } }
    // Chỉ phát lại nhạc nếu trước khi mở video, nhạc đang bật.
    if (Music.pausedForVideo) { Music.pausedForVideo = false; if (Music.wanted && !document.hidden) Music.play(); }
    if (videoOpener && document.contains(videoOpener) && videoOpener.offsetParent) videoOpener.focus({ preventScroll: true });
    videoOpener = null;
  });

  /* ------------------------------------------------------------------ */
  /* Toàn màn hình                                                       */
  /* ------------------------------------------------------------------ */
  const docEl = document.documentElement;
  const fsSupported = !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
  const fsElement = () => document.fullscreenElement || document.webkitFullscreenElement;
  el.btnFullscreen.hidden = !fsSupported;
  el.btnFullscreen.addEventListener('click', () => {
    try {
      if (fsElement()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      else {
        const req = docEl.requestFullscreen || docEl.webkitRequestFullscreen;
        const r = req && req.call(docEl);
        if (r && r.catch) r.catch(() => toast('Trình duyệt không cho phép toàn màn hình.', null, 4000));
      }
    } catch { toast('Trình duyệt không hỗ trợ toàn màn hình.', null, 4000); }
  });
  ['fullscreenchange', 'webkitfullscreenchange'].forEach((ev) => document.addEventListener(ev, () => {
    const on = !!fsElement();
    el.btnFullscreen.setAttribute('aria-pressed', String(on));
    el.btnFullscreen.setAttribute('aria-label', on ? 'Thoát toàn màn hình' : 'Toàn màn hình');
    el.btnFullscreen.querySelector('use').setAttribute('href', on ? '#i-shrink' : '#i-expand');
    scheduleRebuild(120);
  }));

  /* ------------------------------------------------------------------ */
  /* Mở sách                                                             */
  /* ------------------------------------------------------------------ */
  function startIndexFromLocation() {
    const m = /^#trang-(\d+)$/.exec(location.hash);
    if (m) { const n = Number(m[1]); const i = PAGES.findIndex((p) => p.n === n); if (i >= 0) return { i, from: 'hash' }; }
    const saved = Number(store.get('page', 1));
    const i = PAGES.findIndex((p) => p.n === saved);
    return { i: i > 0 ? i : 0, from: i > 0 ? 'saved' : 'none' };
  }
  const start = startIndexFromLocation();
  if (start.i > 0) {
    el.introResume.hidden = false;
    el.introResume.textContent = start.from === 'hash' ? `Sách sẽ mở ở trang ${PAGES[start.i].n}.` : `Sách sẽ mở lại ở trang ${PAGES[start.i].n} bạn đang đọc dở.`;
  }

  function waitImg(img, ms) {
    return new Promise((res) => {
      if (!img || !img.getAttribute('src')) return res();
      const t = setTimeout(res, ms);
      const done = () => { clearTimeout(t); res(); };
      if (img.complete && img.naturalWidth) { (img.decode ? img.decode().catch(() => {}) : Promise.resolve()).then(done); return; }
      img.addEventListener('load', done, { once: true });
      img.addEventListener('error', done, { once: true });
    });
  }

  async function openBook(withSound) {
    if (state.opened) return;
    state.opened = true;
    el.btnOpenMusic.disabled = el.btnOpenSilent.disabled = true;

    // Âm thanh phải được yêu cầu ngay trong cú bấm của người dùng.
    if (withSound) {
      if (Music.available) Music.play();
      if (Music.available && store.get('flipSound', true)) FlipSound.setEnabled(true);
    } else {
      FlipSound.enabled = false;
    }
    renderSound();

    el.reader.hidden = false;
    el.reader.classList.add('is-entering');
    document.body.classList.add('is-reading');
    buildBook(start.i);

    const coverImg = state.pages[state.index] && state.pages[state.index].querySelector('img');
    await waitImg(coverImg, 1800);

    const flyCover = start.i === 0 && !reduced();
    if (flyCover) {
      // Bìa ở màn hình mở đầu "bay" vào đúng vị trí trong sách.
      const from = el.introCover.getBoundingClientRect();
      const to = state.pages[0].getBoundingClientRect();
      const ghost = el.introCover.cloneNode(true);
      ghost.removeAttribute('id');
      Object.assign(ghost.style, { position: 'fixed', left: from.left + 'px', top: from.top + 'px', width: from.width + 'px', height: from.height + 'px',
        margin: 0, zIndex: 50, animation: 'none', transformOrigin: '0 0', transition: 'transform .95s cubic-bezier(.65,0,.25,1), box-shadow .95s, border-radius .95s', pointerEvents: 'none' });
      document.body.appendChild(ghost);
      el.introCover.style.visibility = 'hidden';
      el.intro.classList.add('is-leaving');
      requestAnimationFrame(() => requestAnimationFrame(() => {
        ghost.style.transform = `translate(${to.left - from.left}px, ${to.top - from.top}px) scale(${to.width / from.width}, ${to.height / from.height})`;
        ghost.style.borderRadius = '2px';
      }));
      await new Promise((r) => setTimeout(r, 980));
      el.reader.classList.remove('is-entering');
      await new Promise((r) => setTimeout(r, 60));
      ghost.style.transition = 'opacity .35s ease'; ghost.style.opacity = '0';
      setTimeout(() => ghost.remove(), 400);
    } else {
      el.intro.classList.add('is-leaving');
      await new Promise((r) => setTimeout(r, reduced() ? 0 : 450));
      el.reader.classList.remove('is-entering');
    }
    setTimeout(() => { el.intro.hidden = true; Petals.populate(); }, reduced() ? 0 : 700);
    el.stage.focus({ preventScroll: true });

    if (start.from === 'saved') {
      toast(`Đã mở lại trang ${PAGES[start.i].n}.`, { label: 'Về trang bìa', run: () => goTo(0) }, 8000);
    } else if (coarse && !store.get('hintShown', false)) {
      store.set('hintShown', true);
      toast('Mẹo: vuốt ngang để lật trang · chạm đúp để phóng to chữ · xoay ngang máy để xem trang lớn hơn.', null, 6500);
    }
  }

  el.btnOpenMusic.addEventListener('click', () => openBook(true));
  el.btnOpenSilent.addEventListener('click', () => openBook(false));

  // Kiểm tra nhạc nền có thật hay không trước khi hứa hẹn với người đọc.
  el.btnOpenMusic.disabled = el.btnOpenSilent.disabled = true;
  Music.probe().then((ok) => {
    Music.available = ok;
    el.btnOpenMusic.disabled = el.btnOpenSilent.disabled = false;
    if (!ok) {
      el.btnOpenMusicLabel.textContent = 'Mở sách';
      el.btnOpenMusic.querySelector('use').setAttribute('href', '#i-book');
      el.btnOpenSilent.hidden = true;
    }
    FlipSound.enabled = false;
    renderSound();
  });

  // Tải sẵn vài trang đầu trong lúc người đọc ngắm bìa.
  const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 600));
  idle(() => {
    const variant = chooseVariant(Math.min(window.innerWidth, window.innerHeight * RATIO));
    for (let k = Math.max(0, start.i - 1); k <= Math.min(TOTAL - 1, start.i + 3); k++) { const im = new Image(); im.decoding = 'async'; im.src = PAGES[k][variant]; }
  });

  // Phục vụ kiểm thử tự động.
  window.__book = { state, go, goTo, visiblePages, Music, FlipSound, openZoom, enterScroll, exitScroll, openVideos, Petals };
  Petals.sync();
})();
