const crypto = require('crypto').webcrypto || globalThis.crypto;

class SnapAny {
  static #secretKey = 'snapany';

  static #generateHeaders(url, locale) {
    const timestamp = Date.now();
    const data = url + locale + timestamp;
    const encoder = new TextEncoder();
    return crypto.subtle
      .importKey(
        'raw',
        encoder.encode(this.#secretKey),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      )
      .then(key =>
        crypto.subtle.sign('HMAC', key, encoder.encode(data))
      )
      .then(signature => {
        const hex = Array.from(new Uint8Array(signature))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
        return {
          'Accept-Language': locale,
          'G-Timestamp': String(timestamp),
          'G-Footer': hex,
        };
      });
  }

  static async download(url, locale = 'en') {
    const headers = await this.#generateHeaders(url, locale);
    const response = await fetch('https://api.snapany.com/v1/extract/post', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
        'Referer': 'https://snapany.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
        'Sec-Ch-Ua': '"Google Chrome";v="149", "Chromium";v="149", "Not)A;Brand";v="24"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
      },
      body: JSON.stringify({ link: url }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`SnapAny API error (${response.status}): ${errorText}`);
    }

    return response.json();
  }

  static setSecretKey(key) {
    this.#secretKey = key;
  }
}

module.exports = SnapAny;