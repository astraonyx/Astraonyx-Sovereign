const https = require('https');
const dns = require('dns');
const querystring = require('querystring');
dns.setServers(['8.8.8.8', '1.1.1.1']);
function customLookup(hostname, opts, callback) {
    dns.resolve4(hostname, (err, addresses) => {
        if (err || !addresses || addresses.length === 0) {
            dns.lookup(hostname, opts, callback);
        } else {
            if (opts.all) {
                callback(null, addresses.map(ip => ({ address: ip, family: 4 })));
            } else {
                callback(null, addresses[0], 4);
            }
        }
    });
}
function makeRequest(urlStr, method, headers = {}, body = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(urlStr);
        const options = {
            hostname: url.hostname,
            port: url.port || (url.protocol === 'https:' ? 443 : 80),
            path: url.pathname + url.search,
            method: method,
            lookup: customLookup,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                ...headers
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: data
                });
            });
        });

        req.on('error', reject);
        if (body) req.write(body);
        req.end();
    });
}
function extractVideoId(url) {
    if (url.length === 11 && /^[\w-]+$/.test(url)) return url;
    const match = url.match(/(?:youtube\.com\/(?:watch\?.*v=|embed\/|v\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
    return match ? match[1] : null;
}
function fetchMetadata(videoId) {
    return new Promise((resolve) => {
        const oembedUrl = `[https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=$](https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=$){videoId}&format=json`;
        makeRequest(oembedUrl, 'GET')
            .then((res) => {
                if (res.statusCode === 200) {
                    try {
                        const data = JSON.parse(res.body);
                        resolve({
                            title: data.title || '',
                            thumbnail: data.thumbnail_url || `[https://i.ytimg.com/vi/$](https://i.ytimg.com/vi/$){videoId}/hqdefault.jpg`
                        });
                    } catch (e) {
                        resolve({ title: '', thumbnail: `[https://i.ytimg.com/vi/$](https://i.ytimg.com/vi/$){videoId}/hqdefault.jpg` });
                    }
                } else {
                    resolve({ title: '', thumbnail: `[https://i.ytimg.com/vi/$](https://i.ytimg.com/vi/$){videoId}/hqdefault.jpg` });
                }
            })
            .catch(() => {
                resolve({ title: '', thumbnail: `[https://i.ytimg.com/vi/$](https://i.ytimg.com/vi/$){videoId}/hqdefault.jpg` });
            });
    });
}