/**
 * =============================================================================
 *  Code.gs — API Endpoint Dashboard Monitoring Penyerapan Anggaran
 *  Pusat Data, Informasi dan Komunikasi Publik
 * =============================================================================
 *
 *  PASANG DI: Google Sheets → Extensions → Apps Script → tempel seluruh file ini.
 *  DEPLOY   : Deploy → New deployment → Web app
 *               Execute as     : Me (pemilik sheet)
 *               Who has access : Anyone
 *             → copy URL .../exec ke CONFIG.APPSCRIPT_URL pada data-source.js
 *
 *  ENDPOINT
 *  --------
 *  GET  ?action=getAll        → { status, updated, anggaran:[...], pencairan:[...] }
 *  GET  ?action=getAnggaran   → { status, anggaran:[...] }
 *  GET  ?action=getPencairan&komponen=051.0M-522141
 *                             → { status, pencairan:[...] }
 *  POST body JSON  { action:'addPencairan', token, ID_Komponen, Tanggal_Cair,
 *                    Nominal_Pencairan, Keterangan, Link_Dokumen_Bukti }
 *                             → { status:'ok', id, total_realisasi_komponen }
 *
 *  Setelah POST berhasil, Total_Realisasi di Sheet "Anggaran" di-hitung ulang
 *  otomatis (subkomponen + komponen utama induknya).
 * =============================================================================
 */

/** ---------------------------- KONFIGURASI ------------------------------- */
var SHEET_ANGGARAN  = 'Anggaran';
var SHEET_PENCAIRAN = 'Pencairan';
var SHEET_LOG       = 'Log';           // opsional, dibuat otomatis

/** GANTI dengan token acak Anda sendiri, dan samakan di data-source.js */
var ADMIN_TOKEN = 'GANTI_TOKEN_RAHASIA_ANDA';

/** Header wajib (dipakai saat setup otomatis) */
var HEADER_ANGGARAN = ['ID_Komponen', 'Tipe', 'Parent_ID', 'Nama_Kegiatan',
                       'Pagu_Anggaran', 'Total_Realisasi', 'Sisa_Anggaran'];
var HEADER_PENCAIRAN = ['ID_Pencairan', 'ID_Komponen', 'Tanggal_Cair',
                        'Nominal_Pencairan', 'Keterangan', 'Link_Dokumen_Bukti', 'Dicatat_Pada'];

/* ============================== ENTRY POINTS ============================== */

function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) || 'getAll';

    if (action === 'getAnggaran') {
      return json({ status: 'ok', updated: nowIso(), anggaran: readAnggaran() });
    }
    if (action === 'getPencairan') {
      var komponen = e.parameter.komponen || '';
      var rows = readPencairan();
      if (komponen) {
        rows = rows.filter(function (r) { return r.ID_Komponen === komponen; });
      }
      return json({ status: 'ok', updated: nowIso(), pencairan: rows });
    }
    // default: getAll
    return json({
      status: 'ok',
      updated: nowIso(),
      periode: 'TA ' + new Date().getFullYear(),
      anggaran: readAnggaran(),
      pencairan: readPencairan()
    });
  } catch (err) {
    return json({ status: 'error', message: String(err && err.message || err) });
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();          // cegah tabrakan input bersamaan
  try {
    lock.waitLock(20000);

    var body = {};
    if (e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    } else if (e && e.parameter) {
      body = e.parameter;                          // fallback form-urlencoded
    }

    if (body.token !== ADMIN_TOKEN) {
      return json({ status: 'error', message: 'Token tidak valid. Akses ditolak.' });
    }

    var action = body.action || 'addPencairan';
    if (action === 'addPencairan')    return json(addPencairan(body));
    if (action === 'deletePencairan') return json(deletePencairan(body));
    if (action === 'recalc')          return json({ status: 'ok', updated: recalcAll() });

    return json({ status: 'error', message: 'Action tidak dikenal: ' + action });
  } catch (err) {
    return json({ status: 'error', message: String(err && err.message || err) });
  } finally {
    try { lock.releaseLock(); } catch (ignore) {}
  }
}

/* ============================== OPERASI DATA ============================== */

/** Tambah 1 baris pencairan ke Sheet 2 lalu perbarui Total_Realisasi di Sheet 1. */
function addPencairan(body) {
  var idKomponen = String(body.ID_Komponen || '').trim();
  var tanggal    = String(body.Tanggal_Cair || '').trim();
  var nominal    = Number(String(body.Nominal_Pencairan).replace(/[^0-9.-]/g, ''));
  var keterangan = String(body.Keterangan || '').trim();
  var link       = String(body.Link_Dokumen_Bukti || '').trim();

  // ---- validasi ----
  if (!idKomponen) throw new Error('ID_Komponen wajib diisi.');
  if (!tanggal || isNaN(new Date(tanggal).getTime())) throw new Error('Tanggal_Cair tidak valid (format YYYY-MM-DD).');
  if (!nominal || nominal <= 0) throw new Error('Nominal_Pencairan harus lebih besar dari 0.');
  if (link && !/^https?:\/\//i.test(link)) throw new Error('Link_Dokumen_Bukti harus diawali http:// atau https://');

  var sheetA = sheet(SHEET_ANGGARAN);
  var komponen = findKomponen(idKomponen);
  if (!komponen) throw new Error('ID_Komponen "' + idKomponen + '" tidak ditemukan di sheet ' + SHEET_ANGGARAN + '.');

  // ---- cegah realisasi melampaui pagu (ubah jadi warning bila instansi mengizinkan) ----
  var pagu = Number(komponen.row[4]) || 0;
  var realisasiBaru = sumPencairan(idKomponen) + nominal;
  if (pagu > 0 && realisasiBaru > pagu) {
    throw new Error('Realisasi (' + realisasiBaru.toLocaleString('id-ID') + ') melampaui pagu (' +
                    pagu.toLocaleString('id-ID') + ') untuk ' + idKomponen + '.');
  }

  // ---- simpan ----
  var sheetP = sheet(SHEET_PENCAIRAN);
  var id = nextId();
  sheetP.appendRow([id, idKomponen, tanggal, nominal, keterangan, link, new Date()]);

  // ---- update agregat ----
  var total = recalcKomponen(idKomponen);
  var parentId = String(komponen.row[2] || '').trim();
  var totalParent = parentId ? recalcKomponen(parentId) : null;

  writeLog('ADD', id + ' | ' + idKomponen + ' | ' + nominal);

  return {
    status: 'ok',
    id: id,
    ID_Komponen: idKomponen,
    total_realisasi_komponen: total,
    total_realisasi_induk: totalParent,
    updated: nowIso()
  };
}

/** Hapus pencairan berdasarkan ID_Pencairan, lalu hitung ulang agregat. */
function deletePencairan(body) {
  var id = String(body.ID_Pencairan || '').trim();
  if (!id) throw new Error('ID_Pencairan wajib diisi.');
  var sh = sheet(SHEET_PENCAIRAN);
  var values = sh.getDataRange().getValues();
  for (var i = values.length - 1; i >= 1; i--) {
    if (String(values[i][0]).trim() === id) {
      var komponenId = String(values[i][1]).trim();
      sh.deleteRow(i + 1);
      var total = recalcKomponen(komponenId);
      var k = findKomponen(komponenId);
      var parentId = k ? String(k.row[2] || '').trim() : '';
      if (parentId) recalcKomponen(parentId);
      writeLog('DELETE', id + ' | ' + komponenId);
      return { status: 'ok', deleted: id, total_realisasi_komponen: total };
    }
  }
  throw new Error('ID_Pencairan "' + id + '" tidak ditemukan.');
}

/** Total_Realisasi 1 komponen = SUM pencairan miliknya + SUM realisasi anak-anaknya. */
function recalcKomponen(idKomponen) {
  var sh = sheet(SHEET_ANGGARAN);
  var values = sh.getDataRange().getValues();
  var anakIds = [];
  var targetRow = -1;

  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0]).trim() === idKomponen) targetRow = i;
    if (String(values[i][2]).trim() === idKomponen) anakIds.push(String(values[i][0]).trim());
  }
  if (targetRow < 0) return null;

  var total = sumPencairan(idKomponen);
  for (var a = 0; a < anakIds.length; a++) total += sumPencairan(anakIds[a]);

  var pagu = Number(values[targetRow][4]) || 0;
  sh.getRange(targetRow + 1, 6).setValue(total);          // kolom F: Total_Realisasi
  sh.getRange(targetRow + 1, 7).setValue(pagu - total);   // kolom G: Sisa_Anggaran
  return total;
}

/** Hitung ulang seluruh baris (jalankan manual bila data sheet diedit langsung). */
function recalcAll() {
  var values = sheet(SHEET_ANGGARAN).getDataRange().getValues();
  var subs = [], utama = [];
  for (var i = 1; i < values.length; i++) {
    var id = String(values[i][0]).trim();
    if (!id) continue;
    (String(values[i][1]).trim().toUpperCase().charAt(0) === 'U' ? utama : subs).push(id);
  }
  subs.forEach(recalcKomponen);      // anak dulu
  utama.forEach(recalcKomponen);     // lalu induk
  return nowIso();
}

/** Jumlah seluruh pencairan untuk satu ID_Komponen. */
function sumPencairan(idKomponen) {
  var values = sheet(SHEET_PENCAIRAN).getDataRange().getValues();
  var total = 0;
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][1]).trim() === idKomponen) total += Number(values[i][3]) || 0;
  }
  return total;
}

/* ================================ PEMBACAAN =============================== */

function readAnggaran() {
  var values = sheet(SHEET_ANGGARAN).getDataRange().getValues();
  var out = [];
  for (var i = 1; i < values.length; i++) {
    var r = values[i];
    if (!String(r[0]).trim() && !String(r[3]).trim()) continue;
    var pagu = Number(r[4]) || 0, real = Number(r[5]) || 0;
    out.push({
      ID_Komponen: String(r[0]).trim(),
      Tipe: String(r[1]).trim().toUpperCase().charAt(0) === 'U' ? 'UTAMA' : 'SUB',
      Parent_ID: String(r[2] || '').trim(),
      Nama_Kegiatan: String(r[3]).trim(),
      Pagu_Anggaran: pagu,
      Total_Realisasi: real,
      Sisa_Anggaran: pagu - real,
      Persen_Penyerapan: pagu ? Math.round((real / pagu) * 10000) / 100 : 0
    });
  }
  return out;
}

function readPencairan() {
  var values = sheet(SHEET_PENCAIRAN).getDataRange().getValues();
  var out = [];
  for (var i = 1; i < values.length; i++) {
    var r = values[i];
    if (!String(r[1]).trim()) continue;
    out.push({
      ID_Pencairan: String(r[0]).trim(),
      ID_Komponen: String(r[1]).trim(),
      Tanggal_Cair: r[2] instanceof Date ? Utilities.formatDate(r[2], tz(), 'yyyy-MM-dd') : String(r[2]).slice(0, 10),
      Nominal_Pencairan: Number(r[3]) || 0,
      Keterangan: String(r[4] || '').trim(),
      Link_Dokumen_Bukti: String(r[5] || '').trim()
    });
  }
  return out;
}

function findKomponen(id) {
  var values = sheet(SHEET_ANGGARAN).getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0]).trim() === id) return { index: i, row: values[i] };
  }
  return null;
}

/** ID_Pencairan berurutan: PC-0001, PC-0002, ... */
function nextId() {
  var values = sheet(SHEET_PENCAIRAN).getDataRange().getValues();
  var max = 0;
  for (var i = 1; i < values.length; i++) {
    var m = String(values[i][0]).match(/(\d+)\s*$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return 'PC-' + ('0000' + (max + 1)).slice(-4);
}

/* ================================= UTIL ================================== */

function sheet(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) throw new Error('Sheet "' + name + '" tidak ditemukan. Jalankan setupSpreadsheet() sekali.');
  return sh;
}
function tz() { return SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone() || 'Asia/Jakarta'; }
function nowIso() { return Utilities.formatDate(new Date(), tz(), "yyyy-MM-dd'T'HH:mm:ssXXX"); }
function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
function writeLog(action, detail) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName(SHEET_LOG) || ss.insertSheet(SHEET_LOG);
    if (sh.getLastRow() === 0) sh.appendRow(['Waktu', 'Aksi', 'Detail', 'Pengguna']);
    sh.appendRow([new Date(), action, detail, Session.getActiveUser().getEmail() || 'anonim']);
  } catch (ignore) {}
}

/**
 * Jalankan SEKALI dari editor Apps Script (pilih fungsi → Run) untuk membuat
 * kedua sheet beserta header-nya secara otomatis.
 */
function setupSpreadsheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  [[SHEET_ANGGARAN, HEADER_ANGGARAN], [SHEET_PENCAIRAN, HEADER_PENCAIRAN]].forEach(function (pair) {
    var sh = ss.getSheetByName(pair[0]) || ss.insertSheet(pair[0]);
    if (sh.getLastRow() === 0) sh.appendRow(pair[1]);
    sh.getRange(1, 1, 1, pair[1].length).setFontWeight('bold').setBackground('#0B2545').setFontColor('#FFFFFF');
    sh.setFrozenRows(1);
  });
  return 'Setup selesai. Isi data lalu Deploy sebagai Web App.';
}

/** Uji cepat tanpa browser: Run → lihat Execution log. */
function testGetAll() {
  Logger.log(doGet({ parameter: { action: 'getAll' } }).getContent().slice(0, 800));
}

/* =============================================================================
 *  PENGISIAN DATA AWAL OTOMATIS
 *  ---------------------------------------------------------------------------
 *  Jalankan SEKALI dari editor Apps Script: pilih fungsi seedDataAwal → Run.
 *  Isi: 32 baris Sheet "Anggaran" + 22 baris Sheet "Pencairan" sesuai
 *  "Laporan Ketersediaan Dana Detail TA 2026", Satker 694677, Program WA.7858.
 *  Tidak perlu copy-paste CSV manual.
 *
 *  ⚠ Fungsi ini MENGHAPUS isi kedua sheet (header tetap) sebelum mengisi ulang.
 *    Jangan dijalankan lagi setelah ada data pencairan asli.
 * =========================================================================== */

/** [ID_Komponen, Tipe, Parent_ID, Nama_Kegiatan, Pagu_Anggaran] */
var DATA_ANGGARAN = [
  ['051.0A', 'UTAMA', '', 'Pengelolaan Data dan Informasi', 76501000],
  ['051.0A-521211', 'SUB', '051.0A', 'Belanja Bahan', 54901000],
  ['051.0A-522151', 'SUB', '051.0A', 'Belanja Jasa Profesi', 21600000],
  ['051.0B', 'UTAMA', '', 'Pengelolaan Informasi dan Komunikasi', 719780000],
  ['051.0B-524111', 'SUB', '051.0B', 'Belanja Perjalanan Dinas Biasa', 694230000],
  ['051.0B-524113', 'SUB', '051.0B', 'Belanja Perjalanan Dinas Dalam Kota', 25550000],
  ['051.0E', 'UTAMA', '', 'Penyebaran Informasi', 2105000000],
  ['051.0E-522191', 'SUB', '051.0E', 'Belanja Jasa Lainnya', 2105000000],
  ['051.0H', 'UTAMA', '', 'Sosialisasi / FGD / Konsinyering', 195492000],
  ['051.0H-521211', 'SUB', '051.0H', 'Belanja Bahan', 18000000],
  ['051.0H-524114', 'SUB', '051.0H', 'Belanja Perjalanan Dinas Paket Meeting Dalam Kota', 177492000],
  ['051.0I', 'UTAMA', '', 'Pembangunan dan Pengembangan Aplikasi Kementerian', 9848482000],
  ['051.0I-536111', 'SUB', '051.0I', 'Belanja Modal Lainnya', 9848482000],
  ['051.0J', 'UTAMA', '', 'Tata Kelola Teknologi Informasi dan SPBE', 173128000],
  ['051.0J-521211', 'SUB', '051.0J', 'Belanja Bahan', 18225000],
  ['051.0J-522131', 'SUB', '051.0J', 'Belanja Jasa Konsultan', 148143000],
  ['051.0J-522151', 'SUB', '051.0J', 'Belanja Jasa Profesi', 5400000],
  ['051.0J-524113', 'SUB', '051.0J', 'Belanja Perjalanan Dinas Dalam Kota', 1360000],
  ['051.0K', 'UTAMA', '', 'Penyusunan Imigrasi dan Pemasyarakatan Dalam Angka', 69660000],
  ['051.0K-521211', 'SUB', '051.0K', 'Belanja Bahan', 69660000],
  ['051.0L', 'UTAMA', '', 'Pengelolaan Statistik Sektoral', 206461000],
  ['051.0L-521211', 'SUB', '051.0L', 'Belanja Bahan', 35693000],
  ['051.0L-522151', 'SUB', '051.0L', 'Belanja Jasa Profesi', 13500000],
  ['051.0L-524113', 'SUB', '051.0L', 'Belanja Perjalanan Dinas Dalam Kota', 3400000],
  ['051.0L-524114', 'SUB', '051.0L', 'Belanja Perjalanan Dinas Paket Meeting Dalam Kota', 153868000],
  ['051.0M', 'UTAMA', '', 'Pengamanan dan Pemeliharaan TI', 7445100000],
  ['051.0M-521211', 'SUB', '051.0M', 'Belanja Bahan', 16200000],
  ['051.0M-522141', 'SUB', '051.0M', 'Belanja Sewa', 7420000000],
  ['051.0M-522151', 'SUB', '051.0M', 'Belanja Jasa Profesi', 7200000],
  ['051.0M-524113', 'SUB', '051.0M', 'Belanja Perjalanan Dinas Dalam Kota', 1700000],
  ['051.0N', 'UTAMA', '', 'Pengadaan Lisensi', 408000000],
  ['051.0N-521111', 'SUB', '051.0N', 'Belanja Keperluan Perkantoran', 408000000]
];

/** Ganti URL ini dengan tautan dokumen bukti yang sebenarnya bila sudah ada. */
var DOK_CONTOH = 'https://drive.google.com/file/d/CONTOH_ID_DOKUMEN/view';

/** [ID_Pencairan, ID_Komponen, Tanggal_Cair, Nominal, Keterangan] */
var DATA_PENCAIRAN = [
  ['PC-0001', '051.0M-522141', '2026-01-30', 3710000000, 'Pembayaran sewa infrastruktur TI tahap I'],
  ['PC-0002', '051.0M-521211', '2026-02-13', 4050000, 'Pengadaan bahan pendukung pemeliharaan'],
  ['PC-0003', '051.0B-524111', '2026-02-20', 45000000, 'Perjalanan dinas monitoring wilayah I'],
  ['PC-0004', '051.0M-522151', '2026-03-05', 1800000, 'Honor narasumber pengamanan siber'],
  ['PC-0005', '051.0A-521211', '2026-03-12', 3240000, 'Bahan rapat penyusunan data statistik'],
  ['PC-0006', '051.0J-524113', '2026-03-27', 170000, 'Transport lokal koordinasi SPBE'],
  ['PC-0007', '051.0A-522151', '2026-04-09', 1800000, 'Honor narasumber pengelolaan data'],
  ['PC-0008', '051.0L-521211', '2026-04-17', 4050000, 'Bahan penyusunan statistik sektoral TW-I'],
  ['PC-0009', '051.0E-522191', '2026-04-22', 149850000, 'Jasa produksi konten publikasi tahap I'],
  ['PC-0010', '051.0J-522151', '2026-05-06', 1800000, 'Honor narasumber tata kelola TI'],
  ['PC-0011', '051.0B-524111', '2026-05-14', 48324000, 'Perjalanan dinas monitoring wilayah II'],
  ['PC-0012', '051.0B-524113', '2026-06-05', 4250000, 'Perjalanan dinas dalam kota TW-II'],
  ['PC-0013', '051.0L-522151', '2026-06-11', 1800000, 'Honor narasumber statistik sektoral'],
  ['PC-0014', '051.0A-521211', '2026-06-18', 3240000, 'Bahan FGD data dan informasi'],
  ['PC-0015', '051.0E-522191', '2026-06-27', 190000000, 'Jasa produksi konten publikasi tahap II'],
  ['PC-0016', '051.0M-522141', '2026-07-02', 3709999993, 'Pembayaran sewa infrastruktur TI tahap II'],
  ['PC-0017', '051.0J-522131', '2026-07-15', 49143000, 'Jasa konsultan audit keamanan informasi'],
  ['PC-0018', '051.0L-521211', '2026-07-21', 4050000, 'Bahan penyusunan statistik sektoral TW-II'],
  ['PC-0019', '051.0B-524111', '2026-07-30', 45000000, 'Perjalanan dinas monitoring wilayah III'],
  ['PC-0020', '051.0M-524113', '2026-08-04', 850000, 'Transport lokal pemeliharaan perangkat'],
  ['PC-0021', '051.0E-522191', '2026-08-08', 149749999, 'Jasa produksi konten publikasi tahap III'],
  ['PC-0022', '051.0B-524113', '2026-08-11', 1190000, 'Perjalanan dinas dalam kota Agustus']
];

/**
 * Isi kedua sheet sekaligus lalu hitung agregat. Cukup jalankan sekali.
 * @param {boolean} tanpaPencairan  true = hanya isi pagu (realisasi 0), sheet
 *                                  Pencairan dibiarkan kosong untuk diisi admin.
 */
function seedDataAwal(tanpaPencairan) {
  setupSpreadsheet();

  // ---- Sheet 1: Anggaran ----
  var shA = sheet(SHEET_ANGGARAN);
  if (shA.getLastRow() > 1) shA.getRange(2, 1, shA.getLastRow() - 1, shA.getLastColumn()).clearContent();
  var barisA = DATA_ANGGARAN.map(function (r) {
    return [r[0], r[1], r[2], r[3], r[4], 0, r[4]];   // realisasi 0, sisa = pagu
  });
  shA.getRange(2, 1, barisA.length, 7).setValues(barisA);
  shA.getRange(2, 5, barisA.length, 3).setNumberFormat('#,##0');

  // ---- Sheet 2: Pencairan ----
  var shP = sheet(SHEET_PENCAIRAN);
  if (shP.getLastRow() > 1) shP.getRange(2, 1, shP.getLastRow() - 1, shP.getLastColumn()).clearContent();
  var jumlahP = 0;
  if (!tanpaPencairan) {
    var sekarang = new Date();
    var barisP = DATA_PENCAIRAN.map(function (r) {
      return [r[0], r[1], r[2], r[3], r[4], DOK_CONTOH, sekarang];
    });
    shP.getRange(2, 1, barisP.length, 7).setValues(barisP);
    shP.getRange(2, 4, barisP.length, 1).setNumberFormat('#,##0');
    shP.getRange(2, 3, barisP.length, 1).setNumberFormat('yyyy-mm-dd');
    jumlahP = barisP.length;
  }

  // ---- Hitung Total_Realisasi & Sisa_Anggaran ----
  recalcAll();
  [SHEET_ANGGARAN, SHEET_PENCAIRAN].forEach(function (n) { sheet(n).autoResizeColumns(1, 7); });

  var pesan = 'Selesai: ' + barisA.length + ' baris Anggaran, ' + jumlahP + ' baris Pencairan. ' +
              'Total realisasi = Rp ' + sumSemuaRealisasi().toLocaleString('id-ID');
  Logger.log(pesan);
  return pesan;
}

/** Isi hanya pagu, tanpa contoh pencairan — untuk mulai dari nol. */
function seedPaguSaja() {
  return seedDataAwal(true);
}

function sumSemuaRealisasi() {
  var v = sheet(SHEET_ANGGARAN).getDataRange().getValues();
  var t = 0;
  for (var i = 1; i < v.length; i++) {
    if (String(v[i][1]).trim().toUpperCase().charAt(0) === 'U') t += Number(v[i][5]) || 0;
  }
  return t;
}
