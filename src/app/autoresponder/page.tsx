'use client';

import React, { useState, useEffect } from 'react';
import {
  MessageSquareReply,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  Zap,
  Filter,
} from 'lucide-react';
import { apiFetch } from '@/src/lib/api-client';

interface AutoResponderRule {
  id: string;
  trigger_type: string;
  pattern: string;
  response_text: string;
  is_active: number | boolean;
  match_count?: number;
}

export default function AutoResponderPage() {
  const [rules, setRules] = useState<AutoResponderRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  // New Rule Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [pattern, setPattern] = useState('');
  const [responseText, setResponseText] = useState('');
  const [triggerType, setTriggerType] = useState('contains');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchRules = async () => {
    setIsLoading(true);
    try {
      const res: any = await apiFetch('/api/autoresponders');
      if (Array.isArray(res)) setRules(res);
      else if (res && res.rules) setRules(res.rules);
      else setRules([]);
    } catch (_) {
      setRules([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleToggle = async (id: string, currentActive: number | boolean) => {
    const nextState = !currentActive;
    try {
      await apiFetch(`/api/autoresponders/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: nextState ? 1 : 0 }),
      });
      setRules((prev) =>
        prev.map((r) => (r.id === id ? { ...r, is_active: nextState } : r))
      );
    } catch (_) {}
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus aturan auto-responder ini?')) return;
    try {
      await apiFetch(`/api/autoresponders/${id}`, { method: 'DELETE' });
      setRules((prev) => prev.filter((r) => r.id !== id));
    } catch (_) {}
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pattern.trim() || !responseText.trim()) return;

    setIsSubmitting(true);
    try {
      await apiFetch('/api/autoresponders', {
        method: 'POST',
        body: JSON.stringify({
          pattern: pattern.trim(),
          response_text: responseText.trim(),
          trigger_type: triggerType,
          is_active: 1,
        }),
      });
      setShowAddModal(false);
      setPattern('');
      setResponseText('');
      fetchRules();
    } catch (_) {
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredRules = rules.filter(
    (r) =>
      r.pattern?.toLowerCase().includes(search.toLowerCase()) ||
      r.response_text?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-fadeIn max-w-6xl mx-auto">
      {/* Editorial Header */}
      <div className="border-b border-white/[0.06] pb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span className="text-[11px] font-mono font-bold tracking-widest text-cyan-400 uppercase">
              POLARIS ENGINE • AUTO-RESPONDER MATRIX
            </span>
          </div>
          <h1 className="font-editorial text-4xl lg:text-5xl font-bold tracking-tight text-slate-100">
            Pesan Otomatis WhatsApp
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Konfigurasi kata kunci pemicu instan, balasan otomatis berbasis regex atau teks eksak, dan routing cerdas.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all duration-200 shadow-[0_0_20px_rgba(56,189,248,0.25)]"
        >
          <Plus size={16} />
          <span>Tambah Aturan Baru</span>
        </button>
      </div>

      {/* Rules Table / Cards */}
      <div className="glass-panel-elevated p-6 space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari kata kunci pemicu atau isi balasan..."
            className="flex-1 min-w-[280px] px-4 py-2.5 rounded-xl bg-black/40 border border-white/[0.08] text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
          />
          <div className="text-xs font-mono text-slate-400">
            Total Aturan: <span className="text-cyan-300 font-bold">{filteredRules.length}</span>
          </div>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-slate-500 text-xs font-mono animate-pulse">
            Memuat database auto-responder...
          </div>
        ) : filteredRules.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs font-mono border border-dashed border-white/[0.06] rounded-xl">
            Belum ada aturan auto-responder yang terdaftar. Klik "Tambah Aturan Baru" untuk memulai.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredRules.map((rule) => {
              const active = Boolean(rule.is_active);
              return (
                <div
                  key={rule.id}
                  className="p-5 rounded-xl bg-black/30 border border-white/[0.06] hover:border-white/[0.12] transition-all space-y-3 relative group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                        {rule.trigger_type || 'contains'}
                      </span>
                      <span className="font-mono text-xs font-bold text-slate-200 break-all">
                        "{rule.pattern}"
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggle(rule.id, active)}
                        className={`transition-colors ${active ? 'text-emerald-400' : 'text-slate-600'}`}
                      >
                        {active ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(rule.id)}
                        className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 bg-white/[0.02] p-3 rounded-lg border border-white/[0.04] whitespace-pre-wrap leading-relaxed max-h-32 overflow-y-auto">
                    {rule.response_text}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="glass-panel-elevated max-w-lg w-full p-6 space-y-5 border border-white/[0.1]">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h3 className="font-editorial text-xl font-bold text-slate-100">Tambah Aturan Balasan Otomatis</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Tipe Pemicu</label>
                <select
                  value={triggerType}
                  onChange={(e) => setTriggerType(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-black/50 border border-white/[0.1] text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
                >
                  <option value="contains">Contains (Pesan mengandung kata kunci)</option>
                  <option value="exact">Exact Match (Pesan persis sama)</option>
                  <option value="prefix">Prefix (Dimulai dengan kata)</option>
                  <option value="regex">Regex (Regular Expression Pola Kompleks)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Kata Kunci / Pola Pemicu</label>
                <input
                  type="text"
                  value={pattern}
                  onChange={(e) => setPattern(e.target.value)}
                  placeholder="Contoh: info donasi, halo bot, !menu"
                  required
                  className="w-full px-3 py-2.5 rounded-xl bg-black/50 border border-white/[0.1] text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Isi Pesan Balasan Otomatis</label>
                <textarea
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  placeholder="Ketik teks balasan yang akan dikirim bot secara otomatis..."
                  required
                  rows={4}
                  className="w-full p-3 rounded-xl bg-black/50 border border-white/[0.1] text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 font-bold text-xs transition-all shadow-[0_0_15px_rgba(56,189,248,0.25)]"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Aturan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
