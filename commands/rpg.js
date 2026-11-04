// commands/rpg.js — Handler Fitur RPG & Farming Economy Polaris (Fused with Group Rank & EXP)
const rpg = require('../lib/rpgEngine');
const groupLevelEngine = require('../lib/groupLevelEngine');
const { box, success, warning, usage, info } = require('../lib/messageStyle');

async function handleRpgCommand({ sock, chatJid, msg, command, args, senderNumber, reply }) {
  const isGroup = chatJid && chatJid.endsWith('@g.us');
  const userJid = msg.key.participant || msg.key.remoteJidAlt || `${senderNumber}@s.whatsapp.net`;
  const pushName = msg.pushName || 'Sahabat Polaris';

  switch (command) {
    case 'mining':
    case 'nambang': {
      const res = rpg.mine(senderNumber);
      if (!res.success) {
        await reply(warning('Penambangan Gagal', res.message));
        return;
      }

      // Fusi EXP: sinkronkan ke sistem Group Rank XP jika dimainkan di grup
      if (isGroup && groupLevelEngine.isPlayRankEnabled(chatJid)) {
        await groupLevelEngine.addXp(chatJid, userJid, res.exp, pushName, sock, msg);
      }

      const oreList = Object.entries(res.loot)
        .filter(([_, qty]) => qty > 0)
        .map(([name, qty]) => `• ${name.toUpperCase()}: +${qty}`)
        .join('\n');

      const card = box({
        prefix: 'POLARIS RPG',
        statusTag: 'MINING SUCCESS',
        title: 'HASIL PENAMBANGAN GUA ⛏️',
        body: `Hasil galian tambangmu:\n${oreList}\n\n✨ +${res.exp} RPG & Group XP | ⚡ Sisa Stamina: ${res.staminaLeft}${res.lvlInfo.levelUp ? `\n🎉 *LEVEL UP! Sekarang Level ${res.lvlInfo.newLevel}!*` : ''}`,
        footer: 'Ketik /pasar sellall untuk menjual hasil tambang ke pasar.',
      });
      await sock.sendMessage(chatJid, { text: card }, { quoted: msg });
      return;
    }

    case 'mancing':
    case 'fishing': {
      const res = rpg.fish(senderNumber);
      if (!res.success) {
        await reply(warning('Memancing Gagal', res.message));
        return;
      }

      // Fusi EXP: sinkronkan ke sistem Group Rank XP jika dimainkan di grup
      if (isGroup && groupLevelEngine.isPlayRankEnabled(chatJid)) {
        await groupLevelEngine.addXp(chatJid, userJid, res.exp, pushName, sock, msg);
      }

      const fishList = Object.entries(res.loot)
        .filter(([_, qty]) => qty > 0)
        .map(([name, qty]) => `• ${name.toUpperCase()}: +${qty}`)
        .join('\n');

      const card = box({
        prefix: 'POLARIS RPG',
        statusTag: 'FISHING SUCCESS',
        title: 'HASIL TANGKAPAN IKAN 🎣',
        body: `Tangkapan dari samudra:\n${fishList}\n\n✨ +${res.exp} RPG & Group XP | ⚡ Sisa Stamina: ${res.staminaLeft}${res.lvlInfo.levelUp ? `\n🎉 *LEVEL UP! Sekarang Level ${res.lvlInfo.newLevel}!*` : ''}`,
        footer: 'Ketik /pasar sellall untuk menjual tangkapan ke pasar.',
      });
      await sock.sendMessage(chatJid, { text: card }, { quoted: msg });
      return;
    }

    case 'hunt':
    case 'berburu': {
      const res = rpg.hunt(senderNumber);
      if (!res.success) {
        await reply(warning('Berburu Gagal', res.message));
        return;
      }

      // Fusi EXP: sinkronkan ke sistem Group Rank XP jika dimainkan di grup
      if (isGroup && groupLevelEngine.isPlayRankEnabled(chatJid)) {
        await groupLevelEngine.addXp(chatJid, userJid, res.exp, pushName, sock, msg);
      }

      const meatList = Object.entries(res.loot)
        .filter(([_, qty]) => qty > 0)
        .map(([name, qty]) => `• ${name.toUpperCase()}: +${qty}`)
        .join('\n');

      const card = box({
        prefix: 'POLARIS RPG',
        statusTag: 'HUNTING SUCCESS',
        title: 'HASIL PERBURUAN HUTAN 🏹',
        body: `Hasil buruan liar:\n${meatList}\n\n✨ +${res.exp} RPG & Group XP | ⚡ Sisa Stamina: ${res.staminaLeft}${res.lvlInfo.levelUp ? `\n🎉 *LEVEL UP! Sekarang Level ${res.lvlInfo.newLevel}!*` : ''}`,
        footer: 'Ketik /pasar sellall untuk menjual hasil buruan ke pasar.',
      });
      await sock.sendMessage(chatJid, { text: card }, { quoted: msg });
      return;
    }

    case 'pasar':
    case 'market': {
      const sub = (args[0] || '').toLowerCase();
      if (sub === 'sellall' || sub === 'jualsemua') {
        const res = rpg.sellAll(senderNumber);
        if (!res.success) {
          await reply(warning('Pasar Polaris', res.message));
          return;
        }
        const card = box({
          prefix: 'POLARIS RPG',
          statusTag: 'MARKET TRADE',
          title: 'PENJUALAN HASIL PANEN 💰',
          body: `Barang terjual:\n${res.soldItems.map(i => `• ${i}`).join('\n')}\n\n💵 *Total Pendapatan:* +${res.totalCoins.toLocaleString()} Koin Emas\n💳 *Saldo Tunai Saat Ini:* ${res.newBalance.toLocaleString()} Koin`,
          footer: 'Amankan uangmu di bank dengan /bank deposit <jumlah>',
        });
        await sock.sendMessage(chatJid, { text: card }, { quoted: msg });
        return;
      }

      // Tampilkan katalog harga pasar
      const priceCatalog = Object.entries(rpg.MARKET_PRICES)
        .map(([item, pr]) => `• ${item.toUpperCase()}: ${pr.toLocaleString()} Koin`)
        .join('\n');
      const card = box({
        prefix: 'POLARIS RPG',
        statusTag: 'COMMODITY MARKET',
        title: 'PASAR KOMODITAS POLARIS 🏪',
        body: `Daftar Harga Jual Komoditas:\n${priceCatalog}\n\nKetik */pasar sellall* untuk menjual semua hasil panenmu langsung!`,
        footer: 'Harga komoditas stabil dan dijamin oleh Dewan Polaris.',
      });
      await sock.sendMessage(chatJid, { text: card }, { quoted: msg });
      return;
    }

    case 'bank': {
      const action = (args[0] || '').toLowerCase();
      const amount = args[1];

      if (action === 'deposit' || action === 'nabung') {
        const res = rpg.deposit(senderNumber, amount || 'all');
        if (!res.success) {
          await reply(warning('Gagal Setor Bank', res.message));
          return;
        }
        await reply(success('Setoran Bank Berhasil', `🏦 Setor: +${res.deposited.toLocaleString()} Koin\n💵 Saldo Tunai: ${res.money.toLocaleString()} Koin\n💳 Saldo Bank: ${res.bank.toLocaleString()} Koin`));
        return;
      }

      if (action === 'withdraw' || action === 'tarik') {
        const res = rpg.withdraw(senderNumber, amount || 'all');
        if (!res.success) {
          await reply(warning('Gagal Tarik Bank', res.message));
          return;
        }
        await reply(success('Penarikan Bank Berhasil', `🏦 Tarik: ${res.withdrawn.toLocaleString()} Koin\n💵 Saldo Tunai: ${res.money.toLocaleString()} Koin\n💳 Saldo Bank: ${res.bank.toLocaleString()} Koin`));
        return;
      }

      const user = rpg.getUser(senderNumber);
      await reply(info('Bank Sentral Polaris', `👤 Rekening: @${senderNumber}\n💵 Uang Tunai (Bisa Dicuri): ${user.money.toLocaleString()} Koin\n💳 Saldo Aman di Bank: ${user.bank.toLocaleString()} Koin\n\n_Perintah:_\n• /bank deposit <jumlah/all>\n• /bank withdraw <jumlah/all>`));
      return;
    }

    case 'daily':
    case 'klaim': {
      const res = rpg.claimDaily(senderNumber);
      if (!res.success) {
        await reply(warning('Hadiah Harian', res.message));
        return;
      }

      // Fusi EXP harian ke Group Rank XP jika di grup
      if (isGroup && groupLevelEngine.isPlayRankEnabled(chatJid)) {
        await groupLevelEngine.addXp(chatJid, userJid, res.exp, pushName, sock, msg);
      }

      await reply(success('Hadiah Harian Diklaim! 🎁', `💵 Koin Emas: +${res.cash.toLocaleString()}\n✨ EXP: +${res.exp} (RPG & Group XP)\n⚡ Stamina & HP Dipulihkan Penuh!${res.lvlInfo.levelUp ? `\n🎉 *LEVEL UP! Sekarang Level ${res.lvlInfo.newLevel}!*` : ''}`));
      return;
    }

    case 'slot':
    case 'casino': {
      const bet = args[0] || '1000';
      const res = rpg.playSlot(senderNumber, bet);
      if (!res.success) {
        await reply(warning('Slot Machine Gagal', res.message));
        return;
      }
      const reelStr = `[ ${res.reels.join(' | ')} ]`;
      if (res.isWin) {
        // Bonus kemenangan slot memberi sedikit EXP
        if (isGroup && groupLevelEngine.isPlayRankEnabled(chatJid)) {
          await groupLevelEngine.addXp(chatJid, userJid, 25, pushName, sock, msg);
        }
        rpg.addRpgExpAndCoins(senderNumber, 25, 0);
        await reply(success('JACKPOT MENANG! 🎰', `${reelStr}\n\n🎉 Kamu menang +${res.winAmount.toLocaleString()} Koin (+25 XP)!\n💳 Saldo sekarang: ${res.newBalance.toLocaleString()} Koin`));
      } else {
        await reply(warning('Kamu Belum Beruntung! 🎰', `${reelStr}\n\n💸 Kamu kehilangan ${res.bet.toLocaleString()} koin.\n💳 Sisa saldo: ${res.newBalance.toLocaleString()} Koin`));
      }
      return;
    }

    case 'rpgprofile':
    case 'profile':
    case 'inv':
    case 'inventory': {
      const p = rpg.getProfile(senderNumber);

      let groupRankInfo = '';
      if (isGroup) {
        try {
          const rCard = groupLevelEngine.getRankCard(chatJid, userJid, pushName, senderNumber);
          if (rCard && rCard.currentTier) {
            groupRankInfo = `\n🎖️ *RANK GRUP:* ${rCard.currentTier.badge} ${rCard.currentTier.name} (Lvl ${rCard.level}, ${rCard.currentXp.toLocaleString()} XP)`;
          }
        } catch (_) {}
      }

      const card = box({
        prefix: 'POLARIS RPG',
        statusTag: `LVL ${p.level}`,
        title: `PROFIL KARAKTER @${senderNumber}`,
        body: `❤️ *HP:* ${p.hp}\n⚡ *Stamina:* ${p.stamina}\n⭐ *RPG EXP:* ${p.exp} / ${p.expNeeded}${groupRankInfo}\n\n💰 *KEKAYAAN:*\n• Uang Tunai: Rp ${p.money}\n• Tabungan Bank: Rp ${p.bank}\n• Estimasi Net Worth: Rp ${p.netWorth}\n\n📦 *INVENTORY PANEN:*\n• Tambang: ${p.mining.batu} Batu, ${p.mining.besi} Besi, ${p.mining.perak} Perak, ${p.mining.emas} Emas, ${p.mining.berlian} Berlian\n• Pancing: ${p.fishing.ikan} Ikan, ${p.fishing.lele} Lele, ${p.fishing.udang} Udang, ${p.fishing.kepiting} Kepiting, ${p.fishing.lobster} Lobster\n• Buruan: ${p.hunting.ayam} Ayam, ${p.hunting.kelinci} Kelinci, ${p.hunting.rusa} Rusa, ${p.hunting.babi} Babi, ${p.hunting.banteng} Banteng, ${p.hunting.harimau} Harimau`,
        footer: 'Gunakan /pasar sellall untuk menukar hasil panen menjadi koin emas.',
      });
      await sock.sendMessage(chatJid, { text: card, mentions: [`${senderNumber}@s.whatsapp.net`] }, { quoted: msg });
      return;
    }

    default:
      return;
  }
}

module.exports = { handleRpgCommand };
