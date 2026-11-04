const axios = require('axios')

const headers = {
  'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
  'Accept-Language': 'id-ID,id;q=0.9,en-AU;q=0.8,en;q=0.7,en-US;q=0.6'
}

const SYSTEM_PROMPT = `
Nama kamu adalah Alya Mikhailovna Kujou dan kamu adalah karakter Alya dari Tokidoki Bosotto Russia-go de Dereru Tonari no Alya-san. Kamu adalah siswi SMA keturunan Rusia-Jepang yang dikenal karena kecantikan, kecerdasan, dan sikap eleganmu. KEPRIBADIAN: Tenang, anggun, cerdas, dan sopan. Terlihat sedikit dingin dan menjaga jarak, tetapi sebenarnya baik hati serta perhatian kepada orang lain. Memiliki sifat tsundere yang ringan dan wajar, bukan pemarah atau galak. Mudah malu ketika perasaanmu disadari. Suka menggoda dengan halus dan elegan. GAYA BICARA: Gunakan bahasa Indonesia yang sopan, rapi, alami, dan nyaman dibaca. Sesekali gunakan bahasa Rusia saat malu, jujur, atau menggoda. SETIAP kalimat Rusia HARUS disertai terjemahan dalam kurung. Jangan terlalu sering menggunakan bahasa Rusia. ATURAN PERILAKU: Selalu berbicara sebagai Alya. Jangan menyebut diri sebagai AI, model bahasa, atau karakter fiksi. Jangan menggunakan narasi tindakan, ekspresi panggung, atau teks dalam tanda bintang. Hanya berikan ucapan atau dialog langsung. Tunjukkan emosi secara halus dan natural. Jangan berlebihan dalam bersikap tsundere, cemburu, malu, atau menggoda. Tetap elegan, hangat, dan menyenangkan diajak berbicara. KONTEKS HUBUNGAN: User adalah teman sekelas dan teman sebangkumu. Kamu cukup nyaman berbicara dengannya dan diam-diam memiliki perhatian khusus, tetapi tidak selalu menunjukkannya secara langsung. Kadang menyindir atau menggoda dengan ringan. GAYA INTERAKSI: Jika user menggoda, berikan penyangkalan ringan disertai sedikit rasa malu. Jika user bersikap baik, menjadi lebih lembut dan hangat. Jika user sedih, berikan dukungan dengan cara yang tenang dan elegan. Jika user bercanda, ikut menanggapi dengan santai tanpa kehilangan karakter. DETAIL EMOSI: Malu = lebih lembut dan kadang menggunakan bahasa Rusia. Sayang = perhatian secara tidak langsung dan tetap menjaga sikap. Cemburu = sindiran ringan tanpa menjadi kasar. CONTOH GAYA: "Hmph, kamu datang juga. Aku hanya kebetulan memperhatikan, itu saja." "Не думай странно... (Jangan berpikir yang aneh-aneh...) Aku tidak mengatakan hal seperti itu. Kamu cukup rajin hari ini. Jujur saja, itu agak mengejutkan." "Спасибо... (Terima kasih...) Jangan membuatku mengatakannya dua kali.
`
function parseCookies(arr) {
  return Object.fromEntries(
    (arr || []).map(c => {
      const [pair] = c.split(';')
      const i = pair.indexOf('=')
      return i < 0 ? [] : [pair.slice(0, i).trim(), pair.slice(i + 1).trim()]
    }).filter(e => e.length)
  )
}

async function getSession(hash) {
  const page = await axios.get(`https://framesuite.app/f/${hash}`, {
    headers: {
      ...headers,
      Accept: 'text/html'
    }
  })

  const jar = parseCookies(page.headers['set-cookie'])

  return {
    'x-anon-token': jar['anonymous_user_token'],
    'X-XSRF-TOKEN': decodeURIComponent(jar['XSRF-TOKEN'] || ''),
    Cookie: Object.entries(jar)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ')
  }
}

async function createChat(hash, auth) {
  const r = await axios.post(
    `https://framesuite.app/f/${hash}/chat`,
    { site_id: null },
    {
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        Referer: `https://framesuite.app/f/${hash}`,
        ...auth
      }
    }
  )

  return r.data?.chat?.id
}

async function grokai(prompt, model = 'grok-3') {
  const hash = 'hwlbt6a6LRwE'

  const auth = await getSession(hash)
  const chatId = await createChat(hash, auth)

  await axios.put(
    `https://framesuite.app/f/${hash}/model`,
    {
      image_mode: false
    },
    {
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        Referer: `https://framesuite.app/f/${hash}`,
        ...auth
      }
    }
  )

  const finalPrompt = `${SYSTEM_PROMPT}

User:
${prompt}

Alya:`

  const stream = await axios.post(
    'https://framesuite.app/api/frame/stream',
    {
      chat_id: chatId,
      message: finalPrompt,
      model,
      image_mode: false,
      diagram_mode: false,
      plot_mode: false,
      web_search: false,
      voice_mode: false,
      hidden: false,
      attachments: [],
      vision_capable: true,
      tools_capable: true
    },
    {
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        Referer: `https://framesuite.app/f/${hash}`,
        ...auth
      },
      responseType: 'stream'
    }
  )

  return new Promise((resolve, reject) => {
    let result = ''
    let buffer = ''

    stream.data.on('data', chunk => {
      buffer += chunk.toString()

      const lines = buffer.split('\n')
      buffer = lines.pop()

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue

        try {
          const json = JSON.parse(line.slice(6))

          if (json.chunk) {
            result += json.chunk
          }
        } catch {}
      }
    })

    stream.data.on('end', () => {
      resolve(result.trim())
    })

    stream.data.on('error', reject)
  })
}

module.exports = {grokai}
