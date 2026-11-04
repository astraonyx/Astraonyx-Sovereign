'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Bot,
  ShieldCheck,
  Share2,
  BookOpen,
  Gamepad2,
  Sparkles,
  Terminal,
  Crown,
  User,
  PanelLeftClose,
  PanelLeftOpen,
  MessageSquareReply,
  TerminalSquare,
  History,
  Palette,
  HardDrive,
  Cpu,
  Layers,
  Users,
  BarChart3,
} from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  category: 'COMMAND' | 'STUDIO' | 'ECOSYSTEM' | 'SANCTUM';
}

const NAV_ITEMS: NavItem[] = [
  // COMMAND MATRIX
  { id: 'dashboard', label: 'Command Center', href: '/dashboard', icon: LayoutDashboard, category: 'COMMAND' },
  { id: 'hermes', label: 'Hermes AI Agent', href: '/hermes', icon: Bot, category: 'COMMAND' },
  { id: 'groups', label: 'Grup & Sentinel', href: '/groups', icon: ShieldCheck, category: 'COMMAND' },
  { id: 'autoresponder', label: 'Pesan Otomatis', href: '/autoresponder', icon: MessageSquareReply, category: 'COMMAND' },
  { id: 'commands', label: 'Katalog Perintah', href: '/commands', icon: TerminalSquare, category: 'COMMAND' },
  { id: 'story', label: 'Status & Story WA', href: '/story', icon: History, category: 'COMMAND' },
  { id: 'contacts', label: 'Buku Kontak', href: '/contacts', icon: Users, category: 'COMMAND' },

  // STUDIO & FORGE
  { id: 'tools', label: 'OmniGet Forge', href: '/tools', icon: Sparkles, category: 'STUDIO' },
  { id: 'kinetix', label: 'Kinetix Studio', href: '/kinetix', icon: Palette, category: 'STUDIO' },

  // ECOSYSTEM
  { id: 'social', label: 'Polarium Medsos', href: '/social', icon: Share2, category: 'ECOSYSTEM' },
  { id: 'study', label: 'Luminary Academy', href: '/study', icon: BookOpen, category: 'ECOSYSTEM' },
  { id: 'games', label: 'Starlium Arcade', href: '/games', icon: Gamepad2, category: 'ECOSYSTEM' },

  // SANCTUM & ENGINE
  { id: 'terminal', label: 'Live Terminal', href: '/terminal', icon: Terminal, category: 'SANCTUM' },
  { id: 'analytics', label: 'Analitik Klaster', href: '/analytics', icon: BarChart3, category: 'SANCTUM' },
  { id: 'storage', label: 'Storage & Vault', href: '/storage', icon: HardDrive, category: 'SANCTUM' },
  { id: 'admin', label: 'Sanctum WUNA', href: '/admin', icon: Crown, category: 'SANCTUM' },
];

export function AstraonyxSidebar({ userRole = 'cosmos' }: { userRole?: string }) {
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const activeExpanded = isExpanded || isHovered;

  return (
    <aside
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`fixed top-0 left-0 h-screen z-50 flex flex-col justify-between transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        activeExpanded ? 'w-64' : 'w-[72px]'
      } bg-[#04060d]/95 backdrop-blur-2xl border-r border-white/[0.08] shadow-[4px_0_30px_rgba(0,0,0,0.6)]`}
    >
      {/* Brand Header */}
      <div className="flex flex-col">
        <div className="h-16 flex items-center px-4 border-b border-white/[0.06] overflow-hidden">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-600/20 border border-cyan-400/40 flex items-center justify-center shadow-[0_0_15px_rgba(56,189,248,0.25)] group-hover:scale-105 transition-transform duration-200">
              <img src="/icons/astraonyx-mark.svg" alt="Astraonyx" className="w-7 h-7 object-contain drop-shadow-[0_0_8px_rgba(0,240,255,0.7)]" />
            </div>
            {activeExpanded && (
              <div className="flex flex-col whitespace-nowrap overflow-hidden transition-opacity duration-200">
                <span className="font-editorial text-lg font-bold tracking-wider text-slate-100">ASTRAONYX</span>
                <span className="text-[10px] tracking-widest text-cyan-400 uppercase font-semibold">Cosmic Command</span>
              </div>
            )}
          </Link>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2.5 space-y-4 scrollbar-thin max-h-[calc(100vh-130px)]">
          {(['COMMAND', 'STUDIO', 'ECOSYSTEM', 'SANCTUM'] as const).map((cat) => {
            const items = NAV_ITEMS.filter((item) => item.category === cat);
            if (items.length === 0) return null;

            return (
              <div key={cat} className="space-y-1">
                {activeExpanded && (
                  <div className="px-3 pb-1 text-[10px] font-bold tracking-widest text-slate-500 uppercase">
                    {cat}
                  </div>
                )}
                {items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      className={`relative flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 group ${
                        isActive
                          ? 'bg-gradient-to-r from-cyan-500/15 to-purple-500/10 text-cyan-300 border border-cyan-400/30 shadow-[0_0_20px_rgba(56,189,248,0.15)] font-semibold'
                          : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.04]'
                      }`}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r bg-cyan-400 shadow-[0_0_8px_#38bdf8]" />
                      )}
                      <div className="w-6 flex items-center justify-center shrink-0">
                        <Icon size={18} className={isActive ? 'text-cyan-400' : 'group-hover:text-slate-200'} />
                      </div>
                      {activeExpanded && (
                        <span className="whitespace-nowrap overflow-hidden text-ellipsis tracking-wide">
                          {item.label}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Controls */}
      <div className="p-2.5 border-t border-white/[0.06] space-y-1">
        <Link
          href="/account"
          className="flex items-center gap-3.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-100 hover:bg-white/[0.04] transition-all"
        >
          <div className="w-6 flex items-center justify-center shrink-0">
            <User size={18} />
          </div>
          {activeExpanded && <span className="whitespace-nowrap">Profil & Akun</span>}
        </Link>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center gap-3.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-300 hover:bg-white/[0.04] transition-all"
          title={isExpanded ? 'Ciutkan Sidebar' : 'Kembangkan Sidebar'}
        >
          <div className="w-6 flex items-center justify-center shrink-0">
            {isExpanded ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
          </div>
          {activeExpanded && <span className="whitespace-nowrap text-[11px]">{isExpanded ? 'Kunci Ramping' : 'Kunci Lebar'}</span>}
        </button>
      </div>
    </aside>
  );
}
