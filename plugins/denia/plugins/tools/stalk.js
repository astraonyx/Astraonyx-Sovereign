import { fetchAsBuffer, formatNumber, formatTime, frame } from '../../lib/Utilities.js'

async function getRobloxUser(username) {
   const lookupRes = await fetch('https://users.roblox.com/v1/usernames/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernames: [username], excludeBannedUsers: false })
   })
   const lookup = await lookupRes.json()
   const user = lookup.data?.[0]
   if (!user) return null

   const [detailRes, avatarRes] = await Promise.all([
      fetch(`https://users.roblox.com/v1/users/${user.id}`).then(r => r.json()).catch(() => null),
      fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${user.id}&size=420x420&format=Png&isCircular=false`).then(r => r.json()).catch(() => null)
   ])

   const avatarUrl = avatarRes?.data?.[0]?.imageUrl || ''

   return {
      id: user.id,
      name: user.name,
      displayName: user.displayName || user.name,
      hasVerifiedBadge: user.hasVerifiedBadge,
      created: detailRes?.created || '',
      description: detailRes?.description || 'No description.',
      avatar: avatarUrl
   }
}

export default {
   command: ['dcstalk', 'ffstalk', 'igstalk', 'robloxstalk', 'ttstalk'],
   category: 'tools',
   async run(m, {
      sock,
      isPrefix,
      command,
      args
   }) {
      try {
         if (command === 'robloxstalk') {
            if (!args[0])
               return m.reply(`👉🏻 *Example*: ${isPrefix + command} Roblox`)
            m.react('🕒')

            const data = await getRobloxUser(args[0])
            if (!data)
               return m.reply('❌ Roblox user not found.')

            const printInfo = frame('ROBLOX STALK', [
               `*ID*: ${data.id}`,
               `*Name*: ${data.name}`,
               `*Display Name*: ${data.displayName}`,
               `*Verified*: ${data.hasVerifiedBadge ? '✅' : '❌'}`,
               `*Created At*: ${data.created ? formatTime(undefined, Date.parse(data.created)) : '-'}`
            ], '🎮')

            const printBio = frame('BIO', [
               data.description.length > 250 ? data.description.slice(0, 250) + '...' : data.description
            ], '💭')

            if (data.avatar) {
               await sock.sendMedia(m.chat, data.avatar, `${printInfo}\n\n${printBio}`, m)
            } else {
               m.reply(`${printInfo}\n\n${printBio}`)
            }
         }
         else if (command === 'igstalk') {
            if (!args[0])
               return m.reply(`👉🏻 *Example*: ${isPrefix + command} instagram`)
            m.react('🕒')
            const username = args[0].replace(/^@/, '')
            const printInfo = frame('INSTAGRAM STALK', [
               `*Username*: @${username}`,
               `*Profile Link*: https://instagram.com/${username}`
            ], '📸')
            m.reply(printInfo)
         }
         else if (command === 'ttstalk') {
            if (!args[0])
               return m.reply(`👉🏻 *Example*: ${isPrefix + command} khaby.lame`)
            m.react('🕒')
            const username = args[0].replace(/^@/, '')
            const printInfo = frame('TIKTOK STALK', [
               `*Username*: @${username}`,
               `*Profile Link*: https://tiktok.com/@${username}`
            ], '🎵')
            m.reply(printInfo)
         }
         else if (command === 'dcstalk') {
            if (!args[0])
               return m.reply(`👉🏻 *Example*: ${isPrefix + command} 1355400581027729428`)
            m.react('🕒')
            const printInfo = frame('DISCORD STALK', [
               `*User ID*: ${args[0]}`,
               `*Lookup URL*: https://discord.id/?prefill=${args[0]}`
            ], '💬')
            m.reply(printInfo)
         }
         else if (command === 'ffstalk') {
            if (!args[0])
               return m.reply(`👉🏻 *Example*: ${isPrefix + command} 16207002`)
            m.react('🕒')
            const printInfo = frame('FREE FIRE STALK', [
               `*Player ID*: ${args[0]}`,
               `*Region*: Indonesia`
            ], '🔥')
            m.reply(printInfo)
         }
      }
      catch (error) {
         console.error(error)
         m.reply('❌ ' + error.message)
      }
   },
   premium: true,
   limit: 1
}