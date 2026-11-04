'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Upload,
  Download,
  Search,
  Trash2,
  Phone,
  FileSpreadsheet,
  CheckCircle2,
} from 'lucide-react';
import { apiFetch } from '@/src/lib/api-client';

interface Contact {
  id?: string;
  name: string;
  phone: string;
  category?: string;
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // New Contact State
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState('UMUM');
  const [notice, setNotice] = useState('');

  const fetchContacts = async () => {
    setIsLoading(true);
    try {
      const res: any = await apiFetch('/api/contacts');
      if (Array.isArray(res)) setContacts(res);
      else if (res && res.contacts) setContacts(res.contacts);
      else setContacts([]);
    } catch (_) {
      setContacts([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;

    try {
      await apiFetch('/api/contacts', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), phone: phone.trim(), category }),
      });
      setShowAddModal(false);
      setName('');
      setPhone('');
      setNotice('Kontak berhasil disimpan.');
      fetchContacts();
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan kontak');
    }
  };

  const filtered = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
  );

  return (
    <div className="space-y-8 animate-fadeIn max-w-6xl mx-auto">
      {/* Editorial Header */}
      <div className="border-b border-white/[0.06] pb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span className="text-[11px] font-mono font-bold tracking-widest text-cyan-400 uppercase">
              POLARIS ENGINE • ADDRESS BOOK & VCF IMPORTER
            </span>
          </div>
          <h1 className="font-editorial text-4xl lg:text-5xl font-bold tracking-tight text-slate-100">
            Buku Kontak & Impor VCF
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manajemen buku telepon WhatsApp, impor massal dari berkas VCF/CSV, dan pengelompokan nomor siaran.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all shadow-[0_0_15px_rgba(56,189,248,0.25)]"
          >
            <UserPlus size={15} />
            <span>Tambah Kontak</span>
          </button>
        </div>
      </div>

      {notice && (
        <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{notice}</span>
        </div>
      )}

      {/* Search & Actions Bar */}
      <div className="glass-panel p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama atau nomor telepon WhatsApp..."
            className="w-full px-4 py-2.5 pl-10 rounded-xl bg-black/40 border border-white/[0.08] text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
          />
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
        </div>

        <div className="text-xs font-mono text-slate-400 shrink-0">
          Total Kontak: <span className="text-cyan-400 font-bold">{filtered.length}</span>
        </div>
      </div>

      {/* Contacts List */}
      <div className="glass-panel-elevated p-6">
        {isLoading ? (
          <div className="py-12 text-center text-slate-500 text-xs font-mono animate-pulse">
            Memuat buku telepon...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs font-mono border border-dashed border-white/[0.06] rounded-xl">
            Belum ada kontak tersimpan. Klik "Tambah Kontak" untuk mendaftarkan nomor baru.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((c, i) => (
              <div key={i} className="p-4 rounded-xl bg-black/30 border border-white/[0.06] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-white">{c.name}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.04] text-slate-400">
                    {c.category || 'UMUM'}
                  </span>
                </div>
                <div className="flex items-center gap-2 font-mono text-xs text-cyan-400">
                  <Phone size={12} />
                  <span>{c.phone}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="glass-panel-elevated max-w-md w-full p-6 space-y-5 border border-white/[0.1]">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h3 className="font-editorial text-xl font-bold text-slate-100">Tambah Kontak Baru</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddContact} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Nama Kontak</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Rian Admin"
                  required
                  className="w-full px-3 py-2.5 rounded-xl bg-black/50 border border-white/[0.1] text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Nomor WhatsApp</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Contoh: 6281234567890"
                  required
                  className="w-full px-3 py-2.5 rounded-xl bg-black/50 border border-white/[0.1] text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Kategori</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-black/50 border border-white/[0.1] text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
                >
                  <option value="UMUM">Umum</option>
                  <option value="VIP">VIP</option>
                  <option value="ADMIN">Admin</option>
                  <option value="BLACKLIST">Blacklist</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs text-slate-400 hover:text-slate-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs"
                >
                  Simpan Kontak
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
