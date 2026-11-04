// lib/warnSystem.js — Sistem warning bersama, dipakai oleh semua fitur
// auto-moderasi Fase 5 (antilink, antibad, antispam, antivirtex) dan nanti
// command manual .warn/.resetwarn di Fase 6, supaya tidak dobel logic.

const { updateGroup, getGroup } = require('./groupSettings');

// Nambah 1 warning ke user di grup tsb. Balikin { count, limit, shouldKick }.
function addWarn(chatJid, userNumber) {
  const group = updateGroup(chatJid, (g) => {
    g.warnCounts[userNumber] = (g.warnCounts[userNumber] || 0) + 1;
  });
  const count = group.warnCounts[userNumber];
  const limit = group.warnLimit;
  return { count, limit, shouldKick: count >= limit };
}

function resetWarn(chatJid, userNumber) {
  updateGroup(chatJid, (g) => {
    delete g.warnCounts[userNumber];
  });
}

function getWarnCount(chatJid, userNumber) {
  const group = getGroup(chatJid);
  if (!group) return 0;
  return group.warnCounts[userNumber] || 0;
}

module.exports = { addWarn, resetWarn, getWarnCount };
