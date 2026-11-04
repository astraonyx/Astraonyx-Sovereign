const axios = require('axios')
const crypto = require('crypto')

function isSpotifyUrl(url) {
  return /https:\/\/open\.spotify\.com\/.*\/\w+/i.test(url)
}

async function getAccessToken() {
  const client_id = 'acc6302297e040aeb6e4ac1fbdfd62c3'
  const client_secret = '0e8439a1280a43aba9a5bc0a16f3f009'

  const basic = Buffer.from(`${client_id}:${client_secret}`).toString('base64')

  const { data } = await axios.post(
    'https://accounts.spotify.com/api/token',
    'grant_type=client_credentials',
    {
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }
  )

  return data.access_token
}

async function searchSpotify(query) {
  const token = await getAccessToken()

  const { data } = await axios.get(
    'https://api.spotify.com/v1/search',
    {
      params: {
        q: query,
        type: 'track',
        limit: 10
      },
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  )

  return data.tracks.items.map(item => ({
    title: item.name,
    artist: item.artists.map(a => a.name).join(', '),
    link: item.external_urls.spotify,
    thumbnail: item.album.images[0]?.url
  }))
}

async function spotifyDownload(url) {
  const client = axios.create({
    baseURL: 'https://spotisongdownloader.to',
    headers: {
      'Accept-Encoding': 'gzip, deflate, br',
      'Content-Type': 'application/x-www-form-urlencoded',
      referer: 'https://spotisongdownloader.to',
      cookie: `PHPSESSID=${crypto.randomBytes(16).toString('hex')}`
    }
  })

  const { data: meta } = await client.get(
    '/api/composer/spotify/xsingle_track.php',
    { params: { url } }
  )

  await client.post('/track.php')

  const { data: dl } = await client.post(
    '/api/composer/spotify/ssdw23456ytrfds.php',
    new URLSearchParams({
      url,
      zip_download: 'false',
      quality: 'm4a'
    }).toString()
  )

  if (!dl || !dl.dlink)
    throw new Error('Download link tidak ditemukan')

  return {
    title: meta.song_name,
    artist: meta.artist,
    cover: meta.img,
    download: dl.dlink,
    source: url
  }
}

module.exports = {
  isSpotifyUrl,
  searchSpotify,
  spotifyDownload
}