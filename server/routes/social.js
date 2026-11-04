// server/routes/social.js — Social Network, Posts, Stories, E2EE DMs & Friends
const express = require('express');
const fs = require('fs');
const {
  authenticateToken,
  requireWriteAccess,
  requireRole,
  normalizeRole,
  getRoleInfo,
  readUsers,
} = require('../auth');
const { broadcastWs } = require('../wsServer');
const {
  friendQueries,
  socialQueries,
  storyQueries,
  dmQueries,
  userQueries,
} = require('../db');
const {
  resolveGoogleDriveUrl,
  saveLocalMedia,
  uploadToGoogleDrive,
  getStorageStatus,
} = require('../gdriveStorage');
const {
  encryptE2EE,
  decryptE2EE,
  getConversationId,
  createEncryptedBackupBlob,
} = require('../e2eeService');
const spotifyService = require('../spotifyService');
const { upload } = require('../uploadMiddleware');

const socialRouter = express.Router();
const friendsRouter = express.Router();

// ==================== FRIENDS ROUTER (/api/friends) ====================

// Daftar teman & permintaan masuk
friendsRouter.get('/list', authenticateToken, (req, res) => {
  try {
    const friends = friendQueries.getFriendsList(req.user.id);
    const pending = friendQueries.getPendingIncoming(req.user.id);
    res.json({ success: true, friends, pending });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Kirim permintaan pertemanan
friendsRouter.post('/request', authenticateToken, (req, res) => {
  try {
    const { targetUsername } = req.body;
    if (!targetUsername) return res.status(400).json({ success: false, error: 'Target username wajib diisi.' });
    const users = readUsers();
    const targetUser = users.find(u => u.username.toLowerCase() === targetUsername.trim().toLowerCase());
    if (!targetUser) return res.status(404).json({ success: false, error: `Pengguna '${targetUsername}' tidak ditemukan.` });
    if (targetUser.id === req.user.id) return res.status(400).json({ success: false, error: 'Tidak dapat menambahkan diri sendiri sebagai teman.' });

    const result = friendQueries.sendRequest(req.user.id, targetUser.id);
    broadcastWs('FRIEND_REQUEST', {
      toUserId: targetUser.id,
      fromUsername: req.user.username,
      message: `${req.user.username} mengirim permintaan pertemanan!`,
    }, { to: [targetUser.id] });
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Respon permintaan pertemanan
friendsRouter.post('/respond', authenticateToken, (req, res) => {
  try {
    const { senderId, accept } = req.body;
    if (!senderId) return res.status(400).json({ success: false, error: 'senderId wajib diisi.' });
    const result = friendQueries.respondRequest(req.user.id, senderId, Boolean(accept));
    if (accept) {
      broadcastWs('FRIEND_ACCEPTED', {
        u1: req.user.id,
        u2: senderId,
      }, { to: [req.user.id, senderId] });
    }
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Cari calon teman
friendsRouter.get('/search', authenticateToken, (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) return res.json({ success: true, users: [] });
    const results = userQueries.search.all(`%${q}%`, `%${q}%`);
    const sanitized = results
      .filter(u => u.id !== req.user.id)
      .map(u => ({
        id: u.id,
        username: u.username,
        displayName: u.display_name || u.username,
        avatarUrl: u.avatar_url || '',
        bio: u.bio || '',
        role: normalizeRole(u.role),
        tierInfo: getRoleInfo(u.role),
        isFriend: friendQueries.areFriends(req.user.id, u.id),
      }));
    res.json({ success: true, users: sanitized });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== SOCIAL ROUTER (/api/social) ====================

// Ambil postingan medsos
socialRouter.get('/posts', (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const postType = req.query.type || 'all';
    const posts = socialQueries.getAll(limit, postType);
    const parsed = posts.map(p => {
      let likes = [];
      let comments = [];
      let reposts = [];
      let bookmarks = [];
      let extraData = {};
      try { likes = JSON.parse(p.likes_json || '[]'); } catch (_) {}
      try { comments = JSON.parse(p.comments_json || '[]'); } catch (_) {}
      try { reposts = JSON.parse(p.reposts_json || '[]'); } catch (_) {}
      try { bookmarks = JSON.parse(p.bookmarks_json || '[]'); } catch (_) {}
      try { extraData = JSON.parse(p.extra_data_json || '{}'); } catch (_) {}
      return {
        id: p.id,
        authorId: p.author_id,
        authorUsername: p.author_username,
        authorDisplayName: p.author_display_name,
        authorAvatarUrl: p.author_avatar_url,
        authorRole: p.author_role,
        content: p.content,
        mediaUrl: p.media_url,
        postType: p.post_type || 'post',
        extraData,
        likes,
        likesCount: likes.length,
        comments,
        commentsCount: comments.length,
        reposts,
        repostsCount: reposts.length,
        bookmarks,
        bookmarksCount: bookmarks.length,
        createdAt: p.created_at,
      };
    });
    res.json({ success: true, posts: parsed });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Buat postingan baru
socialRouter.post('/posts', authenticateToken, requireWriteAccess, (req, res) => {
  try {
    const { content, mediaUrl, postType = 'post', extraData = {} } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, error: 'Konten postingan tidak boleh kosong.' });
    }
    const users = readUsers();
    const currentUser = users.find(u => u.id === req.user.id);
    const postId = 'post_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);

    const postObj = {
      id: postId,
      authorId: req.user.id,
      authorUsername: req.user.username,
      authorDisplayName: currentUser ? (currentUser.displayName || currentUser.username) : req.user.username,
      authorAvatarUrl: currentUser ? (currentUser.avatarUrl || '') : '',
      authorRole: req.user.role,
      content: content.trim(),
      mediaUrl: mediaUrl || '',
      postType,
      extraData,
    };

    socialQueries.create(postObj);
    broadcastWs('SOCIAL_NEW_POST', { ...postObj, likes: [], comments: [], reposts: [], bookmarks: [], createdAt: new Date().toISOString() });
    res.json({ success: true, post: postObj });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Like postingan
socialRouter.post('/posts/:id/like', authenticateToken, (req, res) => {
  try {
    const result = socialQueries.toggleLike(req.params.id, req.user.username);
    broadcastWs('SOCIAL_LIKE_UPDATE', { postId: req.params.id, ...result, username: req.user.username });
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Repost
socialRouter.post('/posts/:id/repost', authenticateToken, (req, res) => {
  try {
    const result = socialQueries.toggleRepost(req.params.id, req.user.username);
    broadcastWs('SOCIAL_REPOST_UPDATE', { postId: req.params.id, ...result, username: req.user.username });
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Bookmark
socialRouter.post('/posts/:id/bookmark', authenticateToken, (req, res) => {
  try {
    const result = socialQueries.toggleBookmark(req.params.id, req.user.username);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Vote Polling
socialRouter.post('/posts/:id/vote', authenticateToken, (req, res) => {
  try {
    const { optionIndex } = req.body;
    if (typeof optionIndex !== 'number') return res.status(400).json({ success: false, error: 'Pilihan polling tidak valid.' });
    const result = socialQueries.votePoll(req.params.id, req.user.username, optionIndex);
    broadcastWs('SOCIAL_POLL_UPDATE', { postId: req.params.id, poll: result.poll });
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Komentar
socialRouter.post('/posts/:id/comment', authenticateToken, requireWriteAccess, (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ success: false, error: 'Komentar tidak boleh kosong.' });
    const users = readUsers();
    const currentUser = users.find(u => u.id === req.user.id);
    const result = socialQueries.addComment(req.params.id, {
      authorUsername: req.user.username,
      authorDisplayName: currentUser ? (currentUser.displayName || currentUser.username) : req.user.username,
      authorAvatarUrl: currentUser ? (currentUser.avatarUrl || '') : '',
      commentText: text.trim(),
    });
    broadcastWs('SOCIAL_COMMENT_UPDATE', { postId: req.params.id, ...result });
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Stories (Instagram Style 24h Status)
socialRouter.get('/stories', (req, res) => {
  try {
    const stories = storyQueries.getActive();
    res.json({ success: true, stories });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

socialRouter.post('/stories', authenticateToken, requireWriteAccess, (req, res) => {
  try {
    const { mediaUrl, textContent, bgGradient, soundTitle, soundArtist, soundAudioUrl } = req.body;
    if (!mediaUrl && !textContent) {
      return res.status(400).json({ success: false, error: 'Story harus memiliki teks atau foto/video.' });
    }
    const users = readUsers();
    const currentUser = users.find(u => u.id === req.user.id);
    const storyId = 'story_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);

    const storyObj = {
      id: storyId,
      authorId: req.user.id,
      authorUsername: req.user.username,
      authorDisplayName: currentUser ? (currentUser.displayName || currentUser.username) : req.user.username,
      authorAvatarUrl: currentUser ? (currentUser.avatarUrl || '') : '',
      mediaUrl: mediaUrl || '',
      textContent: textContent || '',
      bgGradient: bgGradient || 'linear-gradient(135deg, #ec4899, #8b5cf6)',
      soundTitle: soundTitle || '',
      soundArtist: soundArtist || '',
      soundAudioUrl: soundAudioUrl || '',
    };

    storyQueries.create(storyObj);
    broadcastWs('SOCIAL_NEW_STORY', storyObj);
    res.json({ success: true, story: storyObj });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Sound search
socialRouter.get('/sounds/search', async (req, res) => {
  try {
    const q = req.query.q || '';
    const sounds = await spotifyService.searchMusic(q);
    res.json({ success: true, sounds });
  } catch (err) {
    res.json({ success: true, sounds: spotifyService.DEFAULT_POPULAR_SOUNDS });
  }
});

// Trending
socialRouter.get('/trending', (req, res) => {
  try {
    const trending = [
      { tag: '#PolarisBotV6', postsCount: 142, category: 'Teknologi' },
      { tag: '#ChessMaster', postsCount: 98, category: 'Games & Arcade' },
      { tag: '#HermesAI', postsCount: 87, category: 'Artificial Intelligence' },
      { tag: '#MoriDownloader', postsCount: 64, category: 'Tools' },
      { tag: '#AstraonyxCosmic', postsCount: 52, category: 'Komunitas' },
    ];
    res.json({ success: true, trending });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Upload media untuk postingan, story, dsb.
socialRouter.post('/upload', authenticateToken, requireWriteAccess, upload.single('mediaFile'), async (req, res) => {
  try {
    let fileBuffer = null;
    let originalName = 'media.bin';
    let mimeType = 'application/octet-stream';

    if (req.file) {
      fileBuffer = fs.readFileSync(req.file.path);
      originalName = req.file.originalname || req.file.filename;
      mimeType = req.file.mimetype || '';
    } else if (req.body && req.body.base64) {
      const base64Data = req.body.base64.replace(/^data:[a-zA-Z0-9/+-]+;base64,/, '');
      fileBuffer = Buffer.from(base64Data, 'base64');
      originalName = req.body.filename || `media_${Date.now()}.png`;
      mimeType = req.body.mimeType || 'image/png';
    } else if (req.body && req.body.gdriveUrl) {
      const directUrl = resolveGoogleDriveUrl(req.body.gdriveUrl);
      return res.json({
        success: true,
        url: directUrl,
        gdriveUrl: directUrl,
        isGdrive: true,
        mediaType: req.body.mediaType || 'image',
      });
    } else {
      return res.status(400).json({ success: false, error: 'Tidak ada file media yang diunggah.' });
    }

    const isVideo = mimeType.startsWith('video/') || originalName.match(/\.(mp4|webm|mov|mkv)$/i);
    const mediaType = isVideo ? 'video' : 'image';

    const gdriveResult = await uploadToGoogleDrive(fileBuffer, originalName, mimeType);
    const localResult = saveLocalMedia(fileBuffer, originalName, mimeType);
    const finalUrl = gdriveResult && gdriveResult.success ? gdriveResult.gdriveUrl : localResult.localUrl;

    res.json({
      success: true,
      url: finalUrl,
      localUrl: localResult.localUrl,
      gdriveUrl: gdriveResult && gdriveResult.success ? gdriveResult.gdriveUrl : '',
      isGdrive: Boolean(gdriveResult && gdriveResult.success),
      mediaType,
      filename: localResult.filename,
      size: fileBuffer.length,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Google Drive Storage Status
socialRouter.get('/storage-status', (req, res) => {
  try {
    const status = getStorageStatus();
    res.json({ success: true, ...status });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Google Drive Config
socialRouter.post('/gdrive-config', authenticateToken, requireRole(['cosmos']), (req, res) => {
  try {
    const { folderId, accessToken } = req.body || {};
    if (folderId) process.env.GOOGLE_DRIVE_FOLDER_ID = folderId;
    if (accessToken) process.env.GOOGLE_DRIVE_ACCESS_TOKEN = accessToken;
    res.json({ success: true, message: 'Konfigurasi Google Drive berhasil disimpan!' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// E2EE Direct Messages: Conversations
socialRouter.get('/dm/conversations', authenticateToken, (req, res) => {
  try {
    const rawChats = dmQueries.getRecentChats(req.user.username);
    const users = readUsers();

    const conversations = rawChats.map(c => {
      const isSender = c.sender_username.toLowerCase() === req.user.username.toLowerCase();
      const otherUsername = isSender ? c.recipient_username : c.sender_username;
      const otherUser = users.find(u => u.username.toLowerCase() === otherUsername.toLowerCase());
      const decryptedPreview = decryptE2EE(c.ciphertext, c.iv, c.tag, req.user.username, otherUsername);

      return {
        id: c.conversation_id,
        otherUsername,
        otherDisplayName: otherUser ? (otherUser.displayName || otherUser.username) : otherUsername,
        otherAvatarUrl: otherUser ? (otherUser.avatarUrl || '') : '',
        otherRole: otherUser ? otherUser.role : 'member',
        lastMessage: decryptedPreview.length > 50 ? decryptedPreview.slice(0, 50) + '...' : decryptedPreview,
        lastMediaUrl: c.media_url || '',
        lastMediaType: c.media_type || '',
        unread: !isSender && c.is_read === 0,
        createdAt: c.created_at,
      };
    });

    const totalUnread = dmQueries.getUnreadCount(req.user.username);
    res.json({ success: true, conversations, totalUnread });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// E2EE Direct Messages: Detail percakapan
socialRouter.get('/dm/:otherUsername', authenticateToken, (req, res) => {
  try {
    const { otherUsername } = req.params;
    const conversationId = getConversationId(req.user.username, otherUsername);
    const rawMessages = dmQueries.getConversation(conversationId, 150);

    dmQueries.markRead(conversationId, req.user.username);

    const decryptedMessages = rawMessages.map(m => {
      const text = decryptE2EE(m.ciphertext, m.iv, m.tag, req.user.username, otherUsername);
      return {
        id: m.id,
        conversationId: m.conversation_id,
        senderUsername: m.sender_username,
        recipientUsername: m.recipient_username,
        isMine: m.sender_username.toLowerCase() === req.user.username.toLowerCase(),
        text,
        mediaUrl: m.media_url || '',
        mediaType: m.media_type || '',
        isRead: m.is_read === 1,
        createdAt: m.created_at,
      };
    });

    res.json({ success: true, conversationId, messages: decryptedMessages });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// E2EE Direct Messages: Kirim pesan
socialRouter.post('/dm/:otherUsername', authenticateToken, requireWriteAccess, (req, res) => {
  try {
    const { otherUsername } = req.params;
    const { text, mediaUrl = '', mediaType = '' } = req.body || {};

    if (!text && !mediaUrl) {
      return res.status(400).json({ success: false, error: 'Pesan atau media tidak boleh kosong.' });
    }

    const conversationId = getConversationId(req.user.username, otherUsername);
    const encrypted = encryptE2EE(text || '', req.user.username, otherUsername);
    const msgId = 'dm_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);

    const msgObj = {
      id: msgId,
      conversationId,
      senderId: req.user.id,
      senderUsername: req.user.username,
      recipientId: otherUsername,
      recipientUsername: otherUsername,
      ciphertext: encrypted.ciphertext,
      iv: encrypted.iv,
      tag: encrypted.tag,
      mediaUrl,
      mediaType,
    };

    dmQueries.saveMessage(msgObj);

    broadcastWs('SOCIAL_DM_NEW', {
      conversationId,
      senderUsername: req.user.username,
      recipientUsername: otherUsername,
      messageId: msgId,
      createdAt: new Date().toISOString(),
    }, { to: [req.user.id, otherUsername] });

    res.json({
      success: true,
      message: {
        id: msgId,
        conversationId,
        senderUsername: req.user.username,
        recipientUsername: otherUsername,
        isMine: true,
        text,
        mediaUrl,
        mediaType,
        isRead: false,
        createdAt: new Date().toISOString(),
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// E2EE Direct Messages: Backup terenkripsi ke Google Drive
socialRouter.post('/dm/backup-to-gdrive', authenticateToken, async (req, res) => {
  try {
    const allMessages = dmQueries.getAllUserMessages(req.user.username);
    const backupBlob = createEncryptedBackupBlob(req.user.username, allMessages);
    const backupJson = JSON.stringify(backupBlob, null, 2);
    const filename = `vault_e2ee_${req.user.username}_${Date.now()}.enc`;

    const gdrive = await uploadToGoogleDrive(Buffer.from(backupJson), filename, 'application/octet-stream');

    res.json({
      success: true,
      filename,
      totalMessages: allMessages.length,
      isGdrive: Boolean(gdrive && gdrive.success),
      gdriveUrl: gdrive && gdrive.success ? gdrive.gdriveUrl : '',
      backupBlob,
      message: gdrive && gdrive.success
        ? 'Cadangan terenkripsi E2EE berhasil disimpan ke Google Drive!'
        : 'Cadangan terenkripsi E2EE berhasil dibuat (Siap diunduh / disimpan di localhost)!'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = {
  socialRouter,
  friendsRouter,
};
