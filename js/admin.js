// ============================================================================
// Admin module: login + password + backup + GitHub push.
//
// SECURITY DISCLAIMER:
// Otentikasi ini sederhana dan client-side. Password hash disimpan di
// localStorage browser - bisa dilihat/diubah via DevTools. Untuk keamanan
// asli butuh server backend. Ini cocok hanya untuk personal/dev use.
// ============================================================================
(() => {
  const STORE_PWD_KEY = "egg_admin_pwd_hash";
  const ADMIN_VERSION_KEY = "egg_admin_v";
  const CURRENT_ADMIN_VERSION = 2;  // bump saat ganti DEFAULT_PWD
  const ADMIN_USER = "admin";
  const DEFAULT_PWD = "Indrawan1484";

  // Auto-migrate: existing users dengan hash dari DEFAULT_PWD lama (admin123)
  // perlu di-reset supaya login pakai DEFAULT_PWD baru. Detect via version
  // flag — kalau belum ada atau < current, wipe stored hash.
  {
    const v = parseInt(localStorage.getItem(ADMIN_VERSION_KEY) || "0", 10);
    if (isNaN(v) || v < CURRENT_ADMIN_VERSION) {
      localStorage.removeItem(STORE_PWD_KEY);
      localStorage.setItem(ADMIN_VERSION_KEY, String(CURRENT_ADMIN_VERSION));
      console.log("[Admin] Password reset to new default via version migration");
    }
  }

  // ---------- Hashing ----------
  // CATATAN: kita TIDAK pakai Web Crypto SHA-256 karena `crypto.subtle` butuh
  // secure context (HTTPS atau localhost). Saat di-host via HTTP / file://,
  // crypto.subtle undefined → "Cannot read properties of undefined (digest)".
  // Pakai simple hash JS yang selalu jalan. Toh keamanan client-side memang
  // illusi (DevTools bisa lihat semua) - simple hash cukup utk obfuscate
  // password dari intip casual localStorage.
  function simpleHash(str) {
    // Kombinasi 2 rolling hash (djb2 + multiplicative) → 16 hex chars
    let h1 = 5381, h2 = 7919;
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      h1 = (((h1 << 5) + h1) ^ ch) >>> 0;
      h2 = ((h2 * 33) + ch) >>> 0;
    }
    return h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0");
  }

  async function getStoredHash() {
    const stored = localStorage.getItem(STORE_PWD_KEY);
    // Migrasi: format lama (SHA-256 hex 64 chars) tidak compatible dengan
    // simple hash baru (16 chars). Auto-reset → user bisa login pakai default
    // admin123 lagi, lalu ganti password kalau perlu.
    if (stored && stored.length === 64 && /^[0-9a-f]+$/.test(stored)) {
      console.warn("Admin: migrasi dari hash SHA-256 lama ke simple hash. Password reset ke default.");
      localStorage.removeItem(STORE_PWD_KEY);
      return simpleHash(DEFAULT_PWD);
    }
    return stored || simpleHash(DEFAULT_PWD);
  }

  // async wrappers dipertahankan supaya signature tidak berubah (UI handler pakai await)
  async function checkLogin(user, pwd) {
    if (user !== ADMIN_USER) return false;
    return simpleHash(pwd) === (await getStoredHash());
  }

  async function changePassword(oldPwd, newPwd) {
    if (!(await checkLogin(ADMIN_USER, oldPwd))) {
      throw new Error("Old password incorrect");
    }
    if (!newPwd || newPwd.length < 4) {
      throw new Error("New password must be at least 4 characters");
    }
    localStorage.setItem(STORE_PWD_KEY, simpleHash(newPwd));
  }

  // ---------- Backup ----------
  // collectBackupData() menentukan APA yang masuk ke backup. Saat ini
  // ambil semua localStorage. Anda bisa filter (exclude entries tertentu)
  // atau tambah game state tambahan (level progress, scores, dll) di sini.
  function collectBackupData() {
    const ls = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      ls[k] = localStorage.getItem(k);
    }
    return {
      app: "Mr. Egg Puzzle Master",
      version: 1,
      timestamp: new Date().toISOString(),
      localStorage: ls,
      // Tambah field lain di sini kalau perlu (mis. levelProgress dari game)
    };
  }

  function exportBackupFile() {
    const data = collectBackupData();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `egg-backup-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // ---------- GitHub Push ----------
  // PUT /repos/{owner}/{repo}/contents/{path} per file.
  // Token TIDAK disimpan - user input tiap session.

  // List source files yang di-push. Sesuai struktur project.
  const FILES_TO_PUSH = [
    "index.html",
    "style.css",
    "sw.js",
    "manifest.webmanifest",
    "icon.svg",
    "package.json",
    "capacitor.config.json",
    "js/levels.js",
    "js/shield-draw.js",
    "js/sound-input.js",
    "js/engine.js",
    "js/admob-bridge.js",
    "js/ads.js",
    "js/main.js",
    "js/admin.js"
  ];

  // Push satu file ke GitHub (PUT dgn SHA check kalau sudah ada)
  async function pushSingleFile({ token, owner, repo, path, content, message }) {
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    const headers = {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28"
    };
    // GET utk dapatkan SHA file existing (kalau ada) - butuh utk update
    let sha = null;
    try {
      const check = await fetch(apiUrl, { headers });
      if (check.ok) {
        const j = await check.json();
        sha = j.sha;
      }
    } catch (e) { /* file belum ada */ }

    // base64 encode dengan UTF-8 safety
    const encoded = btoa(unescape(encodeURIComponent(content)));
    const body = {
      message: message || `Push ${path} ${new Date().toISOString()}`,
      content: encoded,
      ...(sha ? { sha } : {})
    };

    const res = await fetch(apiUrl, {
      method: "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`${path} → ${res.status}: ${txt.slice(0, 120)}`);
    }
    return await res.json();
  }

  // Pre-flight: verifikasi token + repo SEKALI sebelum push 14 file.
  // Tanpa ini: kalau owner/repo salah → 14× error 404 yang sama (lambat & noisy).
  async function preflightCheck({ token, owner, repo }) {
    const headers = {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28"
    };
    // Step 1: cek token valid (401 = token rusak/expired)
    const userRes = await fetch("https://api.github.com/user", { headers });
    if (userRes.status === 401) {
      throw new Error("Token invalid/expired. Regenerate at GitHub → Settings → Developer settings → Personal access tokens.");
    }
    if (!userRes.ok && userRes.status !== 403) {
      throw new Error(`Token check failed (${userRes.status}). Check internet connection.`);
    }
    // Step 2: cek repo accessible
    const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
    if (repoRes.status === 404) {
      throw new Error(
        `Repo '${owner}/${repo}' not found. Check 3 things: ` +
        `(1) repo exists on GitHub (push API does NOT auto-create), ` +
        `(2) owner & repo spelling (case-sensitive), ` +
        `(3) for fine-grained token: ensure repo is included in 'Repository access'.`
      );
    }
    if (repoRes.status === 403) {
      throw new Error("Token lacks 'repo' scope. Classic token: check 'repo'. Fine-grained: set 'Contents: Read and write'.");
    }
    if (!repoRes.ok) {
      const txt = await repoRes.text();
      throw new Error(`Repo check failed (${repoRes.status}): ${txt.slice(0, 100)}`);
    }
  }

  // Push semua source files + DB backup ke GitHub.
  // basePath: prefix folder di repo (mis. "egg-game" → file di-push ke
  //   egg-game/index.html, egg-game/js/main.js, dst). Empty = root repo.
  async function pushAllToGitHub({ token, owner, repo, basePath, message }, onProgress) {
    if (!token || !owner || !repo) {
      throw new Error("Token, owner, repo are required");
    }
    await preflightCheck({ token, owner, repo });

    const prefix = basePath ? basePath.replace(/^\/+|\/+$/g, "") + "/" : "";
    const total = FILES_TO_PUSH.length + 1;  // +1 untuk DB
    let done = 0;
    const errors = [];

    // Query param `?_nocache=N` → SW fetch handler akan skip (lihat sw.js).
    // Ini satu-satunya cara reliable bypass SW cache dari halaman.
    const bust = "?_nocache=" + Date.now();

    for (const file of FILES_TO_PUSH) {
      try {
        const resp = await fetch(file + bust, { cache: "reload" });
        if (!resp.ok) throw new Error(`Local fetch failed: ${resp.status}`);
        const text = await resp.text();
        await pushSingleFile({
          token, owner, repo, message,
          path: prefix + file, content: text
        });
        done++;
        onProgress && onProgress({ file, done, total, ok: true });
      } catch (e) {
        errors.push({ file, err: e.message });
        done++;
        onProgress && onProgress({ file, done, total, ok: false, err: e.message });
      }
    }

    // Push DB backup (localStorage snapshot as JSON)
    try {
      const dbContent = JSON.stringify(collectBackupData(), null, 2);
      await pushSingleFile({
        token, owner, repo, message,
        path: prefix + "backup.json", content: dbContent
      });
      done++;
      onProgress && onProgress({ file: "backup.json", done, total, ok: true });
    } catch (e) {
      errors.push({ file: "backup.json", err: e.message });
      done++;  // konsisten dgn source loop: done = total attempts, bukan sukses
      onProgress && onProgress({ file: "backup.json", done, total, ok: false, err: e.message });
    }

    return { total, done, errors };
  }

  // ---------- UI wiring ----------
  const loginModal = document.getElementById("admin-login");
  const settingsModal = document.getElementById("admin-settings");
  const btnAdmin = document.getElementById("btn-admin");

  function show(el) { el.hidden = false; }
  function hide(el) { el.hidden = true; }

  let isLoggedIn = false;

  // Format log entries jadi string yang readable di textarea
  function refreshAdsLog() {
    const ta = document.getElementById("adm-ads-log");
    const info = document.getElementById("adm-ads-log-info");
    if (!ta || !window.EggAds) return;
    const entries = window.EggAds.getLog();
    const lines = entries.map(e => {
      const lvl = e.level.toUpperCase().padEnd(5);
      const dataStr = e.data ? " " + (typeof e.data === "object" ? JSON.stringify(e.data) : String(e.data)) : "";
      return `${e.ts} ${lvl} ${e.msg}${dataStr}`;
    });
    ta.value = lines.join("\n");
    ta.scrollTop = ta.scrollHeight;  // auto-scroll ke bawah (latest)
    if (info) info.textContent = `${entries.length} entries`;
  }

  // Generate test-level button grid sekali saat modal pertama di-populate.
  // Click handler call window.launchTestLevel() — set testModeActive +
  // startLevel + bypass ads.
  let testGridPopulated = false;
  function populateTestGrid() {
    if (testGridPopulated) return;
    const grid = document.getElementById("adm-test-grid");
    // LEVELS global const dari levels.js (top-level script scope).
    // Top-level const TIDAK auto di-assign ke window — akses direct.
    if (!grid || typeof LEVELS === "undefined") return;
    while (grid.firstChild) grid.removeChild(grid.firstChild);
    for (let i = 0; i < LEVELS.length; i++) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "test-lvl-btn";
      btn.textContent = String(i + 1);
      btn.title = (LEVELS[i] && LEVELS[i].title) || ("Level " + (i+1));
      btn.addEventListener("click", () => {
        hide(settingsModal);
        if (window.launchTestLevel) window.launchTestLevel(i);
      });
      grid.appendChild(btn);
    }
    testGridPopulated = true;
  }

  // Helper: show settings modal + refresh form values + log
  function openSettings() {
    populateAdmobForm();
    refreshAdsLog();
    populateTestGrid();
    show(settingsModal);
  }

  // Wire log refresh + clear buttons
  const logRefreshBtn = document.getElementById("adm-ads-log-refresh");
  const logClearBtn = document.getElementById("adm-ads-log-clear");
  if (logRefreshBtn) logRefreshBtn.addEventListener("click", refreshAdsLog);
  if (logClearBtn) logClearBtn.addEventListener("click", () => {
    if (window.EggAds) window.EggAds.clearLog();
    refreshAdsLog();
  });

  btnAdmin.addEventListener("click", () => {
    if (isLoggedIn) openSettings();
    else {
      document.getElementById("adm-user").value = "";
      document.getElementById("adm-pwd").value = "";
      document.getElementById("adm-login-err").textContent = "";
      show(loginModal);
      setTimeout(() => document.getElementById("adm-user").focus(), 50);
    }
  });

  document.getElementById("adm-login-cancel").addEventListener("click", () => hide(loginModal));

  document.getElementById("adm-do-login").addEventListener("click", async () => {
    const u = document.getElementById("adm-user").value.trim();
    const p = document.getElementById("adm-pwd").value;
    const errEl = document.getElementById("adm-login-err");
    errEl.textContent = "";
    try {
      if (await checkLogin(u, p)) {
        isLoggedIn = true;
        hide(loginModal);
        openSettings();
      } else {
        errEl.textContent = "Invalid user or password";
      }
    } catch (e) {
      errEl.textContent = "Error: " + e.message;
    }
  });

  // Enter key submit di login
  document.getElementById("adm-pwd").addEventListener("keydown", (e) => {
    if (e.key === "Enter") document.getElementById("adm-do-login").click();
  });

  document.getElementById("adm-logout").addEventListener("click", () => {
    isLoggedIn = false;
    hide(settingsModal);
  });

  // Change password
  document.getElementById("adm-change-pwd").addEventListener("click", async () => {
    const oldP = document.getElementById("adm-old-pwd").value;
    const newP = document.getElementById("adm-new-pwd").value;
    const newP2 = document.getElementById("adm-new-pwd2").value;
    const msg = document.getElementById("adm-pwd-msg");
    msg.className = "admin-msg";
    if (newP !== newP2) {
      msg.className = "admin-msg err";
      msg.textContent = "Confirmation does not match";
      return;
    }
    try {
      await changePassword(oldP, newP);
      msg.textContent = "Password changed successfully";
      document.getElementById("adm-old-pwd").value = "";
      document.getElementById("adm-new-pwd").value = "";
      document.getElementById("adm-new-pwd2").value = "";
    } catch (e) {
      msg.className = "admin-msg err";
      msg.textContent = e.message;
    }
  });

  // Export backup
  document.getElementById("adm-export").addEventListener("click", () => {
    const msg = document.getElementById("adm-export-msg");
    try {
      exportBackupFile();
      msg.className = "admin-msg";
      msg.textContent = "File downloaded";
    } catch (e) {
      msg.className = "admin-msg err";
      msg.textContent = e.message;
    }
  });

  // ---------- AdMob settings ----------
  // Load & populate form saat settingsModal dibuka. Pakai EggAds module
  // untuk separation of concern (admin UI vs ads logic).
  function populateAdmobForm() {
    if (!window.EggAds) return;
    const cfg = window.EggAds.loadConfig();
    document.getElementById("adm-ads-enabled").checked = !!cfg.enabled;
    // Radio buttons: adMode "test" atau "production"
    const mode = cfg.adMode || "test";
    const testRadio = document.getElementById("adm-ads-mode-test");
    const prodRadio = document.getElementById("adm-ads-mode-prod");
    if (testRadio) testRadio.checked = (mode === "test");
    if (prodRadio) prodRadio.checked = (mode === "production");
    document.getElementById("adm-ads-app-id").value = cfg.appId || "";
    document.getElementById("adm-ads-interstitial").value = cfg.interstitialId || "";
    document.getElementById("adm-ads-rewarded").value = cfg.rewardedId || "";
    document.getElementById("adm-ads-banner").value = cfg.bannerId || "";
    document.getElementById("adm-ads-device-ids").value = cfg.testDeviceIds || "";
  }

  document.getElementById("adm-ads-save").addEventListener("click", () => {
    const msg = document.getElementById("adm-ads-msg");
    msg.className = "admin-msg";
    try {
      if (!window.EggAds) throw new Error("EggAds module not loaded");
      const prodRadio = document.getElementById("adm-ads-mode-prod");
      const adMode = (prodRadio && prodRadio.checked) ? "production" : "test";
      window.EggAds.saveConfig({
        enabled:        document.getElementById("adm-ads-enabled").checked,
        adMode:         adMode,
        appId:          document.getElementById("adm-ads-app-id").value.trim(),
        interstitialId: document.getElementById("adm-ads-interstitial").value.trim(),
        rewardedId:     document.getElementById("adm-ads-rewarded").value.trim(),
        bannerId:       document.getElementById("adm-ads-banner").value.trim(),
        testDeviceIds:  document.getElementById("adm-ads-device-ids").value.trim(),
      });
      msg.textContent = `AdMob settings saved (mode: ${adMode})`;
    } catch (e) {
      msg.className = "admin-msg err";
      msg.textContent = e.message;
    }
  });

  // Push ALL files + DB ke GitHub
  document.getElementById("adm-push").addEventListener("click", async () => {
    const btn = document.getElementById("adm-push");
    const msg = document.getElementById("adm-push-msg");
    msg.className = "admin-msg";
    msg.textContent = "Push started...";
    btn.disabled = true;
    try {
      const basePath = document.getElementById("adm-gh-path").value.trim();
      const result = await pushAllToGitHub({
        token: document.getElementById("adm-gh-token").value.trim(),
        owner: document.getElementById("adm-gh-owner").value.trim(),
        repo:  document.getElementById("adm-gh-repo").value.trim(),
        basePath: basePath === "backup.json" ? "" : basePath,  // legacy compat
      }, ({ file, done, total, ok }) => {
        msg.textContent = `${done}/${total} ${ok ? "✓" : "✗"} ${file}`;
      });
      const okCount = result.total - result.errors.length;
      if (result.errors.length === 0) {
        msg.textContent = `Pushed all (${result.total} files)`;
      } else {
        msg.className = "admin-msg err";
        // Tampilkan alasan error pertama verbatim - user butuh lihat status code
        // GitHub (401/403/404) untuk diagnosa. Sisanya di console.
        const first = result.errors[0];
        const moreCount = result.errors.length - 1;
        const moreLabel = moreCount > 0 ? ` (+${moreCount} more failed)` : "";
        msg.textContent = `Pushed ${okCount}/${result.total}. Error: ${first.err}${moreLabel}`;
        console.warn("Push errors (full):", result.errors);
      }
    } catch (e) {
      msg.className = "admin-msg err";
      msg.textContent = e.message;
    } finally {
      btn.disabled = false;
    }
  });

  // Click luar card untuk close
  for (const m of [loginModal, settingsModal]) {
    m.addEventListener("click", (e) => {
      if (e.target === m) hide(m);
    });
  }
})();
