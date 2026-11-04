
const crypto = require('crypto');

const CONFIG = {
    BASE_URL: 'https://tik.ninja',
    SESSION_TTL: 20000, // Diubah ke 20 detik agar tidak mudah Forbidden
    USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    HEADERS: {
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
    }
};

let _session = null;
let _sessionTimer = null;

const utils = {
    sleep: (ms) => new Promise(r => setTimeout(r, ms)),

    extractUsername: (input) => {
        return input
            .replace(/^@/, '')
            .replace(/^https?:\/\/(www\.)?tiktok\.com\/@/, '')
            .split('/')[0];
    },

    isVideoUrl: (input) => {
        const q = input.toLowerCase().trim();
        return /tiktok\.com\/@[^/]+\/video\/\d+/.test(q)
            || /^https?:\/\/(vm|vt)\.tiktok\.com\//i.test(q)
            || /^https?:\/\/www\.tiktok\.com\/t\//i.test(q)
            || /^\d{15,25}$/.test(q);
    },

    formatNumber: (n) => {
        n = parseInt(n, 10) || 0;
        if (n >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
        if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
        if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
        return n.toString();
    },

    formatVideo: (v) => ({
        id: v.id || v.video_id || '',
        description: v.desc || v.title || '',
        cover: v.cover || v.origin_cover || '',
        playUrl: v.play || '',
        duration: v.duration || 0,
        playCount: v.play_count || 0,
        diggCount: v.digg_count || 0,
        commentCount: v.comment_count || 0,
        shareCount: v.share_count || 0,
        collectCount: v.collect_count || 0,
        createTime: v.create_time || 0,
        author: v.author ? {
            uniqueId: v.author.unique_id,
            nickname: v.author.nickname,
            avatar: v.author.avatar,
        } : null,
    }),

    formatPost: (p) => {
        const obj = {
            id: p.id || p.video_id || '',
            title: p.title || '',
            description: p.desc || '',
            cover: p.cover || p.origin_cover || '',
            playUrl: p.play || '',
            images: p.images || [],
            duration: p.duration || 0,
            playCount: p.play_count || 0,
            diggCount: p.digg_count || 0,
            commentCount: p.comment_count || 0,
            shareCount: p.share_count || 0,
            collectCount: p.collect_count || 0,
            createTime: p.create_time || 0,
            author: p.author ? {
                uniqueId: p.author.unique_id,
                nickname: p.author.nickname,
                avatar: p.author.avatar,
            } : null,
        };
        if (p._play_token) obj._playToken = p._play_token;
        if (p._music_token) obj._musicToken = p._music_token;
        if (p._image_tokens) obj._imageTokens = p._image_tokens;
        return obj;
    },

    formatComment: (c) => ({
        id: c.cid || c.id || '',
        text: c.text || '',
        diggCount: c.digg_count || 0,
        createTime: c.create_time || 0,
        replyTotal: parseInt(c.reply_total, 10) || 0,
        user: c.user ? {
            uniqueId: c.user.unique_id,
            nickname: c.user.nickname,
            avatar: c.user.avatar,
        } : null,
    }),
};

async function _getSession() {
    if (_session) return _session;

    const res = await fetch(CONFIG.BASE_URL + '/', {
        headers: { 'User-Agent': CONFIG.USER_AGENT },
    });

    // FIX: Dukungan untuk semua versi Node.js (Fallback Cookie)
    let sess = null;
    if (typeof res.headers.getSetCookie === 'function') {
        const cookies = res.headers.getSetCookie();
        sess = cookies.find(c => c.startsWith('PHPSESSID='));
    } 
    
    if (!sess) {
        const rawCookie = res.headers.get('set-cookie') || res.headers.get('Set-Cookie') || '';
        const match = rawCookie.match(/PHPSESSID=([^;]+)/);
        if (match) sess = match[0];
    }

    if (!sess) throw new Error('Gagal mendapatkan session cookie');

    const html = await res.text();
    const tokenMatch = html.match(/const TOKEN = "([a-f0-9]+)"/);
    const seedMatch = html.match(/const JS_CHALLENGE_SEED = "([a-f0-9]+)"/);
    if (!tokenMatch || !seedMatch) throw new Error('Gagal mengekstrak token API');

    _session = {
        cookie: sess.split(';')[0],
        token: tokenMatch[1],
        seed: seedMatch[1],
    };

    if (_sessionTimer) clearTimeout(_sessionTimer);
    _sessionTimer = setTimeout(() => { _session = null; }, CONFIG.SESSION_TTL);

    return _session;
}

function _makeJsToken(session, action) {
    const bucket = Math.floor(Date.now() / 30000);
    const raw = `${session.seed}:${session.token}:${bucket}:${action}:tik.ninja`;
    const hash = crypto.createHash('sha256').update(raw).digest('hex');
    return { token: hash, bucket };
}

function _decryptResponse(session, data) {
    if (!data || !data._t || !data._i || !data._d) return data;

    const rawKey = `${session.seed}:${session.token}:response:tik.ninja`;
    const key = crypto.createHash('sha256').update(rawKey).digest();
    const iv = Buffer.from(data._i, 'base64');
    const encrypted = Buffer.from(data._d, 'base64');

    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return JSON.parse(decrypted.toString('utf-8'));
}

async function _call(action, params = {}) {
    const sess = await _getSession();
    const jsReq = _makeJsToken(sess, action);

    const res = await fetch(CONFIG.BASE_URL + '/api.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Api-Token': sess.token,
            'X-JS-Token': jsReq.token,
            'X-JS-Bucket': String(jsReq.bucket),
            'X-Client-Build': 'js-token-body-v3',
            'User-Agent': CONFIG.USER_AGENT,
            ...CONFIG.HEADERS,
            'Origin': CONFIG.BASE_URL,
            'Referer': CONFIG.BASE_URL + '/',
            'Cookie': sess.cookie,
        },
        body: JSON.stringify({
            ...params,
            action,
            hp: '',
            js_token: jsReq.token,
            js_bucket: String(jsReq.bucket),
            __client_build: 'js-token-body-v3',
        }),
    });

    const data = await res.json();
    const decrypted = _decryptResponse(sess, data);

    if (decrypted.error) throw new Error(decrypted.error);
    return decrypted.data;
}

const tikninja = {
    getUser: async (username) => {
        const uid = utils.extractUsername(username);
        const d = await _call('get_user', { unique_id: uid });
        return {
            id: d.user.id,
            uniqueId: d.user.uniqueId,
            nickname: d.user.nickname,
            signature: d.user.signature,
            verified: !!d.user.verified,
            avatar: d.user.avatarMedium || d.user.avatarThumb || '',
            followerCount: d.stats.followerCount,
            followingCount: d.stats.followingCount,
            heartCount: d.stats.heartCount,
            videoCount: d.stats.videoCount,
        };
    },

    getPosts: async (userId, cursor = '0', count = 20) => {
        const d = await _call('get_posts', { user_id: userId, cursor, count });
        return {
            videos: (d.videos || []).map(utils.formatVideo),
            cursor: d.cursor || '0',
            hasMore: !!d.hasMore,
        };
    },

    getAllPosts: async (userId, { delay = 1000, onPage } = {}) => {
        const allVideos = [];
        let cursor = '0';
        let hasMore = true;

        while (hasMore) {
            const page = await tikninja.getPosts(userId, cursor);
            allVideos.push(...page.videos);
            cursor = page.cursor;
            hasMore = page.hasMore;
            if (onPage) onPage(page);
            if (hasMore && delay > 0) await utils.sleep(delay);
        }

        return allVideos;
    },

    getPost: async (urlOrId) => {
        const d = await _call('get_post', { url_or_id: urlOrId });
        return utils.formatPost(d);
    },

    getComments: async (videoId, cursor = 0, count = 20) => {
        const d = await _call('get_comments', { video_id: videoId, cursor, count });
        return {
            comments: (d.comments || []).map(utils.formatComment),
            cursor: d.cursor || 0,
            hasMore: !!d.hasMore,
        };
    },

    getAllComments: async (videoId, { delay = 1000, onPage } = {}) => {
        const allComments = [];
        let cursor = 0;
        let hasMore = true;

        while (hasMore) {
            const page = await tikninja.getComments(videoId, cursor);
            allComments.push(...page.comments);
            cursor = page.cursor;
            hasMore = page.hasMore;
            if (onPage) onPage(page);
            if (hasMore && delay > 0) await utils.sleep(delay);
        }

        return allComments;
    },

    getReposts: async (uniqueId, cursor = '0', count = 20) => {
        const d = await _call('get_reposts', { unique_id: uniqueId, cursor, count });
        return {
            videos: (d.videos || []).map(utils.formatVideo),
            cursor: d.cursor || '0',
            hasMore: !!d.hasMore,
        };
    },

    getStories: async (uniqueId) => {
        const d = await _call('get_stories', { unique_id: uniqueId });
        return (d.stories || d.videos || []).map(utils.formatVideo);
    },

    getCommentReplies: async (videoId, commentId, cursor = 0, count = 20) => {
        const d = await _call('get_comment_replies', { video_id: videoId, comment_id: commentId, cursor, count });
        return {
            comments: (d.comments || []).map(utils.formatComment),
            cursor: d.cursor || 0,
            hasMore: !!d.hasMore,
        };
    },

    download: async (token, filename) => {
        const sess = await _getSession();
        const jsReq = _makeJsToken(sess, 'download');

        const res = await fetch(CONFIG.BASE_URL + '/api.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Api-Token': sess.token,
                'X-JS-Token': jsReq.token,
                'X-JS-Bucket': String(jsReq.bucket),
                'X-Client-Build': 'js-token-body-v3',
                'User-Agent': CONFIG.USER_AGENT,
                ...CONFIG.HEADERS,
                'Origin': CONFIG.BASE_URL,
                'Referer': CONFIG.BASE_URL + '/',
                'Cookie': sess.cookie,
            },
            body: JSON.stringify({
                action: 'download', token, filename, hp: '',
                js_token: jsReq.token,
                js_bucket: String(jsReq.bucket),
                __client_build: 'js-token-body-v3',
            }),
        });

        if (!res.ok) {
            let errData;
            try {
                errData = await res.json();
                errData = _decryptResponse(sess, errData);
            } catch (_) {}
            throw new Error((errData && errData.error) || `Download gagal (${res.status})`);
        }

        return Buffer.from(await res.arrayBuffer());
    }
};

// Mengirim modul ala CJS
module.exports = {
    tikninja,
    utils
};