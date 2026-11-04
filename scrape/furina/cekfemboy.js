const { generateCard } = require('@kyzzknz/femboy-canvas')

async function getFemboyCard(nama, avatarBuf, botname = 'Alya chan', website = 'Alya Chan Official') {

    let pct = Math.floor(Math.random() * (85 - 35 + 1) + 35)
    if (Math.random() < 0.15) pct = Math.floor(Math.random() * 35)
    if (Math.random() < 0.08) pct = Math.floor(Math.random() * 10 + 90)
    if (Math.random() < 0.03) pct = 69

    try {
        const card = await generateCard(nama, pct, avatarBuf, botname, website)
        return {
            card,
            pct
        }
    } catch (e) {
        console.error(e)
        throw new Error('Gagal membuat gambar femboy canvas')
    }
}

module.exports = { getFemboyCard }