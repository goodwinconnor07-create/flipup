# FlipUp

Live at **https://flipup.kavishahtemu11.workers.dev**

Poker night on your phones. No-limit Texas Hold'em for play chips, plus silly mini games (Crazy Pineapple, Crazy Deuces, Ghost, Pittsburgh, Die on the River, Red River and Imposter), each with its own look: the host opens a table, friends join on their own phones with a 5-letter code or link, and bots fill any empty seats. Or play the bots on your own, offline.

- White, clean design with big cards, SF Pro and emoji profile pictures (pick one or type any emoji)
- Real Hold'em rules: moving button, heads-up blinds, min-raises, short all-ins that don't reopen betting, side pots, split pots, showdown order and auto-muck. See [docs/RULES.md](docs/RULES.md).
- Win and tie odds appear only during an all-in run-out, once every hand is face up
- Host settings: starting chips, blinds, rebuys, time to act
- Bots in forty flavours, and legends in the style of famous players to climb through
- Every mini game dresses the table in its own colours, cards, moving background and sounds

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

Nothing to run by hand. Whatever lands on `main` goes live:

- **The website and online tables** (Cloudflare Worker `flipup`): Cloudflare's GitHub connection builds and deploys on every push to `main`. In the Cloudflare dashboard (Workers & Pages → flipup → Settings → Builds) the production branch is `main`, the build command is `npm run check` (so a failing check stops the deploy) and the deploy command is `npx wrangler deploy`.
- **Checks**: `.github/workflows/ci.yml` runs `npm run check` on every push and pull request.

To deploy the website from your own machine instead (rarely needed):

```sh
CLOUDFLARE_API_TOKEN=… CLOUDFLARE_ACCOUNT_ID=… npm run deploy
```

The build has to run before `wrangler deploy`, because the Vite plugin writes the deploy config into `dist/`. `npm run deploy` does both.
