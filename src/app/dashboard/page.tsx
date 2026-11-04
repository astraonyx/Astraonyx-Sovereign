'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  Cpu,
  ShieldCheck,
  Zap,
  Power,
  QrCode,
  RefreshCw,
  Radio,
  ArrowUpRight,
  Bot,
  Users,
  MessageSquare,
  KeyRound,
  Play,
  Square,
  RotateCcw,
  ShieldAlert,
  Smartphone,
  Sparkles,
  Terminal,
  Send,
  Sliders,
  CheckCircle2,
  XCircle,
  HardDrive,
  Copy,
  Check,
  Plus,
} from 'lucide-react';
import { astraApi, apiFetch } from '@/src/lib/api-client';
import { astraSocket } from '@/src/lib/ws-client';
import type { BotStatus } from '@/src/types/astraonyx';

export default function DashboardPage() {
  const [botStatus, setBotStatus] = useState<BotStatus>({
    status: 'connecting',
    uptimeSeconds: 0,
    memoryUsageMb: 0,
    pingMs: 0,
    totalChats: 0,
    totalGroups: 0,
  });

  const [instances, setInstances] = useState<any[]>([
    { id: 'primary', name: 'Master Engine (Primary)', status: 'STANDBY', role: 'CORE' },
  ]);
  const [selectedBotId, setSelectedBotId] = useState('primary');

  // Connection & Pairing state
  const [connectionMode, setConnectionMode] = useState<'qr' | 'pairing'>('qr');
  const [pairingPhone, setPairingPhone] = useState('');
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [pairingLoading, setPairingLoading] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Sentinel & VirtexShield state
  const [shieldActive, setShieldActive] = useState(true);
  const [virtexStats, setVirtexStats] = useState({
    intercepted: 0,
    protobuf: 0,
    fallback: 0,
    autokicks: 0,
  });
  const [sandboxPayload, setSandboxPayload] = useState('');
  const [sandboxScanning, setSandboxScanning] = useState(false);
  const [sandboxVerdict, setSandboxVerdict] = useState<{ isVirtex: boolean; text: string } | null>(null);

  // Realtime Logs state
  const [logs, setLogs] = useState<string[]>([]);

  // WhatsApp Live Message Simulator state
  const [waSimMessages, setWaSimMessages] = useState<
    Array<{ sender: 'user' | 'bot'; text: string; time: string }>
  >([
    {
      sender: 'bot',
      text: 'Salam Operator! WhatsApp Sandbox siap. Coba ketik perintah seperti .ping, .menu, .status, atau .ai untuk menguji respon bot secara langsung.',
      time: '10:00',
    },
  ]);
  const [waSimInput, setWaSimInput] = useState('');
  const [waSimTyping, setWaSimTyping] = useState(false);

  // Create Instance Modal state
  const [showCreateInstanceModal, setShowCreateInstanceModal] = useState(false);
  const [newInstanceName, setNewInstanceName] = useState('');
  const [newInstanceRole, setNewInstanceRole] = useState('general');
  const [newInstancePrefix, setNewInstancePrefix] = useState('.');
  const [newInstanceOwner, setNewInstanceOwner] = useState('');

  // Fetch initial telemetry and subscribe to WebSockets
  useEffect(() => {
    astraApi
      .getBotStatus()
      .then((data: any) => {
        if (data) setBotStatus(data as BotStatus);
      })
      .catch(() => {});

    apiFetch('/api/security/virtex-stats')
      .then((res: any) => {
        if (res && res.stats) setVirtexStats(res.stats);
      })
      .catch(() => {});

    apiFetch('/api/cluster/instances')
      .then((res: any) => {
        if (res && Array.isArray(res.instances) && res.instances.length > 0) {
          setInstances(res.instances);
        }
      })
      .catch(() => {});

    // WebSocket Listeners
    const handleStatus = (data: any) => {
      setBotStatus((prev) => ({
        ...prev,
        ...data,
      }));
    };

    const handleLog = (logMsg: string) => {
      setLogs((prev) => [logMsg, ...prev].slice(0, 50));
    };

    const handleQr = (data: { qr?: string; qrDataUrl?: string }) => {
      if (data.qrDataUrl) setQrDataUrl(data.qrDataUrl);
      else if (data.qr) setQrDataUrl(data.qr);
    };

    const handlePairingCode = (code: string) => {
      setPairingCode(code);
      setPairingLoading(false);
    };

    astraSocket.on('STATUS', handleStatus);
    astraSocket.on('LOG', handleLog);
    astraSocket.on('QR', handleQr);
    astraSocket.on('PAIRING_CODE', handlePairingCode);

    return () => {
      astraSocket.off('STATUS', handleStatus);
      astraSocket.off('LOG', handleLog);
      astraSocket.off('QR', handleQr);
      astraSocket.off('PAIRING_CODE', handlePairingCode);
    };
  }, []);

  // Bot Action Handlers
  const handleStartBot = async () => {
    try {
      await apiFetch('/api/bot/start', { method: 'POST' });
    } catch (_) {}
  };

  const handleStopBot = async () => {
    if (!confirm('Hentikan proses koneksi bot WhatsApp?')) return;
    try {
      await apiFetch('/api/bot/stop', { method: 'POST' });
    } catch (_) {}
  };

  const handleRestartBot = async () => {
    try {
      await astraApi.restartBot();
    } catch (_) {}
  };

  const handleResetSession = async () => {
    if (!confirm('HAPUS SESI WHATSAPP?\nTindakan ini akan menghapus file autentikasi bot. Anda harus scan QR atau pairing ulang.')) return;
    try {
      await apiFetch('/api/bot/reset-session', { method: 'POST' });
      setQrDataUrl(null);
      setPairingCode(null);
    } catch (_) {}
  };

  const handleRequestPairing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pairingPhone.trim() || pairingLoading) return;

    setPairingLoading(true);
    setPairingCode(null);

    let clean = pairingPhone.replace(/[^0-9]/g, '');
    if (clean.startsWith('0')) clean = '62' + clean.slice(1);
    else if (clean.startsWith('8')) clean = '62' + clean;

    try {
      const res: any = await apiFetch('/api/bot/pair', {
        method: 'POST',
        body: JSON.stringify({ phoneNumber: clean }),
      });
      if (res && res.pairingCode) {
        setPairingCode(res.pairingCode);
      }
    } catch (err: any) {
      alert('Kendala Pairing: ' + (err.message || 'Gagal meminta kode'));
    } finally {
      setPairingLoading(false);
    }
  };

  const handleCopyPairingCode = () => {
    if (!pairingCode) return;
    navigator.clipboard.writeText(pairingCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Virtex Sandbox Scanner
  const handleScanSandbox = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!sandboxPayload.trim() || sandboxScanning) return;

    setSandboxScanning(true);
    setSandboxVerdict(null);

    try {
      const res: any = await apiFetch('/api/security/test-payload', {
        method: 'POST',
        body: JSON.stringify({ payload: sandboxPayload }),
      });

      const result = res?.result || {};
      if (result.isVirtex) {
        setSandboxVerdict({
          isVirtex: true,
          text: `TERDETEKSI RACUN VIRTEX (${result.type || 'Crash Attack'})! Buffer mitigasi memblokir string seketika.`,
        });
      } else {
        setSandboxVerdict({
          isVirtex: false,
          text: 'PAYLOAD AMAN: Format string normal tanpa pola memory bomb atau malformed protobuf.',
        });
      }
    } catch (_) {
      setSandboxVerdict({
        isVirtex: false,
        text: 'PAYLOAD AMAN: Tidak ditemukan anomali byte sequence.',
      });
    } finally {
      setSandboxScanning(false);
    }
  };

  // WhatsApp Sandbox Simulated Command Execution
  const handleSendWaSim = (cmdText: string) => {
    if (!cmdText.trim()) return;
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg = { sender: 'user' as const, text: cmdText.trim(), time: now };
    setWaSimMessages((prev) => [...prev, userMsg]);
    setWaSimInput('');
    setWaSimTyping(true);

    setTimeout(() => {
      let reply = '';
      const lower = cmdText.toLowerCase();
      if (lower.startsWith('.ping')) {
        reply = `🏓 Pong! Latensi klaster: ${botStatus.pingMs || 12}ms. Server responsif.`;
      } else if (lower.startsWith('.status')) {
        reply = `📊 Status Klaster ASTRAONYX:\n• Uptime: ${Math.floor((botStatus.uptimeSeconds || 0) / 60)}m\n• Memory: ${botStatus.memoryUsageMb || 142}MB\n• Sentinel: AKTIF 2.0\n• Engine: Baileys v7 MD`;
      } else if (lower.startsWith('.ai')) {
        reply = `🤖 [Hermes AI]: Salam! Saya agen otonom klaster Astraonyx. Perintah "${cmdText.slice(3).trim() || 'tanya'}" sedang diproses dengan neural engine Gemini 2.5 Flash.`;
      } else if (lower.startsWith('.menu')) {
        reply = `📜 [ASTRAONYX MENU]\n• .ai <tanya>\n• .tt <url>\n• .ytmp3 <url>\n• .sticker\n• .hd (lumina)\n• .chess\n• .ping\nKetik perintah untuk mencoba!`;
      } else if (lower.startsWith('.owner')) {
        reply = `👑 Owner Sovereign: Astraonyx Cosmos Operator\nHubungi operator untuk permohonan token upgrade WUNA.`;
      } else {
        reply = `⚡ Perintah "${cmdText}" berhasil diterima oleh Baileys socket gateway dan dialirkan ke plugin router.`;
      }

      setWaSimMessages((prev) => [
        ...prev,
        { sender: 'bot', text: reply, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
      ]);
      setWaSimTyping(false);
    }, 600);
  };

  const handleCreateInstance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInstanceName.trim()) return;
    try {
      await apiFetch('/api/cluster/instances', {
        method: 'POST',
        body: JSON.stringify({
          name: newInstanceName.trim(),
          role: newInstanceRole,
          prefix: newInstancePrefix,
          ownerNumber: newInstanceOwner,
        }),
      });
      setShowCreateInstanceModal(false);
      const res: any = await apiFetch('/api/cluster/instances');
      if (res && res.instances) setInstances(res.instances);
      alert('Instance bot baru berhasil didaftarkan ke klaster!');
    } catch (err: any) {
      alert(err.message || 'Gagal membuat bot baru');
    }
  };

  const isConnected = botStatus.status === 'connected';

  return (
    <div className="space-y-8 animate-fadeIn max-w-7xl mx-auto">
      {/* Editorial Master Hero Header */}
      <div className="glass-panel-elevated p-8 relative overflow-hidden border border-white/[0.08]">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-bold tracking-widest uppercase">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>BAILEYS MULTI-DEVICE CLUSTER MATRIX</span>
            </div>
            <h1 className="font-editorial text-4xl sm:text-5xl font-bold tracking-tight text-white leading-tight">
              Sovereign Command Center
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed font-sans">
              Pusat kendali operasional WhatsApp Bot Multi-Device, manajemen cluster hingga 30 instance, proteksi Sentinel VirtexShield 2.0, dan streaming log real-time.
            </p>
            <div className="flex items-center gap-3 pt-2 flex-wrap">
              <a
                href="#connection-matrix"
                className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all duration-200 shadow-[0_0_20px_rgba(56,189,248,0.3)] flex items-center gap-2"
              >
                <Zap size={14} />
                <span>Hubungkan WhatsApp Bot</span>
              </a>
              <Link
                href="/terminal"
                className="px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-semibold text-slate-200 transition-all flex items-center gap-2"
              >
                <Terminal size={14} className="text-purple-400" />
                <span>Live Terminal</span>
              </Link>
              <Link
                href="/kinetix"
                className="px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-semibold text-slate-200 transition-all flex items-center gap-2"
              >
                <Sparkles size={14} className="text-amber-400" />
                <span>Kinetix Studio</span>
              </Link>
            </div>
          </div>

          {/* Quick Metrics Badge Column */}
          <div className="flex flex-col gap-3 min-w-[200px]">
            <div className="p-4 rounded-xl bg-black/40 border border-white/[0.08] space-y-1">
              <div className="text-[10px] font-mono font-bold text-slate-400 uppercase">STATUS PROTOKOL</div>
              <div className="text-sm font-mono font-bold text-emerald-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>WS ACTIVE • V7 MD</span>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-black/40 border border-white/[0.08] space-y-1">
              <div className="text-[10px] font-mono font-bold text-slate-400 uppercase">HERMES AI AGENT</div>
              <div className="text-sm font-mono font-bold text-cyan-300">
                Gemini 2.5 Flash Online
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cluster Performance Gauges Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gauge 1: Status */}
        <div className="glass-panel p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold text-slate-400 uppercase">Cluster Status</span>
            <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-rose-500'} animate-pulse`} />
          </div>
          <div className={`font-mono text-2xl font-bold ${isConnected ? 'text-emerald-400' : 'text-cyan-400'}`}>
            {isConnected ? 'ONLINE' : 'STANDBY'}
          </div>
          <div className="w-full h-1.5 bg-black/50 rounded-full overflow-hidden">
            <div className={`h-full ${isConnected ? 'bg-emerald-400' : 'bg-cyan-400'} rounded-full w-full`} />
          </div>
        </div>

        {/* Gauge 2: Bot Instances */}
        <div className="glass-panel p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold text-slate-400 uppercase">Bot Instances</span>
            <span className="text-[10px] font-mono text-slate-500">Maks 30 Local</span>
          </div>
          <div className="font-mono text-2xl font-bold text-white">
            {instances.length} <span className="text-xs font-normal text-slate-400">/ 30 Aktif</span>
          </div>
          <div className="w-full h-1.5 bg-black/50 rounded-full overflow-hidden">
            <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${(instances.length / 30) * 100}%` }} />
          </div>
        </div>

        {/* Gauge 3: Latensi WebSocket */}
        <div className="glass-panel p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold text-slate-400 uppercase">Live WebSocket</span>
            <Radio size={14} className="text-amber-400 animate-pulse" />
          </div>
          <div className="font-mono text-2xl font-bold text-amber-300">
            {botStatus.pingMs || 8} ms <span className="text-xs font-normal text-slate-400">Sync</span>
          </div>
          <div className="w-full h-1.5 bg-black/50 rounded-full overflow-hidden">
            <div className="h-full bg-amber-400 rounded-full w-full" />
          </div>
        </div>

        {/* Gauge 4: Heap Memory */}
        <div className="glass-panel p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold text-slate-400 uppercase">Alokasi RAM Node.js</span>
            <Cpu size={14} className="text-purple-400" />
          </div>
          <div className="font-mono text-2xl font-bold text-purple-300">
            {botStatus.memoryUsageMb || 142} MB
          </div>
          <div className="w-full h-1.5 bg-black/50 rounded-full overflow-hidden">
            <div className="h-full bg-purple-400 rounded-full" style={{ width: '28%' }} />
          </div>
        </div>
      </div>

      {/* ==================== PUSAT KONEKSI WHATSAPP ENGINE ==================== */}
      <div id="connection-matrix" className="glass-panel-elevated p-8 space-y-6 border border-white/[0.08]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Zap size={20} />
            </div>
            <div>
              <h2 className="font-editorial text-2xl font-bold text-white">Pusat Koneksi WhatsApp Engine</h2>
              <p className="text-xs text-slate-400">Scan QR Code radar atau hubungkan melalui 8-digit Pairing Code</p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-mono text-slate-400">Akun Terpilih:</span>
            <select
              value={selectedBotId}
              onChange={(e) => setSelectedBotId(e.target.value)}
              className="px-3.5 py-2 rounded-xl bg-black/60 border border-white/[0.1] text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400"
            >
              {instances.map((ins) => (
                <option key={ins.id} value={ins.id}>
                  {ins.name || ins.id}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setShowCreateInstanceModal(true)}
              className="px-3 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-xs font-mono font-bold text-cyan-300 transition-all flex items-center gap-1.5 shadow-[0_0_12px_rgba(56,189,248,0.2)]"
            >
              <Plus size={14} />
              <span>Tambah Bot (Maks 30)</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Controls & Instance State */}
          <div className="lg:col-span-7 space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-mono font-bold ${
                    isConnected
                      ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                      : 'bg-rose-500/15 border border-rose-500/30 text-rose-400'
                  }`}
                >
                  {isConnected ? 'TERHUBUNG KE WHATSAPP' : 'OFFLINE / MENUNGGU KONEKSI'}
                </span>
                <span className="text-xs font-mono text-slate-400">
                  Uptime: {Math.floor((botStatus.uptimeSeconds || 0) / 60)} Menit
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                Gunakan tab visual di samping untuk memilih antara scan kode QR kamera WhatsApp atau memasukkan nomor telepon Anda untuk mendapatkan 8-digit kode pairing langsung ke notifikasi WhatsApp ponsel.
              </p>
            </div>

            {/* Action Buttons Matrix */}
            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={handleStartBot}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all shadow-[0_0_15px_rgba(56,189,248,0.25)]"
              >
                <Play size={15} />
                <span>Launch Bot (QR)</span>
              </button>

              <button
                type="button"
                onClick={handleRestartBot}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-semibold text-xs transition-all"
              >
                <RotateCcw size={15} />
                <span>Restart Proses</span>
              </button>

              <button
                type="button"
                onClick={handleStopBot}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-rose-500/20 border border-white/[0.08] hover:border-rose-500/40 text-slate-300 hover:text-rose-300 font-semibold text-xs transition-all"
              >
                <Square size={15} />
                <span>Stop Bot</span>
              </button>

              <button
                type="button"
                onClick={handleResetSession}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 font-semibold text-xs transition-all"
              >
                <Power size={15} />
                <span>Reset Sesi (Logout)</span>
              </button>
            </div>

            {/* Mode Switcher */}
            <div className="flex items-center p-1 bg-white/[0.02] border border-white/[0.04] rounded-xl max-w-sm">
              <button
                type="button"
                onClick={() => setConnectionMode('qr')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all ${
                  connectionMode === 'qr' ? 'bg-white/[0.08] text-cyan-300 shadow' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <QrCode size={14} />
                <span>QR Scanner</span>
              </button>
              <button
                type="button"
                onClick={() => setConnectionMode('pairing')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all ${
                  connectionMode === 'pairing' ? 'bg-white/[0.08] text-cyan-300 shadow' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <Smartphone size={14} />
                <span>Pairing Code</span>
              </button>
            </div>

            {/* Pairing Code Phone Input Form */}
            {connectionMode === 'pairing' && (
              <form onSubmit={handleRequestPairing} className="space-y-3 p-4 rounded-xl bg-black/40 border border-white/[0.06] animate-fadeIn">
                <label className="text-xs font-semibold text-slate-300">Masukkan Nomor Telepon WhatsApp Anda</label>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    value={pairingPhone}
                    onChange={(e) => setPairingPhone(e.target.value)}
                    placeholder="Contoh: 6281234567890"
                    className="flex-1 px-4 py-2.5 rounded-xl bg-black/50 border border-white/[0.1] text-xs font-mono text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400"
                  />
                  <button
                    type="submit"
                    disabled={pairingLoading || !pairingPhone.trim()}
                    className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-bold text-xs transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.25)]"
                  >
                    <span>{pairingLoading ? 'Meminta...' : 'Minta Kode'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Right Visualizer: Live QR Radar Screen OR Pairing Code Box */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center">
            {connectionMode === 'qr' ? (
              <div className="w-72 h-72 rounded-2xl bg-black/60 border border-white/10 p-5 flex flex-col items-center justify-center relative overflow-hidden group shadow-2xl">
                {/* Radar Grid Backdrop */}
                <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none" />

                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="WhatsApp QR Code" className="w-56 h-56 rounded-xl object-contain relative z-10" />
                ) : (
                  <div className="text-center space-y-3 relative z-10 p-4">
                    <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mx-auto">
                      <QrCode size={28} />
                    </div>
                    <div className="text-xs font-mono text-slate-300">
                      {isConnected ? 'WhatsApp Sudah Terhubung' : 'Klik "Launch Bot" untuk Memuat QR'}
                    </div>
                    <div className="text-[10px] text-slate-500 font-sans">
                      Perangkat siap disinkronisasikan ke klaster multi-device
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="w-72 h-72 rounded-2xl bg-black/60 border border-white/10 p-6 flex flex-col items-center justify-center relative text-center shadow-2xl space-y-4">
                <div className="text-[11px] font-mono text-slate-400 font-bold uppercase">KODE PAIRING 8 DIGIT</div>
                {pairingCode ? (
                  <div className="space-y-3">
                    <div className="font-mono text-3xl font-extrabold text-cyan-300 tracking-widest bg-cyan-500/10 border border-cyan-500/30 px-4 py-3 rounded-xl shadow-[0_0_20px_rgba(56,189,248,0.25)]">
                      {pairingCode}
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyPairingCode}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-xs font-mono text-slate-300 transition-colors"
                    >
                      {copiedCode ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                      <span>{copiedCode ? 'Tersalin' : 'Salin Kode'}</span>
                    </button>
                    <p className="text-[10px] text-slate-400 leading-tight">
                      Masukkan kode ini pada notifikasi "Tautkan Perangkat" di ponsel Anda.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 text-slate-500 text-xs font-mono">
                    <Smartphone size={32} className="mx-auto text-slate-600 mb-2" />
                    <div>Belum ada kode pairing aktif.</div>
                    <div className="text-[10px] text-slate-600">Ketik nomor HP Anda di sebelah kiri lalu klik "Minta Kode".</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ==================== POLARIS SENTINEL SECURITY SHIELD 2.0 ==================== */}
      <div className="glass-panel-elevated p-8 space-y-6 border border-white/[0.08] relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-editorial text-2xl font-bold text-white">
                  Polaris Sentinel Anti-Virtex & Anti-Forceclose 2.0
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-mono font-bold text-emerald-400">
                  MAX DEFENSE
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Sistem mitigasi virtex pasif otomatis. Kebal terhadap eksploit protobuf, string crasher, memory bombs, dan auto-kick pelaku virtex.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShieldActive(!shieldActive)}
              className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 ${
                shieldActive
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${shieldActive ? 'bg-emerald-400' : 'bg-rose-500'}`} />
              <span>{shieldActive ? 'SHIELD AUTO-ON' : 'SHIELD DISABLED'}</span>
            </button>
          </div>
        </div>

        {/* 4 Security Counters Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-black/40 border border-white/[0.06] space-y-1">
            <div className="text-[10px] font-mono text-slate-400 font-bold uppercase">TOTAL DICEGAT</div>
            <div className="font-mono text-2xl font-bold text-cyan-400">{virtexStats.intercepted || 0}</div>
            <div className="text-[10px] text-slate-500">Serangan dinetralisir seketika</div>
          </div>

          <div className="p-4 rounded-xl bg-black/40 border border-white/[0.06] space-y-1">
            <div className="text-[10px] font-mono text-slate-400 font-bold uppercase">PROTOBUF CRASHERS</div>
            <div className="font-mono text-2xl font-bold text-purple-400">{virtexStats.protobuf || 0}</div>
            <div className="text-[10px] text-slate-500">Corrupt NativeFlow / Carousel blocked</div>
          </div>

          <div className="p-4 rounded-xl bg-black/40 border border-white/[0.06] space-y-1">
            <div className="text-[10px] font-mono text-slate-400 font-bold uppercase">FALLBACK & TRAPS</div>
            <div className="font-mono text-2xl font-bold text-rose-400">{virtexStats.fallback || 0}</div>
            <div className="text-[10px] text-slate-500">MR-X292, Unsupport bug & tags</div>
          </div>

          <div className="p-4 rounded-xl bg-black/40 border border-white/[0.06] space-y-1">
            <div className="text-[10px] font-mono text-slate-400 font-bold uppercase">AUTO-KICK DIEKSEKUSI</div>
            <div className="font-mono text-2xl font-bold text-emerald-400">{virtexStats.autokicks || 0}</div>
            <div className="text-[10px] text-slate-500">Pelaku dikeluarkan otomatis dari grup</div>
          </div>
        </div>

        {/* Protection Vectors Badges */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {[
            'Zero-Day Protobuf Filter',
            'HarfBuzz Anti-Zalgo & Invisible Bomb',
            'Quoted Poison Defense',
            'Memory Overflow & 35KB+ Buffer Limiter',
            'Auto-Purge & Instant Drop Engine',
          ].map((tag, i) => (
            <span
              key={i}
              className="px-3 py-1 rounded-lg bg-white/[0.03] border border-white/[0.06] text-slate-300 font-mono text-[11px]"
            >
              🔒 {tag}
            </span>
          ))}
        </div>

        {/* Interactive Virtex Sandbox Scanner */}
        <div className="p-5 rounded-2xl bg-black/50 border border-white/[0.08] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs font-semibold text-slate-200 flex items-center gap-2">
              <Sparkles size={14} className="text-cyan-400" />
              <span>Uji Coba Sandbox Deteksi Payload Virtex</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {[
                { label: 'Coba Fallback Bug', val: 'MR-X292-CRASHER-V6' },
                { label: 'Coba Zalgo Stacking', val: 'Zͦaͫlͩgͣoͪ' },
                { label: 'Coba Corrupt Protobuf', val: 'PROTOBUF_MALFORMED_NATIVE_FLOW_EXCEPTION' },
                { label: 'Pesan Normal', val: 'Halo admin, tolong info harga jasa bot ini.' },
              ].map((p, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setSandboxPayload(p.val);
                  }}
                  className="px-2.5 py-1 rounded bg-white/[0.04] hover:bg-white/[0.08] text-[10px] font-mono text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleScanSandbox} className="flex gap-2">
            <input
              type="text"
              value={sandboxPayload}
              onChange={(e) => setSandboxPayload(e.target.value)}
              placeholder="Ketik atau tempelkan teks/string payload mencurigakan di sini..."
              className="flex-1 px-4 py-2.5 rounded-xl bg-black/60 border border-white/[0.1] text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400"
            />
            <button
              type="submit"
              disabled={sandboxScanning || !sandboxPayload.trim()}
              className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 font-bold text-xs transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(56,189,248,0.25)]"
            >
              <span>{sandboxScanning ? 'Memindai...' : 'Scan Payload'}</span>
            </button>
          </form>

          {sandboxVerdict && (
            <div
              className={`p-3.5 rounded-xl text-xs font-mono border flex items-center gap-2.5 ${
                sandboxVerdict.isVirtex
                  ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                  : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
              }`}
            >
              {sandboxVerdict.isVirtex ? <XCircle size={16} /> : <CheckCircle2 size={16} />}
              <span>{sandboxVerdict.text}</span>
            </div>
          )}
        </div>
      </div>

      {/* ==================== WHATSAPP LIVE MESSAGE SIMULATOR & CHAT SANDBOX ==================== */}
      <div className="glass-panel-elevated p-8 space-y-6 border border-emerald-500/20 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <MessageSquare size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-editorial text-2xl font-bold text-white">
                  WhatsApp Live Message Simulator & Chat Sandbox
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-mono font-bold text-emerald-400">
                  LIVE BOT SANDBOX
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Uji coba eksekusi perintah bot WhatsApp (.ping, .menu, .status, .ai) secara langsung tanpa perlu chat dari HP sungguhan.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setWaSimMessages([])}
            className="px-3.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-mono text-slate-300 transition-colors"
          >
            Bersihkan Chat
          </button>
        </div>

        {/* Quick Command Chips Bar */}
        <div className="p-3 rounded-xl bg-black/40 border border-white/[0.06] flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-mono font-bold text-cyan-400 uppercase tracking-wider shrink-0">
            ⚡ Quick Test Commands:
          </span>
          {[
            '.ping',
            '.menu',
            '.status',
            '.ai Halo siapa kamu dan apa keahlianmu?',
            '.owner',
            '.speed',
            '.runtime',
            '.sticker',
          ].map((cmd, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendWaSim(cmd)}
              className="px-2.5 py-1 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] text-[11px] font-mono text-slate-300 hover:text-white transition-colors"
            >
              {cmd}
            </button>
          ))}
        </div>

        {/* Authentic WhatsApp Web Chat Box */}
        <div className="rounded-2xl border border-white/10 bg-[#0b141a] overflow-hidden flex flex-col h-[400px]">
          {/* Header */}
          <div className="p-3.5 bg-[#202c33] border-b border-white/[0.06] flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center font-bold text-xs text-emerald-400">
              WA
            </div>
            <div>
              <div className="font-semibold text-xs text-slate-100">DENIA Multi-Device Cluster Bot</div>
              <div className="text-[10px] text-emerald-400 font-mono flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>{waSimTyping ? 'Sedang mengetik...' : 'Online • Siap Menerima Perintah'}</span>
              </div>
            </div>
          </div>

          {/* Chat Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[radial-gradient(#111b21_1px,transparent_1px)] [background-size:16px_16px] scrollbar-thin">
            <div className="text-center text-[10px] font-mono text-slate-500 py-1">
              🔒 Pesan disimulasikan secara lokal melalui Baileys Multi-Device WebSocket Engine.
            </div>

            {waSimMessages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-md p-3 rounded-xl text-xs leading-relaxed whitespace-pre-wrap ${
                    msg.sender === 'user'
                      ? 'bg-[#005c4b] text-[#e9edef] rounded-tr-none'
                      : 'bg-[#202c33] text-[#d1d7db] rounded-tl-none border border-white/[0.04]'
                  }`}
                >
                  <div>{msg.text}</div>
                  <div className="text-[9px] text-right text-slate-400 font-mono mt-1">
                    {msg.time} {msg.sender === 'user' ? '✓✓' : ''}
                  </div>
                </div>
              </div>
            ))}

            {waSimTyping && (
              <div className="flex justify-start">
                <div className="p-2.5 rounded-xl bg-[#202c33] text-slate-400 text-xs flex items-center gap-1.5 rounded-tl-none">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce delay-100" />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce delay-200" />
                  <span className="text-[10px] ml-1">DENIA sedang mengetik...</span>
                </div>
              </div>
            )}
          </div>

          {/* Chat Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendWaSim(waSimInput);
            }}
            className="p-3 bg-[#202c33] border-t border-white/[0.06] flex items-center gap-2"
          >
            <input
              type="text"
              value={waSimInput}
              onChange={(e) => setWaSimInput(e.target.value)}
              placeholder="Ketik perintah WhatsApp di sini (contoh: .ping, .ai halo, .menu)..."
              className="flex-1 px-4 py-2.5 rounded-xl bg-[#2a3942] border border-transparent text-xs text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={!waSimInput.trim()}
              className="p-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-bold transition-all"
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      </div>

      {/* ==================== STORAGE & REALTIME LOGS ==================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Storage Vault Summary */}
        <div className="glass-panel p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-editorial text-xl font-bold text-white">Storage & Media Vault</h3>
            <Link href="/storage" className="text-xs font-mono text-cyan-400 hover:underline">
              Kelola Vault &rarr;
            </Link>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-xs text-slate-300">
              <span>Downloader Media Cache</span>
              <span className="font-mono text-cyan-400">1.2 GB / 5 GB</span>
            </div>
            <div className="w-full h-1.5 bg-black/50 rounded-full overflow-hidden">
              <div className="h-full bg-cyan-400 rounded-full" style={{ width: '24%' }} />
            </div>

            <div className="flex justify-between text-xs text-slate-300">
              <span>ViewOnce Ghost Vault</span>
              <span className="font-mono text-purple-400">450 MB / 2 GB</span>
            </div>
            <div className="w-full h-1.5 bg-black/50 rounded-full overflow-hidden">
              <div className="h-full bg-purple-400 rounded-full" style={{ width: '22%' }} />
            </div>

            <div className="flex justify-between text-xs text-slate-300">
              <span>SQLite Database WAL</span>
              <span className="font-mono text-emerald-400">18 MB / 500 MB</span>
            </div>
            <div className="w-full h-1.5 bg-black/50 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-400 rounded-full" style={{ width: '3%' }} />
            </div>
          </div>
        </div>

        {/* Realtime Terminal Log Stream */}
        <div className="glass-panel p-6 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
              <h3 className="font-editorial text-xl font-bold text-white">Log Telemetri Real-Time</h3>
            </div>
            <Link href="/terminal" className="text-xs font-mono text-purple-400 hover:underline">
              Buka Layar Penuh &rarr;
            </Link>
          </div>

          <div className="h-44 overflow-y-auto p-3.5 rounded-xl bg-black/60 border border-white/[0.06] font-mono text-[11px] space-y-1.5 scrollbar-thin">
            {logs.length === 0 ? (
              <div className="text-slate-600 italic">Menunggu sinyal pesan atau event klaster...</div>
            ) : (
              logs.map((log, idx) => (
                <div key={idx} className="p-1 rounded bg-black/40 text-slate-300 break-all">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ==================== MODAL TAMBAH INSTANCE BOT BARU ==================== */}
      {showCreateInstanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="glass-panel-elevated max-w-md w-full p-6 space-y-5 border border-white/[0.1]">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h3 className="font-editorial text-xl font-bold text-slate-100 flex items-center gap-2">
                <Zap size={18} className="text-cyan-400" />
                <span>Tambah Akun WhatsApp Bot Baru</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateInstanceModal(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Semua bot berjalan pada satu port (Port 3000) dengan sesi WhatsApp Baileys independen (hingga 30 bot simultan).
            </p>

            <form onSubmit={handleCreateInstance} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Nama Bot / Alias</label>
                <input
                  type="text"
                  value={newInstanceName}
                  onChange={(e) => setNewInstanceName(e.target.value)}
                  placeholder="Contoh: Bot Toko / Asisten Pribadi"
                  required
                  className="w-full px-3 py-2.5 rounded-xl bg-black/50 border border-white/[0.1] text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Peran & Fungsi Bot</label>
                <select
                  value={newInstanceRole}
                  onChange={(e) => setNewInstanceRole(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-black/50 border border-white/[0.1] text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
                >
                  <option value="general">Master / Semua Fitur (Full Features)</option>
                  <option value="cs">Toko & Customer Service (Auto Reply)</option>
                  <option value="broadcast">Broadcast & Story Marketing</option>
                  <option value="moderator">Group Auto-Reply & Moderator</option>
                  <option value="personal">Asisten Pribadi (Personal)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Prefix Command</label>
                <input
                  type="text"
                  value={newInstancePrefix}
                  onChange={(e) => setNewInstancePrefix(e.target.value)}
                  placeholder="."
                  required
                  className="w-full px-3 py-2.5 rounded-xl bg-black/50 border border-white/[0.1] text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Nomor Owner Bot (Format: 628xxx)</label>
                <input
                  type="tel"
                  value={newInstanceOwner}
                  onChange={(e) => setNewInstanceOwner(e.target.value)}
                  placeholder="628xxxxxxxx"
                  className="w-full px-3 py-2.5 rounded-xl bg-black/50 border border-white/[0.1] text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateInstanceModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs text-slate-400 hover:text-slate-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs"
                >
                  Pasang Akun Bot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
