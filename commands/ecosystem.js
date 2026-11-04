// commands/ecosystem.js — Handler Command Kontrol Ekosistem Grup Polaris Bot
// Menyediakan /bindeco, /listeco, dan /synceco untuk Owner

const { 
  ECOSYSTEM_SPECS, 
  bindGroupToEcosystem, 
  ensureEcosystemGroups, 
  getEcosystemDiagnostics, 
  getSavedData,
  inviteOwnerToAllEcosystemGroups,
  logEcosystemTerminalError,
} = require('../lib/botEcosystemGroups');
const { isOwner } = require('../lib/accessControl');
const { success, warning, denied, info } = require('../lib/messageStyle');
const { isGroupJid } = require('../lib/helpers');

/**
 * Memformat tanggal timestamp ke format lokal Indonesia
 */
function formatDate(isoOrTs) {
  if (!isoOrTs) return 'Tidak diketahui';
  try {
    const d = new Date(isoOrTs);
    if (isNaN(d.getTime())) return 'Tidak diketahui';
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (_) {
    return 'Tidak diketahui';
  }
}

/**
 * Handler utama command ekosistem
 */
async function handleEcosystemCommand({ sock, chatJid, msg, senderNumber, command, args, reply }) {
  if (!isOwner(senderNumber)) {
    await reply(denied('Akses Ditolak', 'Command ekosistem hanya dapat dijalankan oleh Owner Bot.'));
    return;
  }

  const sub = (args[0] || '').toLowerCase().trim();

  // 1. Command: /listeco
  if (command === 'listeco' || (command === 'bindeco' && sub === 'list')) {
    try {
      const diag = await getEcosystemDiagnostics(sock);
      const comm = diag.community;

      const lines = [
        `╔════════════════════════════════════╗`,
        `  🌐 *[ POLARIS ECOSYSTEM DASHBOARD ]*`,
        `╚════════════════════════════════════╝`,
        ``,
        `🏛️ *Komunitas Resmi:*`,
        `• *Nama:* ${comm.subject}`,
        `• *JID:* \`${comm.jid || 'Belum Terhubung'}\``,
        `• *Status:* ${comm.isActive ? '🟢 AKTIF' : '🔴 TIDAK TERDETEKSI'}`,
        comm.inviteLink ? `• *Link:* ${comm.inviteLink}` : '',
        ``,
        `👥 *Daftar 5 Ruang Operasional Ekosistem:*`,
      ];

      for (const g of diag.groups) {
        lines.push(`──────────────────────────────`);
        lines.push(`📌 *Kategori [${g.key.toUpperCase()}]:* ${g.specSubject}`);
        lines.push(`• *Nama Grup:* ${g.activeSubject || 'Belum Dikenali'}`);
        lines.push(`• *JID:* \`${g.jid || 'Kosong / Belum Diikat'}\``);
        lines.push(`• *Dibuat:* ${formatDate(g.creationTime)}`);
        lines.push(`• *Status:* ${g.isActive ? '🟢 AKTIF' : '🔴 OFFLINE'}`);
        lines.push(`• *Key Tag:* ${g.hasTag ? '✅ Terpasang di Deskripsi' : '⚠️ Belum Terpasang'}`);
        lines.push(`• *Komunitas:* ${g.linkedToCommunity ? '✅ Tertaut' : '❌ Belum Tertaut'}`);
        if (g.isBotAdmin) lines.push(`• *Admin Bot:* ✅ Ya`);
        if (g.participantCount) lines.push(`• *Member:* ${g.participantCount} peserta`);
        if (g.inviteLink) lines.push(`• *Link:* ${g.inviteLink}`);
      }

      lines.push(`──────────────────────────────`);
      lines.push(`💡 *Petunjuk Penggunaan:*`);
      lines.push(`• Ketik */bindeco <kategori>* di dalam grup untuk mengikatnya.`);
      lines.push(`• Pilihan: \`news\`, \`logs\`, \`vault\`, \`sandbox\`, \`academy\`.`);
      lines.push(`• Ketik */synceco* untuk audit & auto-healing seluruh grup.`);
      lines.push(`• Ketik */inteco* untuk auto-invite Owner ke seluruh 5 grup & Komunitas.`);

      await reply(lines.filter(Boolean).join('\n'));
      return;
    } catch (err) {
      logEcosystemTerminalError('Gagal Membuka Dashboard Ekosistem (/listeco)', err, {
        command,
        sub,
        senderNumber,
        chatJid,
      });
      await reply(warning('Dashboard Gagal', `Terjadi kesalahan saat memuat dashboard ekosistem: ${err.message}`));
      return;
    }
  }

  // 2. Command: /synceco atau /bindeco auto
  if (command === 'synceco' || (command === 'bindeco' && (sub === 'auto' || sub === 'sync'))) {
    await reply(info('Sinkronisasi Ekosistem', 'Sedang menjalankan audit grup, evaluasi umur via tie-breaker, dan auto-healing key injection...'));
    try {
      const res = await ensureEcosystemGroups(sock, true);
      const diag = await getEcosystemDiagnostics(sock);
      
      const successCount = diag.groups.filter((g) => g.isActive).length;
      const tagCount = diag.groups.filter((g) => g.hasTag).length;
      const linkedCount = diag.groups.filter((g) => g.linkedToCommunity).length;

      const summaryText = [
        `✅ *Audit & Sinkronisasi Selesai!*`,
        `──────────────────────────────`,
        `• *Grup Terhubung:* ${successCount} / 5 Grup Aktif`,
        `• *Digital Signature Tag:* ${tagCount} / 5 Terpasang`,
        `• *Tertaut Komunitas:* ${linkedCount} / 5 Grup`,
        `• *Komunitas:* ${diag.community.isActive ? '🟢 Terhubung' : '⚠️ Belum Siap'}`,
        ``,
        `Ketik */listeco* untuk melihat detail JID dan tautan undangan.`,
      ].join('\n');

      await reply(success('Sinkronisasi Berhasil', summaryText));
    } catch (err) {
      logEcosystemTerminalError('Gagal Sinkronisasi Ekosistem (/synceco)', err, {
        command,
        sub,
        senderNumber,
        chatJid,
      });
      await reply(warning('Sinkronisasi Gagal', `Terjadi kendala saat sinkronisasi: ${err.message}`));
    }
    return;
  }

  // 3. Command: /inteco atau /bindeco invite (Auto invite Owner ke seluruh grup ekosistem)
  if (command === 'inteco' || (command === 'bindeco' && (sub === 'invite' || sub === 'join'))) {
    await reply(info('Memproses Undangan Ekosistem', 'Sedang memverifikasi keanggotaan dan menambahkan Owner ke seluruh 5 ruang ekosistem Polaris...'));
    try {
      const res = await inviteOwnerToAllEcosystemGroups(sock, senderNumber);
      if (!res.success) {
        logEcosystemTerminalError('Gagal Memproses Undangan Ekosistem (/inteco)', new Error(res.reason || 'Unknown error'), {
          command,
          senderNumber,
          chatJid,
          reason: res.reason,
        });
        await reply(warning('Gagal Memproses', `Tidak dapat memproses undangan: ${res.reason || 'Unknown error'}`));
        return;
      }

      const report = [
        `🎟️ *[ POLARIS ECOSYSTEM OWNER INVITATION ]*`,
        `──────────────────────────────`,
        `Halo Owner! Status keanggotaan Anda di seluruh ruang ekosistem:`,
        ``,
      ];

      for (const r of res.results) {
        let statusIcon = '✅';
        let statusText = 'Berhasil Ditambahkan';
        if (r.status === 'already_member') {
          statusIcon = '🟢';
          statusText = 'Sudah Menjadi Anggota';
        } else if (r.status === 'invite_sent') {
          statusIcon = '📨';
          statusText = 'Link Undangan Dikirim via DM (Privasi Akun Aktif)';
        } else if (r.status === 'skip' || r.status === 'failed') {
          statusIcon = '⚠️';
          statusText = `Belum Siap (${r.reason || 'Offline'})`;
        }
        report.push(`${statusIcon} *[${r.key.toUpperCase()}] ${r.subject}*`);
        report.push(`   ↳ Status: ${statusText}`);
        if (r.link) report.push(`   ↳ Link: ${r.link}`);
      }

      if (res.communityLink) {
        report.push(``);
        report.push(`🌐 *Komunitas Induk Polaris:*`);
        report.push(`   ↳ ${res.communityLink}`);
      }

      report.push(``);
      report.push(`💡 Seluruh link undangan privat juga telah dikirimkan ke obrolan pribadi Anda.`);

      await reply(success('Undangan Ekosistem Selesai', report.join('\n')));
    } catch (err) {
      logEcosystemTerminalError('Gagal Memproses Undangan Ekosistem (/inteco)', err, {
        command,
        sub,
        senderNumber,
        chatJid,
      });
      await reply(warning('Kendala Undangan', `Terjadi error saat memproses /inteco: ${err.message}`));
    }
    return;
  }

  // 4. Command: /bindeco <kategori> [targetJid]
  if (command === 'bindeco') {
    if (!sub || sub === 'help') {
      const validKeys = ECOSYSTEM_SPECS.map((s) => `\`${s.key}\``).join(', ');
      const helpText = [
        `*Panduan Pengikatan Grup Ekosistem Polaris:*`,
        `──────────────────────────────`,
        `Ketik command di dalam grup yang ingin diikat:`,
        `👉 */bindeco <kategori>*`,
        ``,
        `Atau tentukan JID secara langsung:`,
        `👉 */bindeco <kategori> <grupJid>*`,
        ``,
        `📋 *Kategori Tersedia:*`,
        validKeys,
        ``,
        `• \`news\`: Polaris • Global Hot News`,
        `• \`logs\`: Polaris • System & Error Logs`,
        `• \`vault\`: Polaris • Output & Artifact Vault`,
        `• \`sandbox\`: Polaris • AI Agent Sandbox`,
        `• \`academy\`: Polaris • Belajar & Polymath Genius`,
      ].join('\n');
      await reply(info('Panduan /bindeco', helpText));
      return;
    }

    // Tentukan target JID (argumen kedua atau chatJid saat ini jika di grup)
    let targetJid = args[1] ? args[1].trim() : null;
    if (!targetJid) {
      if (isGroupJid(chatJid)) {
        targetJid = chatJid;
      } else {
        await reply(warning('Bukan di Grup', 'Sertakan JID grup tujuan jika menjalankan command di private chat:\n`/bindeco <kategori> <JID_GRUP>`'));
        return;
      }
    }

    // Format JID jika belum ada @g.us
    if (!targetJid.includes('@')) {
      targetJid = `${targetJid}@g.us`;
    }

    await reply(info('Memproses Pengikatan', `Sedang mengikat grup ${targetJid} ke kategori [${sub.toUpperCase()}]...`));

    try {
      const result = await bindGroupToEcosystem(sock, sub, targetJid);
      if (!result.success) {
        logEcosystemTerminalError('Gagal Mengikat Grup (/bindeco)', new Error(result.message), {
          sub,
          targetJid,
          senderNumber,
          chatJid,
        });
        await reply(warning('Gagal Mengikat Grup', result.message));
        return;
      }

      const report = [
        `🎉 *Grup Berhasil Diikat & Dilindungi!*`,
        `──────────────────────────────`,
        `• *Kategori:* [${result.key.toUpperCase()}]`,
        `• *Nama Grup:* ${result.subject}`,
        `• *JID:* \`${result.jid}\``,
        `• *Dibuat:* ${formatDate(result.creationTime)}`,
        `• *Status Admin Bot:* ${result.isBotAdmin ? '✅ Admin' : '⚠️ Bukan Admin (Jadikan bot admin agar bisa taut komunitas)'}`,
        `• *Digital Signature Tag:* ${result.tagInjected ? '✅ Berhasil Disuntikkan' : '⚠️ Menunggu Hak Admin'}`,
        `• *Tertaut Komunitas:* ${result.linkedToCommunity ? '✅ Sukses Tertaut' : '⚠️ Belum Tertaut'}`,
        ``,
        `🔒 *Data Protection Active:* Riwayat percakapan dan info penting di grup ini 100% aman dan permanen terkunci untuk bot.`,
      ].join('\n');

      await reply(success('Pengikatan Sukses', report));
    } catch (err) {
      logEcosystemTerminalError('Gagal Mengeksekusi Pengikatan Grup (/bindeco)', err, {
        sub,
        targetJid,
        senderNumber,
        chatJid,
      });
      await reply(warning('Kendala Pengikatan', `Terjadi error saat memproses /bindeco: ${err.message}`));
    }
  }
}

module.exports = {
  handleEcosystemCommand,
};
