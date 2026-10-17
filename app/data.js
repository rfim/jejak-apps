// Example data shared by the app screens. All candidates and numbers are invented.
window.JEJAK = (() => {
  const SKILLS = [
    { id: 'laravel', name: 'Laravel / PHP', w: 3 },
    { id: 'mysql', name: 'MySQL & indeks', w: 2 },
    { id: 'lock', name: 'Konkurensi & locking', w: 2 },
    { id: 'api', name: 'Desain REST API', w: 2 },
    { id: 'test', name: 'Testing (Pest)', w: 1 },
    { id: 'eng', name: 'Bahasa Inggris teknis', w: 1 },
  ];

  const SRC = {
    U: { name: 'Uji kerja', trust: 1.0, reads: 'Hasil uji 45 menit yang kamu kerjakan di Jejak.' },
    K: { name: 'Kode publik', trust: 0.8, reads: 'Repositori yang kamu pilih, hanya commit milikmu.' },
    R: { name: 'Referensi terstruktur', trust: 0.6, reads: 'Jawaban atasan yang kontaknya kamu berikan.' },
    S: { name: 'Sertifikasi', trust: 0.5, reads: 'Status sertifikat, dicek langsung ke penerbit.' },
    W: { name: 'Wawancara teknis', trust: 0.5, reads: 'Transkrip wawancara dan nilai rubrik.' },
  };

  const CANDS = [
    {
      id: 'raka', name: 'Raka Pratama', tag: '6 thn pengalaman · 14 kata kunci cocok',
      claim:    { laravel: 5, mysql: 5, lock: 4, api: 5, test: 4, eng: 4 },
      evidence: { laravel: 3, mysql: 2, lock: 1, api: 3, test: 1, eng: 3 },
      ev: [
        { s: 'U', t: 'Uji kerja: potong stok bersamaan', d: 'Solusi lolos uji tunggal, gagal saat dua request berjalan bersamaan. Tidak memakai transaksi atau lockForUpdate.', k: ['lock', 'mysql'], str: 'Kuat', when: '2 hari lalu' },
        { s: 'K', t: '3 repo publik, 2 di antaranya fork tutorial', d: 'Commit asli sedikit; kode CRUD standar tanpa test.', k: ['laravel', 'api', 'test'], str: 'Sedang', when: '3 hari lalu' },
        { s: 'S', t: 'Sertifikat "Laravel Expert"', d: 'Penerbit tidak bisa diverifikasi; tidak ada ujian terawasi.', k: ['laravel'], str: 'Lemah', when: '3 hari lalu' },
        { s: 'W', t: 'Wawancara teknis 30 menit', d: 'Menjelaskan indeks komposit dengan keliru; komunikasi lancar.', k: ['mysql', 'eng'], str: 'Sedang', when: 'Kemarin' },
      ],
      agent: 'Klaim konkurensi gugur di uji kerja. Jangan lanjutkan untuk posisi yang menyentuh stok atau uang tanpa uji ulang.',
    },
    {
      id: 'sinta', name: 'Sinta Wulandari', tag: '3 thn pengalaman · 7 kata kunci cocok',
      claim:    { laravel: 3, mysql: 3, lock: 0, api: 3, test: 2, eng: 3 },
      evidence: { laravel: 4, mysql: 4, lock: 4, api: 4, test: 4, eng: 3 },
      ev: [
        { s: 'K', t: 'PR yang di-merge ke paket open source populer', d: 'Memperbaiki race condition pada penghitung kuota dengan transaksi dan lock baris; menyertakan test dua request bersamaan.', k: ['lock', 'mysql', 'test', 'laravel'], str: 'Kuat', when: '4 hari lalu' },
        { s: 'U', t: 'Uji kerja: potong stok bersamaan', d: 'Lolos, termasuk kasus bersamaan. Menambah test yang tidak diminta.', k: ['lock', 'test', 'laravel'], str: 'Kuat', when: '2 hari lalu' },
        { s: 'R', t: 'Referensi dari lead sebelumnya', d: 'Merancang ulang API pemesanan; "yang paling sering menemukan bug sebelum produksi".', k: ['api', 'laravel'], str: 'Sedang', when: 'Kemarin' },
        { s: 'W', t: 'Wawancara teknis 30 menit', d: 'Penjelasan desain API jelas; membaca dokumentasi Inggris tanpa kesulitan.', k: ['api', 'eng', 'mysql'], str: 'Sedang', when: 'Hari ini' },
      ],
      agent: 'Keahlian konkurensi tidak ada di CV tapi terbukti kuat. Kandidat ini kemungkinan besar tersaring keluar oleh filter kata kunci.',
    },
    {
      id: 'dimas', name: 'Dimas Hakim', tag: '4 thn pengalaman · 10 kata kunci cocok',
      claim:    { laravel: 4, mysql: 4, lock: 3, api: 4, test: 3, eng: 2 },
      evidence: { laravel: 4, mysql: 3, lock: 3, api: 4, test: 2, eng: 4 },
      ev: [
        { s: 'K', t: 'Repo layanan internal yang dibuka atas izin', d: 'Struktur rapi, cakupan test tipis pada modul pembayaran.', k: ['laravel', 'api', 'test'], str: 'Sedang', when: '5 hari lalu' },
        { s: 'U', t: 'Uji kerja: potong stok bersamaan', d: 'Lolos dengan lock pesimistis; tidak menulis test bersamaan.', k: ['lock', 'mysql'], str: 'Kuat', when: '2 hari lalu' },
        { s: 'R', t: 'Referensi dari klien luar negeri', d: 'Dua tahun berkomunikasi langsung dengan tim di Singapura dan Jerman.', k: ['eng', 'api'], str: 'Sedang', when: 'Kemarin' },
      ],
      agent: 'CV merendahkan bahasa Inggrisnya. Cocok untuk integrasi dengan vendor asing; minta uji testing singkat.',
    },
    {
      id: 'ayu', name: 'Ayu Lestari', tag: '5 thn pengalaman · 11 kata kunci cocok',
      claim:    { laravel: 4, mysql: 3, lock: 2, api: 5, test: 3, eng: 4 },
      evidence: { laravel: 3, mysql: 3, lock: 0, api: 4, test: 3, eng: 4 },
      ev: [
        { s: 'K', t: 'Portofolio dokumentasi API publik', d: 'Spesifikasi OpenAPI lengkap dan konsisten untuk 40+ endpoint.', k: ['api', 'eng'], str: 'Kuat', when: '6 hari lalu' },
        { s: 'S', t: 'Sertifikasi cloud terverifikasi penerbit', d: 'Ujian terawasi; relevan sebagian untuk Laravel.', k: ['laravel'], str: 'Sedang', when: '4 hari lalu' },
        { s: 'W', t: 'Wawancara teknis 30 menit', d: 'Menulis test dengan baik; belum pernah menangani transaksi bersamaan.', k: ['test', 'mysql', 'laravel'], str: 'Sedang', when: 'Hari ini' },
      ],
      agent: 'Belum ada bukti konkurensi sama sekali. Kirim uji kerja 45 menit sebelum memutuskan.',
    },
  ];

  return { SKILLS, SRC, CANDS, ROLE: 'Backend Engineer, Laravel' };
})();
