// ============================================================================
// AdMob Bridge: adapter dari @capacitor-community/admob ke API yang dipakai
// js/ads.js (window.admob.rewarded.show, window.admob.interstitial.show).
//
// Cara kerja:
//   - Script ini di-load di semua context (PWA browser + Capacitor native).
//   - Di PWA browser: window.Capacitor tidak ada → script exit early, ads.js
//     fallback ke simulator.
//   - Di APK native: window.Capacitor.Plugins.AdMob ter-inject oleh plugin
//     Capacitor. Bridge register event listeners + expose Promise-based API
//     yang compatible dengan interface yang sudah dipakai ads.js.
//
// Dependency: @capacitor-community/admob v6+ (lihat package.json).
// ============================================================================
(() => {
  // ---------- Native context guard ----------
  const cap = window.Capacitor;
  if (!cap || !cap.Plugins || !cap.Plugins.AdMob) {
    console.log("[AdMob Bridge] Not in Capacitor native context — skip install (PWA mode, ads.js akan pakai simulator).");
    return;
  }
  const { AdMob } = cap.Plugins;
  console.log("[AdMob Bridge] Capacitor AdMob plugin detected — installing window.admob bridge.");

  // ---------- Initialize (dipanggil sekali, lazy pada panggilan ad pertama) ----------
  let initPromise = null;
  function ensureInit() {
    if (initPromise) return initPromise;
    // Baca config dari EggAds (localStorage). adMode=test → initializeForTesting=true.
    const cfg = (window.EggAds && window.EggAds.loadConfig) ? window.EggAds.loadConfig() : {};
    const testingDevices = (cfg.testDeviceIds || "")
      .split(",").map(s => s.trim()).filter(Boolean);
    const opts = {
      initializeForTesting: cfg.adMode === "test",
      testingDevices
    };
    console.log("[AdMob Bridge] Initializing AdMob SDK", opts);
    initPromise = AdMob.initialize(opts).then(() => {
      console.log("[AdMob Bridge] AdMob.initialize() resolved.");
    }).catch(err => {
      console.error("[AdMob Bridge] AdMob.initialize() FAILED", err);
      initPromise = null; // allow retry
      throw err;
    });
    return initPromise;
  }

  // ---------- Event name constants ----------
  // Plugin @capacitor-community/admob v5/v6 pakai string enum yang berbeda.
  // Kita listen ke BEBERAPA variant untuk robustness. Yang fire akan diterima.
  const EV_REWARDED_VARIANTS = ["onRewardedVideoAdReward", "onRewarded", "rewardedVideoAdReward"];
  const EV_REWARDED_DISMISSED_VARIANTS = ["onRewardedVideoAdDismissed", "rewardedVideoAdDismissed"];
  const EV_REWARDED_FAILED_VARIANTS = ["onRewardedVideoAdFailedToLoad", "rewardedVideoAdFailedToLoad"];
  const EV_INTERSTITIAL_DISMISSED_VARIANTS = ["onInterstitialAdDismissed", "interstitialAdDismissed"];
  const EV_INTERSTITIAL_FAILED_VARIANTS = ["onInterstitialAdFailedToLoad", "interstitialAdFailedToLoad"];

  // Timeout: kalau nothing fires dalam 90 detik setelah show(), anggap stuck
  // dan force-resolve. User ga mau app nge-freeze gara2 AdMob bug.
  const AD_TIMEOUT_MS = 90000;

  // Delay setelah Dismissed sebelum resolve Promise. Beri WebView waktu
  // recover dari pause saat activity ad kembali. 250ms cukup untuk
  // mayoritas device, tidak noticable ke user.
  const POST_AD_RESUME_DELAY_MS = 250;

  function addListeners(eventNames, handler) {
    return eventNames.map(ev => AdMob.addListener(ev, (...args) => {
      console.log(`[AdMob Bridge] Event fired: ${ev}`, args);
      handler(...args);
    }));
  }

  // Kick WebView + game loop setelah ad close. Mengatasi Android WebView yang
  // kadang stall setelah activity AdMob fullscreen kembali:
  //   1. Force reflow body — stimulate repaint pipeline
  //   2. Dispatch custom event — main.js listener restart requestAnimationFrame
  //      (game loop sering mati karena WebView timers paused saat ad fullscreen)
  function kickWebViewAfterAd() {
    console.log("[AdMob Bridge] kickWebViewAfterAd — force reflow + loop restart");
    try {
      document.body.style.display = "none";
      void document.body.offsetHeight;  // trigger reflow (void = ignore value, just read for side-effect)
      document.body.style.display = "";
    } catch (e) { /* noop */ }
    try {
      window.dispatchEvent(new CustomEvent("admob-ad-closed"));
    } catch (e) { /* noop */ }
  }

  // ---------- Rewarded ad flow ----------
  // Capacitor's rewarded ad is event-driven:
  //   prepareRewardVideoAd() → listen for Loaded | FailedToLoad
  //   showRewardVideoAd()   → listen for Rewarded (user earned) | Dismissed (closed)
  //
  // ads.js expects: Promise<{reward: true|false}>
  //
  // TODO-FOR-USER: implement resolveReward() below.
  // See big comment block above the function.
  async function showRewarded({ adUnitId }) {
    await ensureInit();
    console.log("[AdMob Bridge] Preparing rewarded ad:", adUnitId);

    return new Promise((resolve) => {
      let earnedReward = false;
      let settled = false;
      let listeners = [];
      let timeoutId = null;

      const cleanup = () => {
        listeners.forEach(arr => arr.forEach(h => {
          try { h.remove && h.remove(); } catch (e) { /* plugin v6 kadang return plain obj */ }
        }));
        if (timeoutId) clearTimeout(timeoutId);
      };

      // safeResolve: wrap resolveReward di try/catch supaya bug user di sana
      // tidak bikin Promise hang (yg bikin game freeze). Ini defensive layer
      // yang critical untuk UX - kalau resolveReward throw, kita tetap resolve
      // dengan completed=false supaya caller bisa lanjut.
      const safeResolve = (ctx) => {
        if (settled) return;
        settled = true;
        cleanup();
        let result;
        try {
          result = resolveReward(ctx);
          if (!result || typeof result.completed !== "boolean") {
            throw new Error("resolveReward must return { completed: boolean, reason: string }");
          }
        } catch (e) {
          console.error("[AdMob Bridge] resolveReward threw, fallback to earned-based default", e);
          result = { completed: !!ctx.earnedReward, reason: "fallback-after-throw" };
        }
        console.log("[AdMob Bridge] Rewarded Promise resolving with:", result);
        resolve(result);
      };

      // Earned reward (watched sampai selesai)
      listeners.push(addListeners(EV_REWARDED_VARIANTS, (rewardItem) => {
        console.log("[AdMob Bridge] REWARDED variant received", rewardItem);
        earnedReward = true;
      }));

      // User closed ad. Kick WebView SEBELUM resolve supaya game loop sudah
      // hidup lagi saat caller (withGamePaused) unpause game. Delay kecil
      // beri Android waktu switch activity.
      listeners.push(addListeners(EV_REWARDED_DISMISSED_VARIANTS, () => {
        console.log("[AdMob Bridge] Rewarded DISMISSED (earnedReward=" + earnedReward + ")");
        kickWebViewAfterAd();
        setTimeout(() => {
          safeResolve({ earnedReward, failed: false, error: null });
        }, POST_AD_RESUME_DELAY_MS);
      }));

      // Gagal load sebelum show
      listeners.push(addListeners(EV_REWARDED_FAILED_VARIANTS, (error) => {
        console.error("[AdMob Bridge] Rewarded FAILED to load", error);
        safeResolve({ earnedReward: false, failed: true, error });
      }));

      // Safety timeout
      timeoutId = setTimeout(() => {
        console.error("[AdMob Bridge] TIMEOUT " + AD_TIMEOUT_MS + "ms — no event received, force-resolving");
        safeResolve({ earnedReward, failed: true, error: new Error("timeout") });
      }, AD_TIMEOUT_MS);

      // Prepare → Show chain
      AdMob.prepareRewardVideoAd({ adId: adUnitId, isTesting: false })
        .then(() => {
          console.log("[AdMob Bridge] prepareRewardVideoAd resolved — calling showRewardVideoAd");
          return AdMob.showRewardVideoAd();
        })
        .catch((err) => {
          console.error("[AdMob Bridge] prepare/show threw", err);
          safeResolve({ earnedReward: false, failed: true, error: err });
        });
    });
  }

  // ============================================================================
  // resolveReward() — keputusan bisnis: kapan pemain dapat reward (+1 nyawa)?
  // ============================================================================
  // Default policy = STRICT: pemain hanya dapat nyawa kalau tonton ad sampai
  // habis (earnedReward=true). Kalau ad gagal load / user tutup prematur, no
  // reward. Ini mencegah abuse (airplane mode → ad gagal → tetap dapat nyawa).
  //
  // GANTI implementasi di bawah kalau mau policy berbeda:
  //
  //   LENIENT (UX-friendly, ada risk abuse):
  //     if (earnedReward || failed) return { completed: true, reason: ... };
  //     return { completed: false, reason: "dismissed-early" };
  //
  //   FAIL-OPEN-ON-ERROR (kasih reward kalau ERROR, tapi tidak kalau user tutup):
  //     if (earnedReward) return { completed: true, reason: "earned" };
  //     if (failed) return { completed: true, reason: "failed-granted-anyway" };
  //     return { completed: false, reason: "dismissed-early" };
  //
  function resolveReward({ earnedReward, failed, error }) {
    if (earnedReward) return { completed: true, reason: "native-earned" };
    if (failed) return { completed: false, reason: "native-failed" };
    return { completed: false, reason: "native-dismissed-early" };
  }
  // ============================================================================

  // ---------- Interstitial ad flow ----------
  async function showInterstitial({ adUnitId }) {
    await ensureInit();
    console.log("[AdMob Bridge] Preparing interstitial:", adUnitId);

    return new Promise((resolve, reject) => {
      let settled = false;
      let listeners = [];
      let timeoutId = null;
      const cleanup = () => {
        listeners.forEach(arr => arr.forEach(h => {
          try { h.remove && h.remove(); } catch (e) { /* noop */ }
        }));
        if (timeoutId) clearTimeout(timeoutId);
      };
      const safeResolve = () => { if (settled) return; settled = true; cleanup(); resolve(); };
      const safeReject = (e) => { if (settled) return; settled = true; cleanup(); reject(e); };

      listeners.push(addListeners(EV_INTERSTITIAL_DISMISSED_VARIANTS, () => {
        console.log("[AdMob Bridge] Interstitial dismissed");
        kickWebViewAfterAd();
        setTimeout(() => safeResolve(), POST_AD_RESUME_DELAY_MS);
      }));
      listeners.push(addListeners(EV_INTERSTITIAL_FAILED_VARIANTS, (err) => {
        console.error("[AdMob Bridge] Interstitial failed to load", err);
        safeReject(err);
      }));

      timeoutId = setTimeout(() => {
        console.error("[AdMob Bridge] Interstitial TIMEOUT — force-resolving");
        safeResolve();  // interstitial doesn't block flow, so resolve not reject
      }, AD_TIMEOUT_MS);

      AdMob.prepareInterstitial({ adId: adUnitId, isTesting: false })
        .then(() => AdMob.showInterstitial())
        .catch((err) => {
          console.error("[AdMob Bridge] prepare/show interstitial threw", err);
          safeReject(err);
        });
    });
  }

  // ---------- Install global API yang di-consume ads.js ----------
  window.admob = {
    rewarded:     { show: showRewarded },
    interstitial: { show: showInterstitial }
  };
  console.log("[AdMob Bridge] window.admob installed. ads.js akan pakai native path sekarang.");
})();
