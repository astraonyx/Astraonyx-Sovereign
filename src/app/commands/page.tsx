'use client';

import React, { useState, useEffect } from 'react';
import {
  TerminalSquare,
  Search,
  Filter,
  ToggleLeft,
  ToggleRight,
  Shield,
  Layers,
  Sparkles,
  Zap,
  Code,
} from 'lucide-react';
import { apiFetch } from '@/src/lib/api-client';

interface CommandItem {
  name: string;
  category?: string;
  description?: string;
  aliases?: string[];
  enabled?: boolean;
  minTier?: string;
  usageCount?: number;
}

const CATEGORIES = ['SEMUA', 'AI', 'TOOLS', 'DOWNLOADER', 'GROUP', 'MEDIA', 'GAMES', 'OWNER'];

export default function CommandsPage() {
  const [commands, setCommands] = useState<CommandItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('SEMUA');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchCommands = async () => {
    setIsLoading(true);
    try {
      const res: any = await apiFetch('/api/commands');
      if (res && res.data) {
        if (Array.isArray(res.data)) {
          setCommands(res.data);
        } else if (typeof res.data === 'object') {
          // Flatten if dictionary
          const flattened = Object.values(res.data).flat() as CommandItem[];
          setCommands(flattened);
        }
      }
    } catch (_) {
      // Fallback sample commands if not authenticated yet
      setCommands([
        { name: 'menu', category: 'TOOLS', description: 'Tampilkan seluruh menu perintah bot', aliases: ['help', 'allmenu'], enabled: true },
        { name: 'ai', category: 'AI', description: 'Tanya kecerdasan buatan Hermes AI multimodal', aliases: ['hermes', 'tanya'], enabled: true },
        { name: 'tt', category: 'DOWNLOADER', description: 'Unduh video TikTok HD tanpa watermark', aliases: ['tiktok', 'ttdl'], enabled: true },
        { name: 'ytmp3', category: 'DOWNLOADER', description: 'Konversi dan unduh audio musik YouTube MP3', aliases: ['yta'], enabled: true },
        { name: 'ytmp4', category: 'DOWNLOADER', description: 'Unduh video YouTube resolusi tinggi', aliases: ['ytv'], enabled: true },
        { name: 'sticker', category: 'MEDIA', description: 'Buat stiker WA statis atau bergerak dari gambar/video', aliases: ['s', 'stiker'], enabled: true },
        { name: 'hd', category: 'TOOLS', description: 'Restorasi foto buram dengan Lumina AI', aliases: ['remini', 'upscale'], enabled: true },
        { name: 'chess', category: 'GAMES', description: 'Mulai catur interaktif melawan Stockfish AI', aliases: ['catur'], enabled: true },
        { name: 'kick', category: 'GROUP', description: 'Keluarkan anggota bermasalah dari grup', aliases: ['tendang'], enabled: true },
        { name: 'antilink', category: 'GROUP', description: 'Aktifkan filter hapus tautan grup otomatis', aliases: ['antitauran'], enabled: true },
        { name: 'broadcast', category: 'OWNER', description: 'Siaran pengumuman ke seluruh grup', aliases: ['bc'], enabled: true },
        { name: 'restart', category: 'OWNER', description: 'Mulai ulang klaster server bot', aliases: ['reboot'], enabled: true },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCommands();
  }, []);

  const handleToggle = async (cmdName: string, currentEnabled: boolean) => {
    const nextState = !currentEnabled;
    try {
      await apiFetch('/api/commands/override', {
        method: 'POST',
        body: JSON.stringify({ name: cmdName, enabled: nextState }),
      });
      setCommands((prev) =>
        prev.map((c) => (c.name === cmdName ? { ...c, enabled: nextState } : c))
      );
    } catch (_) {}
  };

  const filtered = commands.filter((cmd) => {
    const matchCat =
      selectedCategory === 'SEMUA' ||
      cmd.category?.toUpperCase() === selectedCategory.toUpperCase();
    const matchQuery =
      cmd.name?.toLowerCase().includes(search.toLowerCase()) ||
      cmd.description?.toLowerCase().includes(search.toLowerCase()) ||
      cmd.aliases?.some((a) => a.toLowerCase().includes(search.toLowerCase()));
    return matchCat && matchQuery;
  });

  return (
    <div className="space-y-8 animate-fadeIn max-w-6xl mx-auto">
      {/* Editorial Header */}
      <div className="border-b border-white/[0.06] pb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span className="text-[11px] font-mono font-bold tracking-widest text-cyan-400 uppercase">
              POLARIS ENGINE • 180+ COMMAND MATRIX
            </span>
          </div>
          <h1 className="font-editorial text-4xl lg:text-5xl font-bold tracking-tight text-slate-100">
            Katalog Perintah Bot
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Daftar lengkap fitur trigger bot WhatsApp Baileys v7, alias pemicu, switch aktif/nonaktif, dan hak akses.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative flex-1 w-full">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama perintah, alias, atau deskripsi fitur..."
              className="w-full px-4 py-2.5 pl-10 rounded-xl bg-black/40 border border-white/[0.08] text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
            />
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          </div>

          <div className="text-xs font-mono text-slate-400 shrink-0">
            Ditemukan: <span className="text-cyan-400 font-bold">{filtered.length}</span> Perintah
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold transition-all shrink-0 ${
                selectedCategory === cat
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-[0_0_12px_rgba(56,189,248,0.2)]'
                  : 'bg-white/[0.02] border border-white/[0.06] text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Commands Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((cmd) => {
          const isEnabled = cmd.enabled !== false;
          return (
            <div
              key={cmd.name}
              className="glass-panel p-4 space-y-3 relative group hover:border-white/[0.12] transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  <span className="font-mono text-sm font-bold text-white tracking-wide">
                    .{cmd.name}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] text-slate-400">
                    {cmd.category || 'GENERAL'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleToggle(cmd.name, isEnabled)}
                    className={isEnabled ? 'text-cyan-400' : 'text-slate-600'}
                  >
                    {isEnabled ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                {cmd.description || 'Tidak ada deskripsi tersedia.'}
              </p>

              {cmd.aliases && cmd.aliases.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-white/[0.04]">
                  <span className="text-[10px] font-mono text-slate-500">Alias:</span>
                  {cmd.aliases.map((a) => (
                    <span
                      key={a}
                      className="text-[10px] font-mono text-slate-400 bg-black/40 px-1.5 py-0.5 rounded"
                    >
                      .{a}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
