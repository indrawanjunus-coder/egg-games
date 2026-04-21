// Koordinat dalam ruang canvas 1200x560.
// Tiap level terdiri dari:
//   platforms  : permukaan padat yang bisa dipijak
//   hazards    : bahaya (paku/lubang/air). type 'spike'|'pit'|'water'
//   hazards air: type 'water' -> telur mengambang, bukan mati
//   slopes     : segmen miring (x1,y1,x2,y2, solidSide: 'top')
//   trees      : objek pohon yang bisa tumbang (level 2)
//   doorIn/Out : posisi pintu masuk dan keluar
//   start      : posisi spawn telur
//   title, hint: teks yang muncul di atas layar

const LEVELS = [
  // ---------- LEVEL 1: jalan lurus, tanpa hambatan ----------
  // CATATAN: ground dinaikkan ~30px (y 450→420) supaya area aktif telur tidak
  // tertutup tombol kontrol. Door, start position ikut shift -30.
  {
    title: "Level 1 - Jalan Pagi",
    hint: "Geser ke kanan untuk keluar.",
    bounds: { x: 40, y: 40, w: 1120, h: 440 },
    start: { x: 120, y: 390 },
    doorIn:  { x: 70,   y: 350, w: 48, h: 70 },
    doorOut: { x: 1080, y: 350, w: 48, h: 70 },
    platforms: [
      { x: 40, y: 420, w: 1120, h: 60 }  // lantai utama (h diperpanjang utk fill bottom)
    ],
    hazards: [],
    slopes: [],
    trees: []
  },

  // ---------- LEVEL 2: pohon yang bisa tumbang ----------
  {
    title: "Level 2 - Awas Pohon!",
    hint: "Jangan sampai tertimpa pohon.",
    bounds: { x: 40, y: 40, w: 1120, h: 440 },
    start: { x: 120, y: 390 },
    doorIn:  { x: 70,   y: 350, w: 48, h: 70 },
    doorOut: { x: 1080, y: 350, w: 48, h: 70 },
    platforms: [
      { x: 40, y: 420, w: 1120, h: 60 }
    ],
    hazards: [],
    slopes: [],
    trees: [
      {
        baseX: 560, baseY: 420,
        height: 200, trunkWidth: 26,
        triggerZone: { x: 430, y: 350, w: 120, h: 70 },
        fallDirection: 1,
        fallDurationMs: 900,
        warningMs: 500
      }
    ]
  },

  // ---------- LEVEL 3: daratan - laut - daratan ----------
  {
    title: "Level 3 - Menyeberang Lautan",
    hint: "Jalan ke air untuk mengambang, lalu loncat ke tangga.",
    bounds: { x: 40, y: 40, w: 1120, h: 440 },
    start: { x: 110, y: 328 },
    doorIn:  { x: 70,   y: 290, w: 48, h: 70 },
    doorOut: { x: 1070, y: 240, w: 48, h: 70 },
    platforms: [
      { x: 40,   y: 360, w: 340, h: 120 },  // daratan kiri (h diperpanjang)
      { x: 880,  y: 360, w: 160, h: 120 },  // daratan kanan bawah
      { x: 1040, y: 310, w: 120, h: 170 }   // tangga naik ke pintu
    ],
    hazards: [
      { type: "water", x: 380, y: 360, w: 500, h: 110 }
    ],
    slopes: [],
    trees: []
  },

  // ---------- LEVEL 4: hujan paku (dinamik, acak tiap main) ----------
  // Setiap putaran pola paku jatuh BEDA karena spawner pakai RNG.
  // Telur harus MEMBACA warning (segitiga kuning di langit-langit) dan
  // menghindar sebelum paku menancap. Interval spawn mengecil seiring waktu
  // -> tekanan naik. Paku yang jatuh ke tanah tinggal beberapa detik lalu
  // hilang (supaya lintasan tetap bisa dilalui).
  {
    title: "Level 4 - Hujan Paku",
    hint: "Awas paku jatuh! Pantau segitiga kuning.",
    bounds: { x: 40, y: 40, w: 1120, h: 440 },
    start: { x: 100, y: 390 },
    doorIn:  { x: 70,   y: 350, w: 48, h: 70 },
    doorOut: { x: 1080, y: 350, w: 48, h: 70 },
    platforms: [
      { x: 40, y: 420, w: 1120, h: 60 }
    ],
    hazards: [],
    slopes: [],
    trees: [],
    spawner: {
      type: "spike-rain",
      zoneX: 140,            // zona spawn tidak di depan pintu masuk/keluar
      zoneW: 880,
      ceilingY: 80,          // y tempat warning muncul
      minIntervalMs: 700,
      maxIntervalMs: 1300,
      warningMs: 700,        // waktu reaksi pemain
      firstDelayMs: 1200     // jeda tenang di awal
    }
  },

  // ---------- LEVEL 5: UJIAN AKHIR (gabungan semua mekanik) ----------
  // Capstone level: pohon tumbang (lvl2) + air mengambang (lvl3) + paku jatuh (lvl4).
  // Pemain harus pakai semua skill yang dipelajari di level sebelumnya.
  // Layout: tanah kiri (pohon) -> air -> mid island -> air -> tanah kanan (spike rain)
  {
    title: "Level 5 - Ujian Akhir",
    hint: "Pohon, air, paku - semua sekaligus!",
    bounds: { x: 40, y: 40, w: 1120, h: 440 },
    start: { x: 110, y: 388 },
    doorIn:  { x: 70,   y: 350, w: 48, h: 70 },
    doorOut: { x: 1080, y: 350, w: 48, h: 70 },
    platforms: [
      { x: 40,  y: 420, w: 380, h: 60 },
      { x: 520, y: 420, w: 200, h: 60 },
      { x: 820, y: 420, w: 340, h: 60 }
    ],
    hazards: [
      { type: "water", x: 420, y: 420, w: 100, h: 60 },
      { type: "water", x: 720, y: 420, w: 100, h: 60 }
    ],
    slopes: [],
    trees: [
      {
        baseX: 280, baseY: 420,
        height: 180, trunkWidth: 24,
        triggerZone: { x: 180, y: 350, w: 100, h: 70 },
        fallDirection: 1,
        fallDurationMs: 900,
        warningMs: 500
      }
    ],
    spawner: {
      type: "spike-rain",
      // Zona spawn hanya di tanah kanan, exclude pintu keluar (~x=1080).
      zoneX: 830,
      zoneW: 200,
      ceilingY: 80,
      minIntervalMs: 1100,
      maxIntervalMs: 2000,
      warningMs: 750,
      firstDelayMs: 3500    // jeda lebih panjang - pemain perlu waktu menyeberang
    }
  },

  // ---------- LEVEL 6: NAIK TANGGA - puzzle dorong kotak ----------
  // Pintu keluar di tier paling atas (y=250). Telur tidak bisa loncat
  // langsung (jump max 70px). Solusi: dorong 2 kotak ke posisi strategis,
  // pakai kotak sebagai pijakan untuk naik ke tier 2 lalu tier 3.
  //
  // Solusi yang dimaksudkan:
  // 1. Dorong KOTAK1 ke kiri tier 2 (di bawah dindingnya)
  // 2. Naik kotak1, loncat ke tier 2 (atap y=370)
  // 3. Jalan ke kanan tier 2, terjun ke tanah bawah (aman, di bawah threshold)
  // 4. Dorong KOTAK2 ke kiri tier 3 (yang lebih tinggi)
  // 5. Naik kotak2, loncat ke tier 3 (atap y=320), masuk pintu keluar
  {
    title: "Level 6 - Naik Tangga",
    hint: "Dorong kotak buat tangga ke pintu di atas!",
    bounds: { x: 40, y: 40, w: 1120, h: 440 },
    start: { x: 110, y: 385 },
    doorIn:  { x: 70,   y: 350, w: 48, h: 70 },
    doorOut: { x: 1080, y: 220, w: 48, h: 70 },
    platforms: [
      { x: 40,  y: 418, w: 1120, h: 62 },
      { x: 300, y: 340, w: 200, h: 78 },
      { x: 850, y: 290, w: 310, h: 128 }
    ],
    hazards: [],
    slopes: [],
    trees: [],
    boxes: [
      { x: 200, y: 382, w: 36, h: 36 },
      { x: 600, y: 382, w: 36, h: 36 }
    ]
  },

  // ---------- LEVEL 7: JEMBATAN GANTUNG ----------
  // Pintu start di kiri-atas (dataran tinggi), pintu finish di kanan-bawah.
  // 3 jembatan gantung di antara, tiap jembatan goyang ditiup angin.
  // Pemain harus loncat platform-ke-jembatan dengan timing tepat saat angin
  // menggeser ke posisi yang dijangkau.
  {
    title: "Level 7 - Jembatan Angin",
    hint: "Loncat ke jembatan saat angin geser cocok!",
    bounds: { x: 40, y: 40, w: 1120, h: 440 },
    start: { x: 80, y: 158 },
    doorIn:  { x: 60,   y: 120, w: 48, h: 70 },
    doorOut: { x: 1080, y: 350, w: 48, h: 70 },
    noFallDamage: true,         // backup: semua landing di level ini aman
    bridgeMattresses: true,     // setiap bridge dapat kasur di atasnya (visual + safe)
    platforms: [
      { x: 40,   y: 190, w: 200, h: 290 },
      { x: 980,  y: 420, w: 180, h: 60 }   // finish platform raised
    ],
    hazards: [],
    slopes: [],
    trees: [],
    bridges: [
      // Bridges shifted -20 supaya tetap di antara kiri-atas dan kanan-bawah
      { anchorX: 360, anchorY: 220, w: 110, amplitude: 35, period: 2400, phase: 0 },
      { anchorX: 580, anchorY: 270, w: 110, amplitude: 45, period: 2000, phase: 600 },
      { anchorX: 800, anchorY: 330, w: 110, amplitude: 30, period: 1800, phase: 1200 }
    ]
  },

  // ---------- LEVEL 8: SUKU KANIBAL ----------
  // Telur di dataran tinggi. Suku kanibal di tanah bawah lempar garpu ke atas.
  // Garpu hilang di atas layar lalu balik turun di posisi acak.
  // Telur harus loncat platform-ke-platform sambil menghindari garpu jatuh.
  {
    title: "Level 8 - Suku Kanibal",
    hint: "Awas garpu jatuh dari atas! Loncat platform.",
    bounds: { x: 40, y: 40, w: 1120, h: 440 },
    start: { x: 90, y: 226 },               // egg.h=33, platform.y=260 -> egg.y=227
    doorIn:  { x: 60,   y: 190, w: 48, h: 70 },
    doorOut: { x: 1080, y: 190, w: 48, h: 70 },
    platforms: [
      // Tanah bawah (cannibal area)
      { x: 40,   y: 440, w: 1120, h: 40 },
      // Semua dataran SEJAJAR di y=260 supaya jump-landing sama tinggi
      // (no fall damage, vy at land = jumpVy = 8.8 < maxFallSafe 10.5)
      { x: 40,   y: 260, w: 200, h: 24 },   // start
      { x: 320,  y: 260, w: 110, h: 24 },
      { x: 510,  y: 260, w: 110, h: 24 },
      { x: 700,  y: 260, w: 110, h: 24 },
      { x: 880,  y: 260, w: 110, h: 24 },
      { x: 1010, y: 260, w: 150, h: 30 }    // finish
    ],
    hazards: [],
    slopes: [],
    trees: [],
    spawner: {
      type: "fork-throw",
      // Posisi cannibal di tanah bawah
      cannibals: [
        { x: 380, y: 440 },
        { x: 700, y: 440 },
        { x: 940, y: 440 }
      ],
      // Zona x untuk fork JATUH (random) - cover semua stepping platforms
      fallZoneX: 280, fallZoneW: 800,
      fallSpeed: 6,
      intervalMin: 1500,
      intervalMax: 2800,
      firstDelayMs: 2000
    }
  },

  // ---------- LEVEL 9: PINTU GUNUNG (teleport door) ----------
  // Telur keluar dari pintu kiri bawah, naik ke gunung (stepped platforms).
  // Pintu finish di puncak gunung tapi MENGHILANG saat didekati telur.
  // Cara menang: drag pintu pakai touch/mouse ke posisi telur supaya overlap.
  // Spot teleport ada di area unreachable supaya pemain harus pakai drag.
  {
    title: "Level 9 - Pintu Gunung",
    hint: "Pintu kabur saat dekat! DRAG ke telur untuk menang.",
    bounds: { x: 40, y: 40, w: 1120, h: 440 },
    start: { x: 80, y: 437 },
    doorIn:  { x: 60, y: 400, w: 48, h: 70 },
    doorOut: {
      x: 860, y: 100, w: 48, h: 70,        // posisi awal di puncak
      teleport: true,
      teleportThreshold: 110,               // jarak px egg-center ke door-center
      teleportSpots: [
        // Semua spot WAJIB tidak overlap dengan mountain platforms.
        // Mountain: plat0-plat6 stepped dari (40,470) → (1160,170).
        // Door rect (x, y, 48, 70) tidak boleh memotong platform manapun.
        { x: 60,   y: 60  },                // pojok kiri atas (di atas pintu masuk)
        { x: 1060, y: 60  },                // pojok kanan atas
        { x: 580,  y: 50  },                // tengah atas
        { x: 100,  y: 380 },                // mid-kiri bawah (x<240, di atas tanah bawah)
        { x: 200,  y: 200 },                // mid-kiri (mid-air, di atas plat0)
        { x: 860,  y: 100 }                 // puncak gunung (door 860-908,100-170 vs plat6 y=170 → strict < no overlap)
      ]
    },
    platforms: [
      // Tanah bawah (start area)
      { x: 40,  y: 470, w: 200, h: 10 },
      // Mountain steps (naik dari kiri ke kanan-atas)
      { x: 240, y: 420, w: 100, h: 60 },
      { x: 340, y: 370, w: 100, h: 110 },
      { x: 440, y: 320, w: 100, h: 160 },
      { x: 540, y: 270, w: 100, h: 210 },
      { x: 640, y: 220, w: 100, h: 260 },
      { x: 740, y: 170, w: 420, h: 310 }   // puncak gunung (lebar - lokasi pintu awal)
    ],
    hazards: [],
    slopes: [],
    trees: []
  },

  // ---------- LEVEL 10: PIPA PERSEMBUNYIAN (giant foot + stone rain) ----------
  // Tanah datar dengan 1 pipa di tengah. Kaki raksasa & batu jatuh dari atas.
  // Pipa adalah satu-satunya safe spot:
  //   - Kaki diblok cap pipa (foot menginjak pipa, tidak sampai tanah di area itu)
  //   - Batu juga diblok cap pipa
  //   - Telur di dalam pipa AMAN dari kedua bahaya
  // Player harus time pergerakan: hide → run → hide.
  {
    title: "Level 10 - Pipa Persembunyian",
    hint: "Sembunyi di pipa dari kaki & batu jatuh!",
    bounds: { x: 40, y: 40, w: 1120, h: 440 },
    start: { x: 90, y: 375 },
    doorIn:  { x: 60,   y: 350, w: 48, h: 70 },
    doorOut: { x: 1080, y: 350, w: 48, h: 70 },
    platforms: [
      { x: 40, y: 420, w: 1120, h: 60 }   // ground raised
    ],
    hazards: [],
    slopes: [],
    trees: [],
    pipes: [
      { x: 568, y: 358, w: 64, h: 62 }    // pipa raised dengan ground
    ],
    spawner: {
      type: "giant-foot",
      // Zona stomp: exclude area pintu masuk (~140px) & pintu keluar (~1040px)
      zoneX: 160, zoneW: 880,
      stompWidth: 100,        // lebar telapak kaki saat menginjak
      warningMs: 400,         // silent prep (no visual/audio per user request).
                              // pendek supaya tidak jadi "dead time" yg buang waktu.
                              // Pemain reaksi via descent visibility (~350ms).
      descendSpeed: 26,
      riseSpeed: 14,
      stompHoldMs: 250,
      intervalMin: 1500,
      intervalMax: 2700,
      firstDelayMs: 3500,     // kasih waktu pemain capai pipa dulu sebelum threat
      predictiveLookaheadMs: 200,
      mixRandomChance: 0.5,
      // Hujan batu - independent dari foot, juga di-blok cap pipa.
      // Density tinggi: spawn 2-4 batu per warning, interval pendek.
      stoneRain: {
        zoneX: 140, zoneW: 920,
        warningMs: 600,           // pendek tapi masih terlihat segitiganya
        fallSpeed: 7,             // sedikit lebih cepat
        intervalMin: 500,         // 3x lebih sering (dari 1500)
        intervalMax: 1100,        // (dari 2800)
        countMin: 2, countMax: 4, // multiple batu per spawn (cluster)
        firstDelayMs: 0           // LANGSUNG - hujan batu mulai saat level load
      }
    }
  },

  // ---------- LEVEL 11: BALON KAYU (canyon crossing) ----------
  // Kiri & kanan: tanah mid-height. Tengah: jurang lebar (no ground bottom).
  // 3 balon membawa rod kayu di tengah jurang. Player klik balon untuk pop.
  // Mekanik:
  //   3 balon  -> rod naik perlahan (hilang ke atas)
  //   2 balon  -> rod hover (stabil)
  //   1 balon  -> rod swing kiri-kanan + perlahan tenggelam ke jurang
  //   0 balon  -> free fall
  // Strategi: pop 1-2 balon untuk stabilkan rod jadi pijakan, jump ke kanan.
  {
    title: "Level 11 - Balon Kayu",
    hint: "Klik balon untuk pop. Pijak batang ke seberang!",
    bounds: { x: 40, y: 40, w: 1120, h: 440 },
    start: { x: 80, y: 247 },                   // egg di tanah kiri (y+h=280)
    doorIn:  { x: 60,   y: 210, w: 48, h: 70 },
    doorOut: { x: 1080, y: 210, w: 48, h: 70 },
    platforms: [
      // Tanah kiri mid-height (egg start). Lebar supaya gap kecil (telur jump max ~102px).
      { x: 40,  y: 280, w: 350, h: 200 },
      // Tanah kanan mid-height (finish)
      { x: 700, y: 280, w: 460, h: 200 }
      // Jurang terbuka antara x=390 dan x=700 (310px). Rod di tengah utk crossing.
    ],
    hazards: [],
    slopes: [],
    trees: [],
    balloonRods: [
      // Rod panjang menutupi mayoritas jurang. Gap kiri ~50px, gap kanan ~40px - jumpable.
      // anchorY = 280 (rata tanah).
      {
        rodX: 440, rodY: 280, rodW: 220, rodH: 14,
        balloons: [
          { offsetX: 20 },   // kiri (di atas ujung kiri rod)
          { offsetX: 110 },  // tengah
          { offsetX: 200 }   // kanan
        ]
      }
    ]
  },

  // ---------- LEVEL 12: PASIR HISAP + GUNUNG BERAPI ----------
  // Bertingkat seperti gunung: tier kiri → pasir + stepping stones → tier kanan.
  // Pasir hisap menyedot perlahan (0.3 px/frame) - lama-lama tenggelam.
  // Pemain lompat stone-to-stone sebelum tenggelam. Stones sedikit di atas pasir
  // supaya pemain aman saat berdiri di atasnya. Background: gunung berapi samar
  // menyemburkan batu panas (random landing, juga bisa ke area pasir).
  {
    title: "Level 12 - Pasir Hisap",
    hint: "Loncat dari batu ke batu! Pasir menyedot terus, jangan lama-lama.",
    bounds: { x: 40, y: 40, w: 1120, h: 440 },
    start: { x: 80, y: 247 },
    doorIn:  { x: 60,   y: 210, w: 48, h: 70 },
    doorOut: { x: 1080, y: 210, w: 48, h: 70 },
    platforms: [
      // Tier kiri (start)
      { x: 40,  y: 280, w: 220, h: 200 },
      // Stepping stones di atas pasir (y=290, sedikit lebih tinggi dari surface 300).
      // Gap antar stone ≤100px (max jump horizontal). 4 stones untuk cover 680px pasir.
      { x: 330, y: 290, w: 90, h: 14 },
      { x: 490, y: 285, w: 90, h: 14 },
      { x: 650, y: 290, w: 90, h: 14 },
      { x: 810, y: 285, w: 90, h: 14 },
      // Tier kanan (finish)
      { x: 940, y: 280, w: 220, h: 200 }
    ],
    hazards: [
      // Pasir hisap di tengah. Surface y=300 (20px di bawah tier 280).
      // Sink rate slow (0.3) - lama-lama tenggelam kalau diam.
      { type: "quicksand", x: 260, y: 300, w: 680, h: 150, sinkRate: 0.3 }
    ],
    slopes: [],
    trees: [],
    // Gunung berapi background (samar) di pojok kanan-atas
    volcano: { x: 1000, y: 110, scale: 0.7 },
    spawner: {
      type: "hot-stones",
      // Zona spawn x: cover area PASIR (260-940) juga, tidak hanya tier.
      // Stones jatuh random dimana saja - pemain harus dodge + cross pasir.
      zoneX: 200, zoneW: 820,
      ceilingY: 70,
      minIntervalMs: 1300,
      maxIntervalMs: 2200,
      warningMs: 700,
      firstDelayMs: 2000,
      fallSpeed: 7,
      countMin: 1, countMax: 2
    }
  },

  // ---------- LEVEL 13: GAMBAR PERISAI - hujan paku padat ----------
  // Telur masuk pintu → langsung muncul hujan paku padat tanpa warning, tidak
  // bisa dilewati. Pemain WAJIB klik PAUSE lalu gambar garis perlindungan
  // dengan touchscreen/mouse. Garis = perisai yang block paku. Unpause lalu
  // jalan di bawah perisai ke pintu keluar.
  //
  // Mekanik baru: spawner "nail-rain" — dense + no warning + random full-width.
  // Pemain menang dengan navigasi strategis + gambar shield strategis.
  {
    title: "Level 13 - Gambar Perisai",
    hint: "PAUSE, gambar garis perisai dari hujan paku, lalu lanjut!",
    bounds: { x: 40, y: 40, w: 1120, h: 440 },
    start: { x: 100, y: 388 },
    doorIn:  { x: 70,   y: 350, w: 48, h: 70 },
    doorOut: { x: 1080, y: 350, w: 48, h: 70 },
    platforms: [
      { x: 40, y: 420, w: 1120, h: 60 }
    ],
    hazards: [],
    slopes: [],
    trees: [],
    // Level ini enable shield drawing saat pause. Engine akan buat ShieldCanvas.
    shieldDrawing: true,
    spawner: {
      type: "nail-rain",
      zoneX: 40, zoneW: 1120,      // full width
      ceilingY: 50,                 // paku spawn dari atas canvas
      minIntervalMs: 40,            // padat: tiap 40-90ms muncul 1 paku
      maxIntervalMs: 90,
      firstDelayMs: 400,            // jeda 0.4s setelah spawn egg (biar bisa pause)
      fallSpeed: 6,                 // kecepatan jatuh
      nailWidth: 6, nailHeight: 18  // slim nail, beda dari spike (18x27)
    }
  },

  // ---------- LEVEL 14: LARI DARI KANIBAL - chase + drawable walls ----------
  // Telur exit pintu → 3 kanibal langsung chase. 1 di belakang telur, 2 dekat
  // pintu keluar untuk block akses. Tanpa tembok, kanibal berhasil tangkap.
  //
  // Strategi menang: PAUSE → gambar tembok vertikal (ceiling→ground) untuk
  // block kanibal. Telur tembus tembok, kanibal tidak. Kanibal yang tertahan
  // > 500ms akan coba LOMPAT — tembok pendek tidak cukup, gambar sampai tinggi.
  //
  // Bedanya dengan Level 13: tidak ada projectile, tapi AI mengejar aktif.
  {
    title: "Level 14 - Lari dari Kanibal",
    hint: "PAUSE! Gambar tembok vertikal untuk block kanibal!",
    bounds: { x: 40, y: 40, w: 1120, h: 440 },
    start: { x: 130, y: 388 },
    doorIn:  { x: 70,   y: 350, w: 48, h: 70 },
    doorOut: { x: 1080, y: 350, w: 48, h: 70 },
    platforms: [
      { x: 40, y: 420, w: 1120, h: 60 }
    ],
    hazards: [],
    slopes: [],
    trees: [],
    shieldDrawing: true,  // reuse shield canvas dari Level 13
    spawner: {
      type: "cannibal-chase",
      walkSpeed: 1.5,           // < egg speed (2.2) → bisa outrun kalau bebas
      jumpVy: -11,              // kekuatan lompat saat blocked
      blockedMsToJump: 500,     // stuck 0.5s → lompat
      firstDelayMs: 0,
      // 3 kanibal: 1 chaser dari belakang, 2 door-blockers
      cannibals: [
        { x: 320, y: 420 },     // chaser utama
        { x: 900, y: 420 },     // near-door blocker 1
        { x: 1020, y: 420 }     // near-door blocker 2 (paling dekat pintu finish)
      ]
    }
  },

  // ---------- LEVEL 15: AWAL YANG MENIPU - tutorial draw-as-platform ----------
  // Level sederhana untuk ngenalin mekanik "pause + gambar = pijakan".
  // Tidak ada musuh, tidak ada hazard jatuh dari langit.
  //
  // Layout: tanah kiri → LUBANG 200px → tanah kanan. Lubang terlalu lebar untuk
  // dilompati (max jump horizontal ~102px), jadi player WAJIB pause+gambar
  // jembatan horizontal untuk menyeberang. Air di dasar lubang = lost state.
  //
  // "Awal yang menipu" karena terlihat trivial tapi butuh mekanik baru.
  // Secara flow game: tutorial untuk mekanik yang muncul di L13/L14.
  {
    title: "Level 15 - Awal yang Menipu",
    hint: "Lubang terlalu lebar! PAUSE + gambar jembatan untuk menyeberang",
    bounds: { x: 40, y: 40, w: 1120, h: 440 },
    start: { x: 130, y: 388 },
    doorIn:  { x: 70,   y: 350, w: 48, h: 70 },
    doorOut: { x: 1080, y: 350, w: 48, h: 70 },
    // Dua platform dipisah lubang. Left berakhir x=540, right mulai x=750.
    // Gap = 210px (>> 102px max jump) → impossible lompat.
    platforms: [
      { x: 40,  y: 420, w: 500, h: 60 },
      { x: 750, y: 420, w: 410, h: 60 }
    ],
    hazards: [
      // Air mengisi lubang. y=420 (top pit), h=140 sampai bawah canvas
      // — kalau telur jatuh = LOST via checkHazards.
      { type: "water", x: 540, y: 420, w: 210, h: 140 }
    ],
    slopes: [],
    trees: [],
    shieldDrawing: true,  // enable drawing canvas — garis jadi jembatan
    // Tidak ada spawner — tidak ada musuh/bahaya dari langit
  },

  // ---------- LEVEL 16: DOUBLE PATH REALITY - dual hazard, pilih risiko ----------
  // Dua jalur horizontal:
  //   TOP    (y=220): aman dari kanibal, tapi hujan batu dari langit
  //   BOTTOM (y=420): aman dari batu, tapi 3 kanibal mengejar
  // Pintu masuk + keluar keduanya di BOTTOM path. Top = alternatif jalur
  // untuk escape kanibal — tapi trade-off kena batu.
  //
  // Player pakai drawn line sebagai:
  //   1. Ramp naik ke top path (hindari kanibal sementara)
  //   2. Bridge di atas kepala (block batu saat di top path)
  //   3. Ramp turun ke bottom (sebelum pintu exit)
  //
  // "Pilih risiko sendiri" — bottom run outrun cannibals, atau top run dodge
  // stones. Keduanya viable.
  {
    title: "Level 16 - Double Path Reality",
    hint: "2 jalur: atas hujan batu, bawah kanibal. PAUSE + gambar untuk pindah jalur.",
    bounds: { x: 40, y: 40, w: 1120, h: 440 },
    start: { x: 130, y: 388 },
    doorIn:  { x: 70,   y: 350, w: 48, h: 70 },
    doorOut: { x: 1080, y: 350, w: 48, h: 70 },
    platforms: [
      // Bottom path (full width). Ground y=420.
      { x: 40,  y: 420, w: 1120, h: 60 },
      // Mid stepping platform — bridge 200px gap. Ground→mid 100px, mid→top
      // 100px, both within 110px max vertical jump.
      { x: 540, y: 320, w: 120, h: 14 },
      // Top path (full width). y=220.
      // Gap dengan step: 100px (reachable). Drawing masih optional untuk
      // akses dari posisi lain + roof protection dari stones.
      { x: 40,  y: 220, w: 1120, h: 20 }
    ],
    hazards: [],
    slopes: [],
    trees: [],
    shieldDrawing: true,  // drawing untuk ramp + roof protection
    spawner: {
      type: "cannibal-chase",
      walkSpeed: 1.5,
      jumpVy: -11,
      blockedMsToJump: 500,
      firstDelayMs: 0,
      cannibals: [
        { x: 320, y: 420 },    // dekat start
        { x: 650, y: 420 },    // tengah (forced encounter)
        { x: 980, y: 420 }     // near door exit
      ],
      // Nested stoneRain: threat di TOP path. groundY=240 → stones destroyed
      // di level top platform, tidak bleed ke bottom path.
      // Composite pattern: sama seperti Level 10 giant-foot + stoneRain.
      stoneRain: {
        zoneX: 80, zoneW: 1040,    // cover top path width
        warningMs: 650,
        fallSpeed: 6,
        intervalMin: 900,
        intervalMax: 1500,
        countMin: 1, countMax: 2,
        firstDelayMs: 1500,         // jeda supaya pemain paham threat dulu
        groundY: 220                // top platform top → stones land di atasnya
      }
    }
  },

  // ---------- LEVEL 17: SUARA MENGUBAH DUNIA - mic controls platforms ----------
  // Twist: mic input dari device mengontrol visibility platform.
  //   - Sunyi → sound-platforms INVISIBLE, tidak bisa dipijak
  //   - Suara/tepuk → platforms muncul (hysteresis: tetap ada beberapa detik
  //     setelah sunyi supaya tidak flicker)
  //   - TERLALU berisik (sustained) → chaos mode: hujan paku turun
  //
  // Layout: ground kiri → jurang dengan pasir hisap di dasar → 3 stepping
  // platforms naik ke kanan (sound-activated) → tanah tinggi di kanan dengan
  // door exit.
  //
  // Strategi pemain: buat suara konsisten (bisik/ngomong) → platforms visible,
  // tapi hati-hati tidak terlalu keras (trigger chaos nail rain).
  //
  // Fallback: kalau mic denied, hold TAP di canvas = simulate sound input.
  {
    title: "Level 17 - Suara Mengubah Dunia",
    hint: "Bunyi/tepuk bikin platform muncul. Terlalu berisik = hujan paku!",
    bounds: { x: 40, y: 40, w: 1120, h: 440 },
    start: { x: 100, y: 388 },
    doorIn:  { x: 70,   y: 350, w: 48, h: 70 },
    doorOut: { x: 1080, y: 150, w: 48, h: 70 },  // elevated — forced naik via sound platforms
    platforms: [
      // Ground kiri (start). y=420.
      { x: 40,  y: 420, w: 280, h: 60 },
      // Ground kanan (finish), tiered high. Door di y=150, platform di y=220.
      { x: 980, y: 220, w: 180, h: 260 }
    ],
    // Pasir hisap di dasar jurang — jatuh dari sound-platform = lost.
    hazards: [
      { type: "quicksand", x: 320, y: 430, w: 660, h: 60, sinkRate: 0.5 }
    ],
    slopes: [],
    trees: [],
    // Platforms yang muncul/hilang berdasar sound level.
    // Gap harus ≤ 88px (max horizontal jump). Rise ≤ 110px (max vertical).
    // Step 4 ditambah untuk bridge gap ke right ground (y=220).
    soundPlatforms: [
      { x: 400, y: 370, w: 110, h: 14 },   // step 1 (lowest)
      { x: 580, y: 320, w: 110, h: 14 },   // step 2
      { x: 760, y: 270, w: 110, h: 14 },   // step 3
      { x: 880, y: 230, w: 90,  h: 14 }    // step 4 (bridge ke right ground)
    ],
    shieldDrawing: false,  // disabled — level fokus sound mechanic
    spawner: {
      type: "sound-reactive",
      // Threshold untuk platform visibility (hysteresis ON > OFF)
      platformOnThreshold:  0.15,  // level > ini → platforms muncul
      platformOffThreshold: 0.08,  // level < ini → platforms mulai fade
      platformFadeMs: 800,         // durasi fade (visibility → invisible)
      // Chaos mode: hujan paku trigger saat level sustained > threshold
      chaosThreshold: 0.55,
      chaosSustainMs: 400,         // harus berisik 400ms berturut-turut
      chaosDurationMs: 3000,       // hujan paku 3 detik
      chaosNailRain: {
        zoneX: 300, zoneW: 680,    // zone cover area jurang
        ceilingY: 50,
        minIntervalMs: 60,
        maxIntervalMs: 120,
        fallSpeed: 6,
        nailWidth: 6, nailHeight: 18
      }
    }
  },

  // ---------- LEVEL 18: WAKTU BISA DISEDOT - time-dilation zone ----------
  // Player tap layar saat pause → time zone diletakkan di lokasi tap.
  // Di DALAM zone: stones hampir berhenti (dt × 0.05), crumbling platforms
  // tidak countdown. Egg bebas normal → asimetri yang bikin zone strategis.
  //
  // Layout: 2 water pit dengan crumbling stepping platforms di atasnya.
  // Hujan batu cepat ter-render full width. Tanpa time zone, pemain pecah
  // sebelum menyeberang. Dengan zone placement yang tepat, bisa lewati aman.
  //
  // Core: satu zone aktif, fixed radius. Pemain reposisi via tap baru.
  {
    title: "Level 18 - Waktu Bisa Disedot",
    hint: "PAUSE + tap layar → tempatkan zona waktu. Batu beku di dalamnya.",
    bounds: { x: 40, y: 40, w: 1120, h: 440 },
    start: { x: 100, y: 388 },
    doorIn:  { x: 70,   y: 350, w: 48, h: 70 },
    doorOut: { x: 1080, y: 350, w: 48, h: 70 },
    platforms: [
      // Ground kiri
      { x: 40,  y: 420, w: 340, h: 60 },
      // Mid ground (safe resting spot di tengah)
      { x: 560, y: 420, w: 80,  h: 60 },
      // Ground kanan
      { x: 820, y: 420, w: 340, h: 60 },
      // Crumbling stepping platforms (lebih tinggi dari ground)
      // State machine: idle → egg step → countdown → fall
      { x: 380, y: 370, w: 100, h: 14, crumble: true, crumbleDelayMs: 600 },
      { x: 460, y: 370, w: 100, h: 14, crumble: true, crumbleDelayMs: 600 },
      { x: 640, y: 370, w: 100, h: 14, crumble: true, crumbleDelayMs: 600 },
      { x: 720, y: 370, w: 100, h: 14, crumble: true, crumbleDelayMs: 600 }
    ],
    hazards: [
      // Water pits di bawah crumbling platforms
      { type: "water", x: 380, y: 420, w: 180, h: 140 },
      { type: "water", x: 640, y: 420, w: 180, h: 140 }
    ],
    slopes: [],
    trees: [],
    timeZone: { radius: 110, slowFactor: 0.05 },  // enable mekanik
    spawner: {
      type: "hot-stones",
      stonesHot: false,            // plain stones, bukan volcanic
      zoneX: 40, zoneW: 1120,      // full width
      ceilingY: 60,
      minIntervalMs: 500,          // cepat
      maxIntervalMs: 900,
      warningMs: 350,              // pendek — minim reaction time
      firstDelayMs: 800,
      fallSpeed: 9,                // batu cepat
      countMin: 1, countMax: 2
    }
  },

  // ---------- LEVEL 19: TELUR TAK TERLIHAT - invisible character ----------
  // Sprite egg disembunyikan. Pemain navigasi HANYA lewat efek:
  //   - Walking dust (dust cloud di kaki setiap ~140ms saat gerak)
  //   - Jump dust burst (5 particles saat takeoff)
  //   - Landing dust burst (saat jatuh ke platform)
  //   - Water splash + egg temporarily visible saat di air
  //
  // Terrain kompleks + hazard klasik: mix water pit, spike, elevated platform.
  // Tanpa reveals → player stuck (diam = zero feedback). Player harus gerak
  // konsisten untuk "merasakan" posisi telur.
  {
    title: "Level 19 - Telur Tak Terlihat",
    hint: "Telur INVISIBLE. Bergerak untuk lihat debu, lewati air untuk splash.",
    bounds: { x: 40, y: 40, w: 1120, h: 440 },
    start: { x: 100, y: 388 },
    doorIn:  { x: 70,   y: 350, w: 48, h: 70 },
    doorOut: { x: 1080, y: 350, w: 48, h: 70 },
    platforms: [
      // Ground pattern: kiri → water pit → mid → water pit → kanan
      { x: 40,  y: 420, w: 280, h: 60 },   // ground kiri
      { x: 400, y: 420, w: 200, h: 60 },   // mid 1
      { x: 680, y: 420, w: 180, h: 60 },   // mid 2
      { x: 940, y: 420, w: 220, h: 60 },   // ground kanan
      // Elevated platforms (optional upper route, more dust reveal)
      { x: 370, y: 340, w: 120, h: 14 },
      { x: 620, y: 310, w: 120, h: 14 },
      { x: 870, y: 340, w: 120, h: 14 }
    ],
    hazards: [
      // Water pit 1
      { type: "water", x: 320, y: 420, w: 80, h: 60 },
      // Water pit 2 dengan spike hidden di dasar (visual dan reveal trigger)
      { type: "water", x: 600, y: 420, w: 80, h: 60 },
      // Spike di mid 2 ground — punishment untuk invisibility
      { type: "spike", x: 860, y: 416, w: 80, h: 4 }
    ],
    slopes: [],
    trees: [],
    // Draggable box — visible landmark + bisa digeser ke atas spike untuk cover,
    // atau dipakai sebagai stepping stone ke elevated platform.
    // Pemain drag via touch/mouse (engine sudah handle di main.js pointerdown
    // → hitBox → dragBoxTo). Box juga push-able oleh telur invisible saat jalan.
    boxes: [
      { x: 460, y: 384, w: 36, h: 36 }
    ],
    invisibleEgg: true
  },

  // ---------- LEVEL 20: BOSS - TANGAN RAKSASA ----------
  // Boss fight: tangan raksasa menghantam tanah dari atas. Egg dodge +
  // lure hand ke zona kanan (x=850-950) → sprint ke catapult (kiri) →
  // step on catapult → rock arc terbang ke kanan → hit hand saat stuck.
  //
  // State machine hand: idle → aim (1200ms preview) → descend (400ms) →
  // stuck (1000ms VULNERABLE) → rise (700ms) → rest → loop.
  // Hand target x di-LOCK saat mulai aim → egg bisa fake-out dgn pindah.
  //
  // Rock trajectory: fixed ballistic (vx=14, vy=-12, g=0.45) landing
  // sekitar x=890. Egg HARUS lure hand ke zona ~850-950 supaya rock hit.
  //
  // HP 3. Kalau habis, hand disabled, egg bisa masuk doorOut untuk win.
  {
    title: "Level 20 - Tangan Raksasa",
    hint: "Pancing ke kanan, lari ke catapult kiri. Rock landing ~x=890!",
    bounds: { x: 40, y: 40, w: 1120, h: 440 },
    start: { x: 200, y: 388 },
    doorIn:  { x: 70,   y: 350, w: 48, h: 70 },
    doorOut: { x: 1080, y: 350, w: 48, h: 70 },
    platforms: [
      { x: 40, y: 420, w: 1120, h: 60 }
    ],
    hazards: [],
    slopes: [],
    trees: [],
    // Catapult: lever kayu di atas ground. Top face y=396 (egg bisa berdiri).
    // Tile catapult act sebagai platform + trigger zone.
    catapult: {
      x: 100, y: 396, w: 80, h: 24,
      launchX: 148,  launchY: 396,      // titik lepas rock (center top)
      rockVx: 14, rockVy: -12,           // kecepatan awal rock
      rockGravity: 0.45,
      cooldownMs: 1500                   // delay antar launch
    },
    spawner: {
      type: "giant-hand",
      initialHp: 3,
      restMs: 1000,          // jeda antar siklus attack
      aimMs: 1200,           // preview phase (hand peek dari atas)
      descendMs: 400,        // hand turun dari sky ke ground
      stuckMs: 1000,         // VULNERABLE window
      riseMs: 700,           // hand naik kembali
      slamYBase: 420,        // posisi ground surface (palm bottom saat slam)
      handOffTop: -180,      // posisi idle/rest (off-screen atas)
      // Hujan batu random — additional hazard selain hand. Reuse stoneRain
      // sub-config (sama seperti Level 10 giant-foot pattern).
      stoneRain: {
        zoneX: 100, zoneW: 1000,    // avoid area pintu
        warningMs: 500,
        fallSpeed: 6,
        intervalMin: 1200,
        intervalMax: 2200,
        countMin: 1, countMax: 2,
        firstDelayMs: 3000,          // jeda awal supaya pemain orient dulu
        groundY: 420
      }
    }
  },

  // ---------- LEVEL 21: RUMAH PEGUNUNGAN - multi-phase finale ----------
  // Phase 1 (mountain): 5 stepped tiers + 5 houses. Telur tap pintu rumah
  // untuk ketuk. Rumah #3 (tengah) butuh 2 ketukan untuk buka. Setelah buka
  // → auto-transition ke Phase 2.
  //
  // Phase 2 (indoor): 3 lantai (F1 ground, F2 atas, F3 paling atas).
  // 2 tombol di F2 dan F3 — harus pressed simultaneously (sustain 2s fallback
  // untuk single-pointer devices). Both pressed → exit door unlock. Masuk
  // exit → credits "Congratulations! Director & Game Maker: Indrawan".
  //
  // Simplifikasi dari spec: NPC follower di-replace sprite static di F1.
  // Stairs = platform gap untuk jump (bukan ramp miring).
  {
    title: "Level 21 - Rumah Pegunungan",
    hint: "Naik gunung, ketuk pintu rumah #3 (tengah) dua kali!",
    bounds: { x: 40, y: 40, w: 1120, h: 440 },
    // Top-level fields untuk loadLevel initial setup (mirror phase1).
    // Multi-phase engine akan overwrite via _applyPhaseData.
    start: { x: 80, y: 388 },
    doorIn: { x: 70, y: 350, w: 48, h: 70 },    // bottom sit on tier 1 top (y=420)
    doorOut: { x: -100, y: -100, w: 1, h: 1 },
    platforms: [
      { x: 40,  y: 420, w: 240, h: 60 }
    ],
    hazards: [],
    slopes: [],
    trees: [],
    multiPhase: true,
    // Phase 1: mountain climb
    phase1: {
      start: { x: 80, y: 388 },
      doorIn: { x: 70, y: 350, w: 48, h: 70 },   // bottom on tier 1 (y=420)
      // No normal exit — phase transition via house knock
      doorOut: { x: -100, y: -100, w: 1, h: 1 },
      platforms: [
        { x: 40,  y: 420, w: 240, h: 60 },   // tier 1 (start)
        { x: 280, y: 380, w: 180, h: 100 },  // tier 2 (house A)
        { x: 460, y: 340, w: 180, h: 140 },  // tier 3 (house B)
        { x: 640, y: 300, w: 180, h: 180 },  // tier 4 (KEY house C)
        { x: 820, y: 260, w: 180, h: 220 },  // tier 5 (house D)
        { x: 1000,y: 220, w: 160, h: 260 }   // tier 6 (house E)
      ],
      // Each house: sits on tier, has door rect for tap detection.
      // knocksNeeded 99 = locked forever (only house #3 can open).
      houses: [
        { x: 300, y: 320, w: 100, h: 60, doorX: 336, doorY: 340, doorW: 28, doorH: 40, knocksNeeded: 99 },
        { x: 480, y: 280, w: 100, h: 60, doorX: 516, doorY: 300, doorW: 28, doorH: 40, knocksNeeded: 99 },
        // KEY house — middle, tier 4. 2 knocks to unlock.
        { x: 660, y: 240, w: 100, h: 60, doorX: 696, doorY: 260, doorW: 28, doorH: 40, knocksNeeded: 2, isKey: true },
        { x: 840, y: 200, w: 100, h: 60, doorX: 876, doorY: 220, doorW: 28, doorH: 40, knocksNeeded: 99 },
        { x: 1020,y: 160, w: 100, h: 60, doorX: 1056,doorY: 180, doorW: 28, doorH: 40, knocksNeeded: 99 }
      ]
    },
    // Phase 2: indoor — 3 floors + 2 stair platforms. Gap F1→F2 / F2→F3
    // masing-masing 100px, melebihi max jump 70px → butuh tangga halfway.
    // Jump per step = 50px, well within jump budget.
    phase2: {
      start: { x: 120, y: 388 },
      doorIn: { x: 70, y: 350, w: 48, h: 70 },
      doorOut: { x: 1080, y: 350, w: 48, h: 70 },  // right F1
      platforms: [
        { x: 40,  y: 420, w: 1120, h: 60 },    // F1 (ground)
        { x: 900, y: 370, w: 120, h: 12 },     // STAIR 1→2 (kanan)
        { x: 200, y: 320, w: 840,  h: 16 },    // F2 (middle floor)
        { x: 140, y: 270, w: 120, h: 12 },     // STAIR 2→3 (kiri)
        { x: 40,  y: 220, w: 840,  h: 16 }     // F3 (top floor)
      ],
      // Buttons: F2 right + F3 left — must press simultaneously (or sustain)
      buttons: [
        { id: "btn_f2", x: 960, y: 300, w: 64, h: 20, floor: 2 },
        { id: "btn_f3", x: 100, y: 200, w: 64, h: 20, floor: 3 }
      ],
      sustainMs: 2000,     // window untuk "simultaneous" di single-pointer
      // Boxes yang bisa di-drag / di-push egg — di F1, F2, F3.
      // Posisi: box.y = platform.y - box.h (box duduk di atas platform).
      boxes: [
        { x: 400, y: 384, w: 36, h: 36 },   // F1 (y=420 - 36)
        { x: 500, y: 284, w: 36, h: 36 },   // F2 (y=320 - 36)
        { x: 400, y: 184, w: 36, h: 36 }    // F3 (y=220 - 36)
      ],
      // Owner egg (follower NPC)
      owner: { x: 200, y: 388 },
      indoor: true         // render flag: pakai interior theme bukan sky
    },
    // Credits setelah win Phase 2
    creditsAfterWin: {
      title: "Congratulations!",
      subtitle: "Director & Game Maker:",
      author: "Indrawan",
      durationMs: 4500
    }
  }
];

