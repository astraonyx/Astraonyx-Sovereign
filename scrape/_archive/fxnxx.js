const axios = require('axios');
async function fakeXnxx(name, quote) {
    try {
        const { data } = await axios.get('https://api.siputzx.my.id/api/canvas/fake-xnxx', {
            params: {
                name: name,
                quote: quote,
                likes: Math.floor(Math.random() * 999) + 1,
                dislikes: Math.floor(Math.random() * 50),
            },
            responseType: 'arraybuffer',
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' 
            }
        });
        return data;
    } catch (e) {
        throw new Error('Gagal mengambil data dari API.');
    }
}

module.exports = { fakeXnxx };