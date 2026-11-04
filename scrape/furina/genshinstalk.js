const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeEnkaProfile(uid) {
  const url = `https://enka.network/u/${uid}/`;
  
  const { data: html } = await axios.get(url);
  const $ = cheerio.load(html);
  
  const result = {
    uid,
    playerInfo: {
      nickname: '',
      level: 0,
      signature: '',
      worldLevel: 0,
      achievements: 0,
      spiralAbyss: '',
      theater: '',
      stygianOnslaught: '',
      avatar: ''
    },
    characters: []
  };

  const nickname = $('h1.svelte-ea8b6b').first().text().trim();
  if (nickname) result.playerInfo.nickname = nickname;

  const arText = $('.ar.svelte-ea8b6b').text().trim();
  const arMatch = arText.match(/AR (\d+)/);
  if (arMatch) result.playerInfo.level = parseInt(arMatch[1]);
  
  const wlMatch = arText.match(/WL (\d+)/);
  if (wlMatch) result.playerInfo.worldLevel = parseInt(wlMatch[1]);
  
  const signature = $('.signature.svelte-ea8b6b').text().trim();
  if (signature) result.playerInfo.signature = signature;

  const avatarImg = $('.avatar-icon img').attr('src');
  if (avatarImg) {
    result.playerInfo.avatar = avatarImg.startsWith('http') 
      ? avatarImg 
      : `https://enka.network${avatarImg}`;
  }

  $('.stat.svelte-1dtsens').each((i, el) => {
    const td = $(el).find('td');
    const value = $(td[0]).text().trim();
    const label = $(td[2]).text().trim();
    
    if (label.includes('Total Achievement')) {
      result.playerInfo.achievements = parseInt(value) || 0;
    } else if (label.includes('Spiral Abyss')) {
      result.playerInfo.spiralAbyss = value;
    } else if (label.includes('Imaginarium Theater')) {
      result.playerInfo.theater = value;
    } else if (label.includes('Stygian Onslaught')) {
      result.playerInfo.stygianOnslaught = value;
    }
  });

  $('.avatar.live').each((i, el) => {
    const imgStyle = $(el).find('.chara').attr('style') || '';
    const bgMatch = imgStyle.match(/url\(['"]?([^'"]+)['"]?\)/);
    const nameMatch = imgStyle.match(/Side[._]([^.]+)/);
    const levelText = $(el).find('.level').text().trim();
    
    const charData = {
      id: i + 1,
      name: nameMatch ? nameMatch[1] : '',
      level: parseInt(levelText) || 0,
      icon: bgMatch ? `https://enka.network${bgMatch[1]}` : '',
      constellation: 0,
      talents: [],
      weapon: null,
      artifacts: [],
      stats: {},
      card: null
    };

    result.characters.push(charData);
  });

  $('.card-scroll .Card').each((cardIndex, cardEl) => {
    const card = $(cardEl);
    
    const cardName = card.find('.name').text().trim().replace('▴', '').replace('wibutzy', '').trim();
    
    const character = result.characters.find(char => 
      cardName.toLowerCase().includes(char.name.toLowerCase()) || 
      char.name.toLowerCase().includes(cardName.toLowerCase())
    );
    
    if (character) {
      const levelMatch = card.find('.level').text().match(/Lv\. (\d+)\s*\/\s*(\d+)/);
      const friendship = card.find('.fren').text().trim().match(/\d+/)?.[0] || 0;
      
      character.card = {
        name: cardName,
        level: parseInt(levelMatch?.[1]) || 0,
        maxLevel: parseInt(levelMatch?.[2]) || 0,
        friendship: parseInt(friendship) || 0,
        uid: card.find('.uid').text().trim() || uid,
        constellation: card.find('.Consts .icon img').length || 0,
        talents: [],
        weapon: null,
        artifacts: [],
        stats: {}
      };

      const talents = [];
      card.find('.Talents .icon .level').each((i, el) => {
        const levelText = $(el).text().trim().replace('up', '');
        talents.push(parseInt(levelText) || 0);
      });
      character.card.talents = talents.map(level => ({ level }));

      const weaponName = card.find('.Weapon .title span').text().trim();
      if (weaponName) {
        const weaponLevel = card.find('.Weapon .level').text().trim();
        const weaponLevelMatch = weaponLevel.match(/Lv\. (\d+)\s*\/\s*(\d+)/);
        const weaponRefine = card.find('.Weapon .refine').text().trim();
        const weaponRefineMatch = weaponRefine.match(/R(\d+)/);
        const weaponIcon = card.find('.Weapon .WeaponIcon').attr('src');
        const weaponStars = card.find('.Weapon .Stars span').length;
        
        const weaponStats = [];
        card.find('.Weapon .stats .Substat').each((i, el) => {
          const value = $(el).find('span').last().text().trim();
          weaponStats.push(value);
        });
        
        character.card.weapon = {
          name: weaponName,
          level: parseInt(weaponLevelMatch?.[1]) || 0,
          maxLevel: parseInt(weaponLevelMatch?.[2]) || 0,
          refinement: parseInt(weaponRefineMatch?.[1]) || 1,
          icon: weaponIcon ? `https://enka.network${weaponIcon}` : '',
          stars: weaponStars || 0,
          baseAtk: weaponStats[0] || 0,
          substat: weaponStats[1] || null
        };
      }

      const stats = {};
      card.find('.StatsTable .row').each((i, el) => {
        const label = $(el).find('.mid span:first-child').text().trim();
        const value = $(el).find('.mid span:last-child').text().trim().replace(',', '');
        const subValue = $(el).find('.small span span').text().trim().replace(',', '');
        
        if (label === 'HP') {
          stats.hp = parseInt(value) || 0;
          const baseMatch = subValue.match(/(\d+)\s*\+/);
          const bonusMatch = subValue.match(/\+\s*(\d+)/);
          if (baseMatch) stats.hpBase = parseInt(baseMatch[1]) || 0;
          if (bonusMatch) stats.hpBonus = parseInt(bonusMatch[1]) || 0;
        }
        if (label === 'ATK') {
          stats.atk = parseInt(value) || 0;
          const baseMatch = subValue.match(/(\d+)\s*\+/);
          const bonusMatch = subValue.match(/\+\s*(\d+)/);
          if (baseMatch) stats.atkBase = parseInt(baseMatch[1]) || 0;
          if (bonusMatch) stats.atkBonus = parseInt(bonusMatch[1]) || 0;
        }
        if (label === 'DEF') {
          stats.def = parseInt(value) || 0;
          const baseMatch = subValue.match(/(\d+)\s*\+/);
          const bonusMatch = subValue.match(/\+\s*(\d+)/);
          if (baseMatch) stats.defBase = parseInt(baseMatch[1]) || 0;
          if (bonusMatch) stats.defBonus = parseInt(bonusMatch[1]) || 0;
        }
        if (label === 'Elemental Mastery') stats.em = parseInt(value) || 0;
        if (label === 'CRIT Rate') stats.cr = parseFloat(value) || 0;
        if (label === 'CRIT DMG') stats.cd = parseFloat(value) || 0;
        if (label === 'Energy Recharge') stats.er = parseFloat(value) || 0;
        if (label.includes('DMG Bonus')) {
          if (label.includes('Physical')) stats.physicalDmg = parseFloat(value) || 0;
          else stats.elementalDmg = parseFloat(value) || 0;
        }
      });
      character.card.stats = stats;

      const artifacts = [];
      card.find('.Artifact').each((i, el) => {
        const mainStatValue = $(el).find('.mainstat .svelte-14f9a6o').first().text().trim();
        const stars = $(el).find('.Stars span').length;
        const level = $(el).find('.level').text().trim().replace('+', '');
        
        const substats = [];
        $(el).find('.substats .Substat').each((j, subEl) => {
          const val = $(subEl).find('span').last().text().trim();
          if (val) substats.push({ value: val });
        });
        
        artifacts.push({
          slot: ['Flower', 'Plume', 'Sands', 'Goblet', 'Circlet'][i] || '',
          level: parseInt(level) || 0,
          stars: stars || 0,
          mainStat: {
            value: mainStatValue
          },
          substats: substats
        });
      });
      character.card.artifacts = artifacts;

      const setName = card.find('.set .desc').text().trim();
      if (setName && character.card.artifacts.length) {
        character.card.artifacts.forEach(art => {
          art.setName = setName;
        });
      }
    }
  });

  return result;
}

module.exports = scrapeEnkaProfile;
