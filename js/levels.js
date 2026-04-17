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
  }
];

