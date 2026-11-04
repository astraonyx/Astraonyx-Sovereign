const axios = require("axios")
const { CookieJar } = require("tough-cookie")
const { wrapper } = require("axios-cookiejar-support")
const cheerio = require("cheerio")
const crypto = require("crypto")
const fs = require("fs")
const FormData = require("form-data")

class ChatbotClient {
  constructor() {
    this.baseURL = "https://chatbotchatapp.com"
    this.keyToken = "XXXXXXYYY" // GANTI DENGAN KEY ASLI

    this.jar = new CookieJar()

    this.axios = wrapper(axios.create({
      baseURL: this.baseURL,
      timeout: 1000 * 60 * 10,
      jar: this.jar,
      withCredentials: true,
      headers: {
        ...this.generateFakeIpHeaders()
      }
    }))
  }

  generateFakeIpHeaders() {
    const ipv4 = Array.from({ length: 4 }, () =>
      Math.floor(Math.random() * 255)
    ).join(".")

    return {
      "X-Forwarded-For": ipv4,
      "X-Real-IP": ipv4,
      "Client-IP": ipv4,
    }
  }

  genNonce() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0
      const v = c === "x" ? r : (r & 0x3) | 0x8
      return v.toString(16)
    })
  }

  getTimestamp() {
    return { timestamp: Date.now() }
  }

  md5(str) {
    return crypto.createHash("md5").update(str).digest("hex")
  }

  async genKey(messages) {
    const { timestamp } = this.getTimestamp()
    const nonce = this.genNonce()

    const obj = {
      timestamp,
      nonce,
      messages: messages[timestamp % messages.length]?.content ?? "",
    }

    let raw = ""
    for (const [k, v] of Object.entries(obj)) {
      raw += k + v
    }

    raw += "keyToken" + this.keyToken
    raw += "vv1"

    obj.id = this.md5(raw)
    return obj
  }

  async getCsrfToken() {
    const res = await this.axios.get(this.baseURL, {
      headers: {
        accept: "text/html",
        "user-agent":
          "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/127.0.0.0 Mobile Safari/537.36",
      },
    })

    const $ = cheerio.load(res.data)
    return $('meta[name="csrf-token"]').attr("content")
  }

  async uploadFile(filePath) {
    const csrfToken = await this.getCsrfToken()

    const buffer = fs.readFileSync(filePath)
    const base64 = `data:image/png;base64,${buffer.toString("base64")}`
    const stat = fs.statSync(filePath)
    const fileName = filePath.split("/").pop()

    const form = new FormData()
    form.append(
      "fileList",
      JSON.stringify([{
        name: fileName,
        type: "image/png",
        size: stat.size,
        base64,
      }])
    )
    form.append("isAuthCheck", "")

    const res = await this.axios.post(
      `${this.baseURL}/en/upload-file-multiple`,
      form,
      {
        headers: {
          ...form.getHeaders(),
          "x-csrf-token": csrfToken,
          "x-requested-with": "XMLHttpRequest",
        },
      }
    )

    if (!res.data.status) throw res.data.message
    return res.data.data.files[0]
  }

  parseStream(raw) {
    const lines = raw.split("\n")
    const chunks = []

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue
      const jsonStr = line.replace("data: ", "").trim()
      if (!jsonStr || jsonStr === "[DONE]") continue
      try {
        chunks.push(JSON.parse(jsonStr))
      } catch {}
    }

    if (!chunks.length) return null

    const merged = {
      conversationId: null,
      text: "",
      tool_calls: []
    }

    for (const chunk of chunks) {
      if (!merged.conversationId && chunk.conversationId)
        merged.conversationId = chunk.conversationId

      const choice = chunk?.choices?.[0]
      if (!choice) continue

      if (typeof choice.delta?.content === "string")
        merged.text += choice.delta.content

      if (typeof choice.content?.parts?.[0]?.text === "string")
        merged.text += choice.content.parts[0].text

      if (choice.delta?.tool_calls)
        merged.tool_calls = choice.delta.tool_calls
    }

    return merged
  }

  async send({
    messages = null,
    text = null,
    filePath = null,
    isGenerateImage = false,
    isSearchWeb = false,
    isModel = false,
    conversationId = null,
  } = {}) {

    const csrfToken = await this.getCsrfToken()

    if (!messages && text) {
      messages = [{ role: "user", content: text }]
    }

    if (!messages) throw new Error("messages or text required")

    if (isSearchWeb && !isModel) {
      messages[messages.length - 1].functionCall = ""
      messages[messages.length - 1].toolNameHints = ["searchWeb"]
    }

    if (isGenerateImage && !isModel) {
      messages[messages.length - 1].functionCall = ""
      messages[messages.length - 1].toolNameHints = ["generateImage"]
    }

    if (filePath) {
      const uploaded = await this.uploadFile(filePath)
      messages[messages.length - 1].attachments = [uploaded]
    }

    const signed = await this.genKey(messages)

    const finalPayload = {
      ...signed,
      messages,
      url: this.baseURL + "/",
      modal: isSearchWeb || isGenerateImage ? "model-codestral" : null,
      conversationId,
    }

    const endpoint =
      isSearchWeb || isGenerateImage
        ? `${this.baseURL}/api/mai`
        : `${this.baseURL}/api`

    const res = await this.axios.post(endpoint, finalPayload, {
      headers: {
        accept: "text/event-stream",
        "content-type": "text/plain;charset=UTF-8",
        origin: this.baseURL,
        referer: this.baseURL + "/",
        "x-csrf-token": csrfToken,
      },
    })

    const result = this.parseStream(res.data)

    return result
  }
}

module.exports = new ChatbotClient()