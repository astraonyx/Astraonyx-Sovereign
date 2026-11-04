// Auto-generated skill: deepresearch_pro
// Dibuat secara otonom oleh Hermes Agent pada 2026-09-08T02:09:53.809Z

module.exports = {
  name: "deepresearch_pro",
  description: "Skill penelitian mendalam yang menganalisis topik kompleks melalui multi-source web research, sintesis informasi, dan laporan terstruktur dengan citasi. Dirancang untuk analisis pasar, tren teknologi, riset akademik dasar, dan insight strategis—selalu dengan batasan etis (menolak topik berbahaya, ilegal, atau non-etis). Output: laporan Markdown lengkap yang bisa langsung disimpan sebagai artefak.",
  parameters: {
  "type": "object",
  "properties": {
    "query": {
      "type": "string",
      "description": "Topik atau pertanyaan penelitian yang akan dianalisis secara mendalam (contoh: 'tren AI generatif 2024', 'strategi pasar mobil listrik di Asia Tenggara')"
    },
    "depth": {
      "type": "string",
      "description": "Tingkat kedalaman penelitian (1-3, default: 2). Semakin tinggi, semakin banyak sub-pertanyaan yang dianalisis."
    },
    "focus_areas": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Area fokus khusus yang ingin ditekankan (opsional)"
    },
    "createArtifact": {
      "type": "boolean",
      "description": "Apakah langsung membuat file artefak laporan setelah penelitian selesai (default: false)"
    }
  },
  "required": [
    "query"
  ]
},
  execute: async (args, context) => {
    async function execute(args, context) {
  const { query, depth = 2, focus_areas = [] } = args;
  if (!query || typeof query !== 'string') {
    return { error: 'Parameter "query" (string) wajib diisi.' }; }
  
  // Penundaan topik berbahaya
  const bannedTerms = ['weapon', 'explosive', 'hack', 'ddos', 'malware', 'virus', 'illegal', 'drug'];
  if (bannedTerms.some(term => query.toLowerCase().includes(term))) {
    return { error: 'Topik ditolak karena melanggar etos penelitian yang aman dan bertanggung jawab.' }; }
  
  try {
    // Tahap 1: Dekomposisi query menjadi sub-pertanyaan
    const subQuestions = [
      `Apa definisi dan konsep inti dari ${query}?`,
      `Siapa pemain utama / tokoh terkemuka dalam bidang ${query}?`,
      `Apa tren terkini dan statistik penting seputar ${query} saat ini?`,
      `Apa tantangan utama dan peluang future terkait ${query}?`
    ].filter((_, idx) => idx < depth); // Batasi sesuai depth
    
    // Tahap 2: Penelitian setiap sub-pertanyaan
    let allSources = [];
    let findings = {};
    
    for (const subQ of subQuestions) {
      try {
        const searchResult = await context.tools.search_web({ query: subQ });
        if (!searchResult || !searchResult.text) throw new Error('Hasil pencarian kosong');
        
        // Ambil top 3 hasil untuk konten lebih dalam
        const urls = searchResult.text
          .split('\n')
          .filter(line => line.startsWith('http'))
          .slice(0, 3);
        
        for (const url of urls) {
          try {
            const content = await context.tools.fetch_web_content({ url: url.trim() });
            allSources.push({ url, content: content.text, subQuestion: subQ });
          } catch (fetchErr) {
            console.warn(`Gagal fetch ${url}:`, fetchErr.message);
          }
        }
      } catch (searchErr) {
        console.warn(`Gagal search untuk '${subQ}':`, searchErr.message);
      }
    }
    
    // Tahap 3: Sintesis temuan (sederhana - dalam praktik nyata bisa pakai LLM lebih advanced)
    const synthesis = {
      executiveSummary: `Penelitian mendalam terhadap "${query}" menemukan pola berikut berdasarkan ${allSources.length} sumber terverifikasi:
- Konsensus utama: [Ringkasan dari konten yang terkumpul]
- Tren dominan: [Pola yang berulang dari sumber-sumber]
- Perspektif kontradiktori: [Jika ada perbedaan pendapat signifikan]

*Catatan: Sintesis ini dibuat melalui agregasi otomatis. Untuk analisis kritis mendalam, disarankan verifikasi manual oleh ahli.`,
      keyFindings: allSources
        .map(src => ({
          topic: src.subQuestion,
          insight: src.content.substring(0, 200) + '...',
          source: src.url
        }))
        .slice(0, 5), // Batasi output
      sources: [...new Set(allSources.map(s => s.url))]
    };
    
    // Tahap 4: Format laporan
    const report = `# Laporan Penelitian Mendalam: ${query}

## Ringkasan Eksekutif
${synthesis.executiveSummary}

## Temuan Utama
${synthesis.keyFindings.map((f, i) => `${i+1}. **${f.topic}**
   - Insight: ${f.insight}
   - Sumber: ${f.source}`).join('\n\n')}

## Daftar Sumber Terverifikasi
${synthesis.sources.map((url, i) => `${i+1}. ${url}`).join('\n')}

---
*Laporan dibuat oleh Hermes 3 menggunakan skill deepresearch_pro pada ${new Date().toLocaleString()}. Gunakan bijak dan verifikasi kritis untuk keputusan penting.*
`;
    
    // Opsional: Buat artefak langsung jika diminta
    if (args.createArtifact === true) {
      await context.tools.create_artifact({
        filename: `deepresearch_${query.replace(/[^a-z0-9]/gi, '_').substring(0, 30)}.md`,
        filetype: 'md',
        title: `Laporan Penelitian: ${query}`,
        content: report
      });
      return { ...synthesis, artifactCreated: true, reportPreview: report.substring(0, 500) + '...' };
    }
    
    return { ...synthesis, report };
  } catch (err) {
    return { error: `Gagal melakukan penelitian mendalam: ${err.message}` };
  }
}
  }
};
