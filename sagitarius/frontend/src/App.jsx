import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Upload,
  Download,
  Sliders,
  RefreshCw,
  Cpu,
  Layers,
  Wand2,
  CheckCircle2,
  AlertCircle,
  Camera,
  Palette,
  FileImage,
  ChevronDown,
  ChevronUp,
  Zap,
  Check,
  Scissors,
  Paintbrush,
  Image as ImageIcon,
  Info
} from 'lucide-react';
import ComparisonSlider from './components/ComparisonSlider';

// PRESET KHUSUS MODE UPSCALE HD
const UPSCALE_PRESETS = [
  {
    id: 'turbo',
    title: 'Turbo Quick Remini',
    tag: '⚡ 3-5 Detik',
    desc: 'Mode ultra-cepat! Perbaikan mata, wajah, dan upscaling 4x instan tanpa menunggu lama.',
    icon: Zap,
    badge: 'Tercepat',
    gradient: 'from-amber-500/20 via-orange-500/10 to-transparent',
    borderActive: 'border-amber-400 ring-2 ring-amber-500/30',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    iconColor: 'text-amber-400 bg-amber-500/10'
  },
  {
    id: 'remini',
    title: 'Remini Ultra Face HD',
    tag: '🌟 Studio Face',
    desc: 'Restorasi mendalam untuk iris mata buram, bulu mata, alis, dan tekstur kulit pori-pori.',
    icon: Wand2,
    badge: 'Paling Populer',
    gradient: 'from-indigo-500/20 via-purple-500/10 to-transparent',
    borderActive: 'border-indigo-400 ring-2 ring-indigo-500/30',
    badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
    iconColor: 'text-indigo-400 bg-indigo-500/10'
  },
  {
    id: 'wink',
    title: 'Wink Idol Glow',
    tag: '✨ Porcelain Skin',
    desc: 'Kulit halus glowing ala idol, filter micro-contrast pop, dan warna lebih hidup.',
    icon: Sparkles,
    badge: 'Aesthetic Idol',
    gradient: 'from-pink-500/20 via-rose-500/10 to-transparent',
    borderActive: 'border-pink-400 ring-2 ring-pink-500/30',
    badgeColor: 'bg-pink-500/20 text-pink-300 border-pink-500/40',
    iconColor: 'text-pink-400 bg-pink-500/10'
  },
  {
    id: 'photo4k',
    title: 'Ultra Photo 4K',
    tag: '📸 4K Landscape',
    desc: 'Untuk pemandangan, pakaian, arsitektur, dan tekstur detail tanpa merestorasi wajah.',
    icon: Camera,
    badge: 'Foto & Objek',
    gradient: 'from-blue-500/20 via-cyan-500/10 to-transparent',
    borderActive: 'border-blue-400 ring-2 ring-blue-500/30',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    iconColor: 'text-blue-400 bg-blue-500/10'
  },
  {
    id: 'anime',
    title: 'Anime & Manga HD',
    tag: '🎨 2D Clean Art',
    desc: 'Garis kontur tajam tanpa jagged pixel, warna solid bersih untuk kartun dan anime.',
    icon: Palette,
    badge: 'Art & Komik',
    gradient: 'from-emerald-500/20 via-teal-500/10 to-transparent',
    borderActive: 'border-emerald-400 ring-2 ring-emerald-500/30',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    iconColor: 'text-emerald-400 bg-emerald-500/10'
  },
  {
    id: 'custom',
    title: 'Custom Pro Studio',
    tag: '⚙️ Manual Control',
    desc: 'Atur manual kekuatan restorasi wajah, ketajaman, kehalusan kulit, dan warna.',
    icon: Sliders,
    badge: 'Pro Mode',
    gradient: 'from-slate-700/20 via-slate-800/10 to-transparent',
    borderActive: 'border-slate-400 ring-2 ring-slate-500/30',
    badgeColor: 'bg-slate-700/30 text-slate-300 border-slate-600',
    iconColor: 'text-slate-300 bg-slate-800'
  }
];

// OPSI GAYA LATAR KHUSUS MODE HAPUS BACKGROUND
const BG_STYLES = [
  {
    id: 'transparent',
    title: 'Transparan (PNG Alpha)',
    desc: 'Bening tanpa background. Cocok untuk stiker, logo, desain Canva, & produk marketplace.',
    badge: 'Paling Populer',
    badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
    dot: 'bg-indigo-400',
    type: 'transparent',
    previewClass: 'bg-checkered border border-slate-700'
  },
  {
    id: 'white',
    title: 'Putih Bersih (#FFFFFF)',
    desc: 'Standar foto produk katalog e-commerce & marketplace (Shopee, Tokopedia, Amazon).',
    badge: 'E-Commerce',
    badgeColor: 'bg-slate-200/20 text-slate-200 border-slate-300/40',
    dot: 'bg-white',
    type: 'white',
    previewClass: 'bg-white'
  },
  {
    id: 'black',
    title: 'Hitam Pekat (#000000)',
    desc: 'Tampilan kontras tinggi elegan untuk foto profil, avatar, & fotografi studio.',
    badge: 'Studio',
    badgeColor: 'bg-slate-700/40 text-slate-300 border-slate-600',
    dot: 'bg-slate-900 border border-slate-700',
    type: 'black',
    previewClass: 'bg-slate-950 border border-slate-700'
  },
  {
    id: 'red',
    title: 'Pas Foto Merah (#E11D48)',
    desc: 'Standar resmi pas foto Paspor Indonesia, KTP ganjil, dan dokumen kedinasan.',
    badge: 'Paspor / KTP',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    dot: 'bg-rose-600',
    type: 'color',
    colorHex: '#E11D48',
    previewClass: 'bg-[#E11D48]'
  },
  {
    id: 'blue',
    title: 'Pas Foto Biru (#2563EB)',
    desc: 'Standar resmi pas foto Ijazah, Buku Nikah, KTP genap, dan berkas kedutaan.',
    badge: 'Ijazah / Nikah',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    dot: 'bg-blue-600',
    type: 'color',
    colorHex: '#2563EB',
    previewClass: 'bg-[#2563EB]'
  },
  {
    id: 'blur',
    title: 'DSLR Bokeh Blur',
    desc: 'Mengaburkan latar belakang asli foto untuk efek portrait bokeh lensa kamera profesional.',
    badge: 'Portrait Bokeh',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    dot: 'bg-amber-400',
    type: 'blur',
    previewClass: 'bg-gradient-to-tr from-amber-600 via-rose-600 to-indigo-600 blur-[1px]'
  },
  {
    id: 'custom',
    title: 'Warna Kustom (Bebas)',
    desc: 'Pilih warna latar belakang apa saja menggunakan color picker hex code.',
    badge: 'Bebas Pilih',
    badgeColor: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40',
    dot: 'bg-fuchsia-400',
    type: 'color',
    isCustom: true
  }
];

// FASE PEMBUATAN MODE UPSCALE HD
const INITIAL_UPSCALE_PHASES = [
  {
    id: 1,
    title: 'Fase 1 / 4',
    name: 'Analisis & Deteksi Wajah',
    desc: 'OpenCV YuNet memindai 5 titik landmark wajah (mata, hidung, bibir)',
    status: 'idle',
    percent: 0,
    detail: 'Menunggu proses dimulai...'
  },
  {
    id: 2,
    title: 'Fase 2 / 4',
    name: 'Super-Resolution (GPU Vulkan)',
    desc: 'Akselerasi Intel Vulkan GPU meningkatkan kerapatan piksel ke Ultra HD',
    status: 'idle',
    percent: 0,
    detail: 'Menunggu Fase 1 selesai...'
  },
  {
    id: 3,
    title: 'Fase 3 / 4',
    name: 'Rekonstruksi Wajah HD (GFPGAN)',
    desc: 'Memperbaiki iris mata buram, bulu mata, alis, dan tekstur kulit alami',
    status: 'idle',
    percent: 0,
    detail: 'Menunggu Fase 2 selesai...'
  },
  {
    id: 4,
    title: 'Fase 4 / 4',
    name: 'Finishing Wink Beauty Glow',
    desc: 'Menghaluskan tekstur kulit (porcelain smooth) & micro-contrast pop',
    status: 'idle',
    percent: 0,
    detail: 'Menunggu Fase 3 selesai...'
  }
];

// FASE PEMBUATAN MODE HAPUS BACKGROUND
const INITIAL_REMOVE_BG_PHASES = [
  {
    id: 1,
    title: 'Langkah 1 / 3',
    name: 'Membaca Citra Resolusi Asli (1:1)',
    desc: 'Memeriksa dimensi asli gambar tanpa upscaling atau mengubah ukuran piksel',
    status: 'idle',
    percent: 0,
    detail: 'Menyiapkan gambar resolusi asli...'
  },
  {
    id: 2,
    title: 'Langkah 2 / 3',
    name: 'Segmentasi Subjek AI RMBG-1.4',
    desc: 'Mendeteksi rambut, kontur tubuh, dan subjek secara ultra-presisi',
    status: 'idle',
    percent: 0,
    detail: 'Menunggu Langkah 1...'
  },
  {
    id: 3,
    title: 'Langkah 3 / 3',
    name: 'Rendering Alpha & Latar Belakang',
    desc: 'Membuat alpha channel transparan atau mengaplikasikan warna latar baru',
    status: 'idle',
    percent: 0,
    detail: 'Menunggu Langkah 2...'
  }
];

export default function App() {
  // Mode Utama: 'upscale' (Khusus Upscale HD) atau 'remove_bg' (Khusus Hapus Background)
  const [activeMode, setActiveMode] = useState('upscale');

  const [health, setHealth] = useState(null);
  const [uploadedData, setUploadedData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [phases, setPhases] = useState(INITIAL_UPSCALE_PHASES);
  const [currentPhaseId, setCurrentPhaseId] = useState(1);
  const [resultData, setResultData] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // Parameter Khusus Mode Upscale
  const [selectedPreset, setSelectedPreset] = useState('turbo');
  const [showCustomDrawer, setShowCustomDrawer] = useState(false);
  const [scaleFactor, setScaleFactor] = useState(4);
  const [faceStrength, setFaceStrength] = useState(100);
  const [enableFace, setEnableFace] = useState(true);
  const [clarity, setClarity] = useState(35);
  const [skinSmooth, setSkinSmooth] = useState(20);
  const [contrast, setContrast] = useState(15);
  const [vibrance, setVibrance] = useState(10);
  const [exportFormat, setExportFormat] = useState('png');

  // Parameter Khusus Mode Hapus Background
  const [selectedBgStyle, setSelectedBgStyle] = useState('transparent');
  const [customBgColor, setCustomBgColor] = useState('#6366f1');
  const [bgExportFormat, setBgExportFormat] = useState('png');

  const fileInputRef = useRef(null);

  // Check backend health
  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => setHealth(data))
      .catch((err) => console.error('Health check failed', err));
  }, []);

  const handleModeSwitch = (mode) => {
    setActiveMode(mode);
    setErrorMsg(null);
    if (!isProcessing) {
      setPhases(mode === 'upscale' ? INITIAL_UPSCALE_PHASES : INITIAL_REMOVE_BG_PHASES);
    }
  };

  const handleFileUpload = async (file) => {
    if (!file) return;
    setErrorMsg(null);
    setResultData(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Gagal mengunggah gambar');
      }
      const data = await res.json();
      setUploadedData(data);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const loadSample = async (type) => {
    setErrorMsg(null);
    const url = type === 'face' ? '/uploads/sample_face.jpg' : '/uploads/input.jpg';
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const file = new File([blob], type === 'face' ? 'sample_face.jpg' : 'sample_photo.jpg', { type: blob.type });
      handleFileUpload(file);
    } catch (err) {
      setErrorMsg('Gagal memuat sample.');
    }
  };

  // ==========================================================
  // EKSEKUSI MODE 1: KHUSUS UPSCALE HD (TIDAK HAPUS BACKGROUND)
  // ==========================================================
  const startEnhancement = async () => {
    if (!uploadedData) return;
    setIsProcessing(true);
    setErrorMsg(null);
    setCurrentPhaseId(1);

    setPhases(INITIAL_UPSCALE_PHASES.map((p, idx) => ({
      ...p,
      status: idx === 0 ? 'running' : 'idle',
      percent: 0,
      detail: idx === 0 ? 'Memulai deteksi wajah...' : p.detail
    })));

    const payload = {
      image_id: uploadedData.image_id,
      preset: selectedPreset,
      scale: scaleFactor,
      enable_face_restore: enableFace,
      face_strength: faceStrength / 100,
      clarity: clarity / 100,
      skin_smooth: skinSmooth / 100,
      contrast: contrast / 100,
      vibrance: vibrance / 100,
      remove_bg: false, // Murni Upscale!
      export_format: exportFormat,
    };

    try {
      const response = await fetch('/api/enhance/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Gagal memulai proses streaming.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.error) {
                throw new Error(data.message);
              }

              const activePhase = data.phase;
              setCurrentPhaseId(activePhase);

              setPhases((prevPhases) =>
                prevPhases.map((phase) => {
                  if (phase.id < activePhase) {
                    return { ...phase, status: 'done', percent: 100 };
                  } else if (phase.id === activePhase) {
                    return {
                      ...phase,
                      status: data.status,
                      percent: data.percent,
                      detail: data.detail || phase.detail
                    };
                  } else {
                    return { ...phase, status: 'idle', percent: 0 };
                  }
                })
              );

              if (data.result) {
                setResultData(data.result);
                setPhases((prev) => prev.map((p) => ({ ...p, status: 'done', percent: 100 })));
              }
            } catch (parseErr) {
              console.error('SSE JSON parse error:', parseErr);
            }
          }
        }
      }
    } catch (err) {
      setErrorMsg(err.message || 'Terjadi kesalahan saat memproses gambar.');
    } finally {
      setIsProcessing(false);
    }
  };

  // ==========================================================
  // EKSEKUSI MODE 2: KHUSUS HAPUS BACKGROUND (MURNI CUTOUT 1:1, NO UPSCALE)
  // ==========================================================
  const startRemoveBg = async (sourceFilename = null, overrideStyleId = null, overrideHex = null) => {
    if (!uploadedData && !resultData) return;
    setIsProcessing(true);
    setErrorMsg(null);
    setCurrentPhaseId(1);

    const styleId = overrideStyleId || selectedBgStyle;
    const styleObj = BG_STYLES.find((s) => s.id === styleId) || BG_STYLES[0];
    const bgType = styleObj.type;
    const colorHex = overrideHex || (styleObj.isCustom ? customBgColor : (styleObj.colorHex || '#ffffff'));

    // Inisialisasi 3 langkah visual khusus cutout
    setPhases(INITIAL_REMOVE_BG_PHASES.map((p, idx) => ({
      ...p,
      status: idx === 0 ? 'running' : 'idle',
      percent: idx === 0 ? 30 : 0,
      detail: idx === 0 ? 'Membaca dimensi piksel asli 1:1...' : p.detail
    })));

    try {
      // Step 2 timer simulasi visual
      const timer = setTimeout(() => {
        setCurrentPhaseId(2);
        setPhases((prev) =>
          prev.map((p) =>
            p.id === 1
              ? { ...p, status: 'done', percent: 100 }
              : p.id === 2
              ? { ...p, status: 'running', percent: 75, detail: 'AI Bria RMBG-1.4 mengekstrak subjek & helai rambut...' }
              : p
          )
        );
      }, 300);

      const payload = {
        image_id: sourceFilename ? null : (uploadedData ? uploadedData.image_id : null),
        filename: sourceFilename || (resultData ? resultData.filename : null),
        bg_type: bgType,
        color_hex: colorHex,
        export_format: bgType === 'transparent' ? 'png' : bgExportFormat
      };

      const res = await fetch('/api/remove-bg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      clearTimeout(timer);

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Gagal memotong background.');
      }

      const data = await res.json();
      setCurrentPhaseId(3);
      setPhases((prev) => prev.map((p) => ({ ...p, status: 'done', percent: 100 })));
      setResultData(data);
    } catch (err) {
      setErrorMsg(err.message || 'Terjadi kesalahan saat memotong background.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Hitung total progres keseluruhan
  const totalProgress = Math.round(
    phases.reduce((acc, p) => acc + p.percent, 0) / phases.length
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-indigo-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                  LUMINA HD
                </h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  <Zap className="w-3 h-3 fill-amber-300" />
                  AI STUDIO
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Super-Resolution • Face Restore • AI Background Remover</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300">
              <Cpu className="w-4 h-4 text-emerald-400" />
              <span>Upscale: <strong className="text-emerald-400 font-medium">Intel Vulkan GPU</strong></span>
            </div>
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300">
              <Scissors className="w-4 h-4 text-violet-400" />
              <span>Cutout: <strong className="text-violet-400 font-medium">RMBG-1.4</strong></span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 flex flex-col gap-6">
        {/* Error Alert */}
        {errorMsg && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 text-rose-300 flex items-center gap-3 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* View Mode: Comparison / Result View */}
        {resultData ? (
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 rounded-2xl p-4 backdrop-blur">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  resultData.bg_removed
                    ? 'bg-violet-500/10 border border-violet-500/30 text-violet-400'
                    : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                }`}>
                  {resultData.bg_removed ? <Scissors className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-100 flex items-center gap-2 flex-wrap">
                    {resultData.bg_removed ? (
                      <>
                        <span>Background Berhasil Dihapus!</span>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30 font-medium flex items-center gap-1">
                          <Scissors className="w-3 h-3" />
                          Murni Cutout (1:1 Asli)
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                          {resultData.bg_type === 'transparent' ? 'Transparan PNG' : resultData.bg_type === 'blur' ? 'DSLR Bokeh' : `Warna: ${resultData.bg_type}`}
                        </span>
                      </>
                    ) : (
                      <>
                        <span>Foto Berhasil Ditingkatkan ke HD!</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                          {resultData.scale}x Upscale
                        </span>
                      </>
                    )}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {resultData.bg_removed ? (
                      <>
                        Resolusi Asli Tetap Terjaga: <strong className="text-violet-300 font-mono">{resultData.original_width}×{resultData.original_height} px</strong> (Tanpa Perubahan Ukuran) • Selesai dalam <strong className="text-emerald-400">{resultData.process_time_seconds} detik</strong>
                      </>
                    ) : (
                      <>
                        Ditingkatkan ke <strong className="text-emerald-400 font-mono">{resultData.enhanced_width}×{resultData.enhanced_height} px</strong> • Selesai dalam <strong className="text-emerald-400">{resultData.process_time_seconds} detik</strong> • {resultData.faces_enhanced} wajah direstorasi
                      </>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setResultData(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Proses Foto Lain</span>
                </button>
                <a
                  href={resultData.output_url}
                  download={resultData.filename}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-600 to-indigo-600 hover:from-emerald-600 hover:to-indigo-700 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/25 transition active:scale-95"
                >
                  <Download className="w-4 h-4" />
                  <span>Download File ({Math.round(resultData.filesize / 1024)} KB)</span>
                </a>
              </div>
            </div>

            {/* Quick Background Switcher Bar on Result Screen (jika mode hapus background) */}
            {resultData.bg_removed && (
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 rounded-2xl px-4 py-3 text-xs backdrop-blur">
                <div className="flex items-center gap-2 text-slate-300">
                  <Paintbrush className="w-4 h-4 text-violet-400" />
                  <span className="font-semibold text-xs">Ganti Warna Latar Belakang Hasil Ini:</span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {BG_STYLES.filter((s) => !s.isCustom).map((b) => (
                    <button
                      key={b.id}
                      disabled={isProcessing}
                      onClick={() => startRemoveBg(resultData.filename, b.id, b.colorHex)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 hover:border-violet-500/50 text-slate-300 hover:text-white flex items-center gap-1.5 transition text-[11px] font-medium cursor-pointer active:scale-95"
                    >
                      <span className={`w-2 h-2 rounded-full ${b.dot}`}></span>
                      <span>{b.title.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Split Comparison Slider Component */}
            <ComparisonSlider
              originalUrl={resultData.original_url}
              enhancedUrl={resultData.output_url}
              originalDims={{ w: resultData.original_width, h: resultData.original_height }}
              enhancedDims={{ w: resultData.enhanced_width, h: resultData.enhanced_height }}
            />
          </div>
        ) : (
          /* ========================================================== */
          /* MAIN EDITING WORKSPACE DENGAN 2 MODE TERPISAH              */
          /* ========================================================== */
          <div className="flex flex-col gap-6">
            {/* Mode Selector Tabs (Upscale vs Remove BG) */}
            <div className="flex items-center justify-center w-full">
              <div className="inline-flex p-1.5 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur gap-1.5">
                <button
                  type="button"
                  onClick={() => handleModeSwitch('upscale')}
                  className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2.5 transition cursor-pointer ${
                    activeMode === 'upscale'
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-lg shadow-amber-500/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Zap className="w-4 h-4 fill-current" />
                  <span>⚡ Mode Khusus Upscale HD (Super-Resolution & Face)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleModeSwitch('remove_bg')}
                  className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2.5 transition cursor-pointer ${
                    activeMode === 'remove_bg'
                      ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/25'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Scissors className="w-4 h-4" />
                  <span>✂️ Mode Khusus Hapus Background (Pure Cutout 1:1)</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Kolom Kiri: Image Upload & Real-Time Phase Tracker (7 Cols) */}
              <div className="lg:col-span-7 flex flex-col gap-5">
                {/* Image Upload Box */}
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => !uploadedData && fileInputRef.current?.click()}
                  className={`relative border-2 border-dashed rounded-3xl p-6 flex flex-col items-center justify-center transition-all min-h-[380px] ${
                    uploadedData
                      ? 'border-slate-800 bg-slate-900/40'
                      : activeMode === 'remove_bg'
                      ? 'border-slate-700/80 hover:border-violet-400 bg-slate-900/20 hover:bg-slate-900/40 cursor-pointer group'
                      : 'border-slate-700/80 hover:border-amber-400 bg-slate-900/20 hover:bg-slate-900/40 cursor-pointer group'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => e.target.files && handleFileUpload(e.target.files[0])}
                  />

                  {uploadedData ? (
                    <div className="flex flex-col items-center gap-3 w-full">
                      <div className="relative group max-h-[300px] rounded-2xl overflow-hidden border border-slate-700/80 shadow-2xl bg-checkered">
                        <img
                          src={uploadedData.url}
                          alt="Preview"
                          className="max-h-[300px] w-auto object-contain"
                        />
                        <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            className="px-4 py-2 rounded-xl bg-slate-800/90 text-white text-xs font-semibold hover:bg-slate-700 transition cursor-pointer"
                          >
                            Ganti Foto
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between w-full max-w-md bg-slate-900/80 border border-slate-800 rounded-xl px-4 py-2 text-xs">
                        <div className="flex items-center gap-2 text-slate-300">
                          <FileImage className="w-4 h-4 text-indigo-400" />
                          <span className="truncate max-w-[180px] font-medium">{uploadedData.filename}</span>
                        </div>
                        <div className="flex items-center gap-3 text-slate-400">
                          <span>{uploadedData.width}×{uploadedData.height} px</span>
                          <span>•</span>
                          <span className={activeMode === 'remove_bg' ? 'text-violet-400 font-medium' : 'text-amber-400 font-medium'}>
                            {activeMode === 'remove_bg' ? 'Resolusi Asli 1:1' : uploadedData.faces_detected > 0 ? `${uploadedData.faces_detected} Wajah` : 'Objek'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-center gap-4">
                      <div className={`w-20 h-20 rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner ${
                        activeMode === 'remove_bg'
                          ? 'bg-violet-500/10 border border-violet-500/20 text-violet-400'
                          : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                      }`}>
                        {activeMode === 'remove_bg' ? <Scissors className="w-9 h-9" /> : <Upload className="w-9 h-9" />}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-200">
                          Tarik & Lepas Foto di Sini, atau <span className={activeMode === 'remove_bg' ? 'text-violet-400 underline' : 'text-amber-400 underline'}>Pilih File</span>
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">
                          {activeMode === 'remove_bg'
                            ? 'Murni hapus background pada resolusi asli (tanpa upscaling).'
                            : 'Mendukung format JPG, PNG, atau WebP untuk peningkatan resolusi.'}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 mt-2" onClick={(e) => e.stopPropagation()}>
                        <span className="text-xs text-slate-500">Coba sampel langsung:</span>
                        <button
                          onClick={() => loadSample('face')}
                          className="px-3 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-xs text-slate-300 hover:text-white transition cursor-pointer"
                        >
                          Sampel Wajah
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Banner Info Khusus Mode Hapus Background */}
                {activeMode === 'remove_bg' && (
                  <div className="bg-violet-950/20 border border-violet-500/30 rounded-2xl p-3.5 flex items-start gap-3 text-xs text-violet-200">
                    <Info className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-semibold block text-violet-300">Mode Murni Hapus Background (Tanpa Upscaling)</strong>
                      <span>Foto akan dipotong menggunakan model AI RMBG-1.4 dalam 1 detik dengan mempertahankan resolusi asli 1:1 tanpa mengubah ukuran piksel.</span>
                    </div>
                  </div>
                )}

                {/* KOTAK FASE PER FASE PEMBUATAN (REAL-TIME PROGRESS TRACKER) */}
                {isProcessing && (
                  <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-2xl backdrop-blur flex flex-col gap-4">
                    {/* Overall Header */}
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          activeMode === 'remove_bg' ? 'bg-violet-500/20 text-violet-400' : 'bg-amber-500/20 text-amber-400'
                        }`}>
                          <Sparkles className="w-4 h-4 animate-spin" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                            {activeMode === 'remove_bg' ? 'Pemotongan Background Berlangsung' : 'Peningkatan Resolusi Berlangsung'}
                            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                              Langkah {currentPhaseId} dari {phases.length}
                            </span>
                          </h4>
                          <p className="text-[11px] text-slate-400">Total Progres: {totalProgress}%</p>
                        </div>
                      </div>
                      <span className={`font-mono text-lg font-extrabold ${activeMode === 'remove_bg' ? 'text-violet-400' : 'text-amber-400'}`}>
                        {totalProgress}%
                      </span>
                    </div>

                    {/* Kotak Fase / Langkah */}
                    <div className={`grid grid-cols-1 ${phases.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-3`}>
                      {phases.map((phase) => {
                        const isDone = phase.status === 'done';
                        const isRunning = phase.status === 'running';

                        return (
                          <div
                            key={phase.id}
                            className={`p-3.5 rounded-2xl border transition-all duration-300 flex flex-col justify-between ${
                              isDone
                                ? 'bg-emerald-950/40 border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/40'
                                : isRunning
                                ? activeMode === 'remove_bg'
                                  ? 'bg-violet-950/30 border-violet-500/60 shadow-[0_0_15px_rgba(139,92,246,0.15)] ring-1 ring-violet-500/40'
                                  : 'bg-amber-950/30 border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/40'
                                : 'bg-slate-900/40 border-slate-800/80 opacity-60'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                <span
                                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                    isDone
                                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                      : isRunning
                                      ? activeMode === 'remove_bg'
                                        ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40 animate-pulse'
                                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                                      : 'bg-slate-800 text-slate-400'
                                  }`}
                                >
                                  {phase.title}
                                </span>

                                {isDone ? (
                                  <div className="flex items-center gap-1 text-emerald-400 font-bold text-xs">
                                    <CheckCircle2 className="w-4 h-4 fill-emerald-500/20" />
                                    <span>100% ✓</span>
                                  </div>
                                ) : isRunning ? (
                                  <span className={`font-mono text-xs font-bold ${activeMode === 'remove_bg' ? 'text-violet-400' : 'text-amber-400'}`}>
                                    {phase.percent}%
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-slate-500">0%</span>
                                )}
                              </div>

                              <h5
                                className={`text-xs font-bold ${
                                  isDone
                                    ? 'text-emerald-200'
                                    : isRunning
                                    ? activeMode === 'remove_bg'
                                      ? 'text-violet-200'
                                      : 'text-amber-200'
                                    : 'text-slate-400'
                                }`}
                              >
                                {phase.name}
                              </h5>

                              <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">
                                {phase.detail}
                              </p>
                            </div>

                            <div className="mt-3">
                              <div className="w-full bg-slate-800/80 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className={`h-full transition-all duration-300 rounded-full ${
                                    isDone
                                      ? 'bg-emerald-400 w-full shadow-[0_0_8px_#34d399]'
                                      : isRunning
                                      ? activeMode === 'remove_bg'
                                        ? 'bg-gradient-to-r from-violet-400 to-fuchsia-500 shadow-[0_0_8px_#a855f7]'
                                        : 'bg-gradient-to-r from-amber-400 to-orange-500 shadow-[0_0_8px_#fbbf24]'
                                      : 'w-0'
                                  }`}
                                  style={{ width: `${phase.percent}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Kolom Kanan: Kontrol Sesuai Mode (5 Cols) */}
              <div className="lg:col-span-5 flex flex-col gap-5">
                {/* JIKA MODE 1: KHUSUS UPSCALE HD */}
                {activeMode === 'upscale' ? (
                  <>
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-amber-400" />
                          Pilihan Mode AI Enhancer (Upscale)
                        </h3>
                        <span className="text-[11px] text-slate-400">Pilih gaya peningkatan</span>
                      </div>

                      <div className="grid grid-cols-1 gap-2.5">
                        {UPSCALE_PRESETS.map((preset) => {
                          const Icon = preset.icon;
                          const isSelected = selectedPreset === preset.id;

                          return (
                            <div
                              key={preset.id}
                              onClick={() => {
                                setSelectedPreset(preset.id);
                                if (preset.id === 'custom') setShowCustomDrawer(true);
                              }}
                              className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 relative overflow-hidden group ${
                                isSelected
                                  ? `bg-slate-900/90 ${preset.borderActive} shadow-xl`
                                  : 'bg-slate-900/50 border-slate-800/80 hover:bg-slate-900/80 hover:border-slate-700 text-slate-300'
                              }`}
                            >
                              {isSelected && (
                                <div
                                  className={`absolute inset-0 bg-gradient-to-r ${preset.gradient} pointer-events-none opacity-60`}
                                ></div>
                              )}

                              <div className="flex items-center gap-3 relative z-10">
                                <div
                                  className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105 ${
                                    isSelected ? preset.iconColor : 'bg-slate-800 text-slate-400'
                                  }`}
                                >
                                  <Icon className="w-5 h-5" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-xs font-bold text-slate-100">{preset.title}</h4>
                                    <span
                                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${preset.badgeColor}`}
                                    >
                                      {preset.badge}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{preset.desc}</p>
                                </div>
                              </div>

                              <div className="relative z-10 flex-shrink-0">
                                <div
                                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                    isSelected
                                      ? 'border-amber-400 bg-amber-500 text-slate-950'
                                      : 'border-slate-700 bg-slate-800/50'
                                  }`}
                                >
                                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Fine-Tuning Drawer Upscale */}
                    <div className="border border-slate-800 bg-slate-900/50 rounded-2xl overflow-hidden backdrop-blur">
                      <button
                        onClick={() => setShowCustomDrawer(!showCustomDrawer)}
                        className="w-full px-4 py-3 flex items-center justify-between text-xs font-bold text-slate-300 hover:bg-slate-800/40 transition cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <Sliders className="w-4 h-4 text-purple-400" />
                          <span>Pengaturan Detail / Fine-Tuning Slider</span>
                        </div>
                        {showCustomDrawer ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>

                      {showCustomDrawer && (
                        <div className="p-4 border-t border-slate-800 flex flex-col gap-4 text-xs">
                          {/* Scale Selector */}
                          <div>
                            <label className="text-slate-400 font-medium block mb-1.5">Skala Perbesaran (Upscale Factor)</label>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => setScaleFactor(2)}
                                className={`py-1.5 rounded-lg border font-semibold cursor-pointer ${
                                  scaleFactor === 2
                                    ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                                    : 'bg-slate-800/60 border-slate-700 text-slate-400'
                                }`}
                              >
                                2x (Super Kilat)
                              </button>
                              <button
                                type="button"
                                onClick={() => setScaleFactor(4)}
                                className={`py-1.5 rounded-lg border font-semibold cursor-pointer ${
                                  scaleFactor === 4
                                    ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                                    : 'bg-slate-800/60 border-slate-700 text-slate-400'
                                }`}
                              >
                                4x Ultra HD
                              </button>
                            </div>
                          </div>

                          {/* Face Restore Slider */}
                          <div>
                            <div className="flex justify-between text-slate-300 mb-1">
                              <span>Kekuatan Face Restore (GFPGAN):</span>
                              <span className="text-amber-400 font-mono">{faceStrength}%</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={faceStrength}
                              onChange={(e) => setFaceStrength(Number(e.target.value))}
                              className="w-full accent-amber-400 cursor-pointer"
                            />
                          </div>

                          {/* Clarity */}
                          <div>
                            <div className="flex justify-between text-slate-300 mb-1">
                              <span>Ketajaman / Micro-Clarity:</span>
                              <span className="text-amber-400 font-mono">{clarity}%</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={clarity}
                              onChange={(e) => setClarity(Number(e.target.value))}
                              className="w-full accent-amber-400 cursor-pointer"
                            />
                          </div>

                          {/* Skin Smooth */}
                          <div>
                            <div className="flex justify-between text-slate-300 mb-1">
                              <span>Kehalusan Kulit (Wink Porcelain):</span>
                              <span className="text-amber-400 font-mono">{skinSmooth}%</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={skinSmooth}
                              onChange={(e) => setSkinSmooth(Number(e.target.value))}
                              className="w-full accent-amber-400 cursor-pointer"
                            />
                          </div>

                          {/* Vibrance */}
                          <div>
                            <div className="flex justify-between text-slate-300 mb-1">
                              <span>Saturasi & Color Vibrance:</span>
                              <span className="text-amber-400 font-mono">{vibrance}%</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={vibrance}
                              onChange={(e) => setVibrance(Number(e.target.value))}
                              className="w-full accent-amber-400 cursor-pointer"
                            />
                          </div>

                          {/* Export Format */}
                          <div>
                            <label className="text-slate-400 font-medium block mb-1.5">Format File Output</label>
                            <div className="grid grid-cols-3 gap-2">
                              {['png', 'jpg', 'webp'].map((fmt) => (
                                <button
                                  key={fmt}
                                  type="button"
                                  onClick={() => setExportFormat(fmt)}
                                  className={`py-1 rounded-lg uppercase font-bold text-[11px] border cursor-pointer ${
                                    exportFormat === fmt
                                      ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                                      : 'bg-slate-800/60 border-slate-700 text-slate-400'
                                  }`}
                                >
                                  {fmt}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Start Action Button Mode Upscale */}
                    <button
                      disabled={!uploadedData || isProcessing}
                      onClick={startEnhancement}
                      className={`w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2.5 shadow-xl transition-all ${
                        uploadedData && !isProcessing
                          ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 text-white shadow-amber-500/25 active:scale-98 cursor-pointer'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
                      }`}
                    >
                      <Zap className="w-5 h-5 fill-current" />
                      <span>
                        {isProcessing
                          ? 'Sedang Memproses Upscale...'
                          : uploadedData
                          ? `Nge-HD-kan Foto Sekarang (${scaleFactor}x Upscale)`
                          : 'Unggah Foto Terlebih Dahulu'}
                      </span>
                    </button>
                  </>
                ) : (
                  /* JIKA MODE 2: KHUSUS HAPUS BACKGROUND (MURNI CUTOUT) */
                  <>
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                          <Scissors className="w-4 h-4 text-violet-400" />
                          Studio Hapus Background AI (Murni Cutout)
                        </h3>
                        <span className="text-[11px] text-violet-300 bg-violet-500/10 px-2 py-0.5 rounded-full border border-violet-500/20">
                          1:1 Resolusi Asli
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Pilih latar belakang baru untuk subjek foto Anda:
                      </p>

                      <div className="grid grid-cols-1 gap-2.5">
                        {BG_STYLES.map((style) => {
                          const isSelected = selectedBgStyle === style.id;

                          return (
                            <div
                              key={style.id}
                              onClick={() => setSelectedBgStyle(style.id)}
                              className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 relative overflow-hidden group ${
                                isSelected
                                  ? 'bg-slate-900/90 border-violet-400 ring-2 ring-violet-500/30 shadow-xl'
                                  : 'bg-slate-900/50 border-slate-800/80 hover:bg-slate-900/80 hover:border-slate-700 text-slate-300'
                              }`}
                            >
                              <div className="flex items-center gap-3 relative z-10">
                                {/* Color / Pattern Circle Preview */}
                                <div
                                  className={`w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center ${
                                    style.isCustom ? '' : style.previewClass
                                  }`}
                                  style={style.isCustom ? { backgroundColor: customBgColor } : {}}
                                >
                                  {style.isCustom && <Paintbrush className="w-4 h-4 text-white" />}
                                </div>

                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-xs font-bold text-slate-100">{style.title}</h4>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${style.badgeColor}`}>
                                      {style.badge}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{style.desc}</p>
                                </div>
                              </div>

                              <div className="relative z-10 flex-shrink-0">
                                <div
                                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                    isSelected
                                      ? 'border-violet-400 bg-violet-600 text-white'
                                      : 'border-slate-700 bg-slate-800/50'
                                  }`}
                                >
                                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Custom Color Picker if selected */}
                      {selectedBgStyle === 'custom' && (
                        <div className="bg-slate-900/80 border border-violet-500/30 rounded-2xl p-4 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 text-xs text-slate-300">
                            <Paintbrush className="w-4 h-4 text-violet-400" />
                            <span>Pilih Warna Latar Kustom:</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={customBgColor}
                              onChange={(e) => setCustomBgColor(e.target.value)}
                              className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                            />
                            <span className="font-mono text-xs text-violet-300 uppercase">{customBgColor}</span>
                          </div>
                        </div>
                      )}

                      {/* Format Export Khusus Cutout */}
                      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 flex flex-col gap-2">
                        <label className="text-slate-400 text-xs font-medium">Format File Output</label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { id: 'png', label: 'PNG (Lossless Alpha)' },
                            { id: 'jpg', label: 'JPG (Solid BG)' },
                            { id: 'webp', label: 'WebP (Ringan)' }
                          ].map((fmt) => (
                            <button
                              key={fmt.id}
                              type="button"
                              onClick={() => setBgExportFormat(fmt.id)}
                              className={`py-1.5 rounded-lg font-bold text-[11px] border cursor-pointer ${
                                bgExportFormat === fmt.id
                                  ? 'bg-violet-500/20 border-violet-400 text-violet-300'
                                  : 'bg-slate-800/60 border-slate-700 text-slate-400'
                              }`}
                            >
                              {fmt.id.toUpperCase()}
                            </button>
                          ))}
                        </div>
                        {selectedBgStyle === 'transparent' && bgExportFormat === 'jpg' && (
                          <span className="text-[10px] text-amber-400">
                            *Catatan: Background transparan akan disimpan sebagai PNG agar transparansi tidak hilang.
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Start Action Button Mode Hapus Background */}
                    <button
                      disabled={!uploadedData || isProcessing}
                      onClick={() => startRemoveBg()}
                      className={`w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2.5 shadow-xl transition-all ${
                        uploadedData && !isProcessing
                          ? 'bg-gradient-to-r from-violet-600 via-fuchsia-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-violet-500/25 active:scale-98 cursor-pointer'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
                      }`}
                    >
                      <Scissors className="w-5 h-5" />
                      <span>
                        {isProcessing
                          ? 'Sedang Memotong Background...'
                          : uploadedData
                          ? '✂️ Hapus Background Sekarang (1:1 Resolusi Asli)'
                          : 'Unggah Foto Terlebih Dahulu'}
                      </span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-500">
        <p>LUMINA HD AI Studio • Mode Khusus Upscale HD + Mode Khusus Hapus Background (Bria RMBG-1.4)</p>
      </footer>
    </div>
  );
}
