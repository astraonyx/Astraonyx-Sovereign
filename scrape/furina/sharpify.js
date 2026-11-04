const fs = require('fs')

const headers = {
  'User-Agent': 'okhttp/4.9.2',
  'Accept-Encoding': 'gzip'
}

const listmodel = {
  enhance: 'https://sharpify-api.vercel.app/api/enhance/auto_enhance',
  upscale: 'https://sharpify-api.vercel.app/api/enhance/upscale',
  removebg: 'https://sharpify-api.vercel.app/api/enhance/bgrem'
}

async function sharpify(img, model) {
  const form = new FormData()

  const fileBuffer = fs.readFileSync(img)

  const blob = new Blob([fileBuffer], {
    type: 'image/jpeg'
  })

  form.append('file', blob, 'source.jpg')

  const res = await fetch(listmodel[model], {
    method: 'POST',
    headers,
    body: form
  })

  return await res.json()
}

module.exports = {
  sharpify
}