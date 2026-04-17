// ============================================================================
// Ads module: abstraksi AdMob untuk game HTML5/PWA.
//
// PWA MURNI tidak bisa langsung panggil AdMob native SDK (butuh Android/iOS).
// Strategi dual:
//   1. Kalau window.admob tersedia (mis. wrapped dgn Capacitor plugin atau
//      AdMob H5 SDK ter-inject) -> pakai native call.
//   2. Else -> simulator overlay (countdown + skip button). Untuk dev/test.
//
// Deploy ke native (Capacitor/APK build): inject window.admob dengan methods:
//   window.admob.rewarded.show({ adUnitId }) -> Promise<{reward: true/false}>
//   window.admob.interstitial.show({ adUnitId }) -> Promise<void>
// Lihat https://developers.google.com/admob untuk setup real.
// ============================================================================
(() => {
  const ADMOB_CFG_KEY = "egg_admob_cfg";

  // ---------- Log buffer ----------
  // Circular buffer untuk debugging AdMob integration. Admin bisa lihat di
  // settings panel. Juga di-mirror ke console.
  const LOG_MAX = 120;
  const logBuf = [];
  function log(level, msg, data) {
    const ts = new Date().toISOString().slice(11, 23);  // HH:MM:SS.mmm
    const entry = { ts, level, msg, data };
    logBuf.push(entry);
    if (logBuf.length > LOG_MAX) logBuf.shift();
    const pre = `[EggAds ${ts}]`;
    if (level === "error") console.error(pre, msg, data || "");
    else if (level === "warn") console.warn(pre, msg, data || "");
    else console.log(pre, msg, data || "");
  }
  function getLog() { return logBuf.slice(); }
  function clearLog() { logBuf.length = 0; log("info", "Log cleared"); }

  // Google's official test ad unit IDs - selalu tampilkan test ads di device
  // manapun. SOURCE: https://developers.google.com/admob/android/test-ads
  // Pakai ini saat development/QA supaya tidak invalid-click real ads.
  const TEST_AD_UNITS = {
    banner:       "ca-app-pub-3940256099942544/6300978111",
    interstitial: "ca-app-pub-3940256099942544/1033173712",
    rewarded:     "ca-app-pub-3940256099942544/5224354917",
    appOpen:      "ca-app-pub-3940256099942544/3419835294"
  };

  function getDefault() {
    return {
      enabled: false,
      // Mode: "test" = pakai Google test ad units (aman untuk QA).
      //       "production" = pakai custom ad unit IDs user.
      adMode: "test",
      appId: "",              // ca-app-pub-XXXXXXXXXXXXX~YYYYYYYY
      interstitialId: "",     // ca-app-pub-XXXXXXXXXXXXX/YYYYYYYY (production)
      rewardedId: "",
      bannerId: "",
      // Test device IDs - comma-separated MD5 hashes. Diterapkan native wrapper
      // (Android Capacitor plugin) ke RequestConfiguration.setTestDeviceIds().
      // Dapatkan hash dari logcat saat jalan app di device. Optional — kalau
      // pakai adMode=test dengan test unit IDs, device IDs tidak wajib.
      testDeviceIds: ""
    };
  }

  function loadConfig() {
    try {
      const raw = localStorage.getItem(ADMOB_CFG_KEY);
      if (!raw) return getDefault();
      return { ...getDefault(), ...JSON.parse(raw) };
    } catch (e) {
      return getDefault();
    }
  }

  function saveConfig(cfg) {
    // Merge dengan default supaya partial save tidak hilangkan field lain
    const merged = { ...loadConfig(), ...cfg };
    localStorage.setItem(ADMOB_CFG_KEY, JSON.stringify(merged));
    log("info", `Config saved: enabled=${merged.enabled} mode=${merged.adMode}`, {
      appId: merged.appId ? "(set)" : "(empty)",
      interstitialId: merged.interstitialId ? "(set)" : "(empty)",
      rewardedId: merged.rewardedId ? "(set)" : "(empty)",
      bannerId: merged.bannerId ? "(set)" : "(empty)",
      testDeviceIds: merged.testDeviceIds ? merged.testDeviceIds.split(/\s*,\s*/).length + " devices" : "(none)"
    });
    return merged;
  }

  // Pick ad unit ID berdasar mode. Test mode = Google test ID (aman QA).
  // Production mode = ID custom user.
  function pickUnitId(cfg, kind) {
    if (cfg.adMode === "test") return TEST_AD_UNITS[kind];
    return cfg[kind + "Id"] || "";
  }

  // Kalau config.enabled=false -> auto-resolve completed tanpa ad (bypass).
  async function showRewardedAd() {
    const cfg = loadConfig();
    log("info", `▶ Rewarded ad requested (enabled=${cfg.enabled}, mode=${cfg.adMode})`);
    if (!cfg.enabled) {
      log("info", "Ads DISABLED in config → bypass (auto-grant reward)");
      return { completed: true, reason: "disabled" };
    }

    const unitId = pickUnitId(cfg, "rewarded");
    log("info", `Using rewarded unit ID: ${unitId || "(empty!)"}`);

    const nativeAvailable = !!(window.admob && window.admob.rewarded);
    log("info", `Native AdMob SDK ${nativeAvailable ? "AVAILABLE" : "NOT FOUND"} (window.admob.rewarded)`);

    if (nativeAvailable && unitId) {
      log("info", "Calling native rewarded.show()...");
      try {
        const result = await window.admob.rewarded.show({ adUnitId: unitId });
        const completed = !!(result && result.reward);
        log(completed ? "info" : "warn", `Native returned: reward=${completed}`, result);
        return { completed, reason: "native" };
      } catch (e) {
        log("error", "Native rewarded.show() FAILED: " + e.message, e);
      }
    } else if (!unitId) {
      log("warn", "Skip native call: no unit ID available");
    }
    log("info", "→ Falling back to simulator (PWA tanpa native SDK)");
    const simResult = await showAdSimulator(cfg.adMode === "test" ? "TEST REWARDED" : "REWARDED", 5, cfg);
    log("info", `Simulator resolved: completed=${simResult.completed}`);
    return simResult;
  }

  async function showInterstitialAd() {
    const cfg = loadConfig();
    log("info", `▶ Interstitial ad requested (enabled=${cfg.enabled}, mode=${cfg.adMode})`);
    if (!cfg.enabled) {
      log("info", "Ads DISABLED in config → bypass (auto-complete)");
      return { completed: true, reason: "disabled" };
    }

    const unitId = pickUnitId(cfg, "interstitial");
    log("info", `Using interstitial unit ID: ${unitId || "(empty!)"}`);

    const nativeAvailable = !!(window.admob && window.admob.interstitial);
    log("info", `Native AdMob SDK ${nativeAvailable ? "AVAILABLE" : "NOT FOUND"} (window.admob.interstitial)`);

    if (nativeAvailable && unitId) {
      log("info", "Calling native interstitial.show()...");
      try {
        await window.admob.interstitial.show({ adUnitId: unitId });
        log("info", "Native interstitial completed");
        return { completed: true, reason: "native" };
      } catch (e) {
        log("error", "Native interstitial.show() FAILED: " + e.message, e);
      }
    } else if (!unitId) {
      log("warn", "Skip native call: no unit ID available");
    }
    log("info", "→ Falling back to simulator");
    const simResult = await showAdSimulator(cfg.adMode === "test" ? "TEST INTERSTITIAL" : "INTERSTITIAL", 4, cfg);
    log("info", `Simulator resolved: completed=${simResult.completed}`);
    return simResult;
  }

  // Simulator: modal overlay countdown. Skip button enabled setelah countdown.
  // Return Promise yang resolve saat user klik skip/close.
  function showAdSimulator(type, seconds, cfg) {
    return new Promise((resolve) => {
      const adEl = document.getElementById("ad-simulator");
      const titleEl = document.getElementById("ad-sim-title");
      const timerEl = document.getElementById("ad-sim-timer");
      const skipBtn = document.getElementById("ad-sim-skip");
      const bodyEl = document.getElementById("ad-sim-body");
      if (!adEl || !skipBtn) {
        // Fallback: tanpa DOM simulator, langsung resolve
        resolve({ completed: true, reason: "no-dom" });
        return;
      }

      titleEl.textContent = type + " AD";
      bodyEl.textContent = cfg.adMode === "test"
        ? "[Mode TEST - Google test ad simulator]"
        : "[Native SDK tidak tersedia - simulator fallback]";
      let remain = seconds;
      timerEl.textContent = remain + "s";
      skipBtn.disabled = true;
      skipBtn.textContent = "Skip dalam " + remain + "s";
      adEl.hidden = false;

      const interval = setInterval(() => {
        remain--;
        if (remain > 0) {
          timerEl.textContent = remain + "s";
          skipBtn.textContent = "Skip dalam " + remain + "s";
        } else {
          clearInterval(interval);
          timerEl.textContent = "Selesai";
          skipBtn.disabled = false;
          skipBtn.textContent = "TUTUP";
        }
      }, 1000);

      // Cleanup: satu-kali listener supaya skip tombol tidak stale
      const onSkip = () => {
        if (skipBtn.disabled) return;
        clearInterval(interval);
        adEl.hidden = true;
        skipBtn.removeEventListener("click", onSkip);
        resolve({ completed: true, reason: "simulator" });
      };
      skipBtn.addEventListener("click", onSkip);
    });
  }

  // Initial log entry — confirm module loaded
  log("info", "EggAds module loaded");

  window.EggAds = {
    loadConfig, saveConfig, getDefault,
    showRewardedAd, showInterstitialAd,
    TEST_AD_UNITS,
    getLog, clearLog
  };
})();
