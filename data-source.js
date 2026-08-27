/* =============================================================================
   data-source.js — SATU-SATUNYA tempat konfigurasi & sumber data
   Dipakai bersama oleh:  Dashboard Penyerapan Anggaran.dc.html  &  Admin Panel.dc.html
   =============================================================================

   LANGKAH SINGKAT (detail lengkap di PANDUAN-INTEGRASI.md):
   1. Deploy Code.gs sebagai Web App  → dapat URL .../exec
   2. Tempel URL itu ke CONFIG.APPSCRIPT_URL di bawah
   3. Ubah CONFIG.MODE dari 'seed' menjadi 'appscript'
   4. Token admin TIDAK ditulis di file ini bila di-hosting publik — admin
      mengetiknya saat login (lihat CONFIG.ADMIN_TOKEN di bawah)
============================================================================= */

export const CONFIG = {
  // 'seed'      = data contoh bawaan (demo/offline, tanpa koneksi)
  // 'appscript' = Google Apps Script Web App (GET + POST) — MODE PRODUKSI
  // 'gviz'      = baca langsung Google Sheets tanpa API key (read-only, sheet publik)
  MODE: 'appscript',

  // MODE 'appscript' ---------------------------------------------------------
  APPSCRIPT_URL: 'https://script.google.com/macros/s/AKfycbyB6--KdSIPuUTWk0Y34AZx0pSKgKjQEjGjLqHNb_yojIVn9pG51s3-gSmV8qcZvBtX/exec',

  // MODE 'gviz' -------------------------------------------------------------
  SPREADSHEET_ID: 'GANTI_DENGAN_SPREADSHEET_ID',

  // Nama tab di spreadsheet (harus sama persis)
  SHEET_ANGGARAN: 'Anggaran',
  SHEET_PENCAIRAN: 'Pencairan',

  // Token admin.
  // • MODE 'appscript' → BIARKAN KOSONG ''. Admin mengetik token saat login, token
  //   diverifikasi SERVER (Code.gs), dan nilainya hanya hidup di sessionStorage
  //   tab tersebut — tidak pernah ada di repositori. Ini setelan produksi.
  // • MODE 'seed'/'gviz' (demo tanpa server) → isi di sini, karena tidak ada server
  //   yang bisa memverifikasi. Bila kosong, login admin ditolak sama sekali.
  ADMIN_TOKEN: '',

  // Auto-refresh dashboard (ms). 0 = nonaktif
  REFRESH_MS: 5 * 60 * 1000
};

/* -----------------------------------------------------------------------------
   SHEET 1 — Anggaran & Komponen
   Kolom: ID_Komponen | Tipe | Parent_ID | Nama_Kegiatan | Pagu_Anggaran | Total_Realisasi
   Tipe: 'UTAMA' (Komponen Utama) atau 'SUB' (Subkomponen)
   Sisa_Anggaran & % penyerapan dihitung otomatis (tidak perlu kolom manual).
   Data di bawah = hasil parsing "Laporan Ketersediaan Dana Detail TA 2026",
   Satker 694677 Sekretariat Jenderal, Program WA.7858.
----------------------------------------------------------------------------- */
export const SEED_ANGGARAN = [
  ['051.0A', 'UTAMA', '', 'Pengelolaan Data dan Informasi', 76501000, 8280000],
  ['051.0A-521211', 'SUB', '051.0A', 'Belanja Bahan', 54901000, 6480000],
  ['051.0A-522151', 'SUB', '051.0A', 'Belanja Jasa Profesi', 21600000, 1800000],

  ['051.0B', 'UTAMA', '', 'Pengelolaan Informasi dan Komunikasi', 719780000, 143764000],
  ['051.0B-524111', 'SUB', '051.0B', 'Belanja Perjalanan Dinas Biasa', 694230000, 138324000],
  ['051.0B-524113', 'SUB', '051.0B', 'Belanja Perjalanan Dinas Dalam Kota', 25550000, 5440000],

  ['051.0E', 'UTAMA', '', 'Penyebaran Informasi', 2105000000, 489599999],
  ['051.0E-522191', 'SUB', '051.0E', 'Belanja Jasa Lainnya', 2105000000, 489599999],

  ['051.0H', 'UTAMA', '', 'Sosialisasi / FGD / Konsinyering', 195492000, 0],
  ['051.0H-521211', 'SUB', '051.0H', 'Belanja Bahan', 18000000, 0],
  ['051.0H-524114', 'SUB', '051.0H', 'Belanja Perjalanan Dinas Paket Meeting Dalam Kota', 177492000, 0],

  ['051.0I', 'UTAMA', '', 'Pembangunan dan Pengembangan Aplikasi Kementerian', 9848482000, 0],
  ['051.0I-536111', 'SUB', '051.0I', 'Belanja Modal Lainnya', 9848482000, 0],

  ['051.0J', 'UTAMA', '', 'Tata Kelola Teknologi Informasi dan SPBE', 173128000, 51113000],
  ['051.0J-521211', 'SUB', '051.0J', 'Belanja Bahan', 18225000, 0],
  ['051.0J-522131', 'SUB', '051.0J', 'Belanja Jasa Konsultan', 148143000, 49143000],
  ['051.0J-522151', 'SUB', '051.0J', 'Belanja Jasa Profesi', 5400000, 1800000],
  ['051.0J-524113', 'SUB', '051.0J', 'Belanja Perjalanan Dinas Dalam Kota', 1360000, 170000],

  ['051.0K', 'UTAMA', '', 'Penyusunan Imigrasi dan Pemasyarakatan Dalam Angka', 69660000, 0],
  ['051.0K-521211', 'SUB', '051.0K', 'Belanja Bahan', 69660000, 0],

  ['051.0L', 'UTAMA', '', 'Pengelolaan Statistik Sektoral', 206461000, 9900000],
  ['051.0L-521211', 'SUB', '051.0L', 'Belanja Bahan', 35693000, 8100000],
  ['051.0L-522151', 'SUB', '051.0L', 'Belanja Jasa Profesi', 13500000, 1800000],
  ['051.0L-524113', 'SUB', '051.0L', 'Belanja Perjalanan Dinas Dalam Kota', 3400000, 0],
  ['051.0L-524114', 'SUB', '051.0L', 'Belanja Perjalanan Dinas Paket Meeting Dalam Kota', 153868000, 0],

  ['051.0M', 'UTAMA', '', 'Pengamanan dan Pemeliharaan TI', 7445100000, 7426699993],
  ['051.0M-521211', 'SUB', '051.0M', 'Belanja Bahan', 16200000, 4050000],
  ['051.0M-522141', 'SUB', '051.0M', 'Belanja Sewa', 7420000000, 7419999993],
  ['051.0M-522151', 'SUB', '051.0M', 'Belanja Jasa Profesi', 7200000, 1800000],
  ['051.0M-524113', 'SUB', '051.0M', 'Belanja Perjalanan Dinas Dalam Kota', 1700000, 850000],

  ['051.0N', 'UTAMA', '', 'Pengadaan Lisensi', 408000000, 0],
  ['051.0N-521111', 'SUB', '051.0N', 'Belanja Keperluan Perkantoran', 408000000, 0]
];

/* -----------------------------------------------------------------------------
   SHEET 2 — Data Dukung Pencairan
   Kolom: ID_Pencairan | ID_Komponen | Tanggal_Cair | Nominal_Pencairan | Keterangan | Link_Dokumen_Bukti
   ID_Komponen berelasi ke kolom A Sheet 1.
----------------------------------------------------------------------------- */
const DOC = 'https://drive.google.com/file/d/CONTOH_ID_DOKUMEN/view';
export const SEED_PENCAIRAN = [
  ['PC-0001', '051.0M-522141', '2026-01-30', 3710000000, 'Pembayaran sewa infrastruktur TI tahap I', DOC],
  ['PC-0002', '051.0M-521211', '2026-02-13', 4050000, 'Pengadaan bahan pendukung pemeliharaan', DOC],
  ['PC-0003', '051.0B-524111', '2026-02-20', 45000000, 'Perjalanan dinas monitoring wilayah I', DOC],
  ['PC-0004', '051.0M-522151', '2026-03-05', 1800000, 'Honor narasumber pengamanan siber', DOC],
  ['PC-0005', '051.0A-521211', '2026-03-12', 3240000, 'Bahan rapat penyusunan data statistik', DOC],
  ['PC-0006', '051.0J-524113', '2026-03-27', 170000, 'Transport lokal koordinasi SPBE', DOC],
  ['PC-0007', '051.0A-522151', '2026-04-09', 1800000, 'Honor narasumber pengelolaan data', DOC],
  ['PC-0008', '051.0L-521211', '2026-04-17', 4050000, 'Bahan penyusunan statistik sektoral TW-I', DOC],
  ['PC-0009', '051.0E-522191', '2026-04-22', 149850000, 'Jasa produksi konten publikasi tahap I', DOC],
  ['PC-0010', '051.0J-522151', '2026-05-06', 1800000, 'Honor narasumber tata kelola TI', DOC],
  ['PC-0011', '051.0B-524111', '2026-05-14', 48324000, 'Perjalanan dinas monitoring wilayah II', DOC],
  ['PC-0012', '051.0B-524113', '2026-06-05', 4250000, 'Perjalanan dinas dalam kota TW-II', DOC],
  ['PC-0013', '051.0L-522151', '2026-06-11', 1800000, 'Honor narasumber statistik sektoral', DOC],
  ['PC-0014', '051.0A-521211', '2026-06-18', 3240000, 'Bahan FGD data dan informasi', DOC],
  ['PC-0015', '051.0E-522191', '2026-06-27', 190000000, 'Jasa produksi konten publikasi tahap II', DOC],
  ['PC-0016', '051.0M-522141', '2026-07-02', 3709999993, 'Pembayaran sewa infrastruktur TI tahap II', DOC],
  ['PC-0017', '051.0J-522131', '2026-07-15', 49143000, 'Jasa konsultan audit keamanan informasi', DOC],
  ['PC-0018', '051.0L-521211', '2026-07-21', 4050000, 'Bahan penyusunan statistik sektoral TW-II', DOC],
  ['PC-0019', '051.0B-524111', '2026-07-30', 45000000, 'Perjalanan dinas monitoring wilayah III', DOC],
  ['PC-0020', '051.0M-524113', '2026-08-04', 850000, 'Transport lokal pemeliharaan perangkat', DOC],
  ['PC-0021', '051.0E-522191', '2026-08-08', 149749999, 'Jasa produksi konten publikasi tahap III', DOC],
  ['PC-0022', '051.0B-524113', '2026-08-11', 1190000, 'Perjalanan dinas dalam kota Agustus', DOC]
];

/* ------------------------------- token admin ------------------------------
   MODE 'appscript' (produksi): token SELALU diambil dari sessionStorage — nilai
   yang diketik admin dan sudah diverifikasi server. CONFIG.ADMIN_TOKEN tidak
   pernah dipakai di mode ini, sehingga tidak ada rahasia di dalam repositori.
   MODE demo (seed/gviz): tidak ada server, jadi CONFIG.ADMIN_TOKEN yang dipakai.
-------------------------------------------------------------------------- */
const TOKEN_KEY = 'anggaran_admin_token';
export function getToken() {
  if (CONFIG.MODE !== 'appscript' && CONFIG.ADMIN_TOKEN) return CONFIG.ADMIN_TOKEN;
  try { return sessionStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; }
}
export function setToken(v) { try { sessionStorage.setItem(TOKEN_KEY, v); } catch (e) {} }
export function clearToken() { try { sessionStorage.removeItem(TOKEN_KEY); } catch (e) {} }

/* ============================ util & normalisasi ========================== */
export const nf = new Intl.NumberFormat('id-ID');
export const fmt = (n) => nf.format(Math.round(Number(n) || 0));
export const rupiah = (n) => 'Rp ' + fmt(n);
export const short = (n) => {
  const a = Math.abs(Number(n) || 0);
  if (a >= 1e12) return 'Rp ' + (n / 1e12).toFixed(2) + ' T';
  if (a >= 1e9) return 'Rp ' + (n / 1e9).toFixed(2) + ' M';
  if (a >= 1e6) return 'Rp ' + (n / 1e6).toFixed(1) + ' Jt';
  return 'Rp ' + fmt(n);
};
export const toNum = (v) => {
  if (typeof v === 'number') return v;
  return Number(String(v ?? '').replace(/[^0-9.-]/g, '')) || 0;
};
export const tanggalID = (v) => {
  const d = v instanceof Date ? v : new Date(String(v));
  if (isNaN(d)) return String(v || '—');
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
};

/** Ambang status penyerapan — ubah di sini bila kebijakan instansi berbeda. */
export const AMBANG = { AMAN: 75, WASPADA: 25 };
export function statusOf(pct) {
  if (pct > 100) return { key: 'over', label: 'Over Budget', color: 'var(--red)', bg: 'var(--red-bg)' };
  if (pct >= AMBANG.AMAN) return { key: 'aman', label: 'Aman', color: 'var(--green)', bg: 'var(--green-bg)' };
  if (pct >= AMBANG.WASPADA) return { key: 'waspada', label: 'Waspada', color: 'var(--amber)', bg: 'var(--amber-bg)' };
  return { key: 'kritis', label: 'Kritis', color: 'var(--red)', bg: 'var(--red-bg)' };
}

const rowAnggaran = (r) => ({
  id: String(r[0] ?? '').trim(),
  tipe: String(r[1] ?? 'SUB').trim().toUpperCase().startsWith('U') ? 'UTAMA' : 'SUB',
  parent: String(r[2] ?? '').trim(),
  nama: String(r[3] ?? '').trim(),
  pagu: toNum(r[4]),
  realisasi: toNum(r[5])
});
const rowPencairan = (r) => ({
  id: String(r[0] ?? '').trim(),
  komponenId: String(r[1] ?? '').trim(),
  tanggal: r[2] instanceof Date ? r[2].toISOString().slice(0, 10) : String(r[2] ?? '').slice(0, 10),
  nominal: toNum(r[3]),
  keterangan: String(r[4] ?? '').trim(),
  dokumen: String(r[5] ?? '').trim()
});

const objAnggaran = (o) => rowAnggaran([o.ID_Komponen ?? o.id, o.Tipe ?? o.tipe, o.Parent_ID ?? o.parent,
  o.Nama_Kegiatan ?? o.nama, o.Pagu_Anggaran ?? o.pagu, o.Total_Realisasi ?? o.realisasi]);
const objPencairan = (o) => rowPencairan([o.ID_Pencairan ?? o.id, o.ID_Komponen ?? o.komponenId,
  o.Tanggal_Cair ?? o.tanggal, o.Nominal_Pencairan ?? o.nominal, o.Keterangan ?? o.keterangan,
  o.Link_Dokumen_Bukti ?? o.dokumen]);

/* ============================== pengambilan data ========================== */

/** GET data dari Apps Script Web App: {anggaran:[...], pencairan:[...]} */
async function getFromAppScript() {
  const res = await fetch(CONFIG.APPSCRIPT_URL + '?action=getAll', { redirect: 'follow' });
  if (!res.ok) throw new Error('HTTP ' + res.status + ' dari Apps Script Web App.');
  const json = await res.json();
  if (json.status === 'error') throw new Error(json.message || 'Apps Script mengembalikan error.');
  const a = json.anggaran || json.data?.anggaran || [];
  const p = json.pencairan || json.data?.pencairan || [];
  return {
    anggaran: a.map(objAnggaran).filter(r => r.id),
    pencairan: p.map(objPencairan).filter(r => r.id || r.komponenId),
    source: 'Google Apps Script Web App'
  };
}

/** GET langsung dari Google Sheets via GViz (read-only, sheet harus publik). */
async function getFromGViz() {
  const one = async (sheet) => {
    const url = 'https://docs.google.com/spreadsheets/d/' + CONFIG.SPREADSHEET_ID +
      '/gviz/tq?tqx=out:json&sheet=' + encodeURIComponent(sheet);
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status + ' saat membaca sheet "' + sheet + '".');
    const t = await res.text();
    const j = JSON.parse(t.substring(t.indexOf('{'), t.lastIndexOf('}') + 1));
    return (j.table.rows || []).map(r => (r.c || []).map(c => (c ? c.f ?? c.v : '')));
  };
  const [a, p] = await Promise.all([one(CONFIG.SHEET_ANGGARAN), one(CONFIG.SHEET_PENCAIRAN)]);
  return {
    anggaran: a.map(rowAnggaran).filter(r => r.id),
    pencairan: p.map(rowPencairan).filter(r => r.komponenId),
    source: 'Google Sheets (GViz)'
  };
}

/** Sumber data utama yang dipakai kedua halaman. */
export async function fetchAll() {
  if (CONFIG.MODE === 'appscript') return await getFromAppScript();
  if (CONFIG.MODE === 'gviz') return await getFromGViz();
  return {
    anggaran: SEED_ANGGARAN.map(rowAnggaran),
    pencairan: SEED_PENCAIRAN.map(rowPencairan),
    source: 'Data contoh (laporan TA 2026)'
  };
}

/** Data contoh sebagai fallback bila fetch gagal — dashboard tidak pernah kosong. */
export function seedFallback() {
  return {
    anggaran: SEED_ANGGARAN.map(rowAnggaran),
    pencairan: SEED_PENCAIRAN.map(rowPencairan),
    source: 'Fallback data contoh'
  };
}

/**
 * Sidik jari token (djb2) — dipakai Admin Panel untuk menandai sesi login.
 * Bila ADMIN_TOKEN diganti, sidik jari berubah sehingga semua sesi lama otomatis
 * gugur dan admin wajib login ulang.
 */
export function tokenFingerprint(token) {
  var h = 5381;
  var s = String(token || '');
  for (var i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return 'fp' + h.toString(36);
}

/** Token demo belum diisi/masih contoh? (hanya relevan di MODE demo) */
export function tokenBelumDiset() {
  if (CONFIG.MODE === 'appscript') return false;
  return !CONFIG.ADMIN_TOKEN || CONFIG.ADMIN_TOKEN === 'GANTI_TOKEN_RAHASIA_ANDA';
}

/**
 * Verifikasi token admin. SELALU dipanggil sebelum panel admin terbuka.
 * MODE 'appscript' → diverifikasi SERVER (Code.gs action=verifyToken), sehingga
 *                    token salah tidak pernah lolos meski kode halaman diubah.
 * MODE lain (demo) → dibandingkan dengan CONFIG.ADMIN_TOKEN; bila CONFIG kosong,
 *                    tidak ada acuan sah → login ditolak.
 */
export async function verifyToken(token) {
  const t = String(token || '').trim();
  if (!t) return false;
  if (CONFIG.MODE !== 'appscript') {
    if (!CONFIG.ADMIN_TOKEN) {
      throw new Error('MODE ' + CONFIG.MODE + ' tanpa server: isi CONFIG.ADMIN_TOKEN di data-source.js terlebih dahulu.');
    }
    return t === CONFIG.ADMIN_TOKEN;
  }
  try {
    const res = await fetch(CONFIG.APPSCRIPT_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'verifyToken', token: t })
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();
    if (json.status === 'error' && /action tidak dikenal/i.test(json.message || '')) {
      const err = new Error('Web App belum diperbarui: Code.gs versi lama belum mengenal verifyToken. ' +
        'Tempel ulang Code.gs, lalu Deploy → Manage deployments → Edit → New version → Deploy.');
      err.stale = true;
      throw err;
    }
    return json.status === 'ok' && json.verified === true;
  } catch (e) {
    if (e && e.stale) throw e;
    throw new Error('Tidak dapat memverifikasi token ke server: ' + e.message);
  }
}

/**
 * POST pencairan baru ke Apps Script (dipakai Admin Panel).
 * Catatan teknis: Content-Type dibuat 'text/plain' agar browser TIDAK mengirim
 * preflight OPTIONS — Apps Script tidak menjawab OPTIONS sehingga akan gagal CORS.
 * Body tetap berisi JSON dan di-parse dengan JSON.parse() di Code.gs.
 */
export async function postPencairan(payload) {
  if (CONFIG.MODE === 'seed') {
    await new Promise(r => setTimeout(r, 700));
    return { status: 'ok', simulated: true, id: 'PC-DEMO-' + Date.now().toString().slice(-4) };
  }
  const res = await fetch(CONFIG.APPSCRIPT_URL, {
    method: 'POST',
    redirect: 'follow',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'addPencairan', token: getToken(), ...payload })
  });
  if (!res.ok) throw new Error('HTTP ' + res.status + ' saat menyimpan ke Google Sheets.');
  const json = await res.json();
  if (json.status !== 'ok') throw new Error(json.message || 'Penyimpanan ditolak server.');
  return json;
}

/**
 * Susun struktur hierarki + agregasi.
 * Realisasi komponen utama = jumlah realisasi subkomponennya (bila ada),
 * sehingga angka induk selalu konsisten dengan rinciannya.
 */
export function buildTree(anggaran, pencairan) {
  const subs = anggaran.filter(r => r.tipe === 'SUB');
  const byKomponen = {};
  (pencairan || []).forEach(p => {
    (byKomponen[p.komponenId] = byKomponen[p.komponenId] || []).push(p);
  });

  const utama = anggaran.filter(r => r.tipe === 'UTAMA').map(u => {
    const children = subs.filter(s => s.parent === u.id).map(s => {
      const pct = s.pagu > 0 ? (s.realisasi / s.pagu) * 100 : 0;
      const docs = (byKomponen[s.id] || []).slice().sort((a, b) => (a.tanggal < b.tanggal ? 1 : -1));
      return { ...s, sisa: s.pagu - s.realisasi, pct, status: statusOf(pct), docs };
    });
    const pagu = children.length ? children.reduce((t, c) => t + c.pagu, 0) : u.pagu;
    const realisasi = children.length ? children.reduce((t, c) => t + c.realisasi, 0) : u.realisasi;
    const pct = pagu > 0 ? (realisasi / pagu) * 100 : 0;
    const ownDocs = (byKomponen[u.id] || []);
    const docs = children.reduce((all, c) => all.concat(c.docs), ownDocs.slice())
      .sort((a, b) => (a.tanggal < b.tanggal ? 1 : -1));
    return { ...u, pagu, realisasi, sisa: pagu - realisasi, pct, status: statusOf(pct), children, docs };
  });

  const pagu = utama.reduce((t, u) => t + u.pagu, 0);
  const realisasi = utama.reduce((t, u) => t + u.realisasi, 0);
  const totals = {
    pagu, realisasi, sisa: pagu - realisasi,
    pct: pagu ? (realisasi / pagu) * 100 : 0,
    avg: utama.length ? utama.reduce((t, u) => t + u.pct, 0) / utama.length : 0,
    nKomponen: utama.length,
    nPencairan: (pencairan || []).length
  };
  return { utama, totals };
}
