// src/lib/api-client.ts — Sovereign API Client for ASTRAONYX Express Backend

const API_BASE_URL = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

function getAuthHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('polaris_token') || localStorage.getItem('astraonyx_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    let errorMsg = `HTTP Error ${response.status}`;
    try {
      const errorJson = await response.json();
      errorMsg = errorJson.error || errorJson.message || errorMsg;
    } catch (_) {}
    throw new Error(errorMsg);
  }

  return response.json();
}

// Typed API Helpers
export const astraApi = {
  // Auth
  getMe: () => apiFetch('/api/auth/me'),
  getPublicProfile: (username: string) => apiFetch(`/api/auth/public-profile/${username}`),

  // Bot Core Telemetry
  getBotStatus: () => apiFetch('/api/bot/status'),
  startBot: () => apiFetch('/api/bot/start', { method: 'POST' }),
  stopBot: () => apiFetch('/api/bot/stop', { method: 'POST' }),
  restartBot: () => apiFetch('/api/bot/restart', { method: 'POST' }),
  pairBot: (phone: string) => apiFetch('/api/bot/pair', { method: 'POST', body: JSON.stringify({ phone }) }),

  // Hermes AI
  getHermesStatus: () => apiFetch('/api/hermes/status'),
  sendHermesChat: (prompt: string, model?: string) =>
    apiFetch('/api/hermes/chat', { method: 'POST', body: JSON.stringify({ prompt, model }) }),
  clearHermesMemory: () => apiFetch('/api/hermes/memory/clear', { method: 'POST' }),

  // Social
  getPosts: () => apiFetch('/api/social/posts'),
  createPost: (data: any) => apiFetch('/api/social/posts', { method: 'POST', body: JSON.stringify(data) }),
  getStories: () => apiFetch('/api/social/stories'),

  // Games
  getLeaderboard: (gameType: string) => apiFetch(`/api/games/leaderboard/${gameType}`),
  getRaidStatus: () => apiFetch('/api/raid/status'),

  // Tools & Downloader
  analyzeDownload: (url: string) =>
    apiFetch('/api/downloader/analyze', { method: 'POST', body: JSON.stringify({ url }) }),

  // Sanctum Owner
  getVirtexStats: () => apiFetch('/api/security/virtex-stats'),
  getClusterInstances: () => apiFetch('/api/cluster/instances'),
  getDatabaseIntegrity: () => apiFetch('/api/database/integrity'),
};
