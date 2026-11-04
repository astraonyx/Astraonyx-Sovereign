// src/types/astraonyx.ts — Sovereign ASTRAONYX TypeScript Types Specification

export type WunaTier =
  | 'cosmos'
  | 'overlord'
  | 'supernova'
  | 'starlight'
  | 'nebula_master'
  | 'star_sentinel'
  | 'pulsar'
  | 'astral_voyager'
  | 'cosmic_scout'
  | 'member';

export interface UserSession {
  id: string;
  username: string;
  displayName: string;
  phoneNumber?: string;
  avatarUrl?: string;
  bio?: string;
  role: WunaTier;
  tierLevel: number;
  tierInfo: {
    tier: string;
    level: number;
    badge: string;
    description: string;
  };
  require2FA: boolean;
  hasPin: boolean;
  hasCustomAiKey: boolean;
  hermesModel?: string;
  hermesProvider?: string;
  linkedOwnerNumber?: string;
}

export interface BotStatus {
  status: 'connected' | 'connecting' | 'disconnected' | 'pairing';
  botName?: string;
  pushName?: string;
  phoneNumber?: string;
  uptimeSeconds: number;
  memoryUsageMb: number;
  cpuPercent?: number;
  pingMs: number;
  batteryLevel?: number;
  batteryCharging?: boolean;
  totalChats?: number;
  totalGroups?: number;
  totalContacts?: number;
  lastQrDataUrl?: string;
  pairingCode?: string;
  activeClusterInstances?: number;
}

export interface TerminalLogEntry {
  timestamp: string | number;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  source?: string;
}

export interface VirtexAlert {
  id: string;
  timestamp: number;
  senderJid: string;
  groupJid?: string;
  threatType: string;
  actionTaken: string;
}

export interface SocialPost {
  id: string;
  authorUsername: string;
  authorDisplayName: string;
  authorAvatarUrl?: string;
  authorTier: WunaTier;
  content: string;
  mediaUrl?: string;
  postType: 'post' | 'reel' | 'announcement';
  likesCount: number;
  commentsCount: number;
  isLiked?: boolean;
  isBookmarked?: boolean;
  createdAt: string;
}

export interface SocialStory {
  id: string;
  authorUsername: string;
  authorDisplayName: string;
  authorAvatarUrl?: string;
  mediaUrl: string;
  caption?: string;
  expiresAt: string;
  createdAt: string;
}

export interface HermesMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  isStreaming?: boolean;
  modelUsed?: string;
}

export interface StarliumChessState {
  fen: string;
  turn: 'w' | 'b';
  isCheck: boolean;
  isCheckmate: boolean;
  isDraw: boolean;
  moveHistory: string[];
  evaluationScore?: number;
}
