(() => {
  const canvas = document.getElementById("game");
  const levelNum = document.getElementById("level-num");
  const overlay = document.getElementById("overlay");
  const overlayTitle = document.getElementById("overlay-title");
  const overlayMsg = document.getElementById("overlay-msg");
  const overlayLives = document.getElementById("overlay-lives");
  const btnRetry = document.getElementById("btn-retry");
  const btnNext = document.getElementById("btn-next");
  const btnExtend = document.getElementById("btn-extend");
  const btnRestartAd = document.getElementById("btn-restart-ad");
  const btnRestart = document.getElementById("btn-restart");
  const btnPause = document.getElementById("btn-pause");
  const btnMute = document.getElementById("btn-mute");
  const btnHome = document.getElementById("btn-home");
  const btnFs = document.getElementById("btn-fs");
  const btnHint = document.getElementById("btn-hint");
  const topbar = document.querySelector(".topbar");
  const controls = document.querySelector(".controls");
  const livesDisplay = document.getElementById("lives-display");

  let current = 0;
  let game = new Game(canvas, handleEvent);

  // ---------- Lives state ----------
  // Persist di localStorage supaya tidak reset oleh reload. Cheat masih mungkin
  // via DevTools (clear localStorage) - sama trade-off dgn admin hash.
  const MAX_LIVES = 3;
  const LIVES_KEY = "egg_lives";
  let lives = parseInt(localStorage.getItem(LIVES_KEY) ?? MAX_LIVES, 10);
  if (isNaN(lives) || lives < 0 || lives > MAX_LIVES) lives = MAX_LIVES;

  // ---------- Progress state (level unlock) ----------
  // wonMax = index level tertinggi yg pernah dimenangkan. -1 = belum pernah.
  // Level select buttons clickable kalau index <= wonMax.
  // PLAY button start di level wonMax+1 (next yg belum dimenangkan).
  const WON_KEY = "egg_won_max";
  let wonMax = parseInt(localStorage.getItem(WON_KEY) ?? -1, 10);
  if (isNaN(wonMax) || wonMax < -1) wonMax = -1;
  game.wonMax = wonMax;
  function saveWonMax() {
    localStorage.setItem(WON_KEY, String(wonMax));
    game.wonMax = wonMax;  // sync ke engine
  }

  function saveLives() { localStorage.setItem(LIVES_KEY, String(lives)); }
  function renderHearts() {
    for (let i = 1; i <= MAX_LIVES; i++) {
      const el = document.getElementById("heart-" + i);
      if (!el) continue;
      el.className = "heart" + (i <= lives ? "" : " lost");
    }
    // Render mini hearts di overlay juga (kalau overlay sedang terbuka)
    if (overlayLives) {
      overlayLives.innerHTML = "";
      for (let i = 1; i <= MAX_LIVES; i++) {
        const s = document.createElement("span");
        s.className = "heart" + (i <= lives ? "" : " lost");
        s.innerHTML = "&#9829;";
        overlayLives.appendChild(s);
      }
    }
  }
  renderHearts();

  function startLevel(i) {
    // Guard: kalau lives habis, langsung munculkan lives-out overlay bukan load level
    if (lives <= 0) {
      showLivesOutOverlay("NYAWA HABIS", "Pilih: tambah nyawa atau ulang level.");
      return;
    }
    current = Math.max(0, Math.min(LEVELS.length - 1, i));
    levelNum.textContent = current + 1;
    game.loadLevel(LEVELS[current]);
    hideOverlay();
  }

  function goHome() {
    game.goHome();
    hideOverlay();
  }

  function handleEvent(ev) {
    if (ev.type === "mode") {
      applyModeUI(ev.mode);
      return;
    }
    if (ev.type === "won") {
      // +1 nyawa per level yang dimenangkan (max MAX_LIVES). Reward progress.
      if (lives < MAX_LIVES) {
        lives++;
        saveLives();
      }
      renderHearts();
      // Update progress: level "current" baru saja dimenangkan
      if (current > wonMax) {
        wonMax = current;
        saveWonMax();
      }
      showOverlay("LOLOS!", "Telur berhasil kabur lewat pintu.", true);
    } else if (ev.type === "broken" || ev.type === "lost") {
      lives = Math.max(0, lives - 1);
      saveLives();
      renderHearts();
      const title = ev.type === "broken" ? "PECAH!" : "HILANG!";
      const reason = ev.type === "broken" ? `Telur pecah (${ev.reason}).` : `Telur ${ev.reason}.`;
      if (lives === 0) {
        showLivesOutOverlay(title + " NYAWA HABIS", reason);
      } else {
        showOverlay(title, reason + " Sisa nyawa: " + lives + ".", false);
      }
    }
  }

  function applyModeUI(mode) {
    const home = (mode === "home");
    btnHome.style.display    = home ? "none" : "";
    btnRestart.style.display = home ? "none" : "";
    btnPause.style.display   = home ? "none" : "";
    if (btnHint) btnHint.style.display = home ? "none" : "";
    document.querySelector(".level-label").style.display = home ? "none" : "";
    if (livesDisplay) livesDisplay.style.display = home ? "none" : "";
    controls.style.display = home ? "none" : "flex";
  }

  // Normal overlay: retry + next + home (tidak ada tombol iklan)
  function showOverlay(title, msg, canAdvance) {
    overlayTitle.textContent = title;
    overlayMsg.textContent = msg;
    btnRetry.style.display = "";
    btnNext.style.display = canAdvance && current < LEVELS.length - 1 ? "" : "none";
    btnExtend.hidden = true;
    btnRestartAd.hidden = true;
    renderHearts();
    overlay.hidden = false;
  }

  // Lives-out overlay: tombol Retry+Next di-hide, tombol iklan muncul.
  // Label dinamis: kalau ads disabled di admin, hilangkan "(IKLAN)" supaya
  // pemain tidak bingung "kok klik iklan tapi tidak ada iklan tampil".
  function showLivesOutOverlay(title, msg) {
    overlayTitle.textContent = title;
    overlayMsg.textContent = msg;
    btnRetry.style.display = "none";
    btnNext.style.display = "none";
    btnExtend.hidden = false;
    btnRestartAd.hidden = false;
    const adsEnabled = !!(window.EggAds && window.EggAds.loadConfig().enabled);
    btnExtend.textContent = adsEnabled ? "+1 NYAWA (IKLAN)" : "+1 NYAWA";
    btnRestartAd.textContent = adsEnabled ? "ULANG LEVEL (IKLAN)" : "ULANG LEVEL";
    renderHearts();
    overlay.hidden = false;
  }

  function hideOverlay() {
    overlay.hidden = true;
    btnExtend.hidden = true;
    btnRestartAd.hidden = true;
  }

  // ---------- Keyboard ----------
  // Helper: cek apakah admin modal sedang terbuka (skip input game agar tidak
  // konflik dengan typing password/form field admin).
  function adminModalOpen() {
    const a = document.getElementById("admin-login");
    const b = document.getElementById("admin-settings");
    return (a && !a.hidden) || (b && !b.hidden);
  }

  window.addEventListener("keydown", (e) => {
    if (e.repeat) return;
    if (adminModalOpen()) return; // jangan ganggu typing di admin form
    if (game.mode === "home") {
      if (e.key === "ArrowLeft") {
        game.homeSelected = Math.max(0, game.homeSelected - 1);
      } else if (e.key === "ArrowRight") {
        game.homeSelected = Math.min(game.homeBtns.length - 1, game.homeSelected + 1);
      } else if (e.key === " " || e.key === "Enter") {
        const btn = game.homeBtns[game.homeSelected] || game.homeBtns[0];
        if (btn && !btn.locked && btn.handler) btn.handler();
      } else if (e.key >= "1" && e.key <= "9") {
        // Numeric shortcut: hanya di select view dan level yang sudah pernah
        // dimainkan (playedMax = wonMax+1).
        const idx = parseInt(e.key) - 1;
        const playedMax = Math.min(LEVELS.length - 1, wonMax + 1);
        if (game.homeView === "select" && idx <= playedMax) startLevel(idx);
      }
      return;
    }
    // Playing mode
    if (e.key === "ArrowLeft"  || e.key === "a" || e.key === "A") game.input.left = true;
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") game.input.right = true;
    if (e.key === "ArrowUp"    || e.key === "w" || e.key === "W" || e.key === " ") {
      game.input.jump = true; game.input.jumpPressed = true;
    }
    if (e.key === "r" || e.key === "R") startLevel(current);
    if (e.key === "p" || e.key === "P") togglePause();
    if (e.key === "Escape" || e.key === "h" || e.key === "H") goHome();
  });
  window.addEventListener("keyup", (e) => {
    if (e.key === "ArrowLeft"  || e.key === "a" || e.key === "A") game.input.left = false;
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") game.input.right = false;
    if (e.key === "ArrowUp"    || e.key === "w" || e.key === "W" || e.key === " ") game.input.jump = false;
  });

  // ---------- Touch buttons (in-game) ----------
  function bindHold(el, onDown, onUp) {
    const down = (e) => { e.preventDefault(); onDown(); };
    const up   = (e) => { e.preventDefault(); onUp();   };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("pointerleave", up);
  }
  bindHold(document.getElementById("btn-left"),
    () => { game.input.left = true; },
    () => { game.input.left = false; });
  bindHold(document.getElementById("btn-right"),
    () => { game.input.right = true; },
    () => { game.input.right = false; });
  bindHold(document.getElementById("btn-jump"),
    () => { game.input.jump = true; game.input.jumpPressed = true; },
    () => { game.input.jump = false; });

  btnRestart.addEventListener("click", () => startLevel(current));
  btnRetry.addEventListener("click",   () => startLevel(current));
  btnNext.addEventListener("click",    () => startLevel(current + 1));

  // ---------- Tombol iklan (lives-out mode) ----------
  // Helper: pause game saat ad tampil supaya simulasi/animasi background
  // (trees, bridges, particles) tidak jalan tanpa pemain awasi.
  async function withGamePaused(fn) {
    const wasPaused = game.paused;
    game.paused = true;
    try { return await fn(); }
    finally { game.paused = wasPaused; }
  }

  // Rewarded ad: +1 nyawa lalu main lagi level sama.
  // Kalau ads disabled di admin, EggAds.showRewardedAd() auto-resolve sukses
  // (bypass) - gameplay tetap jalan tanpa iklan.
  btnExtend.addEventListener("click", async () => {
    btnExtend.disabled = true;
    btnRestartAd.disabled = true;
    try {
      const result = await withGamePaused(() => window.EggAds.showRewardedAd());
      if (result.completed) {
        lives = Math.min(MAX_LIVES, lives + 1);
        saveLives();
        renderHearts();
        startLevel(current);
      } else {
        overlayMsg.textContent = "Iklan tidak selesai. Nyawa tidak ditambah.";
      }
    } finally {
      btnExtend.disabled = false;
      btnRestartAd.disabled = false;
    }
  });

  // Interstitial ad: ulang level dari awal, nyawa reset ke MAX_LIVES.
  btnRestartAd.addEventListener("click", async () => {
    btnExtend.disabled = true;
    btnRestartAd.disabled = true;
    try {
      await withGamePaused(() => window.EggAds.showInterstitialAd());
      // Reset nyawa & restart level regardless of ad result (user sudah opt-in)
      lives = MAX_LIVES;
      saveLives();
      renderHearts();
      startLevel(current);
    } finally {
      btnExtend.disabled = false;
      btnRestartAd.disabled = false;
    }
  });
  btnPause.addEventListener("click", togglePause);
  btnHome.addEventListener("click", goHome);
  const btnOverlayHome = document.getElementById("btn-ovhome");
  if (btnOverlayHome) btnOverlayHome.addEventListener("click", goHome);
  btnMute.addEventListener("click", () => {
    game.sound.muted = !game.sound.muted;
    btnMute.textContent = game.sound.muted ? "\u{1F507}" : "\u{1F50A}";
  });
  // Hint button: tonton rewarded ad → tampilkan hint 6 detik.
  // Kalau ads disabled, langsung tampil (no ad).
  if (btnHint) {
    btnHint.addEventListener("click", async () => {
      if (game.mode === "home") return;
      btnHint.disabled = true;
      try {
        const r = await withGamePaused(() => window.EggAds.showRewardedAd());
        if (r.completed) game.showHint(6000);
      } finally { btnHint.disabled = false; }
    });
  }

  btnFs.addEventListener("click", async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
        // Mobile: lock to landscape kalau dukung
        if (screen.orientation && screen.orientation.lock) {
          screen.orientation.lock("landscape").catch(()=>{});
        }
      }
    } catch (e) {/* ignore */}
    setTimeout(fitCanvas, 200);
  });

  // Canvas pointer events: home buttons + box drag (in-game)
  function canvasPoint(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top)  * (canvas.height / rect.height)
    };
  }

  let dragBox = null;
  let dragOffset = { x: 0, y: 0 };

  canvas.addEventListener("pointerdown", (e) => {
    const p = canvasPoint(e);
    if (game.mode === "home") {
      const btn = game.hitHomeButton(p.x, p.y);
      if (btn) btn.handler();
      return;
    }
    // Cek balon dulu (level 11) - pop pakai single click
    const balloonHit = game.hitBalloon(p.x, p.y);
    if (balloonHit) {
      game.popBalloon(balloonHit.balloon);
      e.preventDefault();
      return;
    }
    // Playing: cek apakah klik kena box atau door teleport (drag mode)
    const target = game.hitBox(p.x, p.y);
    if (target) {
      dragBox = target;
      // Box pakai flag `dragging`, door teleport pakai `beingDragged`
      target.dragging = true;
      target.beingDragged = true;
      dragOffset.x = p.x - target.x;
      dragOffset.y = p.y - target.y;
      canvas.setPointerCapture(e.pointerId);
      e.preventDefault();
    }
  });

  canvas.addEventListener("pointermove", (e) => {
    if (!dragBox) return;
    const p = canvasPoint(e);
    game.dragBoxTo(dragBox, p.x - dragOffset.x, p.y - dragOffset.y);
  });

  function endDrag() {
    if (dragBox) {
      dragBox.dragging = false;
      dragBox.beingDragged = false;
      dragBox = null;
    }
  }
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);

  // Unlock audio on first user gesture (browser autoplay policy)
  const unlockAudio = () => { game.sound.unlock(); };
  window.addEventListener("pointerdown", unlockAudio, { once: true });
  window.addEventListener("keydown", unlockAudio, { once: true });

  // ---------- Auto fullscreen di mobile ----------
  // Browser modern HARUS user gesture sebelum requestFullscreen. Jadi kita pasang
  // listener pertama yang fire on first tap. Cuma untuk mobile (touch device);
  // desktop bisa pakai tombol manual saja. Skip kalau user dismiss dengan ESC.
  const isMobile = ('ontouchstart' in window) ||
                   /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  let autoFsAttempted = false;
  const autoFullscreen = async () => {
    if (autoFsAttempted) return;
    autoFsAttempted = true;
    if (document.fullscreenElement) return; // sudah fullscreen
    try {
      await document.documentElement.requestFullscreen();
      if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock("landscape").catch(() => {});
      }
      setTimeout(fitCanvas, 200);
    } catch (e) { /* user dismiss / browser tidak izinkan, pakai windowed */ }
  };
  if (isMobile) {
    window.addEventListener("pointerdown", autoFullscreen, { once: true });
  }

  function togglePause() {
    game.paused = !game.paused;
    btnPause.textContent = game.paused ? "\u25B6" : "\u2759\u2759";
  }

  // Canvas internal resolution tetap 1200x560 (physics konsisten).
  // Tampilan menyesuaikan viewport via fitCanvas() - JS yang atur width/height CSS
  // supaya canvas seekstrem mungkin tapi tetap aspect 1200:560.
  canvas.width = 1200;
  canvas.height = 560;

  function fitCanvas() {
    const aspect = 1200 / 560;
    // Saat fullscreen, controls overlay ON TOP canvas (transparent), jadi padding
    // bisa lebih kecil → canvas lebih besar. Saat windowed, sisakan ruang utk topbar.
    const fs = !!document.fullscreenElement;
    // Controls sekarang naik ke atas (overlay transparan di atas canvas),
    // jadi padding bawah lebih kecil, canvas lebih besar.
    const padTop = fs ? 4 : 44;
    const padBottom = fs ? 6 : 12;
    const padSide = fs ? 0 : 4;
    const availW = window.innerWidth - padSide * 2;
    const availH = window.innerHeight - padTop - padBottom;
    let w = availW, h = availW / aspect;
    if (h > availH) { h = availH; w = h * aspect; }
    canvas.style.width = Math.floor(w) + "px";
    canvas.style.height = Math.floor(h) + "px";
  }
  fitCanvas();
  window.addEventListener("resize", fitCanvas);
  window.addEventListener("orientationchange", () => setTimeout(fitCanvas, 100));
  document.addEventListener("fullscreenchange", () => setTimeout(fitCanvas, 100));

  // ---------- PWA: install prompt + service worker ----------
  let deferredInstall = null;

  // Browser kasih event ini saat app eligible di-install (Chrome Android, Edge desktop)
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredInstall = e;
  });

  window.addEventListener("appinstalled", () => {
    deferredInstall = null;
    showInstallStatus("Terinstall! Cek home screen.");
  });

  // Handler tombol GET APK di home screen
  game.onInstallApp = async () => {
    if (deferredInstall) {
      // Native install prompt (Chrome Android / Edge)
      deferredInstall.prompt();
      const choice = await deferredInstall.userChoice;
      if (choice.outcome === "accepted") {
        showInstallStatus("Sedang install...");
      }
      deferredInstall = null;
    } else {
      // Browser belum siap install (iOS Safari, atau sudah terinstall)
      showInstallInstructions();
    }
  };

  function showInstallStatus(msg) {
    overlayTitle.textContent = "INSTALL";
    overlayMsg.textContent = msg;
    btnNext.style.display = "none";
    overlay.hidden = false;
  }

  function showInstallInstructions() {
    overlayTitle.textContent = "INSTALL APP";
    overlayMsg.innerText =
      "ANDROID Chrome:\nMenu (\u22EE) > 'Install app' atau 'Add to Home screen'.\n\n" +
      "iPHONE Safari:\nShare (\u2191) > 'Add to Home Screen'.\n\n" +
      "Untuk APK file murni, build dari https://www.pwabuilder.com/";
    btnNext.style.display = "none";
    overlay.hidden = false;
  }

  // Service worker registration (untuk offline + PWA install eligibility)
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch((err) => {
        console.warn("SW register failed:", err);
      });
    });
  }

  // Start di home mode, kemudian player klik PLAY atau pilih level.
  applyModeUI("home");
  game.start();
})();
