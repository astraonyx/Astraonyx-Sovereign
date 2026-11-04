// astraonyx/polaris/events/messagesUpdate.js — Antidelete, Revoke Detection & Anti-Virtex Ghost Guard
const fs = require('fs');
const path = require('path');
const { jidNormalizedUser } = require('@whiskeysockets/baileys');
const config = require('../../../config');
const storyManager = require('../../../lib/storyManager');
const contactsManager = require('../../../lib/contactsManager');
const botEcosystemGroups = require('../../../lib/botEcosystemGroups');
const antidelete = require('../../../lib/antidelete');
const { getGroup } = require('../../../lib/groupSettings');
const { getChatSettings } = require('../../../lib/privateChatSettings');
const { getCachedGroupMetadata } = require('../../../lib/groupMetadataCache');
const { looksLikeVirtex } = require('../../../lib/virtexDetector');
const { getCommandOverrides, getCustomFeatures } = require('../../../lib/commandOverridesHelper');

function isGroupJid(jid) {
  return typeof jid === 'string' && jid.endsWith('@g.us');
}

function normalizeNumber(num) {
  if (!num) return '';
  let clean = String(num).replace(/[^0-9]/g, '');
  if (clean.startsWith('0')) clean = '62' + clean.slice(1);
  return clean;
}

function jidToNumber(jid) {
  if (!jid || typeof jid !== 'string') return '';
  return jid.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
}

function toJid(num) {
  return `${normalizeNumber(num)}@s.whatsapp.net`;
}

async function resolveParticipantNumber(sock, chatJid, participantJid) {
  if (!participantJid) return '';
  const directNum = jidToNumber(participantJid);
  if (!directNum) return '';

  if (participantJid.endsWith('@lid') && isGroupJid(chatJid)) {
    try {
      const meta = await getCachedGroupMetadata(sock, chatJid);
      if (meta && Array.isArray(meta.participants)) {
        const found = meta.participants.find(
          (p) => p.id === participantJid || p.lid === participantJid
        );
        if (found && found.id && !found.id.endsWith('@lid')) {
          return normalizeNumber(jidToNumber(found.id));
        }
      }
    } catch (_) {}
  }
  return normalizeNumber(directNum);
}

async function repostDeletedMedia(sock, targetJid, deleted, caption, mentionJids) {
  const filePath = deleted.mediaPath;
  const mime = deleted.mimetype || '';
  const buffer = fs.readFileSync(filePath);

  if (mime.startsWith('image/')) {
    await sock.sendMessage(targetJid, {
      image: buffer,
      caption,
      mentions: mentionJids,
    });
  } else if (mime.startsWith('video/')) {
    await sock.sendMessage(targetJid, {
      video: buffer,
      caption,
      mentions: mentionJids,
    });
  } else if (mime.startsWith('audio/')) {
    if (caption) {
      await sock.sendMessage(targetJid, { text: caption, mentions: mentionJids });
    }
    await sock.sendMessage(targetJid, {
      audio: buffer,
      mimetype: mime,
      ptt: Boolean(deleted.ptt),
    });
  } else if (mime.includes('webp') || deleted.mediaType === 'sticker') {
    if (caption) {
      await sock.sendMessage(targetJid, { text: caption, mentions: mentionJids });
    }
    await sock.sendMessage(targetJid, {
      sticker: buffer,
    });
  } else {
    await sock.sendMessage(targetJid, {
      document: buffer,
      mimetype: mime,
      fileName: deleted.fileName || path.basename(filePath),
      caption,
      mentions: mentionJids,
    });
  }
}

function handleMessagesUpdate(sock) {
  sock.ev.on('messages.update', async (updates) => {
    for (const update of updates) {
      try {
        const chatJid = update.key?.remoteJid;
        if (!chatJid) continue;

        // Deteksi apakah pesan yang di-revoke adalah copy status broadcast
        const isRevokedCheck = update.update?.message === null || update.update?.messageStubType === 1;
        const protoTypeCheck = update.update?.message?.protocolMessage?.type;
        if (isRevokedCheck || protoTypeCheck === 0) {
          const targetMsgId = update.key?.id;
          if (targetMsgId) {
            const instId = process.env.INSTANCE_ID || 'primary';
            const revokedStory = storyManager.findStoryByMessageId(targetMsgId, instId);
            if (revokedStory && revokedStory.status === 'active') {
              console.log(`[STORY] 🗑️ Mendeteksi pesan status di-revoke (${targetMsgId}). Menghapus status@broadcast...`);
              try {
                await sock.sendMessage('status@broadcast', {
                  delete: {
                    remoteJid: 'status@broadcast',
                    id: revokedStory.statusKey.id,
                    fromMe: true,
                  },
                });
                storyManager.markStoryDeleted(revokedStory.id, instId);
              } catch (delRevErr) {
                console.error('[STORY] Gagal auto-delete status broadcast dari revoke:', delRevErr.message);
              }
            }
          }
        }

        if (update.key?.fromMe) continue;

        const myJid = sock.user?.id ? jidNormalizedUser(sock.user.id) : null;
        const myNum = myJid ? myJid.replace(/[^0-9]/g, '') : '';
        if (myNum && update.key?.participant && (update.key.participant.includes(myNum) || update.key.participant === myJid)) {
          continue;
        }

        const isRevoked = update.update?.message === null || update.update?.messageStubType === 1;
        const protocolType = update.update?.message?.protocolMessage?.type;

        if (isRevoked || protocolType === 0) {
          const antideleteOn = isGroupJid(chatJid)
            ? Boolean(getGroup(chatJid)?.allowed && getGroup(chatJid)?.antidelete)
            : Boolean(getChatSettings(chatJid)?.antidelete);

          if (!antideleteOn) continue;

          const deleted = antidelete.findDeleted(chatJid, update.key.id);
          if (!deleted) continue;

          if (deleted.fromMe) {
            antidelete.cleanupAfterRepost(chatJid, update.key.id);
            continue;
          }

          // 1. Resolve identitas pengirim (LID-safe)
          const senderNumber = isGroupJid(chatJid)
            ? await resolveParticipantNumber(sock, chatJid, deleted.participant)
            : normalizeNumber(jidToNumber(chatJid));

          if (myNum && (senderNumber === myNum || deleted.participant?.includes(myNum))) {
            antidelete.cleanupAfterRepost(chatJid, update.key.id);
            continue;
          }

          // 2. Resolve nama & identitas grup asal
          let groupSubject = 'Chat Pribadi';
          if (isGroupJid(chatJid)) {
            try {
              const meta = await getCachedGroupMetadata(sock, chatJid);
              if (meta?.subject) groupSubject = meta.subject;
            } catch (_) {
              const g = getGroup(chatJid);
              if (g?.name || g?.subject) groupSubject = g.name || g.subject;
            }
          }

          // 3. Deteksi Virtex / Crash Text
          const isVirtext = Boolean(
            deleted.isVirtext ||
            antidelete.isVirtextMessage(update.key.id) ||
            looksLikeVirtex(deleted.text || '')
          );

          // 4. Resolve Output Routing untuk Anti-Delete
          const commandOverrides = getCommandOverrides();
          const customFeatures = getCustomFeatures();
          const antideleteRouting = commandOverrides['antidelete']?.outputRouting || customFeatures['antidelete']?.outputRouting || { mode: 'inplace' };

          let repostTargetJid = chatJid;
          let isRedirected = false;

          if (antideleteRouting && antideleteRouting.mode && antideleteRouting.mode !== 'inplace') {
            if (antideleteRouting.mode === 'self') {
              const selfNum = contactsManager.normalizePhoneNumber(config.ownerNumber) || (sock.user?.id ? jidNormalizedUser(sock.user.id).split('@')[0] : null);
              if (selfNum) {
                repostTargetJid = `${selfNum}@s.whatsapp.net`;
                isRedirected = true;
              }
            } else if (antideleteRouting.mode === 'friend' && antideleteRouting.destination) {
              const friendNum = contactsManager.normalizePhoneNumber(antideleteRouting.destination);
              if (friendNum) {
                repostTargetJid = `${friendNum}@s.whatsapp.net`;
                isRedirected = true;
              }
            } else if (antideleteRouting.mode === 'group') {
              const dest = String(antideleteRouting.destination || 'vault').toLowerCase().trim();
              const ecoData = botEcosystemGroups.getSavedData();
              if (dest === 'vault' || !dest) {
                if (ecoData.groups?.vault?.jid) {
                  repostTargetJid = ecoData.groups.vault.jid;
                  isRedirected = true;
                }
              } else if (ecoData.groups && ecoData.groups[dest] && ecoData.groups[dest].jid) {
                repostTargetJid = ecoData.groups[dest].jid;
                isRedirected = true;
              } else if (antideleteRouting.destination && antideleteRouting.destination.includes('@g.us')) {
                repostTargetJid = antideleteRouting.destination.trim();
                isRedirected = true;
              } else if (ecoData.groups?.vault?.jid) {
                repostTargetJid = ecoData.groups.vault.jid;
                isRedirected = true;
              }
            }
          }

          const mentionJids = senderNumber ? [toJid(senderNumber)] : [];
          const timeStr = deleted.timestamp ? new Date(deleted.timestamp).toLocaleTimeString('id-ID') : new Date().toLocaleTimeString('id-ID');

          // Netralkan jika terdeteksi virtex
          if (isVirtext) {
            const virtexShieldNotice =
              `🛡️ *[ANTI-DELETE x ANTI-VIRTEX SHIELD]*\n` +
              `──────────────────────────────\n` +
              (isGroupJid(chatJid) ? `🏢 *Grup Asal:* ${groupSubject}\n🆔 *Group JID:* ${chatJid}\n` : '') +
              `👤 *Pengirim:* @${senderNumber || 'seseorang'}\n` +
              `⏰ *Waktu:* ${timeStr} WIB\n` +
              `⚠️ *Status:* Pesan yang dihapus terdeteksi sebagai *VIRTEX / SPAM-CRASH TEXT*!\n` +
              `🔒 *Aksi Keamanan:* Konten mentah dinetralkan demi keselamatan aplikasi WhatsApp.\n` +
              `──────────────────────────────`;

            await sock.sendMessage(repostTargetJid, {
              text: virtexShieldNotice,
              mentions: mentionJids,
            });

            antidelete.cleanupAfterRepost(chatJid, update.key.id);
            continue;
          }

          // Format pesan repost / laporan
          let reportCaption = '';
          if (isRedirected) {
            const typeStr = deleted.mediaType ? deleted.mediaType.toUpperCase() : 'TEKS';
            const msgContent = deleted.text ? `\n📝 *Isi Pesan:*\n${deleted.text}` : '';
            reportCaption =
              `👁️ *[LAPORAN PESAN TERHAPUS]*\n` +
              `──────────────────────────────\n` +
              `🏢 *Grup Asal:* ${groupSubject}\n` +
              `🆔 *Group JID:* ${chatJid}\n` +
              `👤 *Pengirim:* @${senderNumber || 'seseorang'}\n` +
              `⏰ *Waktu:* ${timeStr} WIB\n` +
              `📦 *Tipe:* ${typeStr}\n` +
              `──────────────────────────────` +
              msgContent;
          } else {
            const label = deleted.text || (deleted.mediaType ? `[${deleted.mediaType}]` : '[pesan tidak diketahui]');
            reportCaption = `👁️ Pesan dari @${senderNumber || 'seseorang'} dihapus:\n${label}`;
          }

          if (deleted.mediaPath && fs.existsSync(deleted.mediaPath)) {
            await repostDeletedMedia(sock, repostTargetJid, deleted, reportCaption, mentionJids);
          } else {
            await sock.sendMessage(repostTargetJid, {
              text: reportCaption,
              mentions: mentionJids,
            });
          }

          antidelete.cleanupAfterRepost(chatJid, update.key.id);
        }
      } catch (err) {
        console.error('[antidelete] Gagal proses messages.update:', err.message);
      }
    }
  });
}

module.exports = {
  handleMessagesUpdate,
  repostDeletedMedia,
  resolveParticipantNumber,
};
