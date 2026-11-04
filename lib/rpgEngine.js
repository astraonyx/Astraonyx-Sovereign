// lib/rpgEngine.js — Polaris RPG & Farming Economy System
// Mengintegrasikan sistem Farming, Mining, Fishing, Hunting, Pasar Komoditas, dan Bank Sentral Polaris

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'database', 'rpg_users.json');

// Harga pasar dasar per komoditas (Koin Emas Polaris)
const MARKET_PRICES = {
  // Tambang
  batu: 15,
  besi: 80,
  perak: 250,
  emas: 800,
  berlian: 4500,

  // Pancingan
  ikan: 35,
  lele: 65,
  udang: 120,
  kepiting: 350,
  lobster: 1100,

  // Buruan
  ayam: 45,
  kelinci: 90,
  rusa: 400,
  babi: 320,
  banteng: 1400,
  harimau: 3800,
};

let rpgData = null;

function loadDatabase() {
  if (rpgData) return rpgData;
  try {
    if (fs.existsSync(DB_PATH)) {
      const raw = fs.readFileSync(DB_PATH, 'utf-8');
      rpgData = JSON.parse(raw);
    } else {
      rpgData = {};
      saveDatabase();
    }
  } catch (err) {
    console.error('[RPGEngine] Gagal memuat database RPG:', err.message);
    rpgData = {};
  }
  return rpgData;
}

function saveDatabase() {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(rpgData, null, 2), 'utf-8');
  } catch (err) {
    console.error('[RPGEngine] Gagal menyimpan database RPG:', err.message);
  }
}

function defaultUser(userNumber) {
  return {
    userNumber,
    level: 1,
    exp: 0,
    hp: 100,
    maxHp: 100,
    stamina: 100,
    maxStamina: 100,
    money: 5000,
    bank: 10000,
    mining: {
      batu: 0,
      besi: 0,
      perak: 0,
      emas: 0,
      berlian: 0,
      lastMine: 0,
    },
    fishing: {
      ikan: 0,
      lele: 0,
      udang: 0,
      kepiting: 0,
      lobster: 0,
      lastFish: 0,
    },
    hunting: {
      ayam: 0,
      kelinci: 0,
      rusa: 0,
      babi: 0,
      banteng: 0,
      harimau: 0,
      lastHunt: 0,
    },
    lastDaily: 0,
    lastRob: 0,
  };
}

function getUser(userNumber) {
  const db = loadDatabase();
  if (!db[userNumber]) {
    db[userNumber] = defaultUser(userNumber);
    saveDatabase();
  }
  const user = db[userNumber];
  if (!user.stamina) user.stamina = 100;
  if (!user.maxStamina) user.maxStamina = 100;
  return user;
}

function addExp(user, amount) {
  user.exp = (user.exp || 0) + amount;
  const expNeeded = user.level * 250;
  if (user.exp >= expNeeded) {
    user.level += 1;
    user.exp -= expNeeded;
    user.maxHp += 15;
    user.hp = user.maxHp;
    user.maxStamina += 10;
    user.stamina = user.maxStamina;
    return { levelUp: true, newLevel: user.level };
  }
  return { levelUp: false, newLevel: user.level };
}

// Fusi XP & Koin: Digunakan saat memenangkan mini-games & tebak-tebakan
function addRpgExpAndCoins(userNumber, expAmount, coinsAmount = 0) {
  const user = getUser(userNumber);
  if (coinsAmount > 0) {
    user.money = (user.money || 0) + coinsAmount;
  }
  const lvlInfo = addExp(user, expAmount);
  saveDatabase();
  return { lvlInfo, user, expGained: expAmount, coinsGained: coinsAmount };
}

// Action: Mining
function mine(userNumber) {
  const user = getUser(userNumber);
  const now = Date.now();
  const cooldown = 3 * 60 * 1000; // 3 menit
  const remaining = (user.mining.lastMine || 0) + cooldown - now;

  if (remaining > 0) {
    const mins = Math.ceil(remaining / 60000);
    return { success: false, message: `⏳ Kamu kelelahan! Tunggu *${mins} menit* lagi sebelum bisa menambang kembali.` };
  }

  if (user.stamina < 15) {
    return { success: false, message: '⚡ Stamina kamu tidak cukup (minimal 15 stamina) untuk menambang! Istirahat dulu.' };
  }

  user.stamina -= 15;
  user.mining.lastMine = now;

  // Peluang dapat ore
  const rBatu = Math.floor(Math.random() * 15) + 5;
  const rBesi = Math.floor(Math.random() * 6) + 1;
  const rPerak = Math.random() > 0.4 ? Math.floor(Math.random() * 4) + 1 : 0;
  const rEmas = Math.random() > 0.7 ? Math.floor(Math.random() * 2) + 1 : 0;
  const rBerlian = Math.random() > 0.92 ? 1 : 0;

  user.mining.batu = (user.mining.batu || 0) + rBatu;
  user.mining.besi = (user.mining.besi || 0) + rBesi;
  user.mining.perak = (user.mining.perak || 0) + rPerak;
  user.mining.emas = (user.mining.emas || 0) + rEmas;
  user.mining.berlian = (user.mining.berlian || 0) + rBerlian;

  const expGain = 45 + rPerak * 10 + rEmas * 25 + rBerlian * 100;
  const lvlInfo = addExp(user, expGain);
  saveDatabase();

  return {
    success: true,
    loot: { batu: rBatu, besi: rBesi, perak: rPerak, emas: rEmas, berlian: rBerlian },
    exp: expGain,
    staminaLeft: user.stamina,
    lvlInfo,
  };
}

// Action: Fishing
function fish(userNumber) {
  const user = getUser(userNumber);
  const now = Date.now();
  const cooldown = 3 * 60 * 1000; // 3 menit
  const remaining = (user.fishing.lastFish || 0) + cooldown - now;

  if (remaining > 0) {
    const mins = Math.ceil(remaining / 60000);
    return { success: false, message: `⏳ Umpanmu habis! Tunggu *${mins} menit* lagi sebelum bisa memancing kembali.` };
  }

  if (user.stamina < 12) {
    return { success: false, message: '⚡ Stamina kamu tidak cukup (minimal 12 stamina) untuk memancing! Istirahat dulu.' };
  }

  user.stamina -= 12;
  user.fishing.lastFish = now;

  const rIkan = Math.floor(Math.random() * 10) + 3;
  const rLele = Math.floor(Math.random() * 5) + 1;
  const rUdang = Math.random() > 0.35 ? Math.floor(Math.random() * 4) + 1 : 0;
  const rKepiting = Math.random() > 0.65 ? Math.floor(Math.random() * 3) + 1 : 0;
  const rLobster = Math.random() > 0.88 ? 1 : 0;

  user.fishing.ikan = (user.fishing.ikan || 0) + rIkan;
  user.fishing.lele = (user.fishing.lele || 0) + rLele;
  user.fishing.udang = (user.fishing.udang || 0) + rUdang;
  user.fishing.kepiting = (user.fishing.kepiting || 0) + rKepiting;
  user.fishing.lobster = (user.fishing.lobster || 0) + rLobster;

  const expGain = 35 + rUdang * 8 + rKepiting * 20 + rLobster * 80;
  const lvlInfo = addExp(user, expGain);
  saveDatabase();

  return {
    success: true,
    loot: { ikan: rIkan, lele: rLele, udang: rUdang, kepiting: rKepiting, lobster: rLobster },
    exp: expGain,
    staminaLeft: user.stamina,
    lvlInfo,
  };
}

// Action: Hunting
function hunt(userNumber) {
  const user = getUser(userNumber);
  const now = Date.now();
  const cooldown = 3 * 60 * 1000;
  const remaining = (user.hunting.lastHunt || 0) + cooldown - now;

  if (remaining > 0) {
    const mins = Math.ceil(remaining / 60000);
    return { success: false, message: `⏳ Senjatamu perlu diisi ulang! Tunggu *${mins} menit* lagi sebelum bisa berburu kembali.` };
  }

  if (user.stamina < 20) {
    return { success: false, message: '⚡ Stamina kamu tidak cukup (minimal 20 stamina) untuk berburu! Istirahat dulu.' };
  }

  user.stamina -= 20;
  user.hunting.lastHunt = now;

  const rAyam = Math.floor(Math.random() * 6) + 2;
  const rKelinci = Math.floor(Math.random() * 4) + 1;
  const rRusa = Math.random() > 0.4 ? Math.floor(Math.random() * 2) + 1 : 0;
  const rBabi = Math.random() > 0.5 ? Math.floor(Math.random() * 2) + 1 : 0;
  const rBanteng = Math.random() > 0.8 ? 1 : 0;
  const rHarimau = Math.random() > 0.94 ? 1 : 0;

  user.hunting.ayam = (user.hunting.ayam || 0) + rAyam;
  user.hunting.kelinci = (user.hunting.kelinci || 0) + rKelinci;
  user.hunting.rusa = (user.hunting.rusa || 0) + rRusa;
  user.hunting.babi = (user.hunting.babi || 0) + rBabi;
  user.hunting.banteng = (user.hunting.banteng || 0) + rBanteng;
  user.hunting.harimau = (user.hunting.harimau || 0) + rHarimau;

  const expGain = 50 + rRusa * 15 + rBanteng * 40 + rHarimau * 120;
  const lvlInfo = addExp(user, expGain);
  saveDatabase();

  return {
    success: true,
    loot: { ayam: rAyam, kelinci: rKelinci, rusa: rRusa, babi: rBabi, banteng: rBanteng, harimau: rHarimau },
    exp: expGain,
    staminaLeft: user.stamina,
    lvlInfo,
  };
}

// Action: Sell all harvest items to Market
function sellAll(userNumber) {
  const user = getUser(userNumber);
  let totalCoins = 0;
  const soldItems = [];

  const checkCategory = (catName) => {
    const cat = user[catName] || {};
    for (const [item, count] of Object.entries(cat)) {
      if (item === 'lastMine' || item === 'lastFish' || item === 'lastHunt') continue;
      if (count > 0 && MARKET_PRICES[item]) {
        const itemVal = count * MARKET_PRICES[item];
        totalCoins += itemVal;
        soldItems.push(`${item} x${count} (${itemVal.toLocaleString()} koin)`);
        cat[item] = 0;
      }
    }
  };

  checkCategory('mining');
  checkCategory('fishing');
  checkCategory('hunting');

  if (totalCoins === 0) {
    return { success: false, message: '📦 Tas hasil panenmu kosong! Tambang, mancing, atau berburu dulu.' };
  }

  user.money = (user.money || 0) + totalCoins;
  saveDatabase();

  return {
    success: true,
    totalCoins,
    soldItems,
    newBalance: user.money,
  };
}

// Action: Bank Deposit
function deposit(userNumber, amount) {
  const user = getUser(userNumber);
  const amt = amount === 'all' ? (user.money || 0) : parseInt(amount, 10);

  if (!amt || amt <= 0 || amt > (user.money || 0)) {
    return { success: false, message: '❌ Jumlah uang tunai tidak mencukupi untuk disetor ke bank.' };
  }

  user.money -= amt;
  user.bank = (user.bank || 0) + amt;
  saveDatabase();

  return { success: true, deposited: amt, money: user.money, bank: user.bank };
}

// Action: Bank Withdraw
function withdraw(userNumber, amount) {
  const user = getUser(userNumber);
  const amt = amount === 'all' ? (user.bank || 0) : parseInt(amount, 10);

  if (!amt || amt <= 0 || amt > (user.bank || 0)) {
    return { success: false, message: '❌ Saldo bank kamu tidak mencukupi untuk ditarik.' };
  }

  user.bank -= amt;
  user.money = (user.money || 0) + amt;
  saveDatabase();

  return { success: true, withdrawn: amt, money: user.money, bank: user.bank };
}

// Action: Daily Claim
function claimDaily(userNumber) {
  const user = getUser(userNumber);
  const now = Date.now();
  const cooldown = 24 * 60 * 60 * 1000; // 24 jam
  const remaining = (user.lastDaily || 0) + cooldown - now;

  if (remaining > 0) {
    const hours = Math.ceil(remaining / 3600000);
    return { success: false, message: `⏳ Kamu sudah mengklaim hadiah harian! Tunggu *${hours} jam* lagi.` };
  }

  user.lastDaily = now;
  const rewardCash = 15000 + user.level * 2500;
  const rewardExp = 150;

  user.money = (user.money || 0) + rewardCash;
  user.stamina = user.maxStamina;
  user.hp = user.maxHp;
  const lvlInfo = addExp(user, rewardExp);
  saveDatabase();

  return {
    success: true,
    cash: rewardCash,
    exp: rewardExp,
    lvlInfo,
  };
}

// Action: Slot Machine
function playSlot(userNumber, betAmount) {
  const user = getUser(userNumber);
  const bet = parseInt(betAmount, 10);

  if (!bet || bet < 500 || bet > (user.money || 0)) {
    return { success: false, message: '❌ Taruhan minimal 500 koin dan tidak boleh melebihi saldo uang tunai kamu.' };
  }

  const symbols = ['💎', '👑', '🍒', '🍇', '🔔', '7️⃣'];
  const s1 = symbols[Math.floor(Math.random() * symbols.length)];
  const s2 = symbols[Math.floor(Math.random() * symbols.length)];
  const s3 = symbols[Math.floor(Math.random() * symbols.length)];

  user.money -= bet;

  let winMultiplier = 0;
  if (s1 === s2 && s2 === s3) {
    if (s1 === '7️⃣') winMultiplier = 15;
    else if (s1 === '👑') winMultiplier = 10;
    else if (s1 === '💎') winMultiplier = 7;
    else winMultiplier = 4;
  } else if (s1 === s2 || s2 === s3 || s1 === s3) {
    winMultiplier = 1.5;
  }

  const winAmount = Math.round(bet * winMultiplier);
  if (winAmount > 0) {
    user.money += winAmount;
  }
  saveDatabase();

  return {
    success: true,
    reels: [s1, s2, s3],
    isWin: winAmount > 0,
    winAmount,
    bet,
    newBalance: user.money,
  };
}

// Format Profile Card
function getProfile(userNumber) {
  const user = getUser(userNumber);
  const netWorth = (user.money || 0) + (user.bank || 0);

  return {
    userNumber,
    level: user.level,
    exp: user.exp,
    expNeeded: user.level * 250,
    hp: `${user.hp}/${user.maxHp}`,
    stamina: `${user.stamina}/${user.maxStamina}`,
    money: (user.money || 0).toLocaleString(),
    bank: (user.bank || 0).toLocaleString(),
    netWorth: netWorth.toLocaleString(),
    mining: user.mining,
    fishing: user.fishing,
    hunting: user.hunting,
  };
}

module.exports = {
  getUser,
  addExp,
  addRpgExpAndCoins,
  mine,
  fish,
  hunt,
  sellAll,
  deposit,
  withdraw,
  claimDaily,
  playSlot,
  getProfile,
  MARKET_PRICES,
};
