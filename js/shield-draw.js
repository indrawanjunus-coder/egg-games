// ============================================================================
// ShieldCanvas: modul gambar perisai untuk Level 13 (dan future levels).
//
// Saat game pause di level dengan spawner nail-rain, pointer events di canvas
// di-route ke sini untuk gambar garis. Garis disimpan sebagai array of strokes,
// tiap stroke = array of {x, y} points. Saat nail jatuh, engine panggil
// shield.blocksPoint(x, y) untuk cek apakah nail harus dihancurkan.
//
// Design choices:
// - STROKE THICKNESS 8px → cukup tebal untuk visible + collision toleran
// - POINT SIMPLIFICATION 3px → skip points yang terlalu rapat (hemat memory
//   dan speed up collision check). Mata tidak bisa bedakan segmen <3px toh.
// - COLLISION = distance-to-segment < thickness/2 → titik nail dianggap
//   tertahan kalau dalam jangkauan tebal garis.
//
// Extensibility: kalau nanti mau ink budget atau durability, hook ada di
// shouldAllowStroke() dan onHit().
// ============================================================================
(() => {
  const STROKE_THICKNESS = 8;
  const COLLISION_RADIUS = STROKE_THICKNESS / 2 + 2;
  const COLLISION_RADIUS_SQ = COLLISION_RADIUS * COLLISION_RADIUS;
  const MIN_POINT_DIST_SQ = 3 * 3;  // jangan tambah point kalau < 3px dari point terakhir
  const STROKE_COLOR = "#0f0f0f";
  const STROKE_COLOR_ACTIVE = "#1d5cff";  // biru saat sedang gambar (feedback visual)

  class ShieldCanvas {
    constructor() {
      this.strokes = [];        // array of strokes; stroke = { points: [{x,y}, ...] }
      this.activeStroke = null; // stroke yang sedang digambar
      this.totalLength = 0;     // cumulative length semua stroke (untuk future budget)
    }

    // Mulai stroke baru. Return false kalau ditolak (mis. budget habis).
    beginStroke(x, y) {
      if (!this.shouldAllowStroke()) return false;
      this.activeStroke = { points: [{ x, y }] };
      return true;
    }

    // Tambah point ke stroke aktif. Auto-skip kalau terlalu dekat dgn last point.
    addPoint(x, y) {
      if (!this.activeStroke) return;
      const pts = this.activeStroke.points;
      const last = pts[pts.length - 1];
      const dx = x - last.x, dy = y - last.y;
      const d2 = dx*dx + dy*dy;
      if (d2 < MIN_POINT_DIST_SQ) return;
      pts.push({ x, y });
      this.totalLength += Math.sqrt(d2);
    }

    // Finalisasi stroke. Commit ke strokes[] kalau punya ≥2 points.
    endStroke() {
      if (this.activeStroke && this.activeStroke.points.length >= 2) {
        this.strokes.push(this.activeStroke);
      }
      this.activeStroke = null;
    }

    clear() {
      this.strokes = [];
      this.activeStroke = null;
      this.totalLength = 0;
    }

    // ==========================================================================
    // HOOK untuk custom rule (ink budget, cooldown, dll). Default: unlimited.
    // Ganti kalau mau limit — mis. return this.totalLength < 5000.
    // ==========================================================================
    shouldAllowStroke() {
      return true;
    }

    // Dipanggil engine saat nail diblock oleh stroke. Default: no-op.
    // Bisa dipakai untuk durability (kurangi HP stroke, hapus kalau habis).
    onHit(/* strokeIndex */) {
      // no-op by default
    }

    // Cek apakah point (x,y) di-block oleh stroke manapun.
    // Return index stroke yang block, atau -1 kalau tidak ter-block.
    // Performance: early-return, skip stroke yang bounding-box nya jauh.
    blocksPoint(x, y) {
      for (let si = 0; si < this.strokes.length; si++) {
        const pts = this.strokes[si].points;
        for (let i = 0; i < pts.length - 1; i++) {
          if (pointNearSegment(x, y, pts[i], pts[i+1], COLLISION_RADIUS_SQ)) {
            return si;
          }
        }
      }
      return -1;
    }

    draw(ctx) {
      ctx.save();
      ctx.lineWidth = STROKE_THICKNESS;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = STROKE_COLOR;
      for (const s of this.strokes) this._drawStroke(ctx, s);
      if (this.activeStroke) {
        ctx.strokeStyle = STROKE_COLOR_ACTIVE;
        this._drawStroke(ctx, this.activeStroke);
      }
      ctx.restore();
    }

    _drawStroke(ctx, s) {
      const pts = s.points;
      if (pts.length < 1) return;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      if (pts.length === 1) {
        // Single point → render as dot
        ctx.arc(pts[0].x, pts[0].y, STROKE_THICKNESS / 2, 0, Math.PI * 2);
        ctx.fillStyle = ctx.strokeStyle;
        ctx.fill();
        return;
      }
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();
    }
  }

  // Squared distance from point P to segment AB, compare to maxSq.
  // Pakai squared distance supaya tidak perlu Math.sqrt di hot loop.
  function pointNearSegment(px, py, a, b, maxSq) {
    const abx = b.x - a.x, aby = b.y - a.y;
    const apx = px - a.x, apy = py - a.y;
    const abLenSq = abx*abx + aby*aby;
    if (abLenSq === 0) {
      // Degenerate segment (A == B) → check distance to A
      return apx*apx + apy*apy <= maxSq;
    }
    let t = (apx*abx + apy*aby) / abLenSq;
    t = Math.max(0, Math.min(1, t));
    const cx = a.x + t*abx, cy = a.y + t*aby;
    const dx = px - cx, dy = py - cy;
    return dx*dx + dy*dy <= maxSq;
  }

  window.ShieldCanvas = ShieldCanvas;
})();
