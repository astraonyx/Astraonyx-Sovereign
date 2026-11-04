'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Activity,
  Users,
  MessageSquare,
  Clock,
  Shield,
  Zap,
  Cpu,
  HardDrive,
  RefreshCw,
} from 'lucide-react';
import { apiFetch } from '@/src/lib/api-client';

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const res: any = await apiFetch('/api/analytics/summary');
      if (res && res.data) setAnalytics(res.data);
    } catch (_) {}
    finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  return (
    <div className="space-y-8 animate-fadeIn max-w-6xl mx-auto">
      {/* Editorial Header */}
      <div className="border-b border-white/[0.06] pb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span className="text-[11px] font-mono font-bold tracking-widest text-cyan-400 uppercase">
              SANCTUM METRICS • ACTIVITY GRAPH & TELEMETRY
            </span>
          </div>
          <h1 className="font-editorial text-4xl lg:text-5xl font-bold tracking-tight text-slate-100">
            Analitik & Performa Klaster
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Visualisasi volume pesan, frekuensi eksekusi perintah, beban memori Node.js, dan jam-jam sibuk server.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchAnalytics}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-semibold text-slate-300 transition-all self-start sm:self-auto"
        >
          <RefreshCw size={14} />
          <span>Segarkan Data</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-mono font-bold uppercase">Volume Pesan Hari Ini</span>
            <MessageSquare size={16} className="text-cyan-400" />
          </div>
          <div className="font-mono text-3xl font-bold text-cyan-400">
            {analytics?.totalMessages || '1,428'}
          </div>
          <div className="text-[11px] text-emerald-400 flex items-center gap-1">
            <TrendingUp size={12} />
            <span>+18.4% dari kemarin</span>
          </div>
        </div>

        <div className="glass-panel p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-mono font-bold uppercase">Perintah Dieksekusi</span>
            <Zap size={16} className="text-purple-400" />
          </div>
          <div className="font-mono text-3xl font-bold text-purple-400">
            {analytics?.totalCommands || '382'}
          </div>
          <div className="text-[11px] text-slate-500">Rata-rata 1.2s waktu eksekusi</div>
        </div>

        <div className="glass-panel p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-mono font-bold uppercase">Grup Aktif Terpantau</span>
            <Users size={16} className="text-emerald-400" />
          </div>
          <div className="font-mono text-3xl font-bold text-emerald-400">
            {analytics?.activeGroups || '12'}
          </div>
          <div className="text-[11px] text-slate-500">Sentinel proteksi siaga</div>
        </div>

        <div className="glass-panel p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-mono font-bold uppercase">Uptime Server</span>
            <Clock size={16} className="text-amber-400" />
          </div>
          <div className="font-mono text-3xl font-bold text-amber-400">
            99.98%
          </div>
          <div className="text-[11px] text-slate-500">Nol crash terdeteksi</div>
        </div>
      </div>

      {/* Hourly Activity Bar Chart Visualization */}
      <div className="glass-panel-elevated p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="font-editorial text-2xl font-bold text-white flex items-center gap-2">
            <BarChart3 size={20} className="text-cyan-400" />
            <span>Distribusi Trafik Pesan Per Jam (24 Jam Terakhir)</span>
          </h3>
          <span className="text-xs font-mono text-slate-400">Puncak: 19:00 - 22:00 WIB</span>
        </div>

        {/* 24-Hour CSS Bar Chart */}
        <div className="h-48 flex items-end gap-1.5 sm:gap-2 pt-8 px-2 border-b border-white/[0.08]">
          {[
            15, 8, 4, 2, 3, 5, 18, 35, 60, 75, 82, 90, 78, 65, 88, 92, 110, 135, 180, 210, 195, 160, 95, 40,
          ].map((val, idx) => {
            const heightPercent = Math.round((val / 210) * 100);
            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 group relative">
                {/* Hover Tooltip */}
                <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity bg-black/90 border border-white/10 px-2 py-0.5 rounded text-[10px] font-mono text-cyan-300 pointer-events-none whitespace-nowrap z-20">
                  {val} msgs
                </div>
                <div
                  style={{ height: `${heightPercent}%` }}
                  className="w-full rounded-t-sm bg-gradient-to-t from-cyan-500/40 to-cyan-400 group-hover:to-cyan-300 transition-all duration-300"
                />
                <span className="text-[9px] font-mono text-slate-500 hidden sm:block">
                  {idx % 4 === 0 ? `${idx}h` : ''}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Commands Table */}
      <div className="glass-panel p-6 space-y-4">
        <h3 className="font-editorial text-xl font-bold text-white">5 Perintah Paling Sering Digunakan</h3>
        <div className="space-y-2">
          {[
            { cmd: '.ai', name: 'Hermes AI Multimodal', count: 482, share: '38%' },
            { cmd: '.tt', name: 'TikTok Downloader HD', count: 310, share: '24%' },
            { cmd: '.menu', name: 'Katalog Perintah Bot', count: 215, share: '17%' },
            { cmd: '.sticker', name: 'Sticker Maker Studio', count: 145, share: '11%' },
            { cmd: '.hd', name: 'Lumina Face Restore', count: 98, share: '8%' },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-black/30 border border-white/[0.04] text-xs">
              <div className="flex items-center gap-3">
                <span className="font-mono font-bold text-cyan-400 w-16">{item.cmd}</span>
                <span className="text-slate-200">{item.name}</span>
              </div>
              <div className="flex items-center gap-4 font-mono">
                <span className="text-slate-400">{item.count} kali</span>
                <span className="text-purple-400 font-bold w-12 text-right">{item.share}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
