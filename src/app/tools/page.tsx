'use client';

import React, { useState } from 'react';
import { Sparkles, Download, Wand2, Music, Film, Search, ArrowRight } from 'lucide-react';
import { astraApi } from '@/src/lib/api-client';

export default function ToolsPage() {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || isLoading) return;

    setIsLoading(true);
    try {
      const res: any = await astraApi.analyzeDownload(url.trim());
      setResult(res);
    } catch (err: any) {
      setResult({ error: err.message || 'Gagal menganalisis URL media.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto">
      {/* Editorial Header */}
      <div className="border-b border-white/[0.06] pb-6">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
          <span className="text-[11px] font-mono font-bold tracking-widest text-cyan-400 uppercase">
            OMNIGET • MEDIA FORGE & LUMINA HD AI
          </span>
        </div>
        <h1 className="font-editorial text-4xl lg:text-5xl font-bold tracking-tight text-slate-100">
          OmniGet Media Forge
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Scraper media 15 platform, pengunduh resolusi tinggi tanpa watermark, dan studio restorasi wajah Lumina HD AI.
        </p>
      </div>

      {/* Universal Downloader Input Box */}
      <div className="glass-panel-elevated p-8">
        <h2 className="font-editorial text-2xl font-bold text-white mb-2">Universal Media Extractor</h2>
        <p className="text-xs text-slate-400 mb-6">
          Mendukung tautan TikTok, YouTube (MP3/MP4), Instagram Reels/Post, Facebook, Spotify, MediaFire ZIP, dan TeraBox.
        </p>

        <form onSubmit={handleAnalyze} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Tempel tautan video, musik, atau berkas di sini..."
              className="w-full px-4 py-3.5 pl-11 rounded-xl bg-black/40 border border-white/[0.1] text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
            />
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          </div>
          <button
            type="submit"
            disabled={isLoading || !url.trim()}
            className="px-6 py-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 font-bold text-sm transition-all flex items-center justify-center gap-2"
          >
            <Download size={16} />
            <span>{isLoading ? 'Mengekstraksi...' : 'Ekstraksi Media'}</span>
          </button>
        </form>

        {result && (
          <div className="mt-6 p-4 rounded-xl bg-black/40 border border-white/[0.06] text-xs font-mono">
            {result.error ? (
              <div className="text-rose-400">{result.error}</div>
            ) : (
              <div className="space-y-2 text-slate-300">
                <div className="text-emerald-400 font-bold">Metadata Berhasil Ditemukan</div>
                <div>Judul: {result.title || result.filename || 'Media'}</div>
                {result.downloadUrl && (
                  <a
                    href={result.downloadUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 mt-2 px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 font-bold"
                  >
                    <span>Unduh Berkas</span>
                    <ArrowRight size={14} />
                  </a>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lumina HD Studio Card */}
      <div className="glass-panel p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
            <Wand2 size={24} />
          </div>
          <div>
            <h3 className="font-editorial text-xl font-bold text-slate-100">Lumina HD AI Studio</h3>
            <p className="text-xs text-slate-400 mt-1">
              Restorasi wajah rusak atau buram berbasis model GFPGAN v1.4 dan upscaling citra 2x/4x.
            </p>
          </div>
        </div>
        <button
          type="button"
          className="px-5 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-semibold text-slate-200 transition-all shrink-0"
        >
          Unggah Citra Buram
        </button>
      </div>
    </div>
  );
}
