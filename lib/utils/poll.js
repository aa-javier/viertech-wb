'use strict'

function getBaileys() {
  try {
    return require('baileys')
  } catch (error) {
    const err = new Error(
      'Poll membutuhkan peer dependency "baileys". Install package Baileys yang sama dengan runtime bot.'
    )
    err.cause = error
    throw err
  }
}

function unique(values = []) {
  return [...new Set(values.filter(Boolean))]
}

function stripDeviceJid(jid = '') {
  const value = String(jid || '').trim()
  if (!value) return ''

  const [left, server = ''] = value.split('@')
  if (!server) return value

  return `${left.replace(/:\d+$/, '')}@${server}`
}

function getMessageSecret(message) {
  const source = message?.message || message || {}

  return (
    source?.messageContextInfo?.messageSecret ||
    message?.messageContextInfo?.messageSecret ||
    source?.pollCreationMessageV3?.messageSecret ||
    message?.pollCreationMessageV3?.messageSecret ||
    source?.pollCreationMessageV2?.messageSecret ||
    message?.pollCreationMessageV2?.messageSecret ||
    source?.pollCreationMessage?.messageSecret ||
    message?.pollCreationMessage?.messageSecret ||
    null
  )
}

function normalizeVoterJid(jid, options = {}) {
  const {
    client,
    participants = [],
    aliases = []
  } = options

  let result = stripDeviceJid(jid)
  if (!result) return ''

  if (
    result.endsWith('@lid') &&
    client &&
    typeof client.getRealJid === 'function'
  ) {
    result = client.getRealJid(result) || result
  }

  const all = [
    ...(Array.isArray(participants) ? participants : []),
    ...(Array.isArray(aliases) ? aliases : [])
  ]

  const found = all.find(item => {
    if (!item) return false

    const values = typeof item === 'string'
      ? [item]
      : [
          item.id,
          item.jid,
          item.lid,
          item.phoneNumber,
          item.phone,
          item.participant
        ]

    return values
      .filter(Boolean)
      .some(value => stripDeviceJid(value) === result)
  })

  if (found && typeof found === 'object') {
    result =
      found.phoneNumber ||
      found.jid ||
      found.id ||
      result
  } else if (typeof found === 'string') {
    result = found
  }

  if (
    result.endsWith('@lid') &&
    client &&
    typeof client.getRealJid === 'function'
  ) {
    result = client.getRealJid(result) || result
  }

  return stripDeviceJid(result)
}

async function send(clientOrSock, jid, name, values, options = {}) {
  const client = clientOrSock?.sock || clientOrSock

  if (!client || typeof client.sendMessage !== 'function') {
    throw new Error('[Poll] client tidak menyediakan sendMessage().')
  }

  const list = Array.isArray(values)
    ? values.map(String).map(v => v.trim()).filter(Boolean)
    : []

  if (!jid) throw new Error('[Poll] JID tujuan wajib diisi.')
  if (!String(name || '').trim()) throw new Error('[Poll] Nama poll wajib diisi.')
  if (list.length < 2) throw new Error('[Poll] Poll membutuhkan minimal 2 pilihan.')

  return client.sendMessage(
    jid,
    {
      poll: {
        name: String(name),
        values: list,
        selectableCount: Math.max(
          1,
          Math.min(list.length, Number(options.selectableCount || 1))
        )
      }
    },
    options.quoted ? { quoted: options.quoted } : undefined
  )
}

function buildVoterCandidates(message, normalizedVoter) {
  const pollUpdate = message?.message?.pollUpdateMessage || message?.pollUpdateMessage || {}

  return unique([
    message?.key?.participant,
    message?.sender,
    message?.participant,
    message?.key?.remoteJid,
    normalizedVoter,
    pollUpdate?.pollUpdateMessageKey?.participant,
    pollUpdate?.pollUpdateMessageKey?.remoteJid
  ]).map(stripDeviceJid)
}

function buildCreatorCandidates(pollKey, savedPoll, client) {
  const { getKeyAuthor } = getBaileys()

  const meId =
    typeof client?.decodeJid === 'function'
      ? client.decodeJid(client.user?.id)
      : client?.user?.id

  const defaultCreator = pollKey
    ? getKeyAuthor(pollKey, meId)
    : meId

  return unique([
    defaultCreator,
    meId,
    client?.user?.id,
    client?.user?.jid,
    client?.user?.lid,
    client?.user?.phoneNumber,
    stripDeviceJid(meId),
    stripDeviceJid(client?.user?.id),
    stripDeviceJid(client?.user?.jid),
    stripDeviceJid(client?.user?.lid),
    pollKey?.participant,
    stripDeviceJid(pollKey?.participant),
    pollKey?.remoteJid,
    savedPoll?.key?.participant,
    stripDeviceJid(savedPoll?.key?.participant),
    savedPoll?.key?.remoteJid,
    savedPoll?.key?.fromMe ? meId : null,
    savedPoll?.key?.fromMe ? stripDeviceJid(meId) : null
  ])
}

function getPollIdCandidates(pollKey, savedPoll, options = {}) {
  return unique([
    pollKey?.id,
    options.pollId,
    savedPoll?.id,
    savedPoll?.key?.id
  ])
}

function isPollUpdate(message) {
  const { getContentType } = getBaileys()
  const source = message?.message || {}
  return getContentType(source) === 'pollUpdateMessage'
}

async function decryptUpdate(message, savedPoll, options = {}) {
  const {
    decryptPollVote
  } = getBaileys()

  const client = options.client
  const source = message?.message || {}
  const pollUpdate = source.pollUpdateMessage || message?.pollUpdateMessage

  if (!pollUpdate) {
    throw new Error('[Poll] Message bukan pollUpdateMessage.')
  }

  const pollKey = pollUpdate.pollCreationMessageKey
  if (!pollKey?.id) {
    throw new Error('[Poll] pollCreationMessageKey tidak tersedia.')
  }

  const secret =
    options.messageSecret ||
    getMessageSecret(savedPoll) ||
    getMessageSecret(options.pollMessage)

  if (!secret) {
    throw new Error('[Poll] messageSecret poll tidak ditemukan.')
  }

  const rawVoter =
    message?.key?.participant ||
    message?.sender ||
    message?.participant ||
    message?.key?.remoteJid

  const normalizedVoter = normalizeVoterJid(rawVoter, options)
  const voterCandidates = buildVoterCandidates(message, normalizedVoter)
  const creatorCandidates = buildCreatorCandidates(pollKey, savedPoll, client)
  const pollIdCandidates = getPollIdCandidates(pollKey, savedPoll, options)

  let vote = null
  let voterJid = null
  let pollCreatorJid = null
  let pollMsgId = null

  for (const id of pollIdCandidates) {
    for (const creator of creatorCandidates) {
      for (const voter of voterCandidates) {
        try {
          const decoded = decryptPollVote(pollUpdate.vote, {
            pollEncKey: secret,
            pollCreatorJid: creator,
            pollMsgId: id,
            voterJid: voter
          })

          if (!Array.isArray(decoded?.selectedOptions)) continue

          vote = decoded
          voterJid = voter
          pollCreatorJid = creator
          pollMsgId = id
          break
        } catch {}
      }
      if (vote) break
    }
    if (vote) break
  }

  if (!vote) {
    const error = new Error('[Poll] Vote tidak dapat didekripsi dengan kandidat JID yang tersedia.')
    error.code = 'POLL_DECRYPT_FAILED'
    throw error
  }

  const pollChat =
    pollKey.remoteJid ||
    savedPoll?.key?.remoteJid ||
    message?.chat ||
    message?.key?.remoteJid

  const normalized = normalizeVoterJid(voterJid, options) || stripDeviceJid(voterJid)

  return {
    pollId: pollKey.id,
    pollChat,
    pollKey,
    messageSecret: secret,
    voter: normalized,
    rawVoter: voterJid,
    pollCreatorJid,
    pollMsgId,
    vote,
    selectedOptions: vote.selectedOptions || [],
    update: {
      pollUpdateMessageKey: {
        remoteJid: pollChat,
        fromMe: false,
        id: message?.key?.id,
        participant: voterJid
      },
      vote,
      senderTimestampMs: pollUpdate.senderTimestampMs
    }
  }
}

function aggregate(pollMessage, pollUpdates = [], meId = '') {
  const { getAggregateVotesInPollMessage } = getBaileys()

  const message = pollMessage?.message || pollMessage

  return getAggregateVotesInPollMessage({
    message,
    pollUpdates: Array.isArray(pollUpdates) ? pollUpdates : []
  }, meId)
}

function selectedVotes(votes = []) {
  return (Array.isArray(votes) ? votes : [])
    .filter(item => Array.isArray(item?.voters) && item.voters.length > 0)
    .map(item => ({
      name: item.name,
      voters: [...item.voters]
    }))
}

function findSelectionForVoter(votes = [], voter, options = {}) {
  const target = normalizeVoterJid(voter, options) || stripDeviceJid(voter)

  for (const item of Array.isArray(votes) ? votes : []) {
    const found = (item?.voters || []).find(value => {
      const normalized =
        normalizeVoterJid(value, options) ||
        stripDeviceJid(value)

      return normalized === target
    })

    if (found) {
      return {
        name: item.name,
        voter: target,
        rawVoter: found
      }
    }
  }

  return null
}

async function parseUpdate(message, savedPoll, options = {}) {
  const decrypted = await decryptUpdate(message, savedPoll, options)

  const updates = [
    ...(Array.isArray(options.pollUpdates) ? options.pollUpdates : []),
    decrypted.update
  ]

  const client = options.client
  const meId =
    typeof client?.decodeJid === 'function'
      ? client.decodeJid(client.user?.id)
      : client?.user?.id

  const pollMessage =
    options.pollMessage ||
    savedPoll?.message ||
    savedPoll

  const votes = aggregate(pollMessage, updates, meId)

  const selection = findSelectionForVoter(
    votes,
    decrypted.voter,
    options
  )

  return {
    ...decrypted,
    pollUpdates: updates,
    votes,
    selected: selection?.name || null,
    voter: selection?.voter || decrypted.voter
  }
}

function install(client) {
  if (!client || typeof client !== 'object') {
    throw new Error('[Poll] client wajib berupa object.')
  }

  if (typeof client.sendPoll !== 'function') {
    Object.defineProperty(client, 'sendPoll', {
      configurable: true,
      enumerable: false,
      writable: true,
      value(jid, name, values, options = {}) {
        return send(client, jid, name, values, options)
      }
    })
  }

  if (typeof client.parsePollUpdate !== 'function') {
    Object.defineProperty(client, 'parsePollUpdate', {
      configurable: true,
      enumerable: false,
      writable: true,
      value(message, savedPoll, options = {}) {
        return parseUpdate(message, savedPoll, {
          ...options,
          client
        })
      }
    })
  }

  return client
}

module.exports = {
  send,
  install,
  isPollUpdate,
  getMessageSecret,
  stripDeviceJid,
  normalizeVoterJid,
  decryptUpdate,
  aggregate,
  selectedVotes,
  findSelectionForVoter,
  parseUpdate
}
