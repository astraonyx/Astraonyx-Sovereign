
const axios = require('axios');
const crypto = require('crypto');


const ENCRYPTION_KEY = Buffer.from('@sk=Rigel5729%2-diordnA', 'utf-8');

const MODEL_REGISTRY = [
  { id: 'xiaomi/mimo-v2.5', name: 'MiMo V2.5', provider: 'Xiaomi', premium: false },
  { id: 'xiaomi/mimo-v2-flash', name: 'MiMo V2 Flash', provider: 'Xiaomi', premium: false },
  { id: 'xiaomi/mimo-v2.5-pro', name: 'MiMo V2.5 Pro', provider: 'Xiaomi', premium: true },
  { id: 'deepseek/deepseek-v4-flash', name: 'DeepSeek v4 Flash', provider: 'DeepSeek', premium: false },
  { id: 'deepseek/deepseek-v4-pro', name: 'DeepSeek v4 Pro', provider: 'DeepSeek', premium: true },
  { id: 'deepseek/deepseek-v3.2', name: 'DeepSeek v3.2', provider: 'DeepSeek', premium: true },
  { id: 'deepseek/deepseek-v3.2-speciale', name: 'DeepSeek v3.2 Speciale', provider: 'DeepSeek', premium: true },
  { id: 'deepseek/deepseek-v3.2-exp', name: 'DeepSeek v3.2 Exp', provider: 'DeepSeek', premium: true },
  { id: 'deepseek/deepseek-v3.1-terminus', name: 'DeepSeek v3.1 Terminus', provider: 'DeepSeek', premium: true },
  { id: 'deepseek/deepseek-chat-v3.1', name: 'DeepSeek v3.1 Chat', provider: 'DeepSeek', premium: true },
  { id: 'google/gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', provider: 'Google', premium: false },
  { id: 'google/gemini-3.1-flash-lite-preview', name: 'Gemini 3.1 Flash Lite', provider: 'Google', premium: true },
  { id: 'google/gemma-4-26b-a4b-it', name: 'Gemma 4 26B', provider: 'Google', premium: false },
  { id: 'google/gemma-4-31b-it', name: 'Gemma 4 31B', provider: 'Google', premium: false },
  { id: 'google/gemma-3-27b-it', name: 'Gemma 3 27B', provider: 'Google', premium: false },
  { id: 'google/gemma-3-12b-it', name: 'Gemma 3 12B', provider: 'Google', premium: false },
  { id: 'openai/gpt-5.4-nano', name: 'GPT-5.4 Nano', provider: 'OpenAI', premium: true },
  { id: 'openai/gpt-5-nano', name: 'GPT-5 Nano', provider: 'OpenAI', premium: true },
  { id: 'openai/gpt-4.1-nano', name: 'GPT-4.1 Nano', provider: 'OpenAI', premium: true },
  { id: 'openai/gpt-oss-120b', name: 'GPT OSS 120B', provider: 'OpenAI', premium: false },
  { id: 'openai/gpt-oss-20b', name: 'GPT OSS 20B', provider: 'OpenAI', premium: false },
  { id: 'z-ai/glm-4.7-flash', name: 'GLM 4.7 Flash', provider: 'Z.AI', premium: false },
  { id: 'z-ai/glm-4.7', name: 'GLM 4.7', provider: 'Z.AI', premium: true },
  { id: 'z-ai/glm-4.6', name: 'GLM 4.6', provider: 'Z.AI', premium: true },
  { id: 'z-ai/glm-4.5', name: 'GLM 4.5', provider: 'Z.AI', premium: true },
  { id: 'minimax/minimax-m3', name: 'MiniMax M3', provider: 'MiniMax', premium: true },
  { id: 'minimax/minimax-m2.7', name: 'MiniMax M2.7', provider: 'MiniMax', premium: true },
  { id: 'minimax/minimax-m2.5', name: 'MiniMax M2.5', provider: 'MiniMax', premium: true },
  { id: 'minimax/minimax-m2.1', name: 'MiniMax M2.1', provider: 'MiniMax', premium: true },
  { id: 'minimax/minimax-m2-her', name: 'MiniMax M2-her', provider: 'MiniMax', premium: true },
  { id: 'minimax/minimax-m2', name: 'MiniMax M2', provider: 'MiniMax', premium: true },
  { id: 'ibm-granite/granite-4.1-8b', name: 'Granite 4.1 8B', provider: 'IBM', premium: false },
  { id: 'ibm-granite/granite-4.0-h-micro', name: 'Granite 4 Micro', provider: 'IBM', premium: false },
  { id: 'inclusionai/ling-2.6-flash', name: 'Ling 2.6 Flash', provider: 'InclusionAI', premium: false },
  { id: 'inclusionai/ring-2.6-1t', name: 'Ring 2.6 1T', provider: 'InclusionAI', premium: true },
  { id: 'tencent/hy3-preview', name: 'Hy3 Preview', provider: 'Tencent', premium: true },
  { id: 'tencent/hunyuan-a13b-instruct', name: 'Hunyuan A13B Instruct', provider: 'Tencent', premium: true },
  { id: 'qwen/qwen3.6-35b-a3b', name: 'Qwen3.6 35B', provider: 'Qwen', premium: true },
  { id: 'stepfun/step-3.7-flash', name: 'Step 3.7 Flash', provider: 'StepFun', premium: true },
  { id: 'baidu/ernie-4.5-21b-a3b', name: 'ERNIE-4.5 21B', provider: 'Baidu', premium: true },
  { id: 'alibaba/tongyi-deepresearch-30b-a3b', name: 'Tongyi Deep Research 30B', provider: 'Alibaba', premium: true },
  { id: 'meituan/longcat-flash-chat', name: 'Longcat Flash Chat', provider: 'Meituan', premium: true },
  { id: 'bytedance-seed/seed-2.0-mini', name: 'Seed 2.0 mini', provider: 'ByteDance', premium: true },
  { id: 'mistralai/mistral-small-2603', name: 'Mistral 4 Small', provider: 'MistralAI', premium: true },
  { id: 'rekaai/reka-edge', name: 'Reka Edge', provider: 'RekaAI', premium: true },
  { id: 'inception/mercury-2', name: 'Mercury 2', provider: 'Inception', premium: true }
];

class MimoCrypto {
  static obfuscate(text) {
    if (!text) return '';
    const inputBuffer = Buffer.from(String(text), 'utf-8');
    const xorBuffer = Buffer.alloc(inputBuffer.length);

    for (let idx = 0; idx < inputBuffer.length; idx++) {
      xorBuffer[idx] = inputBuffer[idx] ^ ENCRYPTION_KEY[idx % ENCRYPTION_KEY.length];
    }
    

    return xorBuffer.toString('base64');
  }

  static signRequest(rawJson, timestamp) {
    return crypto
      .createHmac('sha256', ENCRYPTION_KEY)
      .update(`${rawJson}:${timestamp}`, 'utf-8')
      .digest('base64');
  }

  static makeUuid(installTime) {
    const bytes = crypto.randomBytes(16).toString('hex');
    const parts = [
      bytes.substring(0, 8),
      bytes.substring(8, 12),
      bytes.substring(12, 16),
      bytes.substring(16, 20),
      bytes.substring(20, 32)
    ];
    return `user_fi-${installTime}_uu-${parts.join('-')}_pa-mimo_ed-full_edition_apv-3_anv-android__14__API__34)`;
  }
}

class MimoAI {
  constructor(config = {}) {
    this.userAgent = config.userAgent || 'Neo/1.0';
    this.defaultModel = config.defaultModel || 'xiaomi/mimo-v2.5-pro';
  }

  async sendMessage(params = {}) {
    const {
      prompt,
      messages = [],
      model = this.defaultModel,
      onStream = null
    } = params;

    const currentTime = Date.now();
    const installedTime = currentTime - 86400000;

    const conversationHistory = [...messages];
    if (prompt) {
      conversationHistory.push({ role: 'user', content: prompt });
    }

    const characterCount = conversationHistory.reduce(
      (total, msg) => total + (msg.content ? msg.content.length : 0), 
      0
    );

    // Payload yang disesuaikan agar sesuai dengan validasi server API
    const payload = {
      package: MimoCrypto.obfuscate('info.camposha.mimo'),
      uuid: MimoCrypto.obfuscate(MimoCrypto.makeUuid(installedTime)),
      edition: MimoCrypto.obfuscate('full_edition'),
      subscription: MimoCrypto.obfuscate('monthly'),
      order_id: 'GPA.3312-4567-8901-23456',
      last_purchase_date: '2026-08-01',
      ai_model: MimoCrypto.obfuscate(model),
      messages: conversationHistory,
      token_usage: 0,
      thread_char_count: characterCount,
      is_premium: true,
      current_language: MimoCrypto.obfuscate('in'),
      app_version: MimoCrypto.obfuscate('3'),
      request_date: MimoCrypto.obfuscate(new Date().toISOString().split('T')[0]),
      request_time: currentTime,
      first_install: installedTime,
      version: MimoCrypto.obfuscate('android__14__API__34)'),
      session_requests: 1,
      current_session_ads: 0,
      android_id: MimoCrypto.obfuscate(crypto.randomBytes(8).toString('hex')),
      hw_fp: MimoCrypto.obfuscate(crypto.randomBytes(16).toString('hex')),
      is_rooted: false,
      is_emulator: false,
      tz: MimoCrypto.obfuscate('Asia/Jakarta'),
      currency: MimoCrypto.obfuscate('IDR'),
      country: MimoCrypto.obfuscate('ID'),
      gpa_id: 'GPA.3312-4567-8901-23456',
      extra: ''
    };

    const payloadJsonStr = JSON.stringify(payload);
    const timestampStr = String(currentTime);
    const signature = MimoCrypto.signRequest(payloadJsonStr, timestampStr);

    const apiResponse = await axios.post('https://aiv1.clemy.top/chat-completion-stream', payloadJsonStr, {
      headers: {
        'Accept': 'text/event-stream',
        'Content-Type': 'application/json; charset=utf-8',
        'X-Signature': signature,
        'X-Timestamp': timestampStr,
        'User-Agent': this.userAgent
      },
      responseType: 'stream'
    });

    return new Promise((resolve, reject) => {
      let fullText = '';
      let streamBuffer = '';

      apiResponse.data.on('data', (chunk) => {
        streamBuffer += chunk.toString();
        const lines = streamBuffer.split('\n');
        streamBuffer = lines.pop();

        for (const line of lines) {
          const cleanLine = line.trim();
          if (cleanLine.startsWith('data: ')) {
            const dataStr = cleanLine.substring(6).trim();
            if (dataStr === '[DONE]') continue;

            try {
              const parsedData = JSON.parse(dataStr);
              const deltaContent = parsedData.choices?.[0]?.delta?.content;
              if (deltaContent) {
                fullText += deltaContent;
                if (onStream) {
                  onStream(deltaContent);
                }
              }
            } catch (err) {}
          }
        }
      });

      apiResponse.data.on('end', () => {
        const finalReply = fullText.trim();
        conversationHistory.push({ role: 'assistant', content: finalReply });
        resolve({
          response: finalReply,
          model,
          messages: conversationHistory
        });
      });

      apiResponse.data.on('error', (error) => {
        reject(error);
      });
    });
  }
}

module.exports = {
  MimoAI,
  MimoCrypto,
  MODEL_REGISTRY
};