'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Terminal as TerminalIcon, Play, Trash2, ShieldAlert } from 'lucide-react';
import { astraSocket } from '@/src/lib/ws-client';
import { astraApi } from '@/src/lib/api-client';

export default function TerminalPage() {
  const [logs, setLogs] = useState<string[]>([
    '[*] ASTRAONYX SOVEREIGN COMMAND MATRIX TERMINAL INITIALIZED',
    '[*] WebSocket connection to /ws: ESTABLISHED',
    '[*] Type command below to dispatch system operations...',
  ]);
  const [command, setCommand] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    astraSocket.connect();
    const unsubscribe = astraSocket.subscribe((type, data) => {
      if (type === 'LOG') {
        const text = typeof data === 'string' ? data : data?.message || JSON.stringify(data);
        setLogs((prev) => [...prev, text]);
      } else if (type === 'LOG_HISTORY') {
        if (Array.isArray(data)) {
          setLogs((prev) => [...prev, ...data.map((d: any) => (typeof d === 'string' ? d : d.message))]);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleExecute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim() || isExecuting) return;

    const cmdText = command.trim();
    setLogs((prev) => [...prev, `$ ${cmdText}`]);
    setCommand('');
    setIsExecuting(true);

    try {
      // Dispatch command through socket or API
      astraSocket.send('EXEC', { command: cmdText });
    } catch (_) {}
    setIsExecuting(false);
  };

  const handleClear = () => {
    setLogs(['[*] Terminal buffer cleared.']);
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col glass-panel-elevated rounded-2xl overflow-hidden border border-white/[0.08]">
      {/* Header */}
      <div className="p-4 bg-white/[0.02] border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <TerminalIcon size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-editorial text-lg font-bold text-slate-100">Live Web Terminal</h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-bold">
                ANSI STREAM
              </span>
            </div>
            <p className="text-xs text-slate-400">Master Operations Command Line</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleClear}
          className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
          title="Bersihkan Layar Terminal"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* Terminal Viewport */}
      <div className="flex-1 bg-black/70 p-6 overflow-y-auto font-mono text-xs leading-relaxed text-slate-300 space-y-1 select-text scrollbar-thin">
        {logs.map((log, idx) => (
          <div key={idx} className="break-all whitespace-pre-wrap">
            {log}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Terminal Command Input */}
      <form onSubmit={handleExecute} className="p-3 bg-white/[0.02] border-t border-white/[0.06] flex items-center gap-3 font-mono">
        <span className="text-cyan-400 font-bold pl-2 select-none">&gt;</span>
        <input
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          placeholder="Masukkan perintah (misal: help, status, reload)..."
          className="flex-1 bg-transparent border-none text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none"
        />
        <button
          type="submit"
          disabled={isExecuting || !command.trim()}
          className="px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-bold transition-all flex items-center gap-1.5"
        >
          <Play size={12} />
          <span>Eksekusi</span>
        </button>
      </form>
    </div>
  );
}
