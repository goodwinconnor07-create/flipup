# FlipUp

Live at **https://flipup.kavishahtemu11.workers.dev**

Poker night on your phones. No-limit Texas Hold'em for play chips: the host opens a table, friends join on their own phones with a 5-letter code or link, and bots fill any empty seats. Or play the bots on your own, offline.

- White, clean design with big cards, SF Pro and emoji profile pictures (pick one or type any emoji)
- Real Hold'em rules: moving button, heads-up blinds, min-raises, short all-ins that don't reopen betting, side pots, split pots, showdown order and auto-muck. See [docs/RULES.md](docs/RULES.md).
- Win and tie odds appear only during an all-in run-out, once every hand is face up
- Host settings: starting chips, blinds, rebuys, time to act
- Bots with a simple, readable style

## Running it

```sh
npm install
npm run dev        # http://localhost:5173, with the table server running locally
npm run check      # typecheck, unit tests, build
npm run e2e        # phone-sized browser tests, including two phones playing online
```

## How it's built

- React + Vite app in `src/`, with the poker engine in `src/game/` shared with the server
- A Cloudflare Worker in `worker/` serves the app and the `/api` routes. Each table is a Durable Object (`TableRoom`) holding the only copy of the deck; phones talk to it over a WebSocket and only ever get their own cards.

## Deploying

```sh
CLOUDFLARE_API_TOKEN=… CLOUDFLARE_ACCOUNT_ID=… npm run deploy
```

This builds the app and deploys the `flipup` Worker with its Durable Object.
