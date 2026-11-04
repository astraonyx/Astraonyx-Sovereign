// server/waygroundEngine.js — Core Engine for Wayground (Quizizz) inside Luminary Studyspace
const crypto = require('crypto');
const { waygroundQueries } = require('./db');
const { askAI } = require('../lib/aiHelper');
const config = require('../config');

// Default High-Quality Curated Quizzes
const DEFAULT_QUIZZES = [
  {
    id: 'wg_fullstack',
    title: 'Fullstack JS, WebSocket & Baileys Mastery',
    description: 'Uji pemahamanmu tentang arsitektur socket Baileys v7, event loop Node.js, async/await, dan manajemen memori buffer.',
    category: 'coding',
    topic: 'Fullstack Engineering & WhatsApp Baileys',
    icon: '⚡',
    difficulty: 'advanced',
    time_limit: 30,
    author: 'Polaris Lead Architect',
    questions: [
      {
        id: 'q_fs_1',
        question: 'Di Baileys v7 multi-device, event apa yang dipancarkan saat bot berhasil memperoleh status koneksi terbuka (terhubung ke server WA)?',
        options: [
          'connection.update dengan connection === "open"',
          'messages.upsert dengan status === "connected"',
          'creds.update dengan status === "ready"',
          'socket.handshake dengan status === "online"'
        ],
        correctAnswer: 0,
        explanation: 'Di Baileys, pemantauan siklus koneksi dilakukan via event "connection.update". Properti update.connection akan bernilai "open" ketika WebSocket terotentikasi.',
        hint: 'Cari event yang memiliki kata "connection" dan properti status "open".',
        points: 1000
      },
      {
        id: 'q_fs_2',
        question: 'Mengapa Buffer.from() atau stream lebih dianjurkan daripada membaca file utuh (fs.readFileSync) saat mendownload media besar di Node.js?',
        options: [
          'Buffer/stream mencegah lonjakan V8 Heap Memory dan Memory Leak pada RAM server',
          'fs.readFileSync otomatis mengenkripsi media dengan AES-GCM',
          'Node.js melarang fs.readFileSync pada protokol WebSocket',
          'Stream membuat file terunduh 10x lebih kecil dari ukuran aslinya'
        ],
        correctAnswer: 0,
        explanation: 'Streaming atau chunk buffering memungkinkan data diproses bertahap per-paket byte tanpa memuat seluruh file gigabyte ke RAM, mencegah OOM (Out Of Memory) crash.',
        hint: 'Fokus pada alokasi memori RAM dan V8 Heap engine.',
        points: 1000
      },
      {
        id: 'q_fs_3',
        question: 'Pada arsitektur single-threaded Node.js, di mana microtasks (Promise.then, queueMicrotask) dieksekusi dalam siklus Event Loop?',
        options: [
          'Tepat setelah fase saat ini selesai, sebelum melanjutkan ke fase macrotask berikutnya',
          'Hanya di fase check (setImmediate)',
          'Di akhir siklus setiap 1 detik sekali secara berkala',
          'Di thread pool libuv secara paralel di latar belakang'
        ],
        correctAnswer: 0,
        explanation: 'Microtask queue (Promise, queueMicrotask, process.nextTick) dieksekusi segera setelah operasi saat ini selesai sebelum event loop melanjutkan ke macrotask (timers, I/O, check) berikutnya.',
        hint: 'Microtask memiliki prioritas lebih tinggi daripada macrotask biasa.',
        points: 1000
      },
      {
        id: 'q_fs_4',
        question: 'Teknik apa yang paling efektif untuk mencegah nomor bot WhatsApp terkena banned saat memproses pesan massal?',
        options: [
          'Exponential jitter delay acak (2-5 detik) dan peniruan status presence (composing / recording)',
          'Mengirimkan 100 pesan sekaligus dalam 1 milidetik tanpa jeda',
          'Menghapus file auth_info secara berulang kali saat runtime',
          'Mengganti port WebSocket setiap kali pesan dikirimkan'
        ],
        correctAnswer: 0,
        explanation: 'Menambahkan artificial jitter delay acak dan mengirimkan signal presence (composing/recording) meniru pola perilaku manusia asli, menghindari deteksi otomatis anti-spam WhatsApp.',
        hint: 'Pola perilaku natural manusia dengan jeda acak.',
        points: 1000
      },
      {
        id: 'q_fs_5',
        question: 'Fitur HTTP header apa yang wajib disertakan pada koneksi WebSocket untuk melakukan upgrade protokol dari HTTP ke WS?',
        options: [
          'Upgrade: websocket dan Connection: Upgrade',
          'Accept: application/websocket dan Keep-Alive: true',
          'Sec-Protocol: raw-binary dan Content-Type: ws/frame',
          'Authorization: Bearer WS dan Cache-Control: no-cache'
        ],
        correctAnswer: 0,
        explanation: 'Handshake WebSocket dimulai dari request HTTP standar dengan header "Upgrade: websocket" dan "Connection: Upgrade" dengan status response 101 Switching Protocols.',
        hint: 'Header dengan kata kunci Upgrade dan Connection.',
        points: 1000
      }
    ]
  },
  {
    id: 'wg_ai_llm',
    title: 'Artificial Intelligence, Transformers & Agentic Architecture',
    description: 'Pahami mekanisme Attention di balik LLM, penalaran multi-step, RAG, dan koordinasi multi-agent.',
    category: 'ai',
    topic: 'Artificial Intelligence & Large Language Models',
    icon: '🧠',
    difficulty: 'advanced',
    time_limit: 30,
    author: 'Hermes Research Division',
    questions: [
      {
        id: 'q_ai_1',
        question: 'Komponen apakah yang bertanggung jawab menghubungkan token satu dengan token lainnya dalam arsitektur Transformer (Vaswani et al.)?',
        options: [
          'Multi-Head Self-Attention Mechanism',
          'Convolutional Max-Pooling Filter',
          'Recurrent Hidden State Memory Gate',
          'Linear Regression Feedforward Layer'
        ],
        correctAnswer: 0,
        explanation: 'Self-Attention menghitung bobot keterkaitan dinamis antara setiap token dalam urutan teks menggunakan matriks Query (Q), Key (K), dan Value (V).',
        hint: 'Mekanisme ini memungkinkan kata memperhatikan kata lain dalam satu kalimat.',
        points: 1000
      },
      {
        id: 'q_ai_2',
        question: 'Apa fungsi utama dari KV-Cache (Key-Value Cache) pada tahap inferensi autoregresif sebuah model bahasa besar?',
        options: [
          'Menghindari komputasi ulang representasi Key dan Value dari token-token sebelumnya pada tiap langkah prediksi',
          'Menyimpan parameter bobot model ke dalam harddisk SSD agar tidak memakan RAM',
          'Menyensor kata-kata tidak sopan sebelum dikirimkan ke pengguna',
          'Menerjemahkan teks bahasa asing ke bahasa Inggris secara otomatis'
        ],
        correctAnswer: 0,
        explanation: 'Pada generasi token berikutnya, KV-Cache menyimpan matriks K dan V dari token masa lalu, memangkas kompleksitas waktu inferensi dari O(N^2) menjadi O(N).',
        hint: 'Cache ini mencegah perhitungan ulang matriks yang sudah dihitung sebelumnya.',
        points: 1000
      },
      {
        id: 'q_ai_3',
        question: 'Dalam pola arsitektur RAG (Retrieval-Augmented Generation), apa langkah pertama sebelum context disuntikkan ke prompt LLM?',
        options: [
          'Mengubah query pengguna menjadi embedding vector lalu melakukan semantic similarity search di Vector Database',
          'Melatih ulang (fine-tuning) seluruh miliaran parameter model dari awal',
          'Mengompres prompt menjadi berkas arsip zip terenkripsi',
          'Mengirimkan query ke server Google Cloud untuk diterjemahkan ke kode C++'
        ],
        correctAnswer: 0,
        explanation: 'RAG mengonversi pertanyaan pengguna menjadi representasi embedding berdimensi tinggi, mencari potongan dokumen paling relevan (cosine similarity) di Vector DB, lalu menyisipkannya ke prompt context.',
        hint: 'Semantic search dengan representasi numerik vektor.',
        points: 1000
      },
      {
        id: 'q_ai_4',
        question: 'Apa perbedaan mendasar antara parameter "Temperature" dan "Top-P" (Nucleus Sampling) dalam sampling LLM?',
        options: [
          'Temperature mengatur keacakan kurva probabilitas (kelembutan softmax), sedangkan Top-P membatasi kandidat ke kumpulan kumulatif persentase teratas',
          'Temperature mengatur jumlah token maksimum, sedangkan Top-P mengatur kecepatan token per detik',
          'Temperature hanya berlaku untuk model OpenAI, sedangkan Top-P hanya untuk model open-source',
          'Keduanya sama persis tanpa ada perbedaan matematis sama sekali'
        ],
        correctAnswer: 0,
        explanation: 'Temperature menskalakan logit sebelum softmax (mendatarkan atau menajamkan distribusi). Top-P memotong ekor probabilitas rendah dengan menjumlahkan probabilitas kumulatif hingga ambang p.',
        hint: 'Satu mengatur skala logit, satu memotong batas kumulatif p.',
        points: 1000
      },
      {
        id: 'q_ai_5',
        question: 'Dalam konsep Autonomous Coding Agent (seperti Hermes), apa yang dimaksud dengan "Multi-Turn Tool Use with Self-Correction"?',
        options: [
          'Agen mengeksekusi aksi (baca file/jalankan perintah), menerima error kembali sebagai observasi, lalu memperbaiki rencananya secara mandiri',
          'Agen meminta pengguna menulis ulang kode setiap kali terjadi kegagalan sistem',
          'Agen otomatis mematikan server jika mendeteksi bug sintaksis',
          'Agen mengubah bahasa pemrograman menjadi HTML tanpa persetujuan'
        ],
        correctAnswer: 0,
        explanation: 'Self-correction memungkinkan LLM bertindak dalam loop: Thought -> Action -> Observation (error) -> Reflection -> Fixed Action hingga tugas tuntas tanpa intervensi manual.',
        hint: 'Siklus observasi error yang memicu perbaikan mandiri.',
        points: 1000
      }
    ]
  },
  {
    id: 'wg_crypto',
    title: 'Modern Cryptography, AES-256 & Signal Protocol',
    description: 'Kuasai kriptografi simetris, asimetris, Diffie-Hellman key exchange, dan arsitektur rahasia pesan E2EE.',
    category: 'security',
    topic: 'Cybersecurity, Cryptography & Privacy',
    icon: '🔐',
    difficulty: 'advanced',
    time_limit: 30,
    author: 'Polaris Sanctum Security',
    questions: [
      {
        id: 'q_cr_1',
        question: 'Mengapa mode AES-256-GCM lebih aman dan modern dibandingkan mode AES-256-CBC biasa?',
        options: [
          'AES-GCM menyediakan AEAD (Authenticated Encryption with Associated Data) yang mendeteksi manipulasi ciphertext (tampering)',
          'AES-CBC tidak memerlukan kunci enkripsi sama sekali',
          'AES-GCM hanya bisa didekripsi oleh pihak kepolisian internasional',
          'AES-CBC memiliki panjang kunci 1024 bit sedangkan GCM hanya 128 bit'
        ],
        correctAnswer: 0,
        explanation: 'AES-GCM menghasilkan Authentication Tag bersamaan dengan ciphertext. Jika ada pihak yang memodifikasi 1 bit ciphertext, dekripsi akan gagal seketika, mencegah padding oracle attack.',
        hint: 'AEAD menggabungkan enkripsi dan verifikasi integritas data.',
        points: 1000
      },
      {
        id: 'q_cr_2',
        question: 'Dalam protokol pertukaran kunci Diffie-Hellman (ECDH), apa yang dihitung oleh kedua pihak untuk menghasilkan Shared Secret yang sama?',
        options: [
          'Mengalikan Private Key milik sendiri dengan Public Key milik lawan bicara',
          'Mengirimkan Private Key secara terbuka melalui jaringan internet',
          'Menggabungkan password akun Facebook kedua belah pihak',
          'Membuat hash MD5 dari alamat IP router pengirim'
        ],
        correctAnswer: 0,
        explanation: 'Pada ECDH berbasis kurva eliptik: Alice menghitung (privAlice * pubBob) dan Bob menghitung (privBob * pubAlice). Keduanya menghasilkan titik kurva yang identik secara matematis.',
        hint: 'Kombinasi kunci privat sendiri dengan kunci publik pihak kedua.',
        points: 1000
      },
      {
        id: 'q_cr_3',
        question: 'Apa fungsi utama dari protokol "Double Ratchet Algorithm" yang digunakan pada Signal dan WhatsApp E2EE?',
        options: [
          'Menyediakan Perfect Forward Secrecy dan Post-Compromise Security untuk setiap pesan individual',
          'Membuat pesan WhatsApp terkirim 2 kali lebih cepat dari SMS biasa',
          'Menyimpan salinan kunci enkripsi di server Meta untuk keperluan audit',
          'Mengubah format teks pesan menjadi file suara terkompresi'
        ],
        correctAnswer: 0,
        explanation: 'Double Ratchet memutar kunci KDF (Key Derivation Function) pada setiap pesan (Symmetric Ratchet) dan setiap respons (DH Ratchet), sehingga kompromi satu kunci tidak membuka pesan masa lalu atau masa depan.',
        hint: 'Perlindungan kunci pesan masa lalu dan pemulihan otomatis setelah kebocoran.',
        points: 1000
      },
      {
        id: 'q_cr_4',
        question: 'Berapakah ukuran Initialization Vector (IV / Nonce) yang direkomendasikan secara standar untuk algoritma AES-GCM?',
        options: [
          '12 bytes (96 bits)',
          '64 bytes (512 bits)',
          '1 byte (8 bits)',
          '128 bytes (1024 bits)'
        ],
        correctAnswer: 0,
        explanation: 'NIST merekomendasikan IV berukuran tepat 96 bit (12 byte) untuk AES-GCM karena dioptimalkan secara langsung tanpa perlu hashing tambahan GHASH.',
        hint: 'Tepat 12 byte atau 96 bit.',
        points: 1000
      },
      {
        id: 'q_cr_5',
        question: 'Konsep kriptografi tingkat lanjut apakah yang memungkinkan seseorang membuktikan bahwa ia mengetahui rahasia tanpa pernah membocorkan rahasia itu sendiri?',
        options: [
          'Zero-Knowledge Proofs (ZKP)',
          'Caesar Cipher Substitution',
          'Base64 URL Encoding',
          'Single-Factor Authentication'
        ],
        correctAnswer: 0,
        explanation: 'Zero-Knowledge Proof (seperti zk-SNARKs) membuktikan kebenaran suatu proposisi matematis kepada verifikator tanpa mengungkapkan informasi atau variabel rahasia itu sendiri.',
        hint: 'Istilah "Zero-Knowledge" membuktikan kebenaran tanpa membocorkan data.',
        points: 1000
      }
    ]
  },
  {
    id: 'wg_chess',
    title: 'Stockfish Engine, Opening Theory & Minimax',
    description: 'Kuasai algoritma catur canggih, evaluasi NNUE centipawn, PGN parsing, dan taktik grandmaster.',
    category: 'chess',
    topic: 'Chess Algorithms, Tactics & Stockfish NNUE',
    icon: '♟️',
    difficulty: 'intermediate',
    time_limit: 30,
    author: 'Starlium Grandmaster',
    questions: [
      {
        id: 'q_ch_1',
        question: 'Teknik optimasi apakah yang memangkas cabang pohon pencarian (search tree) pada algoritma Minimax catur tanpa memengaruhi hasil evaluasi terbaik?',
        options: [
          'Alpha-Beta Pruning',
          'Monte Carlo Stochastic Drop',
          'Linear Gradient Descent',
          'QuickSort Partitioning'
        ],
        correctAnswer: 0,
        explanation: 'Alpha-Beta pruning mengabaikan langkah-langkah yang terbukti lebih buruk daripada langkah yang sudah ditemukan sebelumnya, memangkas pohon pencarian hingga setengah kedalaman secara eksponensial.',
        hint: 'Dua huruf Yunani pertama untuk pemangkasan pohon.',
        points: 1000
      },
      {
        id: 'q_ch_2',
        question: 'Apa arti nilai evaluasi "+150" centipawns yang diberikan oleh Stockfish pada sebuah posisi catur?',
        options: [
          'Putih unggul setara dengan 1.5 pion (pion dihitung 100 centipawns)',
          'Hitam akan melakukan skakmat dalam 150 langkah',
          'Permainan telah berlangsung selama 150 menit',
          'Putih memiliki kelebihan 150 perwira di atas papan'
        ],
        correctAnswer: 0,
        explanation: 'Dalam representasi mesin catur, 1 pion bernilai 100 centipawns. Nilai positif menunjukkan keunggulan Putih, sehingga +150 berarti Putih unggul 1.5 pion.',
        hint: '100 centipawn sama dengan 1 pion penuh.',
        points: 1000
      },
      {
        id: 'q_ch_3',
        question: 'Apakah kepanjangan dan fungsi dari teknologi "NNUE" pada Stockfish modern?',
        options: [
          'Efficiently Updatable Neural Network — jaringan saraf tiruan cepat yang berjalan pada CPU untuk fungsi evaluasi posisi',
          'New Normal Universal Engine — sistem grafis 3D untuk bidak catur',
          'Node Network Underflow Error — penanda bug saat mesin kehabisan memori',
          'Non-Neutral Uniform Endgame — database endgame 7 bidak Tablebase'
        ],
        correctAnswer: 0,
        explanation: 'NNUE (Efficiently Updatable Neural Network) menggantikan evaluasi manual heuristik dengan jaringan saraf ringan yang hanya memperbarui perbedaan langkah bidak, menjadikannya sangat cepat di CPU.',
        hint: 'Neural network yang dapat diperbarui secara efisien saat langkah bidak bergeser.',
        points: 1000
      },
      {
        id: 'q_ch_4',
        question: 'Dalam teori pembukaan catur, langkah pertama 1. e4 c5 dikenal sebagai pembukaan apa?',
        options: [
          'Pertahanan Sisilia (Sicilian Defense)',
          'Pertahanan Prancis (French Defense)',
          'Ruy Lopez (Spanish Opening)',
          'Gambit Ratu (Queen\'s Gambit)'
        ],
        correctAnswer: 0,
        explanation: '1. e4 c5 adalah Pertahanan Sisilia, respons asimetris paling agresif dan populer di level Grandmaster untuk merebut kontrol petak d4.',
        hint: 'Nama sebuah pulau terkenal di Italia bagian selatan.',
        points: 1000
      },
      {
        id: 'q_ch_5',
        question: 'Notasi baku FEN (Forsyth-Edwards Notation) digunakan dalam pemrograman catur untuk merepresentasikan apa?',
        options: [
          'Kondisi snapshot lengkap penempatan bidak di atas papan catur pada satu waktu spesifik',
          'Daftar seluruh langkah dari awal hingga akhir pertandingan',
          'Riwayat nama dan rating Elo kedua pemain catur',
          'Analisis grafis eval bar dan statistik akurasi gerakan'
        ],
        correctAnswer: 0,
        explanation: 'FEN mendeskripsikan secara ringkas posisi bidak per-baris papan, giliran melangkah, hak rokade, petak en passant, dan counter halfmove.',
        hint: 'Snapshot posisi satu kali, berbeda dengan PGN yang mencatat seluruh jalannya game.',
        points: 1000
      }
    ]
  },
  {
    id: 'wg_physics',
    title: 'First-Principles Physics & Quantum Mechanics',
    description: 'Eksplorasi hukum alam semesta: termodinamika, relativitas, kuantum superposisi, dan reduksi logika fundamental.',
    category: 'science',
    topic: 'Fundamental Physics, Quantum & Thermodynamics',
    icon: '🔬',
    difficulty: 'advanced',
    time_limit: 30,
    author: 'Polymath Science Guild',
    questions: [
      {
        id: 'q_ph_1',
        question: 'Menurut Hukum Kedua Termodinamika, apa yang selalu bertambah atau tidak pernah berkurang pada sistem yang terisolasi?',
        options: [
          'Entropi (derajat ketidakteraturan sistem)',
          'Suhu total dalam skala Kelvin',
          'Massa jenis partikel penyusun materi',
          'Gaya gravitasi antar atom'
        ],
        correctAnswer: 0,
        explanation: 'Hukum Kedua Termodinamika menyatakan bahwa dalam sistem terisolasi, entropi (tingkat keacakan/disorder) cenderung selalu meningkat seiring berjalannya waktu, mendefinisikan panah waktu (Arrow of Time).',
        hint: 'Ukuran keacakan atau ketidakteraturan termodinamika.',
        points: 1000
      },
      {
        id: 'q_ph_2',
        question: 'Fenomena kuantum apakah yang menggambarkan kondisi di mana partikel berada di berbagai kemungkinan keadaan sekaligus sebelum dilakukan pengukuran?',
        options: [
          'Superposisi Kuantum (Quantum Superposition)',
          'Difraksi Elektromagnetik Klasik',
          'Radiasi Benda Hitam Spektral',
          'Efek Doppler Akustik'
        ],
        correctAnswer: 0,
        explanation: 'Superposisi kuantum (dicontohkan secara metaforis oleh Kucing Schrödinger) menyatakan bahwa fungsi gelombang partikel merepresentasikan kombinasi probabilitas sebelum runtuh (wave-function collapse) saat diobservasi.',
        hint: 'Keadaan ganda sebelum observasi menyebabkan keruntuhan fungsi gelombang.',
        points: 1000
      },
      {
        id: 'q_ph_3',
        question: 'Prinsip Ketidakpastian Heisenberg membuktikan bahwa kita tidak dapat mengukur pasangan besaran fisik apa secara bersamaan dengan presisi tak terbatas?',
        options: [
          'Posisi (x) dan Momentum (p)',
          'Massa dan Volume partikel',
          'Suhu dan Tekanan gas ideal',
          'Muatan listrik dan Arus listrik'
        ],
        correctAnswer: 0,
        explanation: 'Rumus Δx * Δp >= ħ/2 menunjukkan bahwa semakin presisi posisi suatu partikel diketahui, semakin besar ketidakpastian dalam menentukan momentumnya.',
        hint: 'Lokasi keberadaan dan besaran momentum gerak.',
        points: 1000
      },
      {
        id: 'q_ph_4',
        question: 'Metode berpikir "First-Principles Thinking" (dipopulerkan oleh Aristoteles & Richard Feynman) mengharuskan kita untuk:',
        options: [
          'Mendekonstruksi suatu masalah ke kebenaran paling mendasar yang tidak bisa diragukan lagi, lalu membangun solusi baru dari fondasi tersebut',
          'Meniru cara kerja kompetitor yang sudah sukses tanpa melakukan modifikasi',
          'Mencari jawaban tercepat berdasarkan opini terbanyak di media sosial',
          'Mengasumsikan bahwa tradisi lama adalah satu-satunya kebenaran mutlak'
        ],
        correctAnswer: 0,
        explanation: 'First Principles menolak analogi atau meniru kebiasaan. Kita membedah masalah hingga fakta ilmiah paling fundamental, kemudian merancang arsitektur solusi dari nol.',
        hint: 'Membongkar masalah ke kebenaran paling mendasar, bukan sekadar meniru analogi.',
        points: 1000
      },
      {
        id: 'q_ph_5',
        question: 'Partikel elementer apakah yang bertindak sebagai pembawa gaya interaksi elektromagnetik di alam semesta?',
        options: [
          'Foton (Photon)',
          'Gluon',
          'Graviton hipotetis',
          'Higgs Boson'
        ],
        correctAnswer: 0,
        explanation: 'Foton adalah kuantum energi cahaya dan partikel pengemban (gauge boson) untuk seluruh interaksi gaya elektromagnetik dalam Model Standar fisika partikel.',
        hint: 'Kuantum partikel cahaya tanpa massa diam.',
        points: 1000
      }
    ]
  },
  {
    id: 'wg_english',
    title: 'Advanced English Fluency, Idioms & Rhetoric',
    description: 'Tingkatkan penguasaan bahasa Inggris tingkat tinggi (C1/C2): idiom diplomatik, perbedaan British vs US, dan kosakata elegan.',
    category: 'languages',
    topic: 'C1/C2 English Master, Idiomatic Phrasings & Diction',
    icon: '🇬🇧',
    difficulty: 'intermediate',
    time_limit: 30,
    author: 'Polymath Linguistic Chair',
    questions: [
      {
        id: 'q_en_1',
        question: 'What does the diplomatic idiom "to play devil\'s advocate" truly mean?',
        options: [
          'To argue against an idea simply to test the strength of the argument, not because you necessarily disagree',
          'To promote evil and harmful deeds inside an organization',
          'To hire an expensive legal attorney for criminal defense',
          'To completely abandon a project before it finishes'
        ],
        correctAnswer: 0,
        explanation: '"Playing devil\'s advocate" means taking an opposing viewpoint in a discussion specifically to critically examine assumptions and stress-test the validity of a proposal.',
        hint: 'Arguing an opposing view to test and strengthen reasoning.',
        points: 1000
      },
      {
        id: 'q_en_2',
        question: 'Which of the following word pairs correctly contrasts British English vs American English for the same item?',
        options: [
          'Pavement (UK) vs Sidewalk (US)',
          'Apartment (UK) vs Flat (US)',
          'Elevator (UK) vs Lift (US)',
          'Trunk (UK) vs Boot (US)'
        ],
        correctAnswer: 0,
        explanation: 'In British English, the pedestrian path beside a road is the "pavement", whereas in American English it is called the "sidewalk". Note that Flat is UK (Apartment is US), and Lift is UK (Elevator is US).',
        hint: 'British people walk on the pavement, Americans walk on the sidewalk.',
        points: 1000
      },
      {
        id: 'q_en_3',
        question: 'What does the sophisticated adjective "ephemeral" describe?',
        options: [
          'Lasting for a very short, fleeting time; transitory',
          'Permanent, unyielding and indestructible through centuries',
          'Deeply religious and strictly orthodox',
          'Unusually heavy and difficult to carry physically'
        ],
        correctAnswer: 0,
        explanation: '"Ephemeral" means short-lived, transient, or fleeting (e.g., "ephemeral beauty of a cherry blossom"). Its antonym is eternal or permanent.',
        hint: 'Something that only lasts for a brief fleeting moment.',
        points: 1000
      },
      {
        id: 'q_en_4',
        question: 'In professional negotiation, what does the idiom "the elephant in the room" refer to?',
        options: [
          'An obvious major problem or controversial issue that people avoid discussing because it is uncomfortable',
          'A very wealthy and influential investor who sponsors the meeting',
          'A catastrophic computer network outage during a presentation',
          'A physical trophy awarded to the most outstanding participant'
        ],
        correctAnswer: 0,
        explanation: '"The elephant in the room" signifies a massive, conspicuous truth or issue that everyone is aware of, yet no one wants to mention due to awkwardness.',
        hint: 'An enormous undeniable problem that everyone avoids mentioning.',
        points: 1000
      },
      {
        id: 'q_en_5',
        question: 'Choose the grammatically immaculate sentence suitable for an executive academic paper:',
        options: [
          'Neither the researchers nor the principal investigator was aware of the anomaly until the dataset was compiled.',
          'Neither the researchers nor the principal investigator were aware of the anomaly until the dataset was compiled.',
          'Either the data or the findings is completely invalid without further review.',
          'The group of scientists have decided to publish their findings without peer consensus.'
        ],
        correctAnswer: 0,
        explanation: 'Under subject-verb agreement rules for "neither... nor...", the verb agrees with the closer subject ("the principal investigator" -> singular "was").',
        hint: 'Look for proximity agreement with the singular closer subject "was".',
        points: 1000
      }
    ]
  },
  {
    id: 'wg_stoic',
    title: 'Stoic Philosophy, Epistemology & Logical Fallacies',
    description: 'Kuasai Stoikisme Marcus Aurelius, Dichotomy of Control, dekonstruksi logical fallacies, dan berpikir jernih tanpa bias.',
    category: 'philosophy',
    topic: 'Stoicism, Epistemology, Logic & Critical Thinking',
    icon: '🏛️',
    difficulty: 'intermediate',
    time_limit: 30,
    author: 'Seneca Philosophical Circle',
    questions: [
      {
        id: 'q_st_1',
        question: 'Prinsip fundamental "Dichotomy of Control" yang diajarkan oleh Epictetus menyatakan bahwa:',
        options: [
          'Hal-hal di dunia terbagi dua: apa yang berada dalam kendali kita (pikiran, aksi kita) dan apa yang di luar kendali kita (opini orang, takdir eksternal)',
          'Seseorang harus mengontrol seluruh anggota keluarga dan rekan kerjanya tanpa toleransi',
          'Pemerintah harus membagi kekuasaan menjadi monarki dan demokrasi sekaligus',
          'Semua hal di dunia ini dapat dikontrol sepenuhnya jika memiliki cukup kekayaan'
        ],
        correctAnswer: 0,
        explanation: 'Dichotomy of Control membedakan hal-hal yang dapat kita kendalikan (kehendak, pertimbangan nilai, tindakan kita sendiri) dan hal-hal di luar kendali kita (perilaku orang lain, cuaca, reputasi). Ketenangan batin tercapai dengan berfokus pada yang pertama.',
        hint: 'Fokus pada apa yang ada di dalam pikiran dan tindakan kita sendiri.',
        points: 1000
      },
      {
        id: 'q_st_2',
        question: 'Logical fallacy apakah yang terjadi ketika seseorang menyerang karakter atau kepribadian lawan debat alih-alih membantah argumennya?',
        options: [
          'Argumentum Ad Hominem',
          'Straw Man Fallacy',
          'False Dilemma / Black-or-White',
          'Post Hoc Ergo Propter Hoc'
        ],
        correctAnswer: 0,
        explanation: 'Ad Hominem menyerang individu (latar belakang, fisik, motif pribadi) daripada konten logika dari klaim yang disampaikannya.',
        hint: 'Menyerang orangnya ("Hominem"), bukan argumen logikanya.',
        points: 1000
      },
      {
        id: 'q_st_3',
        question: 'Ungkapan Stoikisme terkenal "Amor Fati" yang juga diresapi oleh Friedrich Nietzsche memiliki makna:',
        options: [
          'Mencintai dan merangkul takdir hidup secara utuh, baik suka maupun duka, sebagai bahan bakar pertumbuhan jiwa',
          'Menyerah pasrah pada keadaan tanpa pernah berusaha memperbaiki diri',
          'Membenci takdir buruk dan menyalahkan orang tua atas kemalangan hidup',
          'Mengumpulkan sebanyak mungkin harta duniawi sebelum usia tua'
        ],
        correctAnswer: 0,
        explanation: 'Amor Fati bukan sekadar pasrah (resignation), melainkan mencintai apapun yang terjadi ("Love of Fate") dan memanfaatkannya sebagai sarana mengasah kebajikan dan ketangguhan karakter.',
        hint: 'Cinta pada takdir apa pun yang datang menghampiri.',
        points: 1000
      },
      {
        id: 'q_st_4',
        question: 'Apa perbedaan mendasar antara System 1 dan System 2 dalam teori kognitif Daniel Kahneman (Thinking, Fast and Slow)?',
        options: [
          'System 1 beroperasi otomatis, cepat, intuitif, dan hemat energi; System 2 lambat, deliberatif, logis, dan menuntut konsentrasi tinggi',
          'System 1 khusus memproses bahasa pemrograman, System 2 memproses seni lukis',
          'System 1 berada di otak kiri, System 2 berada di otak kanan secara anatomis terpisah',
          'System 1 hanya aktif saat tidur, System 2 aktif saat siang hari'
        ],
        correctAnswer: 0,
        explanation: 'System 1 bekerja secara otomatis dan spontan (sering rentan bias heuristik). System 2 memerlukan usaha sadar untuk melakukan kalkulasi rumit dan penalaran kritis.',
        hint: 'Satu cepat otomatis intuitif, satu lambat terencana analitis.',
        points: 1000
      },
      {
        id: 'q_st_5',
        question: 'Apakah yang dimaksud dengan "Straw Man Fallacy" dalam diskusi kritis?',
        options: [
          'Mendistorsi atau melebih-lebihkan argumen lawan menjadi versi yang lemah dan konyol agar mudah diserang',
          'Menggunakan analogi boneka jerami di persawahan untuk mengusir burung',
          'Mengulang-ulang kebohongan hingga orang percaya sebagai kebenaran',
          'Mengajukan pertanyaan yang jawabannya sudah diasumsikan sebelumnya'
        ],
        correctAnswer: 0,
        explanation: 'Straw Man membuat "orang-orangan sawah" dari argumen lawan — versi yang dipelintir dan disederhanakan secara ekstrem — lalu menghancurkannya untuk memberi ilusi telah memenangkan debat.',
        hint: 'Membuat versi palsu yang mudah dirobohkan dari argumen lawan.',
        points: 1000
      }
    ]
  },
  {
    id: 'wg_polymath',
    title: 'Cosmic Trivia & Polymath General Knowledge',
    description: 'Uji wawasan luasmu dalam sejarah peradaban, geografi dunia, keajaiban sains kosmik, dan misteri bumi.',
    category: 'trivia',
    topic: 'World Trivia, History, Astronomy & Geography',
    icon: '🪐',
    difficulty: 'medium',
    time_limit: 25,
    author: 'Polaris Cosmography',
    questions: [
      {
        id: 'q_po_1',
        question: 'Planet manakah di tata surya kita yang memiliki rotasi berlawanan arah jarum jam (retrograde) dibandingkan mayoritas planet lain?',
        options: [
          'Venus',
          'Mars',
          'Jupiter',
          'Merkurius'
        ],
        correctAnswer: 0,
        explanation: 'Venus berotasi dari timur ke barat (retrograde rotation). Matahari di Venus terbit di barat dan terbenam di timur, dengan periode rotasi lebih lambat daripada periode revolusinya.',
        hint: 'Planet terpanas di tata surya yang sering disebut Bintang Kejora.',
        points: 1000
      },
      {
        id: 'q_po_2',
        question: 'Titik terdalam di seluruh samudra bumi yang terletak di Palung Mariana adalah:',
        options: [
          'Challenger Deep (kedalaman ~10.994 meter)',
          'Java Trench (Palung Jawa)',
          'Puerto Rico Trench',
          'Sunda Abyss'
        ],
        correctAnswer: 0,
        explanation: 'Challenger Deep di bagian selatan Palung Mariana adalah titik paling dalam di lautan bumi dengan kedalaman hampir 11 kilometer di bawah permukaan laut.',
        hint: 'Dinamakan berdasarkan ekspedisi kapal penjelajah HMS Challenger.',
        points: 1000
      },
      {
        id: 'q_po_3',
        question: 'Perpustakaan legendaris dunia kuno yang menjadi pusat ilmu pengetahuan terbesar di era Helenistik bernama:',
        options: [
          'Perpustakaan Agung Aleksandria di Mesir',
          'House of Wisdom (Bayt al-Hikma) di Baghdad',
          'Perpustakaan Ashurbanipal di Niniwe',
          'Perpustakaan Celsus di Efesus'
        ],
        correctAnswer: 0,
        explanation: 'Perpustakaan Aleksandria didirikan di bawah dinasti Ptolemaik di Mesir pada abad ke-3 SM dan menyimpan ratusan ribu gulungan papirus dari berbagai penjuru peradaban kuno.',
        hint: 'Dinamakan dari nama penakluk Makedonia, Aleksander Agung.',
        points: 1000
      },
      {
        id: 'q_po_4',
        question: 'Unsur kimia apakah yang paling melimpah di seluruh alam semesta teramati (observable universe)?',
        options: [
          'Hidrogen (~75% massa baryonik)',
          'Helium',
          'Oksigen',
          'Karbon'
        ],
        correctAnswer: 0,
        explanation: 'Hidrogen (H) adalah unsur paling sederhana dan mencakup sekitar 75% dari seluruh materi biasa di alam semesta, dibentuk saat masa Big Bang Nucleosynthesis.',
        hint: 'Unsur nomor atom 1 pada tabel periodik.',
        points: 1000
      },
      {
        id: 'q_po_5',
        question: 'Siapakah matematikawan jenius asal India yang secara intuitif menemukan ribuan rumus deret tak hingga dan fungsi partisi tanpa pendidikan formal?',
        options: [
          'Srinivasa Ramanujan',
          'Aryabhata',
          'Brahmagupta',
          'Satyendra Nath Bose'
        ],
        correctAnswer: 0,
        explanation: 'Srinivasa Ramanujan (1887–1920) menghasilkan kontribusi revolusioner pada analisis matematika, teori bilangan, deret tak terhingga, dan pecahan berlanjut bersama G.H. Hardy di Cambridge.',
        hint: 'Tokoh di balik film biopik "The Man Who Knew Infinity".',
        points: 1000
      }
    ]
  }
];

// Active In-Memory Multiplayer Lobbies
const activeLobbies = new Map();

/**
 * Initialize Default Curated Quizzes into SQLite Database
 */
function initDefaultQuizzes() {
  try {
    const existing = waygroundQueries.getAllQuizzes();
    if (existing.length === 0) {
      console.log('[Wayground] Initializing 8 curated default quizzes into SQLite...');
      for (const quiz of DEFAULT_QUIZZES) {
        waygroundQueries.saveQuiz(quiz);
      }
      console.log('[Wayground] Default quizzes initialized successfully.');
    }
  } catch (err) {
    console.error('[Wayground] Error initializing default quizzes:', err.message);
  }
}

// Call init on module load
initDefaultQuizzes();

/**
 * Generate AI Quiz from Prompt, Document Text, or PDF Content
 */
async function generateQuizWithAI({ topic, text, questionCount = 5, difficulty = 'medium', language = 'id' }) {
  const count = Math.min(Math.max(parseInt(questionCount, 10) || 5, 3), 15);
  const diff = ['easy', 'medium', 'hard', 'advanced'].includes(String(difficulty).toLowerCase()) ? difficulty : 'medium';
  
  const subjectDescription = (topic || '').trim() || (text ? text.slice(0, 300) : 'General Knowledge');

  const systemPrompt = `Kamu adalah Wayground AI Engine — Arsitek Kuis Interaktif & Edukasi Kelas Dunia (standar Quizizz / Wayground).
Tugasmu adalah membuat kuis berkualitas tinggi, menantang, mendidik, dan terstruktur rapi.

ATURAN WAJIB FORMAT:
Output HARUS murni format JSON tunggal tanpa teks pengantar, tanpa markdown codeblock ticks.
Struktur JSON:
{
  "title": "Judul Kuis yang Menarik",
  "description": "Deskripsi singkat dan jelas materi yang diuji",
  "category": "coding|ai|security|science|languages|philosophy|chess|trivia",
  "topic": "${subjectDescription.slice(0, 80)}",
  "difficulty": "${diff}",
  "time_limit": 30,
  "icon": "🧠",
  "questions": [
    {
      "id": "q_1",
      "question": "Teks pertanyaan yang jelas dan menguji konsep?",
      "options": [
        "Pilihan A (teks lengkap)",
        "Pilihan B (teks lengkap)",
        "Pilihan C (teks lengkap)",
        "Pilihan D (teks lengkap)"
      ],
      "correctAnswer": 0, // angka index 0, 1, 2, atau 3
      "explanation": "Penjelasan mendalam mengapa opsi ini benar dan konsep ilmiah di baliknya",
      "hint": "Petunjuk mini untuk pemain",
      "points": 1000
    }
  ]
}

PENTING:
- Pastikan ada tepat ${count} butir soal di dalam array questions.
- Setiap soal wajib memiliki 4 opsi jawaban yang masuk akal dan menantang (tidak ada opsi konyol atau asal-asalan).
- correctAnswer harus berupa integer 0, 1, 2, atau 3.
- Gunakan bahasa ${language === 'en' ? 'Inggris (English)' : 'Indonesia yang elegan dan artikulatif'}.`;

  const userPrompt = text && text.trim()
    ? `Buatkan kuis edukatif sebanyak ${count} soal berdasarkan dokumen/teks berikut:\n\n${text.slice(0, 3500)}\n\nTopik fokus: ${topic || 'Ringkasan Dokumen'}. Tingkat kesulitan: ${diff}.`
    : `Buatkan kuis edukatif sebanyak ${count} soal tentang topik "${subjectDescription}". Tingkat kesulitan: ${diff}. Pastikan konsepnya akurat, mendalam, dan menarik.`;

  try {
    const aiRes = await askAI(userPrompt, config, [], systemPrompt);
    if (aiRes && aiRes.success && aiRes.text) {
      let rawJson = aiRes.text.trim();
      // Bersihkan jika terbungkus ```json ... ```
      if (rawJson.startsWith('```')) {
        rawJson = rawJson.replace(/^```(?:json)?\s*/i, '').replace(/```$/i, '').trim();
      }

      const parsed = JSON.parse(rawJson);
      if (parsed && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
        // Validasi dan normalisasi tiap pertanyaan
        const normalizedQuestions = parsed.questions.map((q, idx) => ({
          id: `q_ai_${Date.now()}_${idx + 1}`,
          question: String(q.question || `Pertanyaan ${idx + 1}`),
          options: Array.isArray(q.options) && q.options.length >= 2 ? q.options.slice(0, 4) : ['Benar', 'Salah', 'Kurang Tepat', 'Tidak Relevan'],
          correctAnswer: typeof q.correctAnswer === 'number' && q.correctAnswer >= 0 && q.correctAnswer < (q.options?.length || 4) ? q.correctAnswer : 0,
          explanation: String(q.explanation || 'Konsep ini adalah jawaban yang paling tepat.'),
          hint: String(q.hint || 'Pikirkan prinsip dasarnya.'),
          points: 1000
        }));

        const finalQuiz = {
          id: `wg_ai_${Date.now()}`,
          title: String(parsed.title || `Kuis: ${subjectDescription}`),
          description: String(parsed.description || `Kuis hasil generasi AI cerdas seputar topik ${subjectDescription}`),
          category: String(parsed.category || 'ai'),
          topic: String(parsed.topic || subjectDescription),
          difficulty: diff,
          time_limit: Number(parsed.time_limit) || 30,
          icon: String(parsed.icon || '✨'),
          questions: normalizedQuestions,
          author: 'Wayground AI Studio',
        };

        // Simpan langsung ke SQLite DB
        waygroundQueries.saveQuiz(finalQuiz);
        return { success: true, quiz: finalQuiz, source: 'ai' };
      }
    }
  } catch (err) {
    console.warn('[Wayground Engine] AI Generation parse note, falling back to smart template:', err.message);
  }

  // Fallback: Smart Generated Quiz Template jika AI kuota habis / offline
  const fallbackQuiz = generateSmartFallbackQuiz(subjectDescription, count, diff);
  waygroundQueries.saveQuiz(fallbackQuiz);
  return { success: true, quiz: fallbackQuiz, source: 'smart_fallback' };
}

/**
 * Generate Smart Fallback Quiz if API key unavailable
 */
function generateSmartFallbackQuiz(topic, count, difficulty) {
  const questions = [];
  const safeTopic = topic || 'Polymath Knowledge';

  const templateQuestions = [
    {
      q: `Apakah prinsip fundamental paling penting yang harus dipahami saat mempelajari ${safeTopic}?`,
      opts: [
        `Memahami first-principles dan konsep dasar secara mendalam`,
        `Menghafalkan seluruh sintaks atau rumus tanpa memahami logika di baliknya`,
        `Menghindari membaca dokumentasi resmi`,
        `Mengabaikan studi kasus dunia nyata`
      ],
      ans: 0,
      exp: `Dalam menguasai bidang apapun termasuk ${safeTopic}, memahami first-principles dan fondasi dasar jauh lebih berdaya guna daripada sekadar menghafal.`,
      hint: `Pilih pemahaman prinsip dasar.`
    },
    {
      q: `Dalam skenario praktis, bagaimana pendekatan terbaik untuk menyelesaikan kendala kompleks pada ${safeTopic}?`,
      opts: [
        `Membagi masalah menjadi komponen-komponen yang lebih kecil (Decomposition)`,
        `Menebak solusi secara acak tanpa observasi metrik`,
        `Menghentikan proses investigasi sebelum menemukan akar masalah`,
        `Menyalahkan infrastruktur jaringan tanpa pembuktian logis`
      ],
      ans: 0,
      exp: `Dekomposisi masalah (Problem Decomposition) memungkinkan kita mengisolasi variabel penyebab dan menguji hipotesis secara sistematis.`,
      hint: `Pecah masalah besar menjadi bagian-bagian terukur.`
    },
    {
      q: `Metrik atau indikator apa yang paling tepat untuk mengukur keberhasilan penerapan ${safeTopic}?`,
      opts: [
        `Efisiensi, reliabilitas tinggi, dan akurasi teruji`,
        `Tingginya jumlah error yang tidak terdokumentasi`,
        `Ketidakmampuan sistem untuk menangani beban kerja`,
        `Ketergantungan berlebihan pada intervensi manual tanpa otomatisasi`
      ],
      ans: 0,
      exp: `Keberhasilan sistem diukur dari efisiensi pemanfaatan sumber daya, reliabilitas jangka panjang, dan presisi hasil keluaran.`,
      hint: `Cari indikator positif berupa efisiensi dan reliabilitas.`
    },
    {
      q: `Bagaimana arsitektur ${safeTopic} yang baik menjaga keamanan dan integritas datanya?`,
      opts: [
        `Menerapkan prinsip Least Privilege, validasi input berlapis, dan enkripsi end-to-end`,
        `Menyimpan seluruh kredensial dalam bentuk plaintext publik`,
        `Menonaktifkan seluruh mekanisme otentikasi`,
        `Mengizinkan akses root ke semua pihak tanpa otorisasi`
      ],
      ans: 0,
      exp: `Prinsip Least Privilege dan validasi input yang ketat adalah pilar utama pertahanan mendalam (Defense in Depth).`,
      hint: `Prinsip hak akses minimal dan enkripsi berlapis.`
    },
    {
      q: `Mengapa continuous learning dan benchmarking sangat krusial dalam perkembangan ${safeTopic}?`,
      opts: [
        `Teknologi dan metodologi terus berevolusi, membutuhkan adaptasi berbasis bukti`,
        `Agar dapat mempertahankan cara kerja usang tanpa pembaruan`,
        `Karena benchmarking tidak memiliki dampak pada performa`,
        `Hanya untuk memenuhi formalitas birokrasi tanpa nilai teknis`
      ],
      ans: 0,
      exp: `Evolusi teknologi yang pesat menuntut pengujian performa berkala dan adaptasi berkelanjutan agar tetap relevan dan kompetitif.`,
      hint: `Adaptasi terhadap evolusi metode dan standar modern.`
    }
  ];

  for (let i = 0; i < count; i++) {
    const tpl = templateQuestions[i % templateQuestions.length];
    questions.push({
      id: `q_fb_${Date.now()}_${i + 1}`,
      question: tpl.q,
      options: [...tpl.opts],
      correctAnswer: tpl.ans,
      explanation: tpl.exp,
      hint: tpl.hint,
      points: 1000
    });
  }

  return {
    id: `wg_custom_${Date.now()}`,
    title: `Modul Pembelajaran: ${safeTopic}`,
    description: `Kuis komprehensif untuk menguji dan memperdalam wawasan seputar ${safeTopic}.`,
    category: 'ai',
    topic: safeTopic,
    difficulty: difficulty,
    time_limit: 30,
    icon: '📚',
    questions: questions,
    author: 'Polaris Academy Master',
  };
}

/**
 * Live Multiplayer Lobby Management
 */
function createLobby({ quizId, hostName = 'Host' }) {
  const quiz = waygroundQueries.getQuizById(quizId);
  if (!quiz) throw new Error('Kuis tidak ditemukan untuk membuat lobi.');

  // Generate 6-char Game PIN (misal: WAY-84920)
  const pinNum = Math.floor(10000 + Math.random() * 90000);
  const pin = `WAY-${pinNum}`;

  const lobby = {
    pin,
    quiz_id: quiz.id,
    quiz_title: quiz.title,
    host_name: hostName,
    status: 'waiting', // waiting, playing, finished
    players: [],
    current_question: 0,
    total_questions: quiz.questions?.length || 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  activeLobbies.set(pin, lobby);
  waygroundQueries.saveLobby(lobby);
  return lobby;
}

function getLobby(pin) {
  if (!pin) return null;
  const cleanPin = pin.trim().toUpperCase();
  if (activeLobbies.has(cleanPin)) {
    return activeLobbies.get(cleanPin);
  }
  const dbLobby = waygroundQueries.getLobby(cleanPin);
  if (dbLobby) {
    activeLobbies.set(cleanPin, dbLobby);
    return dbLobby;
  }
  return null;
}

function joinLobby({ pin, playerName = 'Guest', avatar = '🦊' }) {
  const lobby = getLobby(pin);
  if (!lobby) throw new Error(`Lobi dengan PIN ${pin} tidak ditemukan.`);
  if (lobby.status === 'finished') throw new Error('Lobi ini telah selesai.');

  const playerId = `p_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const existingIndex = lobby.players.findIndex(p => p.name.toLowerCase() === playerName.toLowerCase());
  
  const playerObj = {
    id: playerId,
    name: playerName,
    avatar: avatar || '🦊',
    score: 0,
    streak: 0,
    answers: [],
    joined_at: Date.now()
  };

  if (existingIndex >= 0) {
    lobby.players[existingIndex] = playerObj;
  } else {
    lobby.players.push(playerObj);
  }

  lobby.updated_at = new Date().toISOString();
  activeLobbies.set(lobby.pin, lobby);
  waygroundQueries.saveLobby(lobby);
  return { lobby, player: playerObj };
}

function submitLobbyAnswer({ pin, playerId, questionIndex, isCorrect, timeRemaining, points = 1000 }) {
  const lobby = getLobby(pin);
  if (!lobby) throw new Error('Lobi tidak ditemukan.');

  const player = lobby.players.find(p => p.id === playerId || p.name === playerId);
  if (!player) throw new Error('Pemain tidak terdaftar di lobi ini.');

  // Skor calculation: Base (1000) + Speed Bonus (timeRemaining * 15) + Streak Bonus
  if (isCorrect) {
    player.streak = (player.streak || 0) + 1;
    const speedBonus = Math.max(0, Math.round((timeRemaining || 0) * 15));
    const streakBonus = Math.min((player.streak - 1) * 200, 1000);
    const addedScore = points + speedBonus + streakBonus;
    player.score = (player.score || 0) + addedScore;
  } else {
    player.streak = 0;
  }

  player.answers.push({
    questionIndex,
    isCorrect,
    timeRemaining,
    timestamp: Date.now()
  });

  // Re-sort leaderboard by score descending
  lobby.players.sort((a, b) => (b.score || 0) - (a.score || 0));
  lobby.updated_at = new Date().toISOString();

  activeLobbies.set(lobby.pin, lobby);
  waygroundQueries.saveLobby(lobby);
  return { lobby, player };
}

function updateLobbyState({ pin, status, currentQuestion }) {
  const lobby = getLobby(pin);
  if (!lobby) throw new Error('Lobi tidak ditemukan.');

  if (status) lobby.status = status;
  if (typeof currentQuestion === 'number') lobby.current_question = currentQuestion;
  lobby.updated_at = new Date().toISOString();

  activeLobbies.set(lobby.pin, lobby);
  waygroundQueries.saveLobby(lobby);
  return lobby;
}

module.exports = {
  DEFAULT_QUIZZES,
  generateQuizWithAI,
  createLobby,
  getLobby,
  joinLobby,
  submitLobbyAnswer,
  updateLobbyState,
  waygroundQueries
};
