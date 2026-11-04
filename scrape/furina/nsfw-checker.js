// ./scrape/nsfw-checker.js
const axios = require('axios');
const FormData = require('form-data');

async function nsfwchecker(buffer) {
    try {
        if (!Buffer.isBuffer(buffer)) {
            throw new Error('Image must be a buffer.');
        }

        const form = new FormData();
        form.append('file', buffer, `${Date.now()}.jpg`);

        const { data } = await axios.post(
            'https://www.nyckel.com/v1/functions/o2f0jzcdyut2qxhu/invoke',
            form,
            { headers: form.getHeaders() }
        );

        return data;
    } catch (error) {
        throw new Error(error.message);
    }
}

module.exports = nsfwchecker;
