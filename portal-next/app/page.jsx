'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { 
  Bot, 
  Sparkles, 
  Atom, 
  Gamepad2, 
  ShoppingBag, 
  GraduationCap, 
  Share2, 
  ShieldCheck, 
  Activity,
  ArrowRight,
  Database,
  ExternalLink
} from 'lucide-react';

// Dynamic import for Three.js 3D canvas (No SSR)
const CosmicCanvas = dynamic(() => import('../components/CosmicCanvas'), { ssr: false });

export default function HomePage() {
  const [botStatus, setBotStatus] = useState('STOPPED');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch('http://localhost:3000/api/bot/status');
        const data = await res.json();
        setBotStatus(data.status || 'STOPPED');
      } catch (err) {
        setBotStatus('OFFLINE');
      } finally {
        setLoading(false);
      }
    }
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const pillars = [
    { id: 'polaris', name: 'Polaris', desc: 'WhatsApp Baileys & Hermes AI Autonomous', icon: Bot, color: 'text-indigo-400', href: 'http://localhost:3000/#/polaris' },
    { id: 'nebula', name: 'Nebula', desc: 'OmniGet Downloader & Lumina Studio HD', icon: Sparkles, color: 'text-cyan-400', href: 'http://localhost:3000/#/nebula' },
    { id: 'atomic', name: 'Atomic', desc: 'Produktivitas Kebiasaan & Finansial', icon: Atom, color: 'text-emerald-400', href: 'http://localhost:3000/#/atomic' },
    { id: 'starlium', name: 'Starlium', desc: 'Papan Catur Stockfish & Game Hub', icon: Gamepad2, color: 'text-amber-400', href: 'http://localhost:3000/#/starlium' },
    { id: 'sirium', name: 'Sirium', desc: 'Marketplace Aset & Toko Digital', icon: ShoppingBag, color: 'text-rose-400', href: 'http://localhost:3000/#/sirium' },
    { id: 'luminary', name: 'Luminary', desc: 'Wayground Quizizz & Riset Proyek', icon: GraduationCap, color: 'text-blue-400', href: 'http://localhost:3000/#/luminary' },
    { id: 'polarium', name: 'Polarium', desc: 'Jejaring Sosial & Pesan E2EE Terenkripsi', icon: Share2, color: 'text-purple-400', href: 'http://localhost:3000/#/polarium' },
    { id: 'sanctum', name: 'Sanctum', desc: 'Benteng Sentinel & Kontrol Cosmos', icon: ShieldCheck, color: 'text-fuchsia-400', href: 'http://localhost:3000/#/sanctum' },
  ];

  return (
    <main className="min-h-screen px-4 py-8 max-w-7xl mx-auto space-y-12">
      {/* Top Navbar */}
      <header className="flex items-center justify-between py-4 border-b border-white/10">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-cyan-400 p-[2px]">
            <div className="w-full h-full bg-obsidian-950 rounded-[10px] flex items-center justify-center font-bold text-lg text-white">
              A
            </div>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Astraonyx Polaris
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono">
                Next.js + Three.js
              </span>
            </h1>
            <p className="text-xs text-slate-400 font-mono">Cosmic Unified Ecosystem</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs">
            <span className={`w-2 h-2 rounded-full ${botStatus === 'CONNECTED' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span className="text-slate-300 font-medium">WhatsApp: {botStatus}</span>
          </div>

          <a
            href="http://localhost:3000"
            className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 transition text-white shadow-lg shadow-indigo-600/30"
          >
            Buka Dashboard Asli
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </header>

      {/* Hero Section with Interactive 3D Three.js */}
      <section className="relative rounded-3xl glass-panel p-8 lg:p-12 overflow-hidden border border-indigo-500/20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-6 z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold">
              <Activity className="w-3.5 h-3.5" />
              Straight Thread High-Performance Architecture
            </div>
            <h2 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Pusat Komando Robot WhatsApp & 8 Pilar Ekosistem
            </h2>
            <p className="text-slate-400 text-sm lg:text-base leading-relaxed">
              Kombinasi modern <strong>Next.js 14, React, Tailwind CSS</strong>, dan kanvas interaktif <strong>Three.js</strong> yang terhubung dengan engine WhatsApp Baileys, SQLite lokal, serta bridge PostgreSQL & Laravel di Laragon.
            </p>

            <div className="flex flex-wrap gap-4 pt-2">
              <a
                href="http://localhost:3000/#/polaris"
                className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm flex items-center gap-2 shadow-lg shadow-indigo-500/25 transition"
              >
                Mulai dari Polaris Bot
                <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href="http://localhost:8000/api/v1/bot/status"
                target="_blank"
                rel="noreferrer"
                className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 font-medium text-sm flex items-center gap-2 transition"
              >
                <Database className="w-4 h-4 text-cyan-400" />
                Laragon / Laravel API
              </a>
            </div>
          </div>

          <div className="lg:col-span-5 relative flex items-center justify-center">
            {/* 3D Three.js Canvas */}
            <CosmicCanvas />
          </div>
        </div>
      </section>

      {/* 8 Pillars Grid */}
      <section className="space-y-6">
        <div>
          <h3 className="text-2xl font-bold tracking-tight text-white">8 Pilar Layanan Aktif</h3>
          <p className="text-sm text-slate-400">Seluruh modul telah selesai dihubungkan dan siap digunakan secara langsung.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {pillars.map((p) => {
            const Icon = p.icon;
            return (
              <a
                key={p.id}
                href={p.href}
                className="p-5 rounded-2xl glass-panel hover:border-indigo-500/40 transition duration-300 group flex flex-col justify-between space-y-4 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className={`p-3 rounded-xl bg-white/5 ${p.color} group-hover:scale-110 transition duration-300`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white group-hover:translate-x-1 transition duration-200" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-base group-hover:text-indigo-300 transition">{p.name}</h4>
                  <p className="text-xs text-slate-400 mt-1 leading-normal">{p.desc}</p>
                </div>
              </a>
            );
          })}
        </div>
      </section>
    </main>
  );
}
