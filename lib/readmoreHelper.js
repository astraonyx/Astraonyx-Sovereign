// lib/readmoreHelper.js — Trik "Baca Selengkapnya" ala WhatsApp.
//
// BUKAN fitur native WhatsApp, ini memanfaatkan cara WhatsApp UI merender
// pesan teks panjang: kalau ada banyak karakter Unicode invisible (U+200E,
// Left-to-Right Mark) yang tetap dihitung sebagai karakter tapi tidak
// tampil, total panjang pesan jadi lewat ambang batas yang bikin WhatsApp
// otomatis melipat sisanya di balik tombol "Baca selengkapnya".
//
// Referensi/amati-tiru-modifikasi dari anxkhn/Peek-a-Chat (versi Python/JS
// client-side, tools serupa sudah lama beredar di komunitas). Rumusnya:
//   visible_text + (U+200E diulang sampai total ~1000 karakter) + hidden_text

const LRM = '\u200E'; // Left-to-Right Mark, invisible tapi terhitung 1 karakter
const TARGET_LENGTH = 1000; // total panjang filler+visible yang bikin WA melipat pesan

function buildReadmore(visibleText, hiddenText) {
  const visible = (visibleText || '').trim();
  const hidden = (hiddenText || '').trim();

  const fillerLength = Math.max(TARGET_LENGTH - visible.length, 0);
  const filler = LRM.repeat(fillerLength);

  return `${visible}${filler}${hidden}`;
}

module.exports = { buildReadmore, LRM, TARGET_LENGTH };
