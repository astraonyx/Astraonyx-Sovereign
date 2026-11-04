'use client';

import React from 'react';
import Link from 'next/link';
import { Constellation3D } from '@/src/components/cosmic/constellation-3d';
import {
  ArrowRight,
  ShieldCheck,
  Bot,
  Share2,
  BookOpen,
  Gamepad2,
  Crown,
  Sparkles,
} from 'lucide-react';

const PILLARS = [
  {
    id: 'polaris',
    name: 'POLARIS',
    subtitle: 'WhatsApp Automation & Hermes AI',
    desc: 'Multi-Device Baileys cluster, VirtexShield 2.0 anti-crash, dan agen kecerdasan otonom Hermes.',
    icon: Bot,
    color: 'from-cyan-500/20 to-blue-600/20',
    border: 'border-cyan-500/30',
  },
  {
    id: 'polarium',
    name: 'POLARIUM',
    subtitle: 'Platform Sosial & Media Ephemeral',
    desc: 'Feed status mikro, stories 24 jam, direct messages privat terenkripsi E2EE, dan media hub cloud.',
    icon: Share2,
    color: 'from-purple-500/20 to-pink-600/20',
    border: 'border-purple-500/30',
  },
  {
    id: 'luminary',
    name: 'LUMINARY',
    subtitle: 'Studyspace & Productivity Suite',
    desc: 'Polymath Genius Academy, Smart Task Deadline, PDF & Document toolkit, serta Time Capsule vault.',
    icon: BookOpen,
    color: 'from-amber-500/20 to-orange-600/20',
    border: 'border-amber-500/30',
  },
  {
    id: 'starlium',
    name: 'STARLIUM',
    subtitle: 'Galaxy Gaming & Stockfish Chess AI',
    desc: 'Engine catur virtual Stockfish, tantangan mabar turn-based, Co-Op Boss Raid, dan RPG 7-Tier XP leveling.',
    icon: Gamepad2,
    color: 'from-emerald-500/20 to-teal-600/20',
    border: 'border-emerald-500/30',
  },
  {
    id: 'sanctum',
    name: 'SANCTUM',
    subtitle: 'Sanctum Khusus Cosmos Master',
    desc: 'Live Web Terminal ANSI stream, ViewOnce ghost vault, manajemen cluster multi-owner, dan whitelist.',
    icon: Crown,
    color: 'from-yellow-500/20 to-amber-600/20',
    border: 'border-yellow-500/30',
  },
];

export default function WelcomePage() {
  return (
    <div className="relative min-h-[90vh] flex flex-col justify-center items-center py-12 overflow-hidden">
      {/* 3D Celestial Constellation Visual Engine */}
      <Constellation3D />

      <div className="relative z-10 max-w-5xl mx-auto text-center px-4 space-y-8 animate-fadeIn">
        {/* Editorial Subtitle Pill */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] backdrop-blur-md">
          <Sparkles size={14} className="text-cyan-400" />
          <span className="text-xs font-mono font-bold tracking-widest text-slate-300 uppercase">
            ASTRAONYX ATARAXIA • MASTER UMBRELLA
          </span>
        </div>

        {/* Hero Title */}
        <div className="space-y-4">
          <h1 className="font-editorial text-5xl md:text-7xl font-bold tracking-tight text-white leading-tight">
            Cosmic Digital <br />
            <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-amber-400 bg-clip-text text-transparent">
              Command Center
            </span>
          </h1>
          <p className="text-base md:text-lg text-slate-300 max-w-2xl mx-auto font-light leading-relaxed">
            Sistem orkestrasi otonom terpadu yang memadukan automasi pesan instan, kecerdasan buatan Hermes, platform sosial, produktivitas, serta gamifikasi dalam satu kanvas semesta modern.
          </p>
        </div>

        {/* CTA Launch Button */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm transition-all duration-200 shadow-[0_0_25px_rgba(56,189,248,0.4)] hover:scale-105 active:scale-95"
          >
            <span>Masuk Command Center</span>
            <ArrowRight size={16} />
          </Link>
          <Link
            href="/hermes"
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.1] text-slate-200 font-semibold text-sm transition-all hover:border-purple-400/50"
          >
            <Bot size={16} className="text-purple-400" />
            <span>Jelajahi Hermes AI</span>
          </Link>
        </div>

        {/* 5 Pillars Bento Grid */}
        <div className="pt-12 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 text-left">
          {PILLARS.map((p) => {
            const Icon = p.icon;
            return (
              <div
                key={p.id}
                className="glass-panel p-5 rounded-2xl relative overflow-hidden group hover:border-white/20 transition-all duration-300"
              >
                <div
                  className={`w-10 h-10 rounded-xl bg-gradient-to-br ${p.color} border ${p.border} flex items-center justify-center mb-3`}
                >
                  <Icon size={18} className="text-white" />
                </div>
                <div className="text-xs font-mono font-bold tracking-wider text-cyan-400 mb-1">{p.name}</div>
                <h4 className="font-semibold text-sm text-slate-100 mb-2">{p.subtitle}</h4>
                <p className="text-xs text-slate-400 leading-relaxed">{p.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
