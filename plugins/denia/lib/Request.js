/**
 * This file is part of the SairiDev Bot WhatsApp project, solely developed and maintained by SairiDev.
 * https://github.com/sairidev
 *
 * All rights reserved.
 *
 * - You are NOT allowed to copy, rewrite, modify, redistribute, or reuse this file in any form.
 * - You are NOT allowed to claim this file or any part of this project as your own.
 * - This credit notice must NOT be removed or altered.
 * - This file may ONLY be used within the SairiDev project.
 */

import { isMimeAudio, isMimeImage, isMimeVideo } from './Utilities.js'

export const request = async (url, options = {}) => {
   const controller = new AbortController()
   const timeoutId = setTimeout(() =>
      controller.abort(), requestTimeout)

   try {
      options.signal = controller.signal

      const response = await fetch(url, options)

      if (!response.ok) {
         await response.body?.cancel()
         throw new Error(response.statusText)
      }

      const contentType = response.headers.get('content-type')

      if (
         isMimeAudio(contentType) ||
         isMimeImage(contentType) ||
         isMimeVideo(contentType) ||
         contentType?.includes('octet')
      )
         return Buffer.from(await response.arrayBuffer())

      if (contentType?.startsWith('text'))
         return await response.text()

      return await response.json()
   }
   catch (error) {
      if (controller.signal.aborted)
         throw new Error(`Request timeout after ${requestTimeout}ms`)
      throw error
   }
   finally {
      clearTimeout(timeoutId)
   }
}

export const safeApiRequest = async (baseUrl, path = '', params = {}, options = {}) => {
   try {
      const qs = new URLSearchParams(params).toString()
      const fullUrl = `${baseUrl}${path}${qs ? '?' + qs : ''}`
      const res = await request(fullUrl, options)
      if (res && typeof res === 'object' && !Array.isArray(res) && !Buffer.isBuffer(res)) {
         return res
      }
      return { status: true, result: res }
   } catch (err) {
      console.warn(`[API Request Warning] ${baseUrl}${path} gagal:`, err.message)
      return { status: false, message: `Layanan API eksternal (${err.message}) sedang offline.` }
   }
}

export const deline = async (path = '', params = {}, options) =>
   safeApiRequest(`https://api.deline.web.id/`, path, params, options)

export const faa = async (path = '', params = {}, options) =>
   safeApiRequest(`https://api-faa.my.id/faa/`, path, params, options)

export const nekolabs = async (path = '', params = {}, options) =>
   safeApiRequest(`https://rynekoo-api.hf.space/`, path, params, options)

export const nexray = async (path = '', params = {}, options) => {
   const res = await safeApiRequest(`https://api.nexray.web.id/`, path, params, options)
   if (res && res.status) return res
   return await safeApiRequest(`https://api.deline.web.id/`, path, params, options)
}

export const zenzxz = async (path = '', params = {}, options) => {
   const res = await safeApiRequest(`https://api.siputzx.my.id/api/`, path, params, options)
   if (res && res.status) return res
   return await safeApiRequest(`https://api.deline.web.id/`, path, params, options)
}