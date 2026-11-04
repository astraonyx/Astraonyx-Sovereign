'use client';

import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Users,
  Lock,
  Sliders,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  MessageSquare,
  UserCheck,
  CheckCircle2,
} from 'lucide-react';
import { astraApi, apiFetch } from '@/src/lib/api-client';

interface GroupData {
  id: string;
  subject: string;
  participantsCount?: number;
  antilink?: boolean;
  antibad?: boolean;
  antidelete?: boolean;
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [shieldActive, setShieldActive] = useState(true);
  const [antilink, setAntilink] = useState(true);
  const [antibad, setAntibad] = useState(true);
  const [antidelete, setAntidelete] = useState(true);
  const [notice, setNotice] = useState('');

  const fetchGroups = async () => {
    setIsLoading(true);
    try {
      const res: any = await apiFetch('/api/data/groups');
      if (res && Array.isArray(res.groups)) setGroups(res.groups);
      else if (Array.isArray(res)) setGroups(res);
      else setGroups([]);
    } catch (_) {
      setGroups([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleSyncGroups = async () => {
    try {
      setNotice('Menyinkronkan daftar grup WhatsApp...');
      await apiFetch('/api/data/groups/sync', { method: 'POST' });
      fetchGroups();
      setNotice('Daftar grup berhasil diperbarui dari WhatsApp.');
      setTimeout(() => setNotice(''), 3000);
    } catch (err: any) {
      alert(err.message || 'Gagal sinkron grup');
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
              POLARIS • GRUP & VIRTEXSHIELD 2.0
            </span>
          </div>
          <h1 className="font-editorial text-4xl lg:text-5xl font-bold tracking-tight text-slate-100">
            Grup & Sentinels Moderasi
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Konfigurasi tameng keamanan otomatis WhatsApp, inspeksi muatan berbahaya virtex, dan proteksi anti-link.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSyncGroups}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all shadow-[0_0_15px_rgba(56,189,248,0.25)]"
        >
          <RefreshCw size={14} />
          <span>Sinkronisasi Grup</span>
        </button>
      </div>

      {notice && (
        <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{notice}</span>
        </div>
      )}

      {/* VirtexShield Master Sentinel Banner */}
      <div className="glass-panel-elevated p-8 relative overflow-hidden border border-white/[0.08]">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs font-bold">
              <ShieldCheck size={16} />
              <span>VIRTEXSHIELD 2.0 BUFFER INTERCEPTOR</span>
            </div>
            <h2 className="font-editorial text-3xl font-bold text-white">Sentinel Anti-Crash WhatsApp</h2>
            <p className="text-sm text-slate-300 max-w-xl">
              Memindai buffer payload &gt;20KB, font zaldo/unicode bomb, malformed protobuf signature, dan auto-kick pelaku virtex seketika tanpa crash pada WhatsApp mobile.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShieldActive(!shieldActive)}
            className={`px-6 py-3.5 rounded-2xl font-bold text-xs font-mono transition-all flex items-center gap-2 shadow-lg ${
              shieldActive
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-emerald-500/20'
                : 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-rose-500/20'
            }`}
          >
            {shieldActive ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
            <span>{shieldActive ? 'SENTINEL AKTIF' : 'SENTINEL NONAKTIF'}</span>
          </button>
        </div>
      </div>

      {/* Moderation Global Switches Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* Antilink */}
        <div className="glass-panel p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-editorial text-xl font-bold text-slate-100">Anti-Link Filter</h3>
            <button type="button" onClick={() => setAntilink(!antilink)} className="text-cyan-400">
              {antilink ? <ToggleRight size={24} /> : <ToggleLeft size={24} className="text-slate-600" />}
            </button>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Hapus otomatis pesan berisi tautan undangan grup WhatsApp lain atau link phishing mencurigakan.
          </p>
        </div>

        {/* Antibad */}
        <div className="glass-panel p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-editorial text-xl font-bold text-slate-100">Anti-Toxic Filter</h3>
            <button type="button" onClick={() => setAntibad(!antibad)} className="text-purple-400">
              {antibad ? <ToggleRight size={24} /> : <ToggleLeft size={24} className="text-slate-600" />}
            </button>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Peringatan otomatis dan hapus kata-kata kasar, ujaran kebencian, atau pelecehan di grup terdaftar.
          </p>
        </div>

        {/* Antidelete */}
        <div className="glass-panel p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-editorial text-xl font-bold text-slate-100">Ghost Protocol</h3>
            <button type="button" onClick={() => setAntidelete(!antidelete)} className="text-amber-400">
              {antidelete ? <ToggleRight size={24} /> : <ToggleLeft size={24} className="text-slate-600" />}
            </button>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Tangkap pesan yang ditarik oleh pengirim (Anti-Delete) dan simpan salinannya secara privat di Message Vault.
          </p>
        </div>
      </div>

      {/* Joined Groups List */}
      <div className="glass-panel-elevated p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-editorial text-xl font-bold text-white flex items-center gap-2">
            <Users size={20} className="text-cyan-400" />
            <span>Daftar Grup WhatsApp Terhubung</span>
          </h3>
          <span className="text-xs font-mono text-slate-400">Total Grup: {groups.length}</span>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-slate-500 text-xs font-mono animate-pulse">
            Memuat daftar grup...
          </div>
        ) : groups.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs font-mono border border-dashed border-white/[0.06] rounded-xl">
            Belum ada grup yang tersinkronisasi. Klik "Sinkronisasi Grup" di kanan atas.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {groups.map((g) => (
              <div key={g.id} className="p-4 rounded-xl bg-black/40 border border-white/[0.06] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-white truncate max-w-[240px]">{g.subject}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400">
                    {g.participantsCount || 0} Anggota
                  </span>
                </div>
                <div className="text-[11px] font-mono text-slate-500 truncate">{g.id}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
