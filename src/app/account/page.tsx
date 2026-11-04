'use client';

import React, { useEffect, useState } from 'react';
import { User, Shield, KeyRound, Phone, Save, CheckCircle } from 'lucide-react';
import { astraApi, apiFetch } from '@/src/lib/api-client';
import type { UserSession } from '@/src/types/astraonyx';

export default function AccountPage() {
  const [user, setUser] = useState<UserSession | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [newPin, setNewPin] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    astraApi.getMe().then((res: any) => {
      if (res && res.user) setUser(res.user);
    }).catch(() => {});
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMsg('');

    try {
      await apiFetch('/api/auth/update-account', {
        method: 'POST',
        body: JSON.stringify({
          password: newPassword || undefined,
          pin: newPin || undefined,
        }),
      });
      setSuccessMsg('Pengaturan akun berhasil disimpan.');
      setNewPassword('');
      setNewPin('');
    } catch (_) {}
    setIsSaving(false);
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-3xl mx-auto">
      {/* Editorial Header */}
      <div className="border-b border-white/[0.06] pb-6">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
          <span className="text-[11px] font-mono font-bold tracking-widest text-cyan-400 uppercase">
            ASTRAONYX • MANAJEMEN AKUN & KEAMANAN
          </span>
        </div>
        <h1 className="font-editorial text-4xl lg:text-5xl font-bold tracking-tight text-slate-100">
          Pengaturan Akun & Kredensial
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Kelola PIN otentikasi 2FA, kata sandi operator, dan tautan nomor WhatsApp.
        </p>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Account Info Card */}
      <div className="glass-panel p-6 space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold text-lg">
            {user?.username?.slice(0, 2).toUpperCase() || 'OP'}
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-100">{user?.displayName || user?.username || 'Operator'}</h3>
            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mt-0.5">
              <span>@{user?.username || 'operator'}</span>
              <span>•</span>
              <span className="text-cyan-400 uppercase font-bold">{user?.role || 'MEMBER'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Form Update Credentials */}
      <div className="glass-panel-elevated p-8">
        <h3 className="font-editorial text-2xl font-bold text-white mb-6">Pembaruan Kredensial</h3>
        <form onSubmit={handleUpdate} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Ganti Password Baru</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Kosongkan jika tidak ingin mengubah password"
              className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/[0.1] text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Ganti PIN 2FA (6 Digit)</label>
            <input
              type="password"
              maxLength={6}
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              placeholder="Kosongkan jika tidak ingin mengubah PIN"
              className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/[0.1] text-sm font-mono text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400 tracking-widest"
            />
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm transition-all flex items-center gap-2"
          >
            <Save size={16} />
            <span>{isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
