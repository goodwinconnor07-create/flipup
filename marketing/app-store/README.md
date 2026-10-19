# App Store cards

Eight App Store screenshots for FlipUp at Apple's 6.9" iPhone size (1320 × 2868), plus a 1920 × 1080 header banner (`out/00-header.png`), all in `out/`. They follow the same layout as CardShot's (`golfapp/marketing/app-store`): caption up top, a framed phone with the real app, one background colour per card. `overview.png` shows the set.

| # | Card | Screen |
|---|------|--------|
| 1 | Poker night, on your phones. | Your turn at a bots table |
| 2 | Everyone on their own phone | Online lobby with the join code |
| 3 | Flip them up. Sweat the river. | All-in run-out with live odds |
| 4 | Bet in one tap | Raise panel |
| 5 | Nobody around? Play the bots. | Bots setup |
| 6 | Showdown, sorted | End of a hand |
| 7 | Every hand, explained | Hand rankings |
| 8 | All this. And plenty more. | Feature grid |

## How they're made

- `capture.spec.ts` plays real tables (bots on one phone, and three phones online) on a 430 × 878 screen at 3× and saves `screens/`. Deals are random, so each capture gives different cards; re-run until you like the hands.
- `cards.html` lays out each card. `render.mjs` saves `out/`.

```
npm run store:capture   # after any change to the app's screens
npm run store:render    # after any change to cards.html
```

In the cloud sandbox, render with `CHROMIUM_PATH=/opt/pw-browsers/chromium-*/chrome-linux/chrome`.
