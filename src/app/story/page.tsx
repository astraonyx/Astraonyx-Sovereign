'use client';

import React, { useState, useEffect } from 'react';
import {
  History,
  Send,
  Plus,
  Trash2,
  Sparkles,
  Palette,
  Eye,
  Type,
  Image as ImageIcon,
  CheckCircle2,
} from 'lucide-react';
import { apiFetch } from '@/src/lib/api-client';

const BG_COLORS = [
  '#0a0a0c',
  '#1e1b4b',
  '#064e3b',
  '#701a75',
  '#7f1d1d',
  '#172554',
  '#312e81',
];

export default function StoryPage() {
  const [storyType, setStoryType] = useState<'text' | 'media'>('text');
  const [text, setText] = useState('');
  const [bgColor, setBgColor] = useState('#1e1b4b');
  const [isPosting, setIsPosting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [templates, setTemplates] = useState<any[]>([]);

  useEffect(() => {
    apiFetch('/api/story/templates')
      .then((res: any) => {
        if (res && res.data) setTemplates(res.data);
      })
      .catch(() => {});
  }, []);

  const handlePostStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || isPosting) return;

    setIsPosting(true);
    setStatusMessage(null);

    try {
      const res: any = await apiFetch('/api/story/post', {
        method: 'POST',
        body: JSON.stringify({
          storyType: 'text',
          text: text.trim(),
          bgColor: bgColor,
        }),
      });

      if (res && res.success) {
        setStatusMessage({ type: 'success', text: 'Status WhatsApp berhasil diunggah ke jaringan!' });
        setText('');
      } else {
        throw new Error(res?.error || 'Gagal memposting status.');
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Gagal mengunggah status.' });
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto">
      {/* Editorial Header */}
      <div className="border-b border-white/[0.06] pb-6">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span className="text-[11px] font-mono font-bold tracking-widest text-emerald-400 uppercase">
            POLARIS ENGINE • WHATSAPP STATUS & BROADCAST
          </span>
        </div>
        <h1 className="font-editorial text-4xl lg:text-5xl font-bold tracking-tight text-slate-100">
          WhatsApp Status Poster
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Kirim pembaruan status cerita WhatsApp (Stories) teks berwarna atau media langsung dari panel tanpa membuka ponsel.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Creator Studio Form */}
        <div className="lg:col-span-7 glass-panel-elevated p-6 space-y-6">
          <h2 className="font-editorial text-2xl font-bold text-white">Buat Status Cerita Baru</h2>

          {statusMessage && (
            <div
              className={`p-4 rounded-xl text-xs font-mono border ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              }`}
            >
              {statusMessage.text}
            </div>
          )}

          <form onSubmit={handlePostStory} className="space-y-5">
            {/* Background Color Picker */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                <Palette size={14} className="text-cyan-400" />
                <span>Pilih Warna Latar Belakang Status</span>
              </label>
              <div className="flex items-center gap-2.5 flex-wrap">
                {BG_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setBgColor(c)}
                    style={{ backgroundColor: c }}
                    className={`w-8 h-8 rounded-full border-2 transition-transform ${
                      bgColor === c ? 'scale-110 border-white shadow-[0_0_10px_rgba(255,255,255,0.4)]' : 'border-transparent hover:scale-105'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Content Input */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                <Type size={14} className="text-cyan-400" />
                <span>Teks Status</span>
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Tuliskan kata-kata, pengumuman, kutipan, atau pesan yang ingin diunggah..."
                rows={5}
                required
                className="w-full p-4 rounded-xl bg-black/50 border border-white/[0.1] text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400 resize-none leading-relaxed"
              />
            </div>

            <button
              type="submit"
              disabled={isPosting || !text.trim()}
              className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.25)]"
            >
              <Send size={16} />
              <span>{isPosting ? 'Mengirim ke WhatsApp...' : 'Unggah Status ke WhatsApp'}</span>
            </button>
          </form>
        </div>

        {/* Live Device Preview */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center">
          <div className="text-xs font-mono text-slate-400 mb-3 flex items-center gap-2">
            <Eye size={14} />
            <span>Pratinjau Status Ponsel</span>
          </div>

          <div
            style={{ backgroundColor: bgColor }}
            className="w-64 h-[420px] rounded-[32px] border-4 border-slate-800 p-6 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-2xl transition-colors duration-300"
          >
            {/* Phone Speaker Notch */}
            <div className="absolute top-3 w-16 h-1 rounded-full bg-slate-700" />

            <p className="font-editorial text-lg text-white font-medium leading-relaxed max-w-[200px] break-words">
              {text.trim() || 'Pratinjau teks status WhatsApp Anda akan tampil di sini secara realtime.'}
            </p>

            {/* Story bottom indicator */}
            <div className="absolute bottom-4 left-6 right-6 flex items-center justify-between text-[10px] text-white/50 font-mono">
              <span>ASTRAONYX</span>
              <span>Baru saja</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
