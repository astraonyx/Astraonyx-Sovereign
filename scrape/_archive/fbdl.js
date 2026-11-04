const axios = require('axios');
const qs = require('qs');

async function fbdl(fbUrl) {
    const url = 'https://api-wh.savefrom.co.id/api/convert';

    // Payload berdasarkan trace HTTP yang kamu berikan
    const data = qs.stringify({
        'sf_url': fbUrl,
        'ts': Date.now(),
        '_ts': Date.now() - 300000, // Simulasi timestamp 5 menit sebelumnya
        '_tsc': 0
        // Catatan: Parameter '_s' (yang berisi hash 64 karakter) saya hilangkan 
        // karena biasanya API mirror Savefrom mengizinkan request tanpa hash tersebut.
    });

    const headers = {
        'Host': 'api-wh.savefrom.co.id',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:153.0) Gecko/20100101 Firefox/153.0',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'id,en-US;q=0.9,en;q=0.8',
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
        'Origin': 'https://savefrom.co.id',
        'Referer': 'https://savefrom.co.id/',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-site'
    };

    try {
        const response = await axios.post(url, data, { headers });
        const json = response.data;

        // Validasi jika JSON error atau URL tidak ditemukan
        if (!json || !json.url || json.url.length === 0) {
            throw new Error('Video tidak ditemukan. Pastikan link bersifat publik.');
        }

        let hdLink = null;
        let sdLink = null;

        // Looping array 'url' dari JSON response
        json.url.forEach(video => {
            if (video.subname === '720p' || (video.subname && video.subname.toLowerCase().includes('hd'))) {
                hdLink = video.url;
            } else if (video.subname === 'SD' || video.subname === '360p') {
                sdLink = video.url;
            }
        });

        // Fallback: Jika labelnya beda, ambil urutan dari array (priority)
        if (!hdLink && json.url.length > 0) hdLink = json.url[0].url;
        if (!sdLink && json.url.length > 1) sdLink = json.url[1].url;

        return {
            status: 'success',
            original_url: fbUrl,
            meta: {
                title: json.meta?.title || 'Facebook Video',
                duration: json.meta?.duration || 'Tidak diketahui',
                thumbnail: json.thumb || ''
            },
            links: {
                hd: hdLink,
                sd: sdLink
            }
        };

    } catch (error) {
        if (error.response && error.response.status === 403) {
            throw new Error('API menolak request (403 Forbidden). API mungkin mewajibkan parameter "_s" (Token Hash).');
        }
        throw new Error(error.message);
    }
}

module.exports = { fbdl };