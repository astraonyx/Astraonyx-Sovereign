const crypto = require('crypto');
const axios = require('axios');

const CONFIG = {
    BASE_URL: 'https://ytb.rip',
    API_URL: 'https://ytb.rip/api/convert',
    CONFIG_TS: 1771534846328,
    HASH_SECRET: 'c7d6fe8b7a87fd4129f36353253e4696b7ca4768d84a5cf5a3432775758ad5d2',
    HEADERS: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Mobile Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'id,en-US;q=0.9,en;q=0.8',
        'Origin': 'https://ytb.rip',
        'Referer': 'https://ytb.rip/',
    }
};

const ytbrip = {
    _generatePayload: (url) => {
        const ts = Date.now();
        const hash = crypto.createHash('sha256').update(url + ts + CONFIG.HASH_SECRET).digest('hex');
        return {
            sf_url: url,
            ts: String(ts),
            _ts: String(CONFIG.CONFIG_TS),
            _tsc: '0',
            _s: hash
        };
    },

    _resolveConverter: async (convUrl) => {
        const res = await axios.get(convUrl + '&popup=true', {
            headers: { ...CONFIG.HEADERS, 'Referer': 'https://ytb.rip/' }
        });
        const task = res.data?.task;
        if (task?.status === 'finished' && task?.downloadUrl) return task.downloadUrl;

        const res2 = await axios.get(convUrl, {
            headers: { ...CONFIG.HEADERS, 'Referer': 'https://ytb.rip/' },
            maxRedirects: 0,
            validateStatus: s => s < 400,
        });
        const loc = res2.headers?.location || '';
        const taskId = loc.match(/[?&]t=([^&]+)/)?.[1];
        if (taskId) {
            const sseRes = await axios.get(`https://du.sf-converter.com/tasks/${taskId}`, {
                headers: { 'Accept': 'text/event-stream', ...CONFIG.HEADERS, 'Referer': 'https://ytb.rip/' },
                responseType: 'stream',
            });
            for await (const chunk of sseRes.data) {
                for (const line of new TextDecoder().decode(chunk).split('\n')) {
                    if (line.startsWith('data: ')) {
                        const evt = JSON.parse(line.slice(6));
                        if (evt.status === 'finished' && evt.downloadUrl) return evt.downloadUrl;
                    }
                }
            }
        }
        if (loc.startsWith('http')) return loc;
        throw new Error('Gagal mendapatkan download URL dari converter');
    },

    getAvailable: async (videoUrl) => {
        try {
            const payload = ytbrip._generatePayload(videoUrl);
            const res = await axios.post(CONFIG.API_URL, new URLSearchParams(payload).toString(), {
                headers: { ...CONFIG.HEADERS, 'Content-Type': 'application/x-www-form-urlencoded' }
            });
            const data = res.data;
            if (!data || !data.url) return { success: false, message: 'Gagal mendapatkan data video' };

            const qualities = data.url
                .filter(u => u.downloadable || u.isConverterUI || u.audio)
                .sort((a, b) => (b.qualityNumber || +b.subname || 0) - (a.qualityNumber || +a.subname || 0))
                .map(q => {
                    let type = 'direct';
                    if (q.isConverterUI) type = 'converter';
                    else if (q.audio) type = 'audio';
                    const ext = q.audio ? (q.ext || q.type?.split(' ')[0] || 'm4a') : 'mp4';
                    return {
                        label: `${q.name} ${q.subname}`,
                        quality: q.subname,
                        type,
                        ext,
                        filesize: q.contentLength || q.filesize || null,
                    };
                });

            return {
                success: true,
                data: {
                    id: data.id,
                    title: data.meta?.title,
                    source: data.meta?.source,
                    duration: data.meta?.duration,
                    thumb: data.thumb,
                    qualities,
                }
            };
        } catch (error) {
            return { success: false, message: error.response?.data?.message || error.message };
        }
    },

    download: async (videoUrl, quality) => {
        try {
            const payload = ytbrip._generatePayload(videoUrl);
            const res = await axios.post(CONFIG.API_URL, new URLSearchParams(payload).toString(), {
                headers: { ...CONFIG.HEADERS, 'Content-Type': 'application/x-www-form-urlencoded' }
            });
            const data = res.data;
            if (!data || !data.url) return { success: false, message: 'Gagal mendapatkan data video' };

            const match = data.url
                .filter(u => u.downloadable || u.isConverterUI || u.audio)
                .find(u => (u.subname === String(quality) || u.quality === String(quality)));

            if (!match) return { success: false, message: `Kualitas ${quality} tidak tersedia` };

            let type = 'direct';
            if (match.isConverterUI) type = 'converter';
            else if (match.audio) type = 'audio';

            let downloadUrl = match.url;
            if (type === 'converter') downloadUrl = await ytbrip._resolveConverter(downloadUrl);
            const ext = match.audio ? (match.ext || match.type?.split(' ')[0] || 'm4a') : 'mp4';

            return {
                success: true,
                data: {
                    id: data.id,
                    title: data.meta?.title,
                    quality: match.subname,
                    type,
                    ext,
                    filesize: match.contentLength || match.filesize || null,
                    download_url: downloadUrl,
                }
            };
        } catch (error) {
            return { success: false, message: error.response?.data?.message || error.message };
        }
    }
};

module.exports = { ytbrip };