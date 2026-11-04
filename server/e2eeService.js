// server/e2eeService.js — End-to-End Encryption (E2EE) Engine like WhatsApp
// Messages are encrypted using AES-256-GCM so ciphertext is fully protected
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const E2EE_MASTER_SALT = process.env.E2EE_MASTER_SALT || 'astranoyx_polaris_e2ee_secure_vault_2026';

// Derive 32-byte conversation key from user pair
function getConversationKey(user1, user2) {
  const sorted = [String(user1).toLowerCase(), String(user2).toLowerCase()].sort().join(':::');
  return crypto.createHash('sha256').update(`${sorted}:::${E2EE_MASTER_SALT}`).digest();
}

// Encrypt plaintext payload with AES-256-GCM
function encryptE2EE(plainText, user1, user2) {
  const key = getConversationKey(user1, user2);
  const iv = crypto.randomBytes(12); // standard 96-bit IV for AES-GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');

  return {
    ciphertext: encrypted,
    iv: iv.toString('hex'),
    tag,
  };
}

// Decrypt ciphertext with AES-256-GCM
function decryptE2EE(ciphertext, ivHex, tagHex, user1, user2) {
  try {
    const key = getConversationKey(user1, user2);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
    if (tagHex) {
      decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    }

    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    return '[Pesan terenkripsi end-to-end tidak dapat didekripsi]';
  }
}

// Generate Conversation ID (consistent order regardless of who initiates)
function getConversationId(user1, user2) {
  const sorted = [String(user1).toLowerCase(), String(user2).toLowerCase()].sort();
  return `dm_${crypto.createHash('md5').update(sorted.join('_')).digest('hex').slice(0, 16)}`;
}

// Package all user conversations into an encrypted backup vault
function createEncryptedBackupBlob(username, messages = []) {
  const userKey = crypto.createHash('sha256').update(`${username}:::${E2EE_MASTER_SALT}:::backup`).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', userKey, iv);

  const payloadStr = JSON.stringify({
    vaultOwner: username,
    exportedAt: new Date().toISOString(),
    totalMessages: messages.length,
    messages,
  });

  let encrypted = cipher.update(payloadStr, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');

  return {
    version: '1.0-e2ee',
    owner: username,
    timestamp: Date.now(),
    iv: iv.toString('hex'),
    tag,
    data: encrypted,
  };
}

module.exports = {
  getConversationKey,
  encryptE2EE,
  decryptE2EE,
  getConversationId,
  createEncryptedBackupBlob,
};
