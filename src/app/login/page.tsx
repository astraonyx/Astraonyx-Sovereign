'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, User, KeyRound, ArrowRight, ShieldCheck, Phone, Mail, UserPlus, LogIn, ChevronRight } from 'lucide-react';
import { apiFetch } from '@/src/lib/api-client';

export default function LoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  
  // Login State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  
  // Register State
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPin, setRegPin] = useState('');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;

    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const res: any = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim(),
          pin: pin.trim() || '111111',
        }),
      });

      if (res && res.token) {
        localStorage.setItem('polaris_token', res.token);
        localStorage.setItem('astraonyx_token', res.token);
        router.push('/dashboard');
      } else {
        throw new Error(res?.message || 'Login gagal.');
      }
    } catch (err: any) {
      setError(err.message || 'Kredensial tidak valid.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regUsername.trim() || !regPassword.trim() || !regPhone.trim()) return;
    
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const res: any = await apiFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          username: regUsername.trim(),
          password: regPassword.trim(),
          phone: regPhone.trim(),
          pin: regPin.trim() || '111111',
        }),
      });

      if (res && res.success) {
        setSuccess('Registrasi berhasil! Silakan masuk.');
        setActiveTab('login');
        setUsername(regUsername);
      } else {
        throw new Error(res?.message || 'Registrasi gagal.');
      }
    } catch (err: any) {
      setError(err.message || 'Gagal mendaftar.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="glass-panel-elevated max-w-md w-full p-8 space-y-6 relative overflow-hidden transition-all duration-500">
        {/* Glow ambient inside card */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />

        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto mb-3 shadow-[0_0_20px_rgba(56,189,248,0.25)]">
            <ShieldCheck size={24} />
          </div>
          <h2 className="font-editorial text-3xl font-bold text-white tracking-tight">ASTRAONYX</h2>
          <p className="text-xs text-slate-400 uppercase tracking-widest font-mono">Autentikasi Gerbang Kosmik</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center p-1 bg-white/[0.02] border border-white/[0.04] rounded-xl relative">
          <div 
            className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg bg-white/[0.06] border border-white/[0.08] transition-all duration-300 ease-out ${activeTab === 'login' ? 'left-1' : 'left-[calc(50%+2px)]'}`}
          />
          <button
            type="button"
            onClick={() => { setError(''); setSuccess(''); setActiveTab('login'); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold relative z-10 transition-colors ${activeTab === 'login' ? 'text-cyan-300' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <LogIn size={14} />
            <span>Masuk</span>
          </button>
          <button
            type="button"
            onClick={() => { setError(''); setSuccess(''); setActiveTab('register'); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold relative z-10 transition-colors ${activeTab === 'register' ? 'text-cyan-300' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <UserPlus size={14} />
            <span>Registrasi</span>
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs text-center font-mono">
            {error}
          </div>
        )}
        
        {success && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs text-center font-mono">
            {success}
          </div>
        )}

        {/* LOGIN FORM */}
        {activeTab === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4 animate-fadeIn">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Username</label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="operator"
                  required
                  className="w-full px-4 py-3 pl-11 rounded-xl bg-black/50 border border-white/[0.1] text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400"
                />
                <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Password</label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-3 pl-11 rounded-xl bg-black/50 border border-white/[0.1] text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400"
                />
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">PIN 2FA (6 Digit)</label>
              <div className="relative">
                <input
                  type="password"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="111111 (bawaan)"
                  className="w-full px-4 py-3 pl-11 rounded-xl bg-black/50 border border-white/[0.1] text-sm font-mono text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400 tracking-widest"
                />
                <KeyRound size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !username || !password}
              className="w-full py-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(56,189,248,0.3)] mt-2"
            >
              <span>{isLoading ? 'Memverifikasi...' : 'Masuk Command Center'}</span>
              <ArrowRight size={16} />
            </button>
          </form>
        )}

        {/* REGISTER FORM */}
        {activeTab === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4 animate-fadeIn">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Username</label>
              <div className="relative">
                <input
                  type="text"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  placeholder="neo_operator"
                  required
                  className="w-full px-4 py-3 pl-11 rounded-xl bg-black/50 border border-white/[0.1] text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400"
                />
                <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Nomor Telepon (WA)</label>
              <div className="relative">
                <input
                  type="tel"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  placeholder="6281234567890"
                  required
                  className="w-full px-4 py-3 pl-11 rounded-xl bg-black/50 border border-white/[0.1] text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400"
                />
                <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Password</label>
              <div className="relative">
                <input
                  type="password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-3 pl-11 rounded-xl bg-black/50 border border-white/[0.1] text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400"
                />
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Buat PIN 2FA (6 Digit)</label>
              <div className="relative">
                <input
                  type="password"
                  maxLength={6}
                  value={regPin}
                  onChange={(e) => setRegPin(e.target.value)}
                  placeholder="111111"
                  className="w-full px-4 py-3 pl-11 rounded-xl bg-black/50 border border-white/[0.1] text-sm font-mono text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400 tracking-widest"
                />
                <KeyRound size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !regUsername || !regPassword || !regPhone}
              className="w-full py-3.5 rounded-xl bg-white hover:bg-slate-200 disabled:opacity-40 text-slate-950 font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 mt-2"
            >
              <span>{isLoading ? 'Mendaftarkan...' : 'Buat Akun Astraonyx'}</span>
              <ChevronRight size={16} />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
