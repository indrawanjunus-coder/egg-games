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

  // ---------- Event name constants (mirror plugin's enum string values) ----------
  // Source: https://github.com/capacitor-community/admob/blob/master/src/rewarded/rewarded-ad.enum.ts
  const EV_REWARDED = "onRewarded";
  const EV_REWARDED_DISMISSED = "onRewardedVideoAdDismissed";
  const EV_REWARDED_FAILED = "onRewardedVideoAdFailedToLoad";
  const EV_REWARDED_LOADED = "onRewardedVideoAdLoaded";
  const EV_INTERSTITIAL_DISMISSED = "onInterstitialAdDismissed";
  const EV_INTERSTITIAL_FAILED = "onInterstitialAdFailedToLoad";

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
      let listeners = [];
      const cleanup = () => listeners.forEach(h => h.remove && h.remove());

      // Earned the reward (watched to completion)
      listeners.push(AdMob.addListener(EV_REWARDED, (rewardItem) => {
        console.log("[AdMob Bridge] REWARDED event fired", rewardItem);
        earnedReward = true;
      }));

      // User closed the ad (with or without earning)
      listeners.push(AdMob.addListener(EV_REWARDED_DISMISSED, () => {
        console.log("[AdMob Bridge] Rewarded DISMISSED (earnedReward=" + earnedReward + ")");
        cleanup();
        resolve(resolveReward({ earnedReward, failed: false, error: null }));
      }));

      // Load failed before show
      listeners.push(AdMob.addListener(EV_REWARDED_FAILED, (error) => {
        console.error("[AdMob Bridge] Rewarded FAILED to load", error);
        cleanup();
        resolve(resolveReward({ earnedReward: false, failed: true, error }));
      }));

      // Prepare → Show chain
      AdMob.prepareRewardVideoAd({ adId: adUnitId, isTesting: false })
        .then(() => {
          console.log("[AdMob Bridge] prepareRewardVideoAd resolved — calling showRewardVideoAd");
          return AdMob.showRewardVideoAd();
        })
        .catch((err) => {
          console.error("[AdMob Bridge] prepare/show threw", err);
          cleanup();
          resolve(resolveReward({ earnedReward: false, failed: true, error: err }));
        });
    });
  }

  // ============================================================================
  // TODO-FOR-USER: Implement resolveReward()
  // ============================================================================
  // Keputusan bisnis: kapan pemain dianggap "layak dapat reward" (+1 nyawa)?
  //
  // Input object:
  //   { earnedReward: boolean,  // true jika event 'onRewarded' pernah fire
  //     failed: boolean,        // true jika ad gagal load / error
  //     error: any }            // error object kalau failed=true
  //
  // Output yang harus di-return (sesuai contract ads.js):
  //   { completed: boolean, reason: string }
  //   - completed:true  → pemain dapat reward (+1 nyawa)
  //   - completed:false → pemain TIDAK dapat reward
  //   - reason: string label pendek untuk logging
  //
  // Trade-off yang perlu dipertimbangkan:
  //
  //   A. STRICT: hanya completed=true kalau earnedReward=true.
  //      → Pemain wajib tonton ad sampai habis. Revenue max. UX harsh kalau
  //        ad gagal load (pemain kecewa "kok ga dapat nyawa padahal ga salah").
  //
  //   B. LENIENT: completed=true kalau earnedReward ATAU failed
  //      (gagal load = bukan salah pemain, kasih reward anyway).
  //      → UX friendly. Tapi bisa di-abuse: pemain airplane mode → ad gagal →
  //        tetap dapat nyawa tanpa nonton.
  //
  //   C. HYBRID: completed=true kalau earnedReward. failed → completed=false
  //      tapi trigger fallback ke simulator (user watch countdown simulator
  //      sebagai "kompensasi"). Tapi ads.js tidak tahu tentang bridge, jadi
  //      ini butuh koordinasi.
  //
  // Saran saya: mulai dengan A (strict) untuk testing, mirip behavior asli
  // AdMob. Nanti pindah ke B kalau ada keluhan pemain.
  //
  // CONTOH implementasi (ganti dengan pilihanmu):
  //
  //   function resolveReward({ earnedReward, failed, error }) {
  //     // ... tulis logic kamu di sini
  //   }
  //
  // Hapus throw di bawah ini setelah kamu isi fungsinya.
  function resolveReward({ earnedReward, failed, error }) {
    throw new Error("resolveReward() belum diimplementasikan — lihat TODO-FOR-USER di js/admob-bridge.js");
  }
  // ============================================================================

  // ---------- Interstitial ad flow (lebih sederhana, tidak ada reward semantics) ----------
  async function showInterstitial({ adUnitId }) {
    await ensureInit();
    console.log("[AdMob Bridge] Preparing interstitial:", adUnitId);

    return new Promise((resolve, reject) => {
      let listeners = [];
      const cleanup = () => listeners.forEach(h => h.remove && h.remove());

      listeners.push(AdMob.addListener(EV_INTERSTITIAL_DISMISSED, () => {
        console.log("[AdMob Bridge] Interstitial dismissed");
        cleanup();
        resolve();
      }));
      listeners.push(AdMob.addListener(EV_INTERSTITIAL_FAILED, (err) => {
        console.error("[AdMob Bridge] Interstitial failed to load", err);
        cleanup();
        reject(err);
      }));

      AdMob.prepareInterstitial({ adId: adUnitId, isTesting: false })
        .then(() => AdMob.showInterstitial())
        .catch((err) => {
          cleanup();
          reject(err);
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
