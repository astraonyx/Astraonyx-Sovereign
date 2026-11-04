'use client';

import React, { useState } from 'react';
import {
  Palette,
  Sparkles,
  Download,
  Layers,
  Wand2,
  Copy,
  Check,
  Sliders,
  Type,
  Layout,
} from 'lucide-react';

const PRESET_THEMES = [
  { id: 'obsidian', name: 'Obsidian Neon', primary: '#38bdf8', secondary: '#a855f7', bg: '#030508' },
  { id: 'aurora', name: 'Cyber Aurora', primary: '#10b981', secondary: '#06b6d4', bg: '#020d0e' },
  { id: 'velvet', name: 'Velvet Midnight', primary: '#ec4899', secondary: '#8b5cf6', bg: '#090314' },
  { id: 'gold', name: 'Galactic Sol', primary: '#f59e0b', secondary: '#ef4444', bg: '#0d0903' },
  { id: 'mono', name: 'Titanium Pure', primary: '#ffffff', secondary: '#94a3b8', bg: '#000000' },
];

export default function KinetixPage() {
  const [selectedTheme, setSelectedTheme] = useState(PRESET_THEMES[0]);
  const [cardTitle, setCardTitle] = useState('ASTRAONYX ARCHITECTURE');
  const [cardSubtitle, setCardSubtitle] = useState('Sovereign Cosmic Command Center');
  const [cardAuthor, setCardAuthor] = useState('Operator');
  const [copied, setCopied] = useState(false);

  const handleCopyTokens = () => {
    const tokens = JSON.stringify(selectedTheme, null, 2);
    navigator.clipboard.writeText(tokens);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-6xl mx-auto">
      {/* Editorial Header */}
      <div className="border-b border-white/[0.06] pb-6">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
          <span className="text-[11px] font-mono font-bold tracking-widest text-purple-400 uppercase">
            ARIES STUDIO • KINETIX VISUAL FORGE & THEME LAB
          </span>
        </div>
        <h1 className="font-editorial text-4xl lg:text-5xl font-bold tracking-tight text-slate-100">
          Kinetix Studio & Visual Lab
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Generator kartu visual kosmik, palet token estetika, pembuat stiker WhatsApp, dan engine desain antarmuka.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Controls */}
        <div className="lg:col-span-6 space-y-6">
          <div className="glass-panel-elevated p-6 space-y-5">
            <h2 className="font-editorial text-2xl font-bold text-white flex items-center gap-2">
              <Sliders size={20} className="text-purple-400" />
              <span>Theme Preset Engine</span>
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {PRESET_THEMES.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => setSelectedTheme(theme)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    selectedTheme.id === theme.id
                      ? 'border-purple-400/60 bg-purple-500/15 shadow-[0_0_15px_rgba(168,85,247,0.25)]'
                      : 'border-white/[0.08] bg-black/40 hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.primary }} />
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.secondary }} />
                  </div>
                  <div className="text-xs font-bold text-slate-200">{theme.name}</div>
                </button>
              ))}
            </div>

            <div className="space-y-4 pt-3 border-t border-white/[0.06]">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Judul Kartu</label>
                <input
                  type="text"
                  value={cardTitle}
                  onChange={(e) => setCardTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/[0.1] text-xs text-slate-200 focus:outline-none focus:border-purple-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Subjudul / Deskripsi</label>
                <input
                  type="text"
                  value={cardSubtitle}
                  onChange={(e) => setCardSubtitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/[0.1] text-xs text-slate-200 focus:outline-none focus:border-purple-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Nama Penulis / Operator</label>
                <input
                  type="text"
                  value={cardAuthor}
                  onChange={(e) => setCardAuthor(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/[0.1] text-xs text-slate-200 focus:outline-none focus:border-purple-400"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleCopyTokens}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs text-slate-300 transition-all font-mono"
              >
                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                <span>{copied ? 'Tersalin!' : 'Salin Token Warna'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Live Canvas Visual Card Render */}
        <div className="lg:col-span-6 flex flex-col justify-center">
          <div className="text-xs font-mono text-slate-400 mb-3 flex items-center gap-2">
            <Sparkles size={14} className="text-purple-400" />
            <span>Render Kartu Visual Kinetix</span>
          </div>

          <div
            style={{ backgroundColor: selectedTheme.bg }}
            className="w-full aspect-[16/10] rounded-3xl border border-white/10 p-8 flex flex-col justify-between relative overflow-hidden shadow-2xl transition-all duration-500"
          >
            {/* Ambient Aurora Glow */}
            <div
              style={{
                background: `radial-gradient(circle, ${selectedTheme.primary}33 0%, transparent 70%)`,
              }}
              className="absolute -top-20 -right-20 w-80 h-80 rounded-full blur-3xl pointer-events-none"
            />
            <div
              style={{
                background: `radial-gradient(circle, ${selectedTheme.secondary}22 0%, transparent 70%)`,
              }}
              className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full blur-3xl pointer-events-none"
            />

            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: selectedTheme.primary }} />
                <span className="text-[11px] font-mono tracking-widest uppercase font-bold text-slate-300">
                  {selectedTheme.name}
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-500">ASTRAONYX ENGINE</span>
            </div>

            <div className="relative z-10 space-y-2">
              <h3 className="font-editorial text-3xl sm:text-4xl font-bold tracking-tight text-white leading-tight">
                {cardTitle}
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 max-w-md font-sans">
                {cardSubtitle}
              </p>
            </div>

            <div className="relative z-10 flex items-center justify-between pt-4 border-t border-white/[0.08] text-xs font-mono">
              <span className="text-slate-400">Created by <strong className="text-white">{cardAuthor}</strong></span>
              <span style={{ color: selectedTheme.primary }}>● SYNCHRONIZED</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
