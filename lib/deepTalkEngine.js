// lib/deepTalkEngine.js — Midnight Deep Talk Cards Engine
// Terinspirasi dari We're Not Really Strangers & psikologi hubungan interpersonal.
// Menghadirkan pertanyaan reflektif mendalam untuk mencairkan obrolan berkualitas di malam hari.

const { box } = require('./messageStyle');

const DEEP_TALK_DECKS = {
  level1: {
    name: 'Level 1: Perception',
    subtitle: 'Persepsi & Kesan Pertama',
    badge: '👁️ PERCEPTION',
    description: 'Menjelajahi bagaimana kita memandang satu sama lain dari luar sebelum benar-benar mengenal lebih jauh.',
    advice: 'Jawablah berdasarkan impresi awalmu tanpa rasa takut salah.',
    questions: [
      'Apa kesan pertamamu saat pertama kali melihat atau berinteraksi denganku di sini?',
      'Menurutmu, profesi atau panggilan hidup apa yang paling cocok dengan auraku/kepribadianku?',
      'Lagu apa yang langsung terlintas di kepalamu saat memikirkan tentang diriku?',
      'Menurutmu, apa hal yang paling membuat orang lain kagum saat pertama kali mengenalku?',
      'Apa satu hal tentang diriku yang menurutmu sering disalahpahami oleh orang lain?',
      'Berapa persen dari kepribadian aslimu yang berani kamu tunjukkan di obrolan grup ini?',
      'Jika kamu harus menggambarkan energiku hanya dengan 1 kata atau warna, apa kata itu?',
      'Menurutmu, apakah aku tipe orang yang lebih mengandalkan logika atau perasaan saat terluka?',
      'Hal kecil apa dari diriku yang pernah kamu perhatikan, tapi belum pernah kamu katakan?',
      'Menurutmu, apa ketakutan terbesarku yang berusaha aku sembunyikan di balik senyuman?',
      'Jika kita bertemu secara tidak sengaja di sebuah kafe sepi saat hujan, apakah kamu akan menyapaku duluan?',
      'Menurutmu, apa hal yang paling aku butuhkan saat aku sedang merasa lelah atau kewalahan?',
      'Apakah menurutmu aku orang yang mudah memaafkan, atau mudah memendam rasa kecewa?',
      'Apa satu pertanyaan yang selalu ingin kamu tanyakan padaku, tapi selalu kamu urungkan?',
      'Menurutmu, apa kebiasaan unikku yang paling mudah diingat orang lain?',
    ],
  },

  level2: {
    name: 'Level 2: Connection',
    subtitle: 'Koneksi & Kerentanan (Vulnerability)',
    badge: '💬 CONNECTION',
    description: 'Menembus obrolan basa-basi dan membuka pintu kejujuran emosional yang tulus.',
    advice: 'Dengarkan tanpa menghakimi. Kerentanan adalah jembatan menuju kedekatan sejati.',
    questions: [
      'Kapan terakhir kali kamu menangis sendirian di kamarmu, dan apa yang membuatmu merasa serapuh itu?',
      'Apa kebohongan terbesar yang pernah kamu katakan pada dirimu sendiri hanya agar bisa terus bertahan?',
      'Apa satu hal kecil yang pernah dilakukan seseorang untukmu yang tidak pernah bisa kamu lupakan seumur hidupmu?',
      'Pernahkah kamu merasa sangat kesepian bahkan ketika berada di tengah ruangan yang ramai? Ceritakan momen itu.',
      'Jika malam ini adalah malam terakhir kita bisa mengobrol tanpa batas, apa hal paling jujur yang ingin kamu sampaikan padaku?',
      'Apa luka masa lalu yang menurutmu paling membentuk caramu mencintai dan mempercayai orang lain hari ini?',
      'Bagian mana dari hidupmu saat ini yang paling menguras energimu, tapi sulit kamu ceritakan ke siapapun?',
      'Apa hal yang paling kamu rindukan dari dirimu yang dulu sebelum mengenal banyak rasa sakit?',
      'Pernahkah kamu merasa sudah berjuang sekuat tenaga untuk seseorang, tapi tetap merasa tidak cukup dihargai?',
      'Apa satu kalimat yang saat ini paling ingin kamu dengar dari seseorang yang kamu sayangi?',
      'Kapan terakhir kali kamu merasa benar-benar dimengerti oleh seseorang tanpa perlu banyak menjelaskan?',
      'Jika kamu bisa memeluk dirimu sendiri saat berusia 15 tahun, apa yang ingin kamu bisikkan padanya?',
      'Apa penyesalan terbesarmu dalam hal hubungan pertemanan atau percintaan yang masih membekas hingga kini?',
      'Apa ketakutan terbesarmu saat membuka hati kepada orang baru?',
      'Apa hal paling berani yang pernah kamu lakukan demi mempertahankan seseorang yang kamu sayangi?',
    ],
  },

  level3: {
    name: 'Level 3: Reflection',
    subtitle: 'Refleksi Batin & Makna Hubungan',
    badge: '✨ REFLECTION',
    description: 'Menemukan makna terdalam dari perjalanan hidup, kedewasaan, dan kehadiran satu sama lain.',
    advice: 'Bicaralah dari ruang paling tenang di dalam jiwamu.',
    questions: [
      'Pelajaran paling berharga apa yang kamu dapatkan dari orang yang pernah paling mengecewakanmu?',
      'Menurutmu, apa arti kehadiran seseorang yang tulus menurut definisi hatimu saat ini?',
      'Bagian mana dari dirimu yang paling sulit kamu terima atau kamu maafkan hingga detik ini?',
      'Jika kamu bisa mengulang satu hari dalam hidupmu hanya untuk meresapi kebahagiaannya sekali lagi, hari apa itu?',
      'Menurutmu, apa yang membedakan antara "merasa nyaman" dengan "merasa benar-benar dicintai"?',
      'Apa hal paling berharga yang kamu pelajari tentang dirimu sendiri selama 1 tahun terakhir ini?',
      'Bagaimana caramu berdamai dengan kenyataan bahwa tidak semua orang yang baik akan tinggal selamanya dalam hidupmu?',
      'Menurutmu, apa satu hal positif dariku yang secara tidak sadar telah memengaruhi atau menginspirasimu?',
      'Apa doa atau harapan paling tulus yang tersimpan di hatimu untuk masa depan kita masing-masing?',
      'Jika hidup adalah sebuah buku cerita, bab hidup mana yang paling ingin kamu tulis ulang?',
      'Apa definisi sukses dan kedamaian hidup versimu yang sebenarnya setelah melewati banyak fase sulit?',
      'Apakah menurutmu pertemuan kita di obrolan ini adalah sebuah kebetulan biasa atau takdir yang punya tujuan?',
      'Apa satu hal yang paling kamu syukuri dari hidupmu hari ini, sekecil apapun itu?',
      'Jika seseorang menulis surat cinta tentang caramu memperlakukan orang lain, apa kalimat pembukanya?',
      'Apa pesan terakhir yang ingin kamu tinggalkan untuk dunia jika esok hari adalah hari terakhirmu?',
    ],
  },

  wildcard: {
    name: 'Wildcard: Action',
    subtitle: 'Tantangan Spontan & Hangat',
    badge: '🃏 WILDCARD',
    description: 'Aksi nyata dan spontan yang membawa kehangatan, tawa, atau keberanian dalam hubungan.',
    advice: 'Lakukan dengan spontanitas dan ketulusan hati!',
    questions: [
      'Kirimkan rekaman pesan suara (VN) berisi potongan 1 bait lagu yang paling menggambarkan perasaanmu saat ini.',
      'Sebutkan 3 hal tulus yang kamu kagumi dari orang yang kamu reply/tag sekarang juga.',
      'Kirimkan 1 foto di galerimu yang memiliki kenangan paling berharga yang belum pernah kamu ceritakan pada siapapun.',
      'Tatap foto profil orang yang kamu reply selama 15 detik, lalu tuliskan doa paling tulus untuk hidupnya malam ini.',
      'Buatkan 2 baris puisi atau kalimat manis dadakan untuk seseorang di grup ini yang paling sering membuatmu tersenyum.',
      'Tuliskan satu rahasia kecil tentang harimu hari ini yang belum kamu ceritakan kepada siapa pun.',
      'Berikan satu julukan atau panggilan hangat baru untuk orang yang kamu tag yang hanya boleh kamu panggilkan untuknya.',
      'Ceritakan mimpi teraneh atau mimpi terindah yang pernah kamu alami dan masih kamu ingat jelas.',
    ],
  },
};

/**
 * Mengambil kartu deep talk acak berdasarkan level atau acak penuh
 */
function drawCard(levelChoice = 'random') {
  let deckKey = levelChoice.toLowerCase().trim();

  if (deckKey === '1' || deckKey === 'perception') deckKey = 'level1';
  else if (deckKey === '2' || deckKey === 'connection') deckKey = 'level2';
  else if (deckKey === '3' || deckKey === 'reflection') deckKey = 'level3';
  else if (deckKey === 'wildcard' || deckKey === 'action' || deckKey === 'w') deckKey = 'wildcard';
  else {
    // Acak penuh dengan bobot level 1-3 lebih sering
    const keys = ['level1', 'level2', 'level3', 'wildcard'];
    deckKey = keys[Math.floor(Math.random() * keys.length)];
  }

  const deck = DEEP_TALK_DECKS[deckKey] || DEEP_TALK_DECKS.level2;
  const qList = deck.questions;
  const cardIndex = Math.floor(Math.random() * qList.length);
  const question = qList[cardIndex];

  const cardText = box({
    prefix: 'POLARIS DEEP TALK',
    statusTag: deck.badge,
    title: `🎴 ${deck.name.toUpperCase()}`,
    body: `*${deck.subtitle}*\n` +
          `_${deck.description}_\n` +
          `──────────────────────────────\n\n` +
          `❓ *Pertanyaan Refleksi (Card #${cardIndex + 1}):*\n` +
          `"${question}"\n\n` +
          `──────────────────────────────\n` +
          `💡 *Tips Mendengar:* ${deck.advice}`,
    footer: 'Ketik /deeptalk [1/2/3/wildcard] untuk kartu lainnya',
  });

  return {
    deckKey,
    cardIndex: cardIndex + 1,
    question,
    text: cardText,
  };
}

module.exports = {
  DEEP_TALK_DECKS,
  drawCard,
};
