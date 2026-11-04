'use client';

import React, { useEffect, useState } from 'react';
import {
  Crown,
  ShieldAlert,
  Database,
  Server,
  Key,
  RefreshCw,
  UserPlus,
  Trash2,
  CheckCircle2,
  XCircle,
  Radio,
  Sparkles,
  RotateCcw,
  Send,
  Plus,
  Shield,
} from 'lucide-react';
import { apiFetch } from '@/src/lib/api-client';

interface WunaUser {
  id: string;
  username: string;
  role: string;
  phone?: string;
  is_banned?: number;
  created_at?: string;
}

interface UpgradeToken {
  id: string;
  token: string;
  tier: string;
  used: number;
  created_at: string;
}

export default function AdminPage() {
  const [users, setUsers] = useState<WunaUser[]>([]);
  const [tokens, setTokens] = useState<UpgradeToken[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState('');

  // Create User Modal State
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('member');
  const [newPhone, setNewPhone] = useState('');

  // Create Token Modal State
  const [showCreateTokenModal, setShowCreateTokenModal] = useState(false);
  const [newTokenTier, setNewTokenTier] = useState('nova');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const uRes: any = await apiFetch('/api/wuna/users');
      if (uRes && Array.isArray(uRes.users)) setUsers(uRes.users);
      else if (Array.isArray(uRes)) setUsers(uRes);

      const tRes: any = await apiFetch('/api/upgrade-tokens/list');
      if (tRes && Array.isArray(tRes.tokens)) setTokens(tRes.tokens);
      else if (Array.isArray(tRes)) setTokens(tRes);
    } catch (_) {}
    finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggleBan = async (username: string, isBanned: boolean) => {
    try {
      await apiFetch('/api/wuna/ban', {
        method: 'POST',
        body: JSON.stringify({ username, banned: !isBanned }),
      });
      setNotice(`Status akun ${username} berhasil diperbarui.`);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Gagal mengubah status');
    }
  };

  const handleChangeRole = async (username: string, nextRole: string) => {
    try {
      await apiFetch('/api/wuna/role', {
        method: 'POST',
        body: JSON.stringify({ username, role: nextRole }),
      });
      setNotice(`Role akun ${username} diubah menjadi ${nextRole.toUpperCase()}.`);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Gagal mengubah role');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword.trim()) return;

    try {
      await apiFetch('/api/wuna/create', {
        method: 'POST',
        body: JSON.stringify({
          username: newUsername.trim(),
          password: newPassword.trim(),
          role: newRole,
          phone: newPhone.trim(),
        }),
      });
      setShowCreateUserModal(false);
      setNewUsername('');
      setNewPassword('');
      setNewPhone('');
      setNotice('Pengguna WUNA baru berhasil dibuat!');
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Gagal membuat pengguna');
    }
  };

  const handleCreateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/upgrade-tokens/create', {
        method: 'POST',
        body: JSON.stringify({ tier: newTokenTier }),
      });
      setShowCreateTokenModal(false);
      setNotice(`Token upgrade untuk tier ${newTokenTier.toUpperCase()} berhasil dibuat!`);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Gagal membuat token');
    }
  };

  const handleBroadcastNews = async () => {
    const msg = prompt('Masukkan pesan siaran pengumuman ke seluruh grup WhatsApp:');
    if (!msg || !msg.trim()) return;

    try {
      await apiFetch('/api/ecosystem/broadcast-news', {
        method: 'POST',
        body: JSON.stringify({ message: msg.trim() }),
      });
      alert('Siaran berhasil dikirim ke antrean transmisi!');
    } catch (err: any) {
      alert(err.message || 'Gagal mengirim siaran');
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-6xl mx-auto">
      {/* Editorial Header */}
      <div className="border-b border-white/[0.06] pb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span className="text-[11px] font-mono font-bold tracking-widest text-amber-400 uppercase">
              SANCTUM • MASTER COSMOS AUTHORITY (WUNA)
            </span>
          </div>
          <h1 className="font-editorial text-4xl lg:text-5xl font-bold tracking-tight text-slate-100">
            Sanctum Owner & WUNA Tier
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manajemen hierarki hak akses pengguna, pembuat token upgrade tier, dan kendali transmisi darurat klaster.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBroadcastNews}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-xs font-semibold text-purple-300 transition-all"
          >
            <Send size={14} />
            <span>Siaran Berita Grup</span>
          </button>
          <button
            type="button"
            onClick={() => setShowCreateUserModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-[0_0_15px_rgba(245,158,11,0.25)]"
          >
            <UserPlus size={15} />
            <span>Tambah User WUNA</span>
          </button>
        </div>
      </div>

      {notice && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{notice}</span>
        </div>
      )}

      {/* User Management Table */}
      <div className="glass-panel-elevated p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-editorial text-xl font-bold text-white flex items-center gap-2">
            <Crown size={20} className="text-amber-400" />
            <span>Daftar Pengguna & Tingkatan Tier (WUNA)</span>
          </h3>
          <span className="text-xs font-mono text-slate-400">Total Akun: {users.length}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/[0.08] text-slate-400 font-mono">
                <th className="pb-3 font-semibold">USERNAME</th>
                <th className="pb-3 font-semibold">ROLE TIER</th>
                <th className="pb-3 font-semibold">NO. WHATSAPP</th>
                <th className="pb-3 font-semibold">STATUS</th>
                <th className="pb-3 font-semibold text-right">AKSI OTORITAS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {users.map((u) => {
                const isBanned = Boolean(u.is_banned);
                return (
                  <tr key={u.id || u.username} className="hover:bg-white/[0.02]">
                    <td className="py-3 font-semibold text-white">{u.username}</td>
                    <td className="py-3">
                      <select
                        value={u.role || 'member'}
                        onChange={(e) => handleChangeRole(u.username, e.target.value)}
                        className="px-2.5 py-1 rounded-lg bg-black/50 border border-white/[0.1] text-xs font-mono text-cyan-300 focus:outline-none"
                      >
                        <option value="cosmos">COSMOS (OWNER)</option>
                        <option value="nova">NOVA</option>
                        <option value="astral">ASTRAL</option>
                        <option value="nebula">NEBULA</option>
                        <option value="member">MEMBER</option>
                      </select>
                    </td>
                    <td className="py-3 font-mono text-slate-300">{u.phone || '-'}</td>
                    <td className="py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          isBanned ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'
                        }`}
                      >
                        {isBanned ? 'BANNED' : 'ACTIVE'}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleToggleBan(u.username, isBanned)}
                        className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                          isBanned
                            ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30'
                        }`}
                      >
                        {isBanned ? 'Unban Akun' : 'Ban Akun'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upgrade Token Generator Card */}
      <div className="glass-panel p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 className="font-editorial text-xl font-bold text-white flex items-center gap-2">
              <Key size={18} className="text-amber-400" />
              <span>Token Kenaikan Tingkat (Upgrade Tokens)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Token unik sekali pakai untuk menaikkan tier WUNA akun member ke Nova atau Astral.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowCreateTokenModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-semibold text-slate-200 transition-all"
          >
            <Plus size={14} />
            <span>Generate Token Baru</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
          {tokens.map((t) => (
            <div key={t.id || t.token} className="p-3.5 rounded-xl bg-black/40 border border-white/[0.06] space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono font-bold text-amber-300">{t.token}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.04] text-slate-400 uppercase">
                  {t.tier}
                </span>
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                Status: {t.used ? 'Telah Diklaim' : 'Belum Dipakai (Aktif)'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="glass-panel-elevated max-w-md w-full p-6 space-y-5 border border-white/[0.1]">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h3 className="font-editorial text-xl font-bold text-slate-100">Buat Pengguna WUNA Baru</h3>
              <button
                type="button"
                onClick={() => setShowCreateUserModal(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Username</label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="operator_baru"
                  required
                  className="w-full px-3 py-2.5 rounded-xl bg-black/50 border border-white/[0.1] text-xs text-slate-200 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-3 py-2.5 rounded-xl bg-black/50 border border-white/[0.1] text-xs text-slate-200 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Nomor WhatsApp</label>
                <input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="628xxxxxxxx"
                  className="w-full px-3 py-2.5 rounded-xl bg-black/50 border border-white/[0.1] text-xs text-slate-200 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Tingkatan Tier</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-black/50 border border-white/[0.1] text-xs text-slate-200 focus:outline-none focus:border-amber-400"
                >
                  <option value="member">MEMBER</option>
                  <option value="nebula">NEBULA</option>
                  <option value="astral">ASTRAL</option>
                  <option value="nova">NOVA</option>
                  <option value="cosmos">COSMOS (OWNER)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateUserModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs text-slate-400 hover:text-slate-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
                >
                  Buat Pengguna
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Token Modal */}
      {showCreateTokenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="glass-panel-elevated max-w-sm w-full p-6 space-y-5 border border-white/[0.1]">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h3 className="font-editorial text-xl font-bold text-slate-100">Buat Token Upgrade Tier</h3>
              <button
                type="button"
                onClick={() => setShowCreateTokenModal(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateToken} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Pilih Target Tier</label>
                <select
                  value={newTokenTier}
                  onChange={(e) => setNewTokenTier(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-black/50 border border-white/[0.1] text-xs text-slate-200 focus:outline-none focus:border-amber-400"
                >
                  <option value="nova">NOVA</option>
                  <option value="astral">ASTRAL</option>
                  <option value="nebula">NEBULA</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateTokenModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs text-slate-400 hover:text-slate-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
                >
                  Generate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
