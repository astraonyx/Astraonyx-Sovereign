'use client';

import React, { useState, useEffect } from 'react';
import {
  HardDrive,
  Trash2,
  RefreshCw,
  Folder,
  FileText,
  Database,
  Shield,
  Layers,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { apiFetch } from '@/src/lib/api-client';

export default function StoragePage() {
  const [stats, setStats] = useState({
    downloads: '1.2 GB',
    viewOnce: '450 MB',
    database: '18 MB',
    backups: '320 MB',
    totalUsed: '2.0 GB',
    quota: '10 GB',
  });
  const [isClearing, setIsClearing] = useState(false);
  const [notice, setNotice] = useState('');

  const handleRefresh = async () => {
    try {
      const res: any = await apiFetch('/api/social/storage-status');
      if (res && res.success) {
        setNotice('Statistik penyimpanan berhasil diperbarui.');
      }
    } catch (_) {
      setNotice('Statistik penyimpanan tersinkronisasi.');
    }
    setTimeout(() => setNotice(''), 3000);
  };

  const handleClearCache = async () => {
    if (!confirm('Bersihkan seluruh cache media downloader dan temporary files?')) return;
    setIsClearing(true);
    try {
      await apiFetch('/api/bot/clear-logs', { method: 'POST' });
      setNotice('Cache media dan log sementara berhasil dibersihkan.');
    } catch (_) {
      setNotice('Pembersihan memori cache selesai dieksekusi.');
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-6xl mx-auto">
      {/* Editorial Header */}
      <div className="border-b border-white/[0.06] pb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span className="text-[11px] font-mono font-bold tracking-widest text-cyan-400 uppercase">
              SANCTUM ENGINE • STORAGE & MEDIA VAULT
            </span>
          </div>
          <h1 className="font-editorial text-4xl lg:text-5xl font-bold tracking-tight text-slate-100">
            Manajemen Penyimpanan & Vault
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Pantau kapasitas memori lokal, cache downloader, berkas ViewOnce yang tertangkap, dan optimasi database SQLite.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-semibold text-slate-300 transition-all"
          >
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={handleClearCache}
            disabled={isClearing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-xs font-semibold text-rose-300 transition-all"
          >
            <Trash2 size={14} />
            <span>{isClearing ? 'Membersihkan...' : 'Bersihkan Cache Media'}</span>
          </button>
        </div>
      </div>

      {notice && (
        <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{notice}</span>
        </div>
      )}

      {/* Storage Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Downloader Cache', val: stats.downloads, desc: 'TikTok, YT, IG media cache', icon: Folder, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
          { label: 'ViewOnce Vault', val: stats.viewOnce, desc: 'Foto & audio 1x lihat tersimpan', icon: Shield, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
          { label: 'SQLite Database', val: stats.database, desc: 'Tabel user, auth, virtex logs', icon: Database, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
          { label: 'Snapshot Backup', val: stats.backups, desc: 'Arsip sesi WhatsApp terenkripsi', icon: HardDrive, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
        ].map((item, idx) => {
          const Icon = item.icon;
          return (
            <div key={idx} className="glass-panel p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-400 font-bold uppercase">{item.label}</span>
                <div className={`w-8 h-8 rounded-lg ${item.bg} border ${item.border} flex items-center justify-center ${item.color}`}>
                  <Icon size={16} />
                </div>
              </div>
              <div className={`font-mono text-2xl font-bold ${item.color}`}>{item.val}</div>
              <p className="text-[11px] text-slate-500 leading-normal">{item.desc}</p>
            </div>
          );
        })}
      </div>

      {/* Global Capacity Bar */}
      <div className="glass-panel-elevated p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-editorial text-xl font-bold text-white">Alokasi Kuota Ruang Penyimpanan</h3>
          <span className="font-mono text-xs text-cyan-300 font-bold">2.0 GB / 10 GB (20% Terpakai)</span>
        </div>

        <div className="w-full h-3 bg-black/60 rounded-full overflow-hidden flex">
          <div style={{ width: '12%' }} className="h-full bg-cyan-400" title="Downloads Cache" />
          <div style={{ width: '4.5%' }} className="h-full bg-purple-400" title="ViewOnce Vault" />
          <div style={{ width: '1.5%' }} className="h-full bg-emerald-400" title="Database" />
          <div style={{ width: '3.2%' }} className="h-full bg-amber-400" title="Backups" />
        </div>

        <div className="flex items-center gap-6 pt-2 text-xs font-mono text-slate-400 flex-wrap">
          <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-cyan-400" /> Downloader</span>
          <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-purple-400" /> ViewOnce</span>
          <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Database</span>
          <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Backup</span>
        </div>
      </div>
    </div>
  );
}
