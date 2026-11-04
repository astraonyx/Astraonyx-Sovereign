'use client';

import React, { useState } from 'react';
import {
  Bot,
  Send,
  Trash2,
  Sparkles,
  Terminal,
  Code2,
  Cpu,
  Sliders,
  CheckCircle2,
  Brain,
  Zap,
} from 'lucide-react';
import { astraApi } from '@/src/lib/api-client';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

const AI_MODELS = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'Google DeepMind', desc: 'Model multimodal tercepat, penalaran visual, dan respons komprehensif.' },
  { id: 'groq-llama-3.1-8b', name: 'Groq Llama 3.1 8B', provider: 'Meta / Groq LPUs', desc: 'Inference ultra-cepat <200ms untuk dialog instan dan parsing teks pendek.' },
  { id: 'groq-llama-3.3-70b', name: 'Groq Llama 3.3 70B', provider: 'Meta / Groq LPUs', desc: 'Penalaran kompleks, penulisan esai, dan logika instruksi tingkat lanjut.' },
  { id: 'deepseek-r1', name: 'DeepSeek R1', provider: 'DeepSeek AI', desc: 'Spesialis pemecahan matematika, penalaran langkah demi langkah (chain of thought).' },
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', desc: 'Arsitektur multimodal omni seimbang untuk coding dan analisis dokumen.' },
  { id: 'claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', desc: 'Pemrograman software tingkat tinggi, refactor kode, dan instruksi presisi.' },
];

export default function HermesPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Salam Operator. Saya Hermes, agen kecerdasan otonom klaster Astraonyx. Saya siap membantu kalkulasi matematika KaTeX, eksekusi perintah terminal, analisis skrip Baileys, atau orkestrasi bot.',
      timestamp: Date.now(),
    },
  ]);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [model, setModel] = useState('gemini-2.5-flash');
  const [reasoningMode, setReasoningMode] = useState<'flash' | 'deep'>('flash');
  const [showModelModal, setShowModelModal] = useState(false);

  const handleSend = async (e?: React.FormEvent, customPrompt?: string) => {
    if (e) e.preventDefault();
    const textToSend = customPrompt || prompt;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      role: 'user',
      content: textToSend.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setPrompt('');
    setIsLoading(true);

    try {
      const res: any = await astraApi.sendHermesChat(userMsg.content, model);
      const reply = res?.reply || res?.content || res?.message || 'Respons tidak diterima.';

      setMessages((prev) => [
        ...prev,
        {
          id: `asst_${Date.now()}`,
          role: 'assistant',
          content: reply,
          timestamp: Date.now(),
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: 'assistant',
          content: `⚠️ Kendala komunikasi: ${err.message || 'Gagal menghubungi neural engine Hermes.'}`,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = async () => {
    try {
      await astraApi.clearHermesMemory();
      setMessages([]);
    } catch (_) {}
  };

  const activeModelObj = AI_MODELS.find((m) => m.id === model) || AI_MODELS[0];

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col glass-panel-elevated rounded-2xl overflow-hidden border border-white/[0.08]">
      {/* Hermes Top Header */}
      <div className="p-4 bg-white/[0.02] border-b border-white/[0.06] flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Bot size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-editorial text-lg font-bold text-slate-100">Hermes Autonomous Agent</h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold">
                ONLINE
              </span>
            </div>
            <p className="text-xs text-slate-400">Multimodal Neural Dialogue Engine</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Reasoning Toggle */}
          <div className="flex items-center p-1 bg-black/40 border border-white/[0.08] rounded-xl text-xs font-mono">
            <button
              type="button"
              onClick={() => setReasoningMode('flash')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                reasoningMode === 'flash' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400'
              }`}
            >
              Flash (Fast)
            </button>
            <button
              type="button"
              onClick={() => setReasoningMode('deep')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                reasoningMode === 'deep' ? 'bg-purple-500/20 text-purple-300 font-bold' : 'text-slate-400'
              }`}
            >
              Deep Think
            </button>
          </div>

          {/* Model Selector Button */}
          <button
            type="button"
            onClick={() => setShowModelModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/40 border border-white/[0.1] text-xs font-mono text-cyan-300 hover:border-cyan-400 transition-colors"
          >
            <Sliders size={13} />
            <span>{activeModelObj.name}</span>
          </button>

          <button
            type="button"
            onClick={handleClear}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            title="Bersihkan Memori Dialog"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 max-w-3xl ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
          >
            <div
              className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-xs font-mono font-bold ${
                msg.role === 'user'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30'
                  : 'bg-purple-500/20 text-purple-300 border border-purple-400/30'
              }`}
            >
              {msg.role === 'user' ? 'ME' : 'AI'}
            </div>
            <div
              className={`p-4 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-cyan-500/10 border border-cyan-400/30 text-slate-100'
                  : 'bg-white/[0.03] border border-white/[0.06] text-slate-200'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-xs font-mono text-slate-500 pl-11 animate-pulse">
            <Sparkles size={14} className="text-purple-400" />
            <span>Hermes ({activeModelObj.name}) sedang menganalisis respon...</span>
          </div>
        )}
      </div>

      {/* Quick Prompts Chips */}
      <div className="px-4 py-2 bg-white/[0.01] border-t border-white/[0.04] flex items-center gap-2 overflow-x-auto scrollbar-none">
        <span className="text-[10px] font-mono text-slate-500 uppercase shrink-0">Preset:</span>
        {[
          'Analisis Arsitektur Astraonyx',
          'Audit Keamanan Virtex Baileys',
          'Optimasi Database SQLite WAL',
          'Buat Plugin Perintah WhatsApp Baru',
        ].map((chip, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSend(undefined, chip)}
            className="px-2.5 py-1 rounded-lg bg-black/40 hover:bg-white/[0.05] border border-white/[0.06] text-[11px] text-slate-300 hover:text-white shrink-0 transition-colors"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Prompt Input Form */}
      <form onSubmit={(e) => handleSend(e)} className="p-4 bg-white/[0.02] border-t border-white/[0.06] flex items-center gap-3">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={`Tanya ${activeModelObj.name}, minta riset, atau berikan perintah kode...`}
          className="flex-1 px-4 py-3 rounded-xl bg-black/40 border border-white/[0.08] text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
        />
        <button
          type="submit"
          disabled={isLoading || !prompt.trim()}
          className="px-5 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 font-bold text-sm transition-all flex items-center gap-2"
        >
          <span>Kirim</span>
          <Send size={14} />
        </button>
      </form>

      {/* Model Selection Modal */}
      {showModelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="glass-panel-elevated max-w-2xl w-full p-6 space-y-5 border border-white/[0.1] max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div>
                <h3 className="font-editorial text-xl font-bold text-slate-100">Katalog Model Neural Hermes</h3>
                <p className="text-xs text-slate-400">Pilih engine kecerdasan buatan untuk menangani kueri Anda</p>
              </div>
              <button
                type="button"
                onClick={() => setShowModelModal(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {AI_MODELS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setModel(m.id);
                    setShowModelModal(false);
                  }}
                  className={`p-4 rounded-xl border text-left transition-all space-y-1.5 ${
                    model === m.id
                      ? 'bg-cyan-500/15 border-cyan-400/50 shadow-[0_0_15px_rgba(56,189,248,0.2)]'
                      : 'bg-black/40 border-white/[0.06] hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-white">{m.name}</span>
                    <span className="text-[10px] font-mono text-cyan-400">{m.provider}</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{m.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
