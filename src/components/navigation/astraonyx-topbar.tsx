'use client';

import React from 'react';
import { Search, Radio, LogOut, Shield } from 'lucide-react';
import type { UserSession, BotStatus } from '@/src/types/astraonyx';

interface TopbarProps {
  user?: UserSession | null;
  botStatus?: BotStatus | null;
  onOpenOmnisearch?: () => void;
  onLogout?: () => void;
}

export function AstraonyxTopbar({
  user,
  botStatus,
  onOpenOmnisearch,
  onLogout,
}: TopbarProps) {
  const isOnline = botStatus?.status === 'connected';

  return (
    <header className="h-16 sticky top-0 z-40 bg-[#04060d]/80 backdrop-blur-xl border-b border-white/[0.06] px-6 flex items-center justify-between gap-4">
      {/* Left: Breadcrumbs / System Environment */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.06] text-xs font-mono text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-slate-400">CLUSTER</span>
          <span className="text-white font-semibold">PRODUCTION</span>
        </div>
      </div>

      {/* Center: Quick Search Trigger (⌘K Spotlight) */}
      <div className="max-w-md w-full mx-4">
        <button
          type="button"
          onClick={onOpenOmnisearch}
          className="w-full flex items-center justify-between px-3.5 py-1.5 rounded-full bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] hover:border-cyan-500/40 text-slate-400 hover:text-slate-200 transition-all duration-200 shadow-inner group"
        >
          <div className="flex items-center gap-2.5 text-xs">
            <Search size={14} className="text-slate-500 group-hover:text-cyan-400 transition-colors" />
            <span>Cari fitur, pilar, perintah, atau agen...</span>
          </div>
          <kbd className="px-2 py-0.5 text-[10px] font-mono rounded bg-white/[0.08] border border-white/[0.1] text-slate-400">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right: Telemetry Beacon & User Profile */}
      <div className="flex items-center gap-4">
        {/* Realtime Status Beacon */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.06]">
          <div className="relative flex items-center justify-center">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isOnline ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-rose-500 shadow-[0_0_8px_#f43f5e]'
              }`}
            />
          </div>
          <span className="text-xs font-mono font-bold tracking-wider text-slate-300">
            {isOnline ? 'ONLINE' : 'STANDBY'}
          </span>
        </div>

        {/* User Pill */}
        <div className="flex items-center gap-3 pl-2 border-l border-white/[0.08]">
          <div className="flex flex-col text-right">
            <span className="text-xs font-semibold text-slate-200">
              {user?.displayName || user?.username || 'Operator'}
            </span>
            <div className="flex items-center justify-end gap-1 text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
              <Shield size={10} />
              <span>{user?.role || 'MEMBER'}</span>
            </div>
          </div>

          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              title="Logout dari Dashboard"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
