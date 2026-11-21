# Tested cloud setup

Use the existing `/workspace/flipup` checkout. Tasks are already isolated; do not create a worktree unless explicitly requested. Node 22.13+ is required; Node 24.22.1 and npm 11.9.0 were used here.

Install or refresh from the lockfile, preserving integrity verification:

```sh
cd /workspace/flipup
npm ci --cache /tmp/flipup-npm-cache --no-audit --no-fund
```

The explicit cache is needed because the default user cache was not writable in this execution context. The main backend bot workflow needs no credentials or external services.

Start the app and local Cloudflare Worker:

```sh
cd /workspace/flipup
XDG_CONFIG_HOME=/tmp/flipup-config npm run dev -- --host 0.0.0.0
```

Check Vite's reported port, then make an internal HTTP request. This instance returned HTTP 200 and the application HTML at port 5173. `XDG_CONFIG_HOME` is necessary for Wrangler's writable registry; the initial startup failed without it. Live processes must restart in future tasks.

Validate the selected workflow:

```sh
cd /workspace/flipup
npm run typecheck
npx vitest run src/bot_engine
npm run bot:demo -- 100 /tmp/bot-001-memory.json
npm run bot:generate -- 20
npm run check
```

The Python/C++ solver, native app and ML training are independent optional workflows and were not installed or run. No remote deployment was attempted. Do not select the experimental policy for live tables without completing the readiness items in EVALUATION.md.

The onboarding configuration backend could not verify its current draft, and the attempted `install_script`/`start_skill` save returned “saving the draft could not be confirmed.” Thus reusable environment configuration persistence and publication are **unconfirmed**. This file preserves the tested commands; it does not claim that the platform saved or published them.
