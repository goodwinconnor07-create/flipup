# Bot generation foundation

`BotFactory.generate(botId, seed, createdAt)` deterministically produces a version-1 profile. `BOT_001` is seed 1001 through exactly the same path as all other identities. Creation time is an explicit deterministic field with a fixed default; a production caller should supply the actual creation timestamp once and persist it.

The current generator samples discipline and pressure latent factors, then derives correlated aggression, curiosity, river caution and adaptation traits within [0,1]. These four traits affect the actual action distribution through bounded log weights. Profiles are validated and serializable. A seed and generator version reproduce the parameters; the identity ID stays stable across sessions. Sampling seeds depend on bot seed, table, hand and action sequence, keeping retry decisions stable and independent of the deck RNG.

```sh
npm run bot:generate -- 20
npm run bot:demo -- 100 /tmp/bot-001-memory.json
```

The generator command emits real profiles with an explicit `calibrated: false` label. It is not a calibrated population generator. There is no skill-target parameter pretending to provide measured strength.

## Measured synthetic calibration

`npm run bot:calibrate -- 20` runs a real calibration/rejection loop. It collects 32 legal decision contexts across all four streets using the production engine, computes the shared baseline once per context, and evaluates each candidate's actual final action distribution. Half the contexts include a controlled synthetic overfolding belief to exercise adaptation; no other bot's private state enters the process.

Candidates are compared by mean total variation across the conditional action distributions, including individual bet sizes. A candidate closer than 0.005 to any accepted identity is rejected. Distances use policy probabilities, so sampling noise cannot drive acceptance. The report additionally samples 200 decisions per context and reports observed action frequencies. It records the seed, policy version, threshold, nearest accepted distance, attempts and acceptance status. If the attempt limit cannot produce enough distinct identities, it returns `insufficient-diversity`, not success.

The initial weak identity policy yielded only seven accepted identities after 2,000 attempts at this threshold. Identity policy `identity-2` makes bounded aggression/calling/river preferences observable. When approximate values exist, it blends back toward baseline to keep the **estimated** expected chip loss within max(0.1bb, 2% of the currently eligible pot). Approximate values do not provide a real regret guarantee. RFI charts have no EVs, so their deviations are bounded by log weights only; traces explicitly report a null estimated value loss.

With the updated policy, the measured run accepted 20 identities in 37 attempts on this battery. This demonstrates modest conditional policy diversity under a synthetic engineering threshold. It does not establish long-session behavioural diversity, calibrated human mistakes, human representativeness or a measured skill distribution. The raw `bot:generate` command remains explicitly uncalibrated.

## Remaining production generation procedure

Select a skill distribution from measured reference populations; expand trait families with compatibility constraints; persist candidate profiles and per-observer priors; run richer contextual calibration and paired full-table experiments; compare street/size/line/skill and changing-opponent behaviour; reject near-duplicates; persist the accepted profile with all evaluation versions, seeds and thresholds. Measure distributions over multiple contexts rather than average aggression alone.

Temporary state, human-data calibration, explicit skill targets and richer behavioural families remain incomplete. The synthetic calibration results must not be presented as human realism or production approval.
