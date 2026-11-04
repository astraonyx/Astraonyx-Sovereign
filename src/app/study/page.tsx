'use client';

import React, { useEffect, useState } from 'react';
import { BookOpen, CheckSquare, FileText, Clock, Compass, Plus, Sparkles } from 'lucide-react';
import { astraApi } from '@/src/lib/api-client';

export default function StudyPage() {
  const [tasks, setTasks] = useState<any[]>([]);

  useEffect(() => {
    // Load tasks if available
    astraApi.getBotStatus().catch(() => {});
  }, []);

  return (
    <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto">
      {/* Editorial Header */}
      <div className="border-b border-white/[0.06] pb-6">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          <span className="text-[11px] font-mono font-bold tracking-widest text-amber-400 uppercase">
            LUMINARY • ACADEMY & PRODUCTIVITY SUITE
          </span>
        </div>
        <h1 className="font-editorial text-4xl lg:text-5xl font-bold tracking-tight text-slate-100">
          Luminary Studyspace
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Polymath Genius Academy, pelacak batas waktu tugas kelompok, toolkit manipulasi PDF, dan kapsul waktu masa depan.
        </p>
      </div>

      {/* Grid Modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Module 1: Smart Task & Deadlines */}
        <div className="glass-panel p-6 space-y-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <CheckSquare size={20} />
          </div>
          <div>
            <h3 className="font-editorial text-xl font-bold text-slate-100">Tugas & Deadline</h3>
            <p className="text-xs text-slate-400 mt-1">
              Manajemen jadwal tugas dengan pengingat otomatis ke grup WhatsApp.
            </p>
          </div>
          <div className="pt-2">
            <button
              type="button"
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-semibold text-slate-200 transition-all"
            >
              <Plus size={14} />
              <span>Tambah Tugas Baru</span>
            </button>
          </div>
        </div>

        {/* Module 2: Polymath Academy */}
        <div className="glass-panel p-6 space-y-4">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <BookOpen size={20} />
          </div>
          <div>
            <h3 className="font-editorial text-xl font-bold text-slate-100">Polymath Academy</h3>
            <p className="text-xs text-slate-400 mt-1">
              Kurikulum materi bertingkat, kuis interaktif, dan konsultasi pelajaran cerdas.
            </p>
          </div>
          <div className="pt-2">
            <button
              type="button"
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-xs font-semibold text-cyan-300 transition-all"
            >
              <Sparkles size={14} />
              <span>Buka Kurikulum</span>
            </button>
          </div>
        </div>

        {/* Module 3: PDF & Document Toolkit */}
        <div className="glass-panel p-6 space-y-4">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <FileText size={20} />
          </div>
          <div>
            <h3 className="font-editorial text-xl font-bold text-slate-100">PDF & Dokumen</h3>
            <p className="text-xs text-slate-400 mt-1">
              Konversi gambar ke PDF, kompresi berkas, dan ekstraksi teks ke Markdown.
            </p>
          </div>
          <div className="pt-2">
            <button
              type="button"
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-semibold text-slate-200 transition-all"
            >
              <span>Jalankan Konverter</span>
            </button>
          </div>
        </div>

        {/* Module 4: Time Capsule Vault */}
        <div className="glass-panel p-6 space-y-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Clock size={20} />
          </div>
          <div>
            <h3 className="font-editorial text-xl font-bold text-slate-100">Time Capsule Vault</h3>
            <p className="text-xs text-slate-400 mt-1">
              Kunci pesan dan kenangan untuk dibuka secara otomatis pada tanggal tertentu di masa depan.
            </p>
          </div>
        </div>

        {/* Module 5: Deep Talk Cards */}
        <div className="glass-panel p-6 space-y-4">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <Compass size={20} />
          </div>
          <div>
            <h3 className="font-editorial text-xl font-bold text-slate-100">Deep Talk Cards</h3>
            <p className="text-xs text-slate-400 mt-1">
              Pertanyaan reflektif mendalam untuk diskusi filosofis, pertemanan, dan introspeksi diri.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
