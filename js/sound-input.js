// ============================================================================
// SoundInput: mic access + level detection untuk Level 17 "Suara Mengubah Dunia".
//
// REQUIREMENTS:
//   - Secure context (HTTPS / localhost / WebView native)
//   - User gesture sebelum start() — browser enforce
//   - Android APK: butuh <uses-permission android:name="android.permission.RECORD_AUDIO"/>
//     di AndroidManifest.xml
//
// STRATEGI LEVEL DETECTION:
//   - FFT analyser (fftSize 256) → 128 frequency bins
//   - Average across bins → RMS-like level 0-1
//   - Exponential smoothing (α=0.3) untuk stable visibility trigger
//   - Raw peak (unsmoothed) untuk chaos threshold detection
//
// FALLBACK tanpa mic:
//   - isAvailable() return false
//   - getLevel() return this.fallbackLevel (set via setFallbackLevel untuk
//     keyboard/touch proxy — e.g., space hold = 0.5, click hold = 0.5)
// ============================================================================
(() => {
  class SoundInput {
    constructor() {
      this.stream = null;
      this.audioCtx = null;
      this.analyser = null;
      this.dataArray = null;
      this.smoothedLevel = 0;
      this.active = false;
      this.startError = null;
      this.fallbackLevel = 0;  // manual override kalau mic unavailable
    }

    // Request mic access. MUST be called from user gesture (click/tap/keydown).
    // Return true kalau sukses, false kalau permission denied / unsupported.
    async start() {
      if (this.active) return true;
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        this.startError = "mediaDevices API tidak tersedia (butuh secure context)";
        console.warn("[SoundInput] " + this.startError);
        return false;
      }
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            // Disable echo/noise suppression supaya tepukan tetap terdeteksi
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false
          }
        });
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.audioCtx = new AudioCtx();
        const source = this.audioCtx.createMediaStreamSource(this.stream);
        this.analyser = this.audioCtx.createAnalyser();
        this.analyser.fftSize = 256;
        this.analyser.smoothingTimeConstant = 0.2;
        source.connect(this.analyser);
        this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        this.active = true;
        this.startError = null;
        console.log("[SoundInput] Mic started, fftSize=256 bins=" + this.dataArray.length);
        return true;
      } catch (e) {
        this.startError = e.message || "Mic permission denied";
        console.error("[SoundInput] start() failed:", e);
        return false;
      }
    }

    stop() {
      if (this.stream) {
        this.stream.getTracks().forEach(t => t.stop());
        this.stream = null;
      }
      if (this.audioCtx) {
        try { this.audioCtx.close(); } catch (e) { /* noop */ }
        this.audioCtx = null;
      }
      this.active = false;
    }

    isAvailable() { return this.active; }

    // Poll current mic level. Call per frame. Return current smoothed 0-1.
    tick() {
      if (!this.active) return this.fallbackLevel;
      this.analyser.getByteFrequencyData(this.dataArray);
      let sum = 0;
      for (let i = 0; i < this.dataArray.length; i++) sum += this.dataArray[i];
      const rawLevel = (sum / this.dataArray.length) / 255;
      // Exponential smoothing: stabil tapi responsive untuk peaks
      this.smoothedLevel = this.smoothedLevel * 0.7 + rawLevel * 0.3;
      this.lastRaw = rawLevel;
      return this.smoothedLevel;
    }

    getLevel() { return this.active ? this.smoothedLevel : this.fallbackLevel; }
    getRawPeak() { return this.active ? (this.lastRaw || 0) : this.fallbackLevel; }
    setFallbackLevel(v) { this.fallbackLevel = Math.max(0, Math.min(1, v)); }
  }

  window.SoundInput = SoundInput;
})();
