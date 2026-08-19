'use strict'

const crypto = require('crypto')
const fs = require('fs').promises
const os = require('os')
const path = require('path')
const { zip } = require('fflate')

function getBaileys() {
  try {
    return require('baileys')
  } catch (error) {
    const err = new Error(
      'StickerPack membutuhkan peer dependency "baileys". Install package Baileys yang sama dengan runtime bot.'
    )
    err.cause = error
    throw err
  }
}

function prepareMediaMaps() {
  const { MEDIA_PATH_MAP, MEDIA_HKDF_KEY_MAPPING } = getBaileys()

  if (!MEDIA_PATH_MAP['sticker-pack']) {
    MEDIA_PATH_MAP['sticker-pack'] = '/mms/sticker-pack'
  }

  if (!MEDIA_PATH_MAP['sticker-pack-thumbnail']) {
    MEDIA_PATH_MAP['sticker-pack-thumbnail'] = '/mms/thumbnail-sticker-pack'
  }

  if (!MEDIA_HKDF_KEY_MAPPING['sticker-pack']) {
    MEDIA_HKDF_KEY_MAPPING['sticker-pack'] = 'Sticker Pack'
  }

  if (!MEDIA_HKDF_KEY_MAPPING['sticker-pack-thumbnail']) {
    MEDIA_HKDF_KEY_MAPPING['sticker-pack-thumbnail'] = 'Sticker Pack Thumbnail'
  }
}

async function urlToBuffer(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      'user-agent': options.userAgent || 'VierTech-WB/1.0',
      ...(options.headers || {})
    },
    redirect: 'follow',
    signal: options.signal
  })

  if (!response.ok) {
    throw new Error(`[StickerPack] HTTP ${response.status} fetch: ${url}`)
  }

  return Buffer.from(await response.arrayBuffer())
}

async function resolveBuffer(input, options = {}) {
  if (Buffer.isBuffer(input)) return input

  if (input instanceof Uint8Array) {
    return Buffer.from(input)
  }

  if (typeof input === 'string' && /^https?:\/\//i.test(input)) {
    return urlToBuffer(input, options)
  }

  if (input && typeof input === 'object') {
    if (Buffer.isBuffer(input.buffer)) return input.buffer
    if (input.buffer instanceof Uint8Array) return Buffer.from(input.buffer)
    if (typeof input.url === 'string') return urlToBuffer(input.url, options)
  }

  throw new Error('[StickerPack] Input harus Buffer, Uint8Array, URL, atau object { buffer/url }.')
}

async function buildZip(files) {
  const input = {}

  for (const [name, buffer] of Object.entries(files || {})) {
    input[name] = [new Uint8Array(buffer), { level: 0 }]
  }

  return new Promise((resolve, reject) => {
    zip(input, (error, data) => {
      if (error) return reject(error)
      resolve(Buffer.from(data))
    })
  })
}

async function encryptAndUpload(sock, buffer, mediaType, options = {}) {
  if (!sock || typeof sock.waUploadToServer !== 'function') {
    throw new Error('[StickerPack] Socket tidak menyediakan waUploadToServer().')
  }

  const { encryptedStream } = getBaileys()
  prepareMediaMaps()

  const tmpIn = path.join(os.tmpdir(), `vier_sp_${crypto.randomUUID()}.bin`)
  await fs.writeFile(tmpIn, buffer)

  let encFilePath = null

  try {
    const encrypted = await encryptedStream({ url: tmpIn }, mediaType)
    encFilePath = encrypted.encFilePath

    const result = await sock.waUploadToServer(encrypted.encFilePath, {
      fileEncSha256B64: encrypted.fileEncSha256.toString('base64'),
      mediaType,
      timeoutMs: Number(options.timeoutMs || 120000)
    })

    return {
      fileSha256: encrypted.fileSha256,
      fileEncSha256: encrypted.fileEncSha256,
      mediaKey: encrypted.mediaKey,
      fileLength: BigInt(encrypted.fileLength),
      directPath: result.directPath
    }
  } finally {
    await fs.unlink(tmpIn).catch(() => {})
    if (encFilePath) await fs.unlink(encFilePath).catch(() => {})
  }
}

function resolveSocket(clientOrSock) {
  if (!clientOrSock) return null
  if (clientOrSock.sock) return clientOrSock.sock
  return clientOrSock
}

async function send(clientOrSock, jid, options = {}) {
  const sock = resolveSocket(clientOrSock)

  if (!sock || typeof sock.relayMessage !== 'function') {
    throw new Error('[StickerPack] Socket tidak mendukung relayMessage().')
  }

  const {
    proto,
    generateMessageID
  } = getBaileys()

  const {
    name = 'Sticker Pack',
    publisher = '',
    description = '',
    cover,
    stickers = [],
    timeoutMs = 120000
  } = options

  if (!jid) throw new Error('[StickerPack] JID tujuan wajib diisi.')
  if (!Array.isArray(stickers) || stickers.length < 1) {
    throw new Error('[StickerPack] Minimal 1 sticker.')
  }
  if (stickers.length > 60) {
    throw new Error('[StickerPack] Maksimal 60 sticker per pack.')
  }

  const packId = String(options.packId || crypto.randomUUID())

  const stickerBuffers = await Promise.all(
    stickers.map(async (sticker, index) => {
      const input = sticker?.buffer ?? sticker?.url ?? sticker

      if (!input) {
        throw new Error(`[StickerPack] Sticker[${index}] membutuhkan buffer/url.`)
      }

      return resolveBuffer(input, options)
    })
  )

  const coverInput =
    cover ??
    stickers[0]?.buffer ??
    stickers[0]?.url ??
    stickers[0]

  const coverBuffer = await resolveBuffer(coverInput, options)
  const trayIconFileName = `${packId}.webp`
  const zipFiles = {}
  const stickerMeta = []

  for (let index = 0; index < stickerBuffers.length; index++) {
    const buffer = stickerBuffers[index]
    const hash = crypto
      .createHash('sha256')
      .update(buffer)
      .digest('base64url')

    const fileName = `${String(index).padStart(2, '0')}_${hash}.webp`
    const meta = typeof stickers[index] === 'object' ? stickers[index] : {}

    zipFiles[fileName] = buffer
    stickerMeta.push({
      fileName,
      emojis: Array.isArray(meta.emojis) ? meta.emojis.map(String) : [],
      isAnimated: Boolean(meta.isAnimated),
      isLottie: Boolean(meta.isLottie),
      mimetype: 'image/webp',
      accessibilityLabel: String(meta.label || meta.accessibilityLabel || '')
    })
  }

  zipFiles[trayIconFileName] = coverBuffer

  const zipBuffer = await buildZip(zipFiles)

  const uploaded = await encryptAndUpload(
    sock,
    zipBuffer,
    'sticker-pack',
    { timeoutMs }
  )

  const thumbnail = await encryptAndUpload(
    sock,
    coverBuffer,
    'sticker-pack-thumbnail',
    { timeoutMs }
  ).catch(() => uploaded)

  const object = {
    stickerPackId: packId,
    name: String(name),
    publisher: String(publisher),
    packDescription: String(description),
    stickerPackOrigin: Number(options.origin ?? 1),

    fileSha256: uploaded.fileSha256,
    fileEncSha256: uploaded.fileEncSha256,
    mediaKey: uploaded.mediaKey,
    directPath: uploaded.directPath,
    fileLength: uploaded.fileLength,
    stickerPackSize: BigInt(zipBuffer.length),

    thumbnailDirectPath: thumbnail.directPath,
    thumbnailSha256: thumbnail.fileSha256,
    thumbnailEncSha256: thumbnail.fileEncSha256,
    thumbnailWidth: Number(options.thumbnailWidth || 512),
    thumbnailHeight: Number(options.thumbnailHeight || 512),

    trayIconFileName,
    stickers: stickerMeta
  }

  const encoded = proto.Message.StickerPackMessage
    .encode(proto.Message.StickerPackMessage.create(object))
    .finish()

  const decoded = proto.Message.StickerPackMessage.decode(encoded)
  const message = proto.Message.create({
    stickerPackMessage: decoded
  })

  const messageId = generateMessageID()

  await sock.relayMessage(jid, message, {
    messageId
  })

  return {
    key: {
      fromMe: true,
      remoteJid: jid,
      id: messageId
    },
    message,
    messageTimestamp: Math.floor(Date.now() / 1000),
    status: 1,
    packId,
    stickerCount: stickerMeta.length
  }
}

function install(client) {
  if (!client || typeof client !== 'object') {
    throw new Error('[StickerPack] client wajib berupa object.')
  }

  if (typeof client.sendStickerPack !== 'function') {
    Object.defineProperty(client, 'sendStickerPack', {
      configurable: true,
      enumerable: false,
      writable: true,
      value(jid, options = {}) {
        return send(client, jid, options)
      }
    })
  }

  return client
}

module.exports = {
  send,
  install,
  resolveBuffer,
  buildZip,
  prepareMediaMaps
}
