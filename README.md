# @viertechjs/wb

VierTech-maintained WhatsApp Bot toolkit for Baileys.

This package is a modified fork. The original MIT copyright
and permission notice are preserved in [`LICENSE`](./LICENSE). See
[`NOTICE`](./NOTICE) for fork attribution.

## Install

Publish `@viertechjs/api` first, then:

```bash
npm install @viertechjs/wb
```

The WhatsApp application must also use a compatible `baileys` package.
`@viertechjs/wb` declares Baileys as a peer dependency so the app and helper
share one protocol/runtime copy.

## Public exports

```js
const {
  Client,
  Utils,
  Converter,
  Database,
  Scraper,
  VierApi,
  StickerPack,
  Poll
} = require('@viertechjs/wb')
```

## Sticker Pack

Native WhatsApp `StickerPackMessage` support is included.

```js
await StickerPack.send(client, chat, {
  name: 'VierTech Pack',
  publisher: 'VierTech',
  description: 'My sticker pack',
  cover: coverBuffer,
  stickers: [
    { buffer: sticker1, emojis: ['🔥'] },
    { buffer: sticker2, emojis: ['😂'] }
  ]
})
```

Supported sticker input:

```text
Buffer
Uint8Array
URL
{ buffer, emojis, isAnimated, label }
{ url, emojis, isAnimated, label }
```

A pack supports 1–60 stickers.

You can install a shortcut on the bot client:

```js
StickerPack.install(client)

await client.sendStickerPack(chat, {
  name: 'VierTech Pack',
  publisher: 'VierTech',
  stickers
})
```

## Poll

Send a normal WhatsApp poll:

```js
await Poll.send(
  client,
  chat,
  'Pilih pemain',
  ['PLAYER 1', 'PLAYER 2', 'PLAYER 3'],
  { selectableCount: 1 }
)
```

Or install client shortcuts:

```js
Poll.install(client)

await client.sendPoll(
  chat,
  'Pilih pemain',
  ['PLAYER 1', 'PLAYER 2'],
  { selectableCount: 1 }
)
```

### Parse encrypted poll updates

The helper contains the generic polling logic used by game flows such as
Werewolf, Mafia, and multiple-choice games.

```js
const result = await Poll.parseUpdate(m, savedPoll, {
  client,
  participants,
  pollUpdates: game.pollUpdates
})

console.log(result.voter)
console.log(result.selected)
console.log(result.votes)
```

It handles:

- `pollUpdateMessage`
- poll `messageSecret`
- `decryptPollVote`
- device JID cleanup
- LID/JID normalization
- poll creator/voter candidate fallback
- `getAggregateVotesInPollMessage`
- normalized selected option

Game rules remain outside `@viertechjs/wb`; the package only handles WhatsApp
poll protocol details.

## Vier API

`VierApi` comes from `@viertechjd/api`:

```js
const api = new VierApi({
  apiKey: process.env.VIER_API_KEY
})
```

## VierTech changes

- package renamed to `@viertechjs/wb`
- `@viertechjs/api` added
- `VierApi` public export added
- native StickerPack helper added
- generic Poll helper added
- repository metadata moved to `viertech/wb`

## Compatibility note

`@neoxr/helper` is still retained in this compatibility release because the
distributed upstream core contains obfuscated runtime code that may call the
helper dynamically. It should be removed only after runtime testing or a
clean reimplementation of those helper functions.

## Requirements

- Node.js 20+
- compatible `baileys` peer dependency

## License

MIT. Original upstream copyright and permission notice are retained.
