// lib/virtexShield.js — Advanced Passive Auto-ON Anti-Virtex & Anti-Crash Shield 2.0
// Menangkis serangan virtex WhatsApp modern, payload forceclose, dan eksploit protobuf deserializer.
// Berjalan otomatis secara pasif di SEMUA pesan masuk (grup & PM) tanpa perlu toggle manual.

const path = require('path');
const fs = require('fs');
const { jidToNumber, normalizeNumber, toJid } = require('./helpers');
const antidelete = require('./antidelete');
const { box } = require('./messageStyle');

const TELEMETRY_FILE = path.join(__dirname, '..', 'database', 'virtex_telemetry.json');

function loadTelemetry() {
  try {
    if (fs.existsSync(TELEMETRY_FILE)) {
      const raw = fs.readFileSync(TELEMETRY_FILE, 'utf8');
      return JSON.parse(raw);
    }
  } catch (_) {}
  return {
    shieldActive: true,
    engineVersion: '2.0 Pro Max',
    lastUpdated: new Date().toISOString(),
    totalScanned: 0,
    totalIntercepted: 0,
    protobufBlocked: 0,
    fallbackBlocked: 0,
    crashGlyphBlocked: 0,
    zalgoBlocked: 0,
    largePayloadBlocked: 0,
    autoKicksIssued: 0,
    lastIncident: null,
    recentIncidents: [],
  };
}

function saveTelemetry(data) {
  try {
    const dir = path.dirname(TELEMETRY_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    data.lastUpdated = new Date().toISOString();
    fs.writeFileSync(TELEMETRY_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('[VIRTEX-SHIELD 2.0] Gagal menyimpan telemetry:', err.message);
  }
}

let defenseTelemetry = loadTelemetry();

function recordThreatIncident({ attacker, reason, severity, category, action, chatJid }) {
  defenseTelemetry.totalIntercepted = (defenseTelemetry.totalIntercepted || 0) + 1;
  if (category === 'protobuf') defenseTelemetry.protobufBlocked = (defenseTelemetry.protobufBlocked || 0) + 1;
  else if (category === 'fallback') defenseTelemetry.fallbackBlocked = (defenseTelemetry.fallbackBlocked || 0) + 1;
  else if (category === 'glyphs') defenseTelemetry.crashGlyphBlocked = (defenseTelemetry.crashGlyphBlocked || 0) + 1;
  else if (category === 'zalgo') defenseTelemetry.zalgoBlocked = (defenseTelemetry.zalgoBlocked || 0) + 1;
  else if (category === 'oversized') defenseTelemetry.largePayloadBlocked = (defenseTelemetry.largePayloadBlocked || 0) + 1;
  else defenseTelemetry.protobufBlocked = (defenseTelemetry.protobufBlocked || 0) + 1;

  if (action && action.toLowerCase().includes('kick')) {
    defenseTelemetry.autoKicksIssued = (defenseTelemetry.autoKicksIssued || 0) + 1;
  }

  const incident = {
    id: 'TR-' + Date.now().toString(36).toUpperCase(),
    timestamp: new Date().toISOString(),
    attacker: attacker || 'Unknown',
    chatJid: chatJid || 'Private/Direct',
    reason: reason || 'Unknown Crash Vector',
    severity: severity || 'high',
    action: action || 'Message Purged',
  };

  defenseTelemetry.lastIncident = incident;
  defenseTelemetry.recentIncidents = defenseTelemetry.recentIncidents || [];
  defenseTelemetry.recentIncidents.unshift(incident);
  if (defenseTelemetry.recentIncidents.length > 50) {
    defenseTelemetry.recentIncidents.pop();
  }

  saveTelemetry(defenseTelemetry);
  return incident;
}

function setShieldActive(active) {
  defenseTelemetry.shieldActive = Boolean(active);
  saveTelemetry(defenseTelemetry);
  return defenseTelemetry.shieldActive;
}

function isShieldActive() {
  return defenseTelemetry.shieldActive !== false;
}

function getDefenseStats() {
  try {
    if (fs.existsSync(TELEMETRY_FILE)) {
      defenseTelemetry = JSON.parse(fs.readFileSync(TELEMETRY_FILE, 'utf8'));
    }
  } catch (_) {}
  return {
    ...defenseTelemetry,
    shieldActive: defenseTelemetry.shieldActive !== false,
    engineVersion: '2.0 Pro Max',
    status: defenseTelemetry.shieldActive !== false ? 'OPTIMAL_DEFENSE' : 'SHIELD_PAUSED',
    uptimeHours: Math.round((process.uptime() / 3600) * 10) / 10,
  };
}

function simulateScan(input) {
  if (!input) return { isVirtex: false, reason: 'Payload kosong', severity: 'safe' };

  if (typeof input === 'object') {
    const protoResult = inspectProtobufCrashVectors({ message: input });
    if (protoResult.isVirtex) {
      return { ...protoResult, category: 'protobuf', scannedType: 'protobuf_structure' };
    }
    const txt = extractAllTextFromMessage({ message: input });
    if (txt) {
      const txtResult = inspectVirtexPayload(txt);
      return { ...txtResult, scannedType: 'extracted_text' };
    }
    return { isVirtex: false, reason: 'Tidak ditemukan pola berbahaya pada struktur', severity: 'safe' };
  }

  const str = String(input);
  try {
    if (str.startsWith('{') && str.endsWith('}')) {
      const parsed = JSON.parse(str);
      const parsedRes = simulateScan(parsed);
      if (parsedRes.isVirtex) return parsedRes;
    }
  } catch (_) {}

  const res = inspectVirtexPayload(str);
  return { ...res, scannedType: 'plaintext_payload' };
}

// Pattern 1: Zalgo & Combining Diacritical Marks Explosion
// Virtex menumpuk combining marks di satu karakter untuk membuat font renderer WhatsApp freeze/crash
const COMBINING_DIACRITICS_REGEX = /[\u0300-\u036F\u1AB0-\u1AFF\u1DC0-\u1DFF\u20D0-\u20FF\uFE20-\uFE2F]/g;
const CONSECUTIVE_COMBINING_REGEX = /[\u0300-\u036F\u1AB0-\u1AFF\u1DC0-\u1DFF\u20D0-\u20FF\uFE20-\uFE2F]{8,}/;

// Pattern 2: Invisible Characters & Zero-Width Space Bombs
// Karakter tersembunyi yang ditumpuk untuk membekukan chat bubble dan layout engine
const INVISIBLE_CHARS_REGEX = /[\u200B-\u200F\uFEFF\u202A-\u202E\u2060-\u206F\u061C\u180E\u00AD]/g;
const CONSECUTIVE_INVISIBLE_REGEX = /[\u200B-\u200F\uFEFF\u202A-\u202E\u2060-\u206F\u061C\u180E\u00AD]{10,}/;

// Pattern 3: Archaic & Complex Crash Glyphs (Cuneiform, Egyptian Hieroglyphs, Ugaritic, Braille)
// Digunakan dalam virtex untuk membuat HarfBuzz crash / out of memory saat glyph table lookup
const CRASH_GLYPHS_REGEX = /[\u{12000}-\u{123FF}\u{13000}-\u{1342F}\u{10000}-\u{10527}\u{14400}-\u{1467F}\u{2800}-\u{28FF}]/gu;

// Pattern 4: BiDi Direction Override Stacking
const BIDI_OVERRIDE_REGEX = /[\u202A-\u202E\u2066-\u2069]/g;

// Pattern 5: Fallback Crash Text Signatures
// Pesan error standar WhatsApp Web / Desktop saat menerima payload mobile crash crasher (MR-X292, FC Bug, Carousel Trapper)
const FALLBACK_CRASH_REGEX = /(part\s+of\s+this\s+response\s+isn't\s+supported\s+on\s+this\s+device\s+yet|view\s+the\s+response\s+on\s+your\s+phone|sebagian\s+dari\s+respons\s+ini\s+belum\s+didukung\s+di\s+perangkat\s+ini|lihat\s+respons\s+di\s+ponsel\s+anda|pesan\s+ini\s+tidak\s+didukung\s+di\s+perangkat\s+ini|this\s+message\s+isn't\s+supported\s+on\s+this\s+device|menunggu\s+pesan\s+ini\.\s+ini\s+mungkin\s+memerlukan\s+waktu|waiting\s+for\s+this\s+message\.\s+this\s+may\s+take\s+a\s+while)/i;

// Pattern 6: Virtex / Crash Exploit Known Signatures
const VIRTEX_TAGS_REGEX = /(\b|_)(virtex|x-virtex|travazap|trava\s*zap|crashzap|crash\s*zap|mr-?x292|freeze\s*chat|bintextbomb|font\s*crasher|bug\s*wa)(\b|_)/i;

/**
 * Buka wrapper pesan berlapis secara aman (ephemeral, viewOnce, dll)
 */
function unwrapMessage(m) {
  if (!m) return null;
  let current = m;
  for (let depth = 0; depth < 5; depth++) {
    if (current.ephemeralMessage?.message) {
      current = current.ephemeralMessage.message;
      continue;
    }
    if (current.viewOnceMessage?.message) {
      current = current.viewOnceMessage.message;
      continue;
    }
    if (current.viewOnceMessageV2?.message) {
      current = current.viewOnceMessageV2.message;
      continue;
    }
    if (current.viewOnceMessageV2Extension?.message) {
      current = current.viewOnceMessageV2Extension.message;
      continue;
    }
    if (current.documentWithCaptionMessage?.message) {
      current = current.documentWithCaptionMessage.message;
      continue;
    }
    if (current.botInvokeMessage?.message) {
      current = current.botInvokeMessage.message;
      continue;
    }
    break;
  }
  return current;
}

/**
 * Ekstraksi seluruh teks dari berbagai kemungkinan tipe struktur pesan Baileys
 */
function extractAllTextFromMessage(msg) {
  if (!msg || !msg.message) return '';
  const inner = unwrapMessage(msg.message);
  if (!inner) return '';

  const parts = [];

  if (inner.conversation) parts.push(inner.conversation);
  if (inner.extendedTextMessage?.text) parts.push(inner.extendedTextMessage.text);
  if (inner.imageMessage?.caption) parts.push(inner.imageMessage.caption);
  if (inner.videoMessage?.caption) parts.push(inner.videoMessage.caption);
  if (inner.documentMessage?.caption) parts.push(inner.documentMessage.caption);

  // Periksa vCard pada kontak
  if (inner.contactMessage?.vcard) parts.push(inner.contactMessage.vcard);
  if (inner.contactsArrayMessage?.contacts) {
    for (const c of inner.contactsArrayMessage.contacts) {
      if (c.vcard) parts.push(c.vcard);
    }
  }

  // Periksa tombol dan list
  if (inner.buttonsResponseMessage?.selectedDisplayText) parts.push(inner.buttonsResponseMessage.selectedDisplayText);
  if (inner.listResponseMessage?.title) parts.push(inner.listResponseMessage.title);
  if (inner.listResponseMessage?.description) parts.push(inner.listResponseMessage.description);
  if (inner.templateButtonReplyMessage?.selectedDisplayText) parts.push(inner.templateButtonReplyMessage.selectedDisplayText);

  // Ekstraksi dari struktur interaktif modern (InteractiveMessage, Buttons, Carousel)
  if (inner.interactiveMessage) {
    const im = inner.interactiveMessage;
    if (im.header?.title) parts.push(im.header.title);
    if (im.header?.subtitle) parts.push(im.header.subtitle);
    if (im.body?.text) parts.push(im.body.text);
    if (im.footer?.text) parts.push(im.footer.text);

    // NativeFlowMessage buttons
    if (im.nativeFlowMessage?.buttons) {
      for (const btn of im.nativeFlowMessage.buttons) {
        if (btn.buttonParamsJson) parts.push(btn.buttonParamsJson);
      }
    }

    // CarouselMessage cards
    if (im.carouselMessage?.cards) {
      for (const card of im.carouselMessage.cards) {
        if (card.header?.title) parts.push(card.header.title);
        if (card.body?.text) parts.push(card.body.text);
        if (card.footer?.text) parts.push(card.footer.text);
        if (card.nativeFlowMessage?.buttons) {
          for (const btn of card.nativeFlowMessage.buttons) {
            if (btn.buttonParamsJson) parts.push(btn.buttonParamsJson);
          }
        }
      }
    }
  }

  // Ekstraksi dari poll & event
  if (inner.pollCreationMessage) {
    if (inner.pollCreationMessage.name) parts.push(inner.pollCreationMessage.name);
    if (Array.isArray(inner.pollCreationMessage.options)) {
      for (const opt of inner.pollCreationMessage.options) {
        if (opt.optionName) parts.push(opt.optionName);
      }
    }
  }
  if (inner.pollCreationMessageV3) {
    if (inner.pollCreationMessageV3.name) parts.push(inner.pollCreationMessageV3.name);
    if (Array.isArray(inner.pollCreationMessageV3.options)) {
      for (const opt of inner.pollCreationMessageV3.options) {
        if (opt.optionName) parts.push(opt.optionName);
      }
    }
  }
  if (inner.eventMessage) {
    if (inner.eventMessage.name) parts.push(inner.eventMessage.name);
    if (inner.eventMessage.description) parts.push(inner.eventMessage.description);
  }

  // Ekstraksi dari Quoted Context Info
  const quoted = inner.extendedTextMessage?.contextInfo?.quotedMessage ||
                 inner.interactiveMessage?.contextInfo?.quotedMessage ||
                 inner.imageMessage?.contextInfo?.quotedMessage ||
                 inner.videoMessage?.contextInfo?.quotedMessage ||
                 inner.documentMessage?.contextInfo?.quotedMessage;
  if (quoted) {
    if (quoted.conversation) parts.push(quoted.conversation);
    if (quoted.extendedTextMessage?.text) parts.push(quoted.extendedTextMessage.text);
  }

  return parts.join(' ');
}

/**
 * Analisis mendalam apakah payload teks merupakan Virtex / Crash Payload
 * Mengembalikan { isVirtex: boolean, reason: string, severity: string }
 */
function inspectVirtexPayload(text) {
  if (!text || typeof text !== 'string') {
    return { isVirtex: false };
  }

  const length = text.length;

  // 1. Deteksi Fallback Crash Strings ("Part of this response isn't supported on this device yet", dll)
  if (FALLBACK_CRASH_REGEX.test(text)) {
    return {
      isVirtex: true,
      reason: 'Unsupported Protocol Forceclose Payload ("Part of this response isn\'t supported...")',
      severity: 'critical',
    };
  }

  // 2. Deteksi Virtex Signature Tags
  if (VIRTEX_TAGS_REGEX.test(text)) {
    return {
      isVirtex: true,
      reason: 'Known Exploit Signature Tag (virtex/crashzap/mr-x292 signature)',
      severity: 'critical',
    };
  }

  // 3. Zalgo / Stacking Diacritics Bomb
  if (CONSECUTIVE_COMBINING_REGEX.test(text)) {
    return {
      isVirtex: true,
      reason: 'Zalgo Stacking Diacritics Attack (8+ tanda aksen bertumpuk)',
      severity: 'critical',
    };
  }
  const combiningMatches = text.match(COMBINING_DIACRITICS_REGEX);
  if (combiningMatches && length > 40) {
    const combiningDensity = combiningMatches.length / length;
    if (combiningDensity > 0.15 || combiningMatches.length > 60) {
      return {
        isVirtex: true,
        reason: `Zalgo Diacritics Density Flood (${combiningMatches.length} karakter aksen)`,
        severity: 'critical',
      };
    }
  }

  // 4. Invisible Flood & Zero-Width Space Attacks
  if (CONSECUTIVE_INVISIBLE_REGEX.test(text)) {
    return {
      isVirtex: true,
      reason: 'Invisible Characters Bomb (10+ karakter tak kasat mata berurutan)',
      severity: 'critical',
    };
  }
  const invisibleMatches = text.match(INVISIBLE_CHARS_REGEX);
  if (invisibleMatches) {
    if (invisibleMatches.length >= 20) {
      return {
        isVirtex: true,
        reason: `Invisible Flood Attack (${invisibleMatches.length} karakter zero-width)`,
        severity: 'critical',
      };
    }
    if (length > 15 && (invisibleMatches.length / length) > 0.20) {
      return {
        isVirtex: true,
        reason: 'High Density Invisible Characters Bomb',
        severity: 'critical',
      };
    }
  }

  // 5. Archaic Glyphs / Cuneiform / Egyptian Hieroglyphs Flood (HarfBuzz Crashers)
  const crashGlyphMatches = text.match(CRASH_GLYPHS_REGEX);
  if (crashGlyphMatches && crashGlyphMatches.length >= 15) {
    return {
      isVirtex: true,
      reason: `HarfBuzz Font Crash Glyphs Attack (${crashGlyphMatches.length} cuneiform/hieroglyphs)`,
      severity: 'critical',
    };
  }

  // 6. BiDi Direction Override Stacking
  const bidiMatches = text.match(BIDI_OVERRIDE_REGEX);
  if (bidiMatches && bidiMatches.length >= 8) {
    return {
      isVirtex: true,
      reason: `BiDi Text Direction Override Stacking (${bidiMatches.length} control tags)`,
      severity: 'high',
    };
  }

  // 7. Karakter sama berulang ekstrim (50+ berurutan tanpa spasi)
  if (/(.)\1{49,}/.test(text)) {
    return {
      isVirtex: true,
      reason: 'Extreme Character Repetition Bomb (50+ karakter berulang)',
      severity: 'high',
    };
  }

  // 8. Linebreak Explosion (> 80 baris kosong/patah)
  const lineCount = text.split(/\r?\n/).length;
  if (lineCount > 80) {
    return {
      isVirtex: true,
      reason: `Linebreak Explosion Bomb (${lineCount} baris)`,
      severity: 'high',
    };
  }

  // 9. Pesan raksasa dengan kepadatan simbol abnormal
  if (length > 2500) {
    const nonAlphanumeric = (text.match(/[^a-zA-Z0-9\s]/g) || []).length;
    if (nonAlphanumeric / length > 0.35) {
      return {
        isVirtex: true,
        reason: `Oversized Payload with High Symbol Entropy (${length} chars)`,
        severity: 'critical',
      };
    }
  }

  return { isVirtex: false };
}

/**
 * Analisis struktural protobuf Baileys untuk mendeteksi crash payload biner/non-teks
 * Menangkap serangan yang TIDAK memiliki teks standar (interactiveMessage, corrupt carousel, quote bomb)
 */
function inspectProtobufCrashVectors(msg) {
  if (!msg || !msg.message) return { isVirtex: false };

  // 1. Guard Ukuran Raw JSON Buffer (Mencegah out-of-memory / payload explosion)
  try {
    const rawJson = JSON.stringify(msg.message);
    if (rawJson.length > 35000) {
      return {
        isVirtex: true,
        reason: `Memory Overflow Payload / Size Bomb (${(rawJson.length / 1024).toFixed(1)} KB)`,
        severity: 'critical',
      };
    }
  } catch (_) {}

  const inner = unwrapMessage(msg.message);
  if (!inner) return { isVirtex: false };

  // 2. Deteksi Eksploit InteractiveMessage & NativeFlow / Carousel Trappers
  if (inner.interactiveMessage) {
    const im = inner.interactiveMessage;

    // Carousel Trapper: Terlalu banyak cards atau card yang sengaja dirusak
    if (im.carouselMessage?.cards) {
      const cards = im.carouselMessage.cards;
      if (!Array.isArray(cards) || cards.length > 10) {
        return {
          isVirtex: true,
          reason: 'Malformed Interactive Carousel Bomb (> 10 cards / corrupt array)',
          severity: 'critical',
        };
      }
      for (const card of cards) {
        if (card.nativeFlowMessage?.buttons) {
          const btns = card.nativeFlowMessage.buttons;
          if (!Array.isArray(btns) || btns.length > 10) {
            return {
              isVirtex: true,
              reason: 'Interactive Carousel Buttons Overload',
              severity: 'critical',
            };
          }
        }
      }
    }

    // NativeFlow Trapper: Tombol abnormal, empty buttons, atau JSON parameter yang sengaja dibuat corrupt
    if (im.nativeFlowMessage) {
      const btns = im.nativeFlowMessage.buttons;
      if (!Array.isArray(btns) || btns.length === 0 || btns.length > 12) {
        return {
          isVirtex: true,
          reason: 'Malformed NativeFlow Buttons Bomb (Corrupt button array / empty crasher payload)',
          severity: 'critical',
        };
      }
      for (const btn of btns) {
        if (btn.buttonParamsJson && typeof btn.buttonParamsJson === 'string') {
          if (btn.buttonParamsJson.length > 2500) {
            return {
              isVirtex: true,
              reason: 'Oversized NativeFlow Button Params JSON',
              severity: 'critical',
            };
          }
          // Cek tanda zalgo/invisible di dalam button params
          if (CONSECUTIVE_INVISIBLE_REGEX.test(btn.buttonParamsJson) || CONSECUTIVE_COMBINING_REGEX.test(btn.buttonParamsJson)) {
            return {
              isVirtex: true,
              reason: 'Zalgo / Invisible Payload inside Interactive Button',
              severity: 'critical',
            };
          }
        }
      }
    }
  }

  // 3. Deteksi FutureProof & Unsupported Bot Invocation Crashers
  if (inner.futureProofMessage) {
    return {
      isVirtex: true,
      reason: 'Unsupported FutureProof Message Attack (mobile client forceclose)',
      severity: 'critical',
    };
  }
  if (inner.bizBotMessageInfo || inner.botFeedbackMessage) {
    return {
      isVirtex: true,
      reason: 'Corrupted Business Bot Protobuf Injection',
      severity: 'high',
    };
  }

  // 4. Deteksi Poisoned Quoted Context (Quote Bomb / Recursive Mentions)
  const context = inner.extendedTextMessage?.contextInfo ||
                  inner.interactiveMessage?.contextInfo ||
                  inner.imageMessage?.contextInfo ||
                  inner.videoMessage?.contextInfo ||
                  inner.documentMessage?.contextInfo;

  if (context) {
    // Mention Bomb: Menandai puluhan/ratusan user sekaligus untuk membuat UI crash
    if (Array.isArray(context.mentionedJid) && context.mentionedJid.length > 30) {
      return {
        isVirtex: true,
        reason: `Mention Bomb Attack (${context.mentionedJid.length} mentions)`,
        severity: 'critical',
      };
    }

    // Quoted Message Trapper: Quoted message yang mengandung payload berbahaya
    if (context.quotedMessage) {
      const qm = unwrapMessage(context.quotedMessage);
      if (qm) {
        if (qm.interactiveMessage || qm.futureProofMessage) {
          return {
            isVirtex: true,
            reason: 'Poisoned Quoted Message (Nested Interactive/FutureProof Crashing Structure)',
            severity: 'critical',
          };
        }
        if (qm.contactMessage?.vcard && qm.contactMessage.vcard.length > 1000) {
          return {
            isVirtex: true,
            reason: 'Poisoned Quoted VCard Bomb',
            severity: 'critical',
          };
        }
      }
    }

    // High Forwarding Score Attack
    if (context.forwardingScore >= 5 && (inner.interactiveMessage || inner.futureProofMessage)) {
      return {
        isVirtex: true,
        reason: 'Forwarded Interactive Crash Bomb Barrage',
        severity: 'critical',
      };
    }
  }

  // 5. Deteksi VCard Crashers
  if (inner.contactMessage?.vcard) {
    const vc = inner.contactMessage.vcard;
    if (vc.length > 1200) {
      return {
        isVirtex: true,
        reason: `Oversized VCard Payload (${vc.length} chars)`,
        severity: 'critical',
      };
    }
    if (CONSECUTIVE_INVISIBLE_REGEX.test(vc) || CONSECUTIVE_COMBINING_REGEX.test(vc)) {
      return {
        isVirtex: true,
        reason: 'Corrupted VCard with Zalgo/Invisible Glyphs',
        severity: 'critical',
      };
    }
  }
  if (inner.contactsArrayMessage?.contacts) {
    const arr = inner.contactsArrayMessage.contacts;
    if (!Array.isArray(arr) || arr.length > 10) {
      return {
        isVirtex: true,
        reason: 'Contacts Array Bomb (> 10 vcards)',
        severity: 'high',
      };
    }
    for (const c of arr) {
      if (c.vcard && (c.vcard.length > 1000 || CONSECUTIVE_INVISIBLE_REGEX.test(c.vcard))) {
        return {
          isVirtex: true,
          reason: 'Contacts Array with Corrupted VCard Payload',
          severity: 'critical',
        };
      }
    }
  }

  // 6. Deteksi Poll Creation Bomb
  const poll = inner.pollCreationMessage || inner.pollCreationMessageV3;
  if (poll) {
    if (Array.isArray(poll.options) && poll.options.length > 15) {
      return {
        isVirtex: true,
        reason: `Poll Creation Option Flood (${poll.options.length} options)`,
        severity: 'high',
      };
    }
    if (poll.name && poll.name.length > 800) {
      return {
        isVirtex: true,
        reason: 'Oversized Poll Title Bomb',
        severity: 'high',
      };
    }
  }

  return { isVirtex: false };
}

/**
 * Kompatibilitas mundur dengan fungsi looksLikeVirtex
 */
function looksLikeVirtex(text) {
  return inspectVirtexPayload(text).isVirtex;
}

/**
 * Interseptor pasif utama: menangani pesan masuk secara realtime
 * Menyelidiki struktur biner/protobuf DAN teks secara simultan.
 * Jika terdeteksi virtex/crash crasher, pesan langsung dimusnahkan dan tidak diproses lebih lanjut!
 * Mengembalikan true jika pesan dinetralisir (caller harus stop/return).
 */
async function interceptAndNeutralize({ sock, msg, chatJid, senderNumber, isGroup, isBotAdminFn }) {
  try {
    if (!isShieldActive()) return false;
    if (!msg || !msg.message) return false;

    // 1. Periksa struktur protobuf biner terlebih dahulu (menangkap interactiveMessage, futureProof, dll)
    let analysis = inspectProtobufCrashVectors(msg);

    // 2. Jika struktur lolos, periksa seluruh representasi teks (menangkap zalgo, fallback text, dll)
    if (!analysis.isVirtex) {
      const fullText = extractAllTextFromMessage(msg);
      if (fullText) {
        analysis = inspectVirtexPayload(fullText);
      }
    }

    if (!analysis.isVirtex) return false;

    console.warn(`[VIRTEX-SHIELD 2.0] 🚨 Serangan Virtex / ForceClose dicegat! Pengirim: ${senderNumber || 'unknown'}, Alasan: ${analysis.reason} (Severity: ${analysis.severity})`);

    // Tandai pesan di Anti-Delete agar tidak direpost jika dihapus
    if (msg.key?.id) {
      antidelete.markAsVirtext(msg.key.id);
    }

    // Hapus pesan virtex dari obrolan secepat mungkin
    try {
      await sock.sendMessage(chatJid, {
        delete: {
          remoteJid: chatJid,
          fromMe: false,
          id: msg.key.id,
          participant: msg.key.participant,
        },
      });
      console.log(`[VIRTEX-SHIELD 2.0] 🗑️ Pesan virtex berhasil dihapus dari ${chatJid}`);
    } catch (delErr) {
      console.error('[VIRTEX-SHIELD 2.0] Gagal auto-delete virtex message:', delErr.message);
    }

    // Jika terjadi di grup dan bot adalah admin:
    if (isGroup && typeof isBotAdminFn === 'function') {
      try {
        const botAdmin = await isBotAdminFn();
        if (botAdmin) {
          const senderJid = msg.key.participant || toJid(senderNumber);

          // Jika tingkat keparahan 'critical', KICK PENGIRIM seketika untuk melindungi member lain
          if (analysis.severity === 'critical') {
            await sock.groupParticipantsUpdate(chatJid, [senderJid], 'remove').catch(() => {});
            console.log(`[VIRTEX-SHIELD 2.0] 👢 Pengirim virtex @${senderNumber} telah dikeluarkan dari grup!`);
          }
        }
      } catch (adminErr) {
        console.error('[VIRTEX-SHIELD 2.0] Gagal mengeksekusi aksi grup:', adminErr.message);
      }
    }

    // Rekam insiden ke telemetry & persistent storage
    let category = 'protobuf';
    if (analysis.reason.includes('Fallback Crash')) category = 'fallback';
    else if (analysis.reason.includes('Zalgo')) category = 'zalgo';
    else if (analysis.reason.includes('Crash Glyphs') || analysis.reason.includes('Invisible')) category = 'glyphs';
    else if (analysis.reason.includes('Ukuran payload')) category = 'oversized';

    const actionSummary = (isGroup && analysis.severity === 'critical')
      ? 'Pesan Dihapus & Pelaku Ditendang Otomatis'
      : 'Pesan Dihapus Seketika';

    // 📢 RUTE LAPORAN KEAMANAN: Wajib dikirimkan ke Grup Output (Vault)
    try {
      const botEcosystemGroups = require('./botEcosystemGroups');
      const ecoData = botEcosystemGroups.getSavedData();
      const vaultJid = ecoData.groups?.vault?.jid || '120363428762313719@g.us';

      let locationLabel = isGroup ? `Grup (${chatJid})` : `Chat Pribadi (${senderNumber})`;
      try {
        const groupsManager = require('./groupsManager');
        const gName = groupsManager.getGroupName ? groupsManager.getGroupName(chatJid) : '';
        if (gName) locationLabel = `${gName} (${chatJid})`;
      } catch (_) {}

      const alertText = box({
        prefix: 'POLARIS SECURITY SHIELD 2.0',
        statusTag: 'FORCECLOSE BLOCKED',
        title: 'SERANGAN VIRTEX / CRASH DINETRALISIR',
        body: `🛡️ *Sistem Keamanan Aktif!*\n\n` +
              `Terdeteksi payload berbahaya / forceclose crasher dari @${senderNumber || 'user'}.\n` +
              `• Lokasi Target: *${locationLabel}*\n` +
              `• Jenis Ancaman: *${analysis.reason}*\n` +
              `• Status: *Dihapus Otomatis (Purged)*\n` +
              `• Tindakan: *${actionSummary}*\n\n` +
              `_Laporan keamanan otomatis dialihkan ke Grup Output._`,
        footer: 'Aman dari lag, crash loop & freeze chat!',
      });

      await sock.sendMessage(vaultJid, {
        text: alertText,
        mentions: senderNumber ? [toJid(senderNumber)] : [],
      }).catch(() => {});
    } catch (alertErr) {
      console.error('[VIRTEX-SHIELD 2.0] Gagal kirim alert ke vault:', alertErr.message);
    }

    recordThreatIncident({
      attacker: senderNumber || 'unknown',
      reason: analysis.reason,
      severity: analysis.severity,
      category,
      action: actionSummary,
      chatJid,
    });

    // Berhasil dinetralisir, caller WAJIB return/drop pesan ini
    return true;
  } catch (err) {
    console.error('[VIRTEX-SHIELD 2.0] Error saat memeriksa pesan:', err);
    return false;
  }
}

module.exports = {
  extractAllTextFromMessage,
  inspectVirtexPayload,
  inspectProtobufCrashVectors,
  looksLikeVirtex,
  interceptAndNeutralize,
  getDefenseStats,
  simulateScan,
  recordThreatIncident,
  setShieldActive,
  isShieldActive,
};
