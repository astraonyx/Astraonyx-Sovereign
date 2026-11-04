// server/services/registry.js — Daftar penyedia lintas-fitur. Modul fitur mendaftar; layanan lintas (pencarian, penyimpanan,
// notifikasi) membacanya saat permintaan datang, jadi urutan pemuatan modul ext tidak penting.
//
//   registerSearch({ domain, label, search(query, { actor, limit }) → [{ id, title, subtitle?, href, icon? }] })
//       href berbentuk rute dashboard, mis. '#/polarium/friends'. Pemilik: F-SRC (akun-core). Penyedia wajib menyaring
//       hasil menurut izin dan privasi pemanggil sendiri (PRD F-SRC, R-07.4): jangan mengembalikan yang tidak boleh dilihat actor.
//   registerStorage({ domain, label, usage(accountId) → { bytes, count } })
//       Pemakaian berkas milik akun di domain itu. Pemilik: F-STO.
//   registerNotificationType({ type, domain, mandatory?, self?, owner })
//       type berbentuk 'ntf.<domain>.<nama>' (PRD R-14.5). mandatory = tidak bisa dimatikan pengguna. self = boleh untuk diri sendiri.
//   registerBlockCheck(fn(accountA, accountB) → boolean)
//       Dipakai notify() untuk melewati pemberitahuan antara dua akun yang saling memblokir. Pemilik: F-MDR (Polarium).
//   registerExport({ domain, label, collect(accountId) → { files: [{ name, json? | text? | buffer? }] } })
//       Data milik akun di domain itu untuk "Data saya" (PRD F-ACC, ekspor). Hanya data milik sendiri; tanpa kata sandi, PIN,
//       kunci API, IP, dan tanpa data orang lain. Nama berkas relatif ('atomic/habits.json'). Dipanggil oleh pekerja ekspor akun.
//   registerTimeZone(fn(accountId) → nama zona IANA | null)
//       Pemilik: akun-core (F-ACC, F-PRO). Pengguna lain memakai kit.userTimeZone(accountId) / kit.localDate(accountId); bawaan Asia/Jakarta (WIB).
//   registerAccountCleanup({ domain, label, cleanup(accountId, { db }) })
//       Dipanggil saat sebuah akun dihapus permanen (setelah masa tunggu 7 hari). Hapus atau anonimkan semua baris milik akun
//       di tabel domain Anda. Berjalan di dalam satu transaksi database milik pemanggil: jangan membuka transaksi sendiri
//       dan jangan menyentuh tabel domain lain.

const searchProviders = new Map();
const storageProviders = new Map();
const notificationTypes = new Map();
const exportProviders = new Map();
const cleanupProviders = new Map();
let blockCheck = () => false;
let timeZoneProvider = () => null;

function need(value, label) {
  if (!value) throw new Error(`registry: ${label} wajib diisi`);
}

function registerSearch(provider) {
  need(provider && provider.domain, 'domain');
  need(typeof provider.search === 'function', 'search()');
  searchProviders.set(provider.domain, { label: provider.domain, ...provider });
}

function registerStorage(provider) {
  need(provider && provider.domain, 'domain');
  need(typeof provider.usage === 'function', 'usage()');
  storageProviders.set(provider.domain, { label: provider.domain, ...provider });
}

function registerNotificationType(def) {
  need(def && def.type && /^ntf\.[a-z0-9_]+\.[a-z0-9_]+$/.test(def.type), "type berbentuk 'ntf.<domain>.<nama>'");
  need(def.domain, 'domain');
  notificationTypes.set(def.type, { mandatory: false, self: false, owner: '', ...def });
}

function registerExport(provider) {
  need(provider && provider.domain, 'domain');
  need(typeof provider.collect === 'function', 'collect()');
  exportProviders.set(provider.domain, { label: provider.domain, ...provider });
}

function registerAccountCleanup(provider) {
  need(provider && provider.domain, 'domain');
  need(typeof provider.cleanup === 'function', 'cleanup()');
  cleanupProviders.set(provider.domain, { label: provider.domain, ...provider });
}

function registerTimeZone(fn) {
  need(typeof fn === 'function', 'fn');
  timeZoneProvider = fn;
}

function registerBlockCheck(fn) {
  need(typeof fn === 'function', 'fn');
  blockCheck = fn;
}

module.exports = {
  registerSearch,
  registerStorage,
  registerNotificationType,
  registerBlockCheck,
  registerExport,
  registerAccountCleanup,
  registerTimeZone,
  searchProviders: () => [...searchProviders.values()],
  storageProviders: () => [...storageProviders.values()],
  notificationTypes: () => [...notificationTypes.values()],
  exportProviders: () => [...exportProviders.values()],
  cleanupProviders: () => [...cleanupProviders.values()],
  getNotificationType: (type) => notificationTypes.get(type) || null,
  timeZoneOf: (accountId) => {
    try { return timeZoneProvider(accountId) || 'Asia/Jakarta'; } catch (_) { return 'Asia/Jakarta'; }
  },
  isBlocked: (a, b) => {
    try { return Boolean(blockCheck(a, b)); } catch (_) { return false; }
  },
};
