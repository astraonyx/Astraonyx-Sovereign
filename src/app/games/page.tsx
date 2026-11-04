'use client';

import React, { useEffect, useState } from 'react';
import { Gamepad2, Swords, Trophy, Flame, Play, Shield } from 'lucide-react';
import { astraApi } from '@/src/lib/api-client';

export default function GamesPage() {
  const [raidStatus, setRaidStatus] = useState<any>(null);

  useEffect(() => {
    astraApi.getRaidStatus().then((res: any) => {
      if (res) setRaidStatus(res);
    }).catch(() => {});
  }, []);

  return (
    <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto">
      {/* Editorial Header */}
      <div className="border-b border-white/[0.06] pb-6">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span className="text-[11px] font-mono font-bold tracking-widest text-emerald-400 uppercase">
            STARLIUM • GALAXY GAMING & STOCKFISH CHESS
          </span>
        </div>
        <h1 className="font-editorial text-4xl lg:text-5xl font-bold tracking-tight text-slate-100">
          Starlium Gaming Arena
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Arena catur Stockfish virtual, Co-Op Boss Raid multipemain grup, dan sistem peringkat RPG 7-Tier.
        </p>
      </div>

      {/* Featured Arena: Stockfish Chess Studio */}
      <div className="glass-panel-elevated p-8 relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-3 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-semibold">
              <Swords size={14} />
              <span>STOCKFISH NEURAL ENGINE</span>
            </div>
            <h2 className="font-editorial text-3xl font-bold text-white">Starlium Chess Studio</h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Tantang AI catur bertenaga evaluasi posisi instan langsung di browser, atau mainkan partai catur bergiliran melawan anggota komunitas via chat WhatsApp.
            </p>
            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-all"
              >
                <Play size={16} />
                <span>Mulai Pertandingan Catur</span>
              </button>
            </div>
          </div>

          <div className="w-48 h-48 rounded-2xl bg-black/50 border border-white/10 flex items-center justify-center p-4">
            <div className="grid grid-cols-4 grid-rows-4 gap-1 w-full h-full opacity-60">
              {Array.from({ length: 16 }).map((_, i) => (
                <div
                  key={i}
                  className={`rounded-sm ${(Math.floor(i / 4) + i) % 2 === 0 ? 'bg-emerald-500/30' : 'bg-white/5'}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Co-Op Boss Raid */}
        <div className="glass-panel p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <Flame size={20} />
              </div>
              <div>
                <h3 className="font-editorial text-xl font-bold text-slate-100">Co-Op Boss Raid</h3>
                <p className="text-xs text-slate-400">Pertempuran Akbar Server</p>
              </div>
            </div>
            <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 font-bold">
              EVENT READY
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Kumpulkan seluruh anggota grup untuk mengalahkan Titan Galactic dan menangkan gelar kehormatan eksklusif.
          </p>
        </div>

        {/* RPG Leaderboard & 7-Tier XP */}
        <div className="glass-panel p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Trophy size={20} />
              </div>
              <div>
                <h3 className="font-editorial text-xl font-bold text-slate-100">Peringkat & XP Server</h3>
                <p className="text-xs text-slate-400">7-Tier Leveling System</p>
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Pantau keaktifan anggota komunitas, akumulasi perolehan poin EXP, dan papan peringkat global teratas.
          </p>
        </div>
      </div>
    </div>
  );
}
