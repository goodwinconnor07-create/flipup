import { useEffect, useRef, useState } from 'react';
import { BackBar, PlayingCard, CardSlot, chips } from '../ui/components';
import { back, toast } from '../state/store';
import {
  completeResearchHand,
  nextResearchHand,
  researchHero,
  researchOptions,
  researchView,
  SCENARIOS,
  startResearch,
  stepResearch,
  type ResearchRun,
} from '../research/engine';
import {
  createResearchStorage,
  fetchResearchReport,
  loadResearch,
  localResearchReport,
  privateResearchLink,
  researchUploadStatus,
  saveResearch,
  syncResearch,
  researchArchives,
} from '../research/storage';
import { reviewResearch } from '../research/review';
import type { ResearchReport } from '../research/protocol';
import type { Move } from '../game/types';

function download(value: unknown, name: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function leaveResearchScreen() {
  if (location.hash.startsWith('#bot-research')) history.replaceState(history.state, '', location.pathname + location.search);
  back();
}
export function BotResearch({ review }: { review?: { id: string; key: string } }) {
  return review ? <ResearchReportView id={review.id} accessKey={review.key} /> : <ResearchPlay />;
}
function ResearchReportView({ id, accessKey }: { id: string; accessKey: string }) {
  const [report, setReport] = useState<ResearchReport | null>(null),
    [error, setError] = useState('');
  useEffect(() => {
    let live = true;
    fetchResearchReport(id, accessKey)
      .then((r) => {
        if (live) setReport(r);
      })
      .catch((e) => {
        if (live) setError(String(e.message));
      });
    return () => {
      live = false;
    };
  }, [id, accessKey]);
  const summary = report && reviewResearch(report);
  return (
    <div className="screen research">
      <BackBar title="Research report" onBack={leaveResearchScreen} />
      <main className="screen-body research-page">
        {error && <p role="alert">{error}</p>}
        {!report && !error && <p role="status">Loading your private report…</p>}
        {report && summary && (
          <>
            <h1>{summary.hands} hands saved</h1>
            <p>
              {summary.botDecisions} bot decisions · {summary.humanDecisions} of your decisions
            </p>
            <p className="muted">
              This private link gives access to the recorded hands and notes. Share it only with someone you want to review them.
            </p>
            <button className="btn btn-blue" onClick={() => download(report, `flipup-research-${id}.json`)}>
              Download full report
            </button>
            <h2>Coverage</h2>
            {summary.byScenario
              .filter((s) => s.hands)
              .map((s) => (
                <p key={s.id}>
                  {s.title}: {s.hands} hands · {s.flagged} flagged
                </p>
              ))}
            <h2>Your notes</h2>
            {summary.flags.length ? (
              summary.flags.map((h) => (
                <p key={h.index}>
                  <b>Hand {h.index + 1}</b> · {h.feedback.odd ? 'Felt odd. ' : ''}
                  {h.feedback.note}
                </p>
              ))
            ) : (
              <p>No hands flagged.</p>
            )}
            <p className="muted">
              Server copy expires {new Date(report.expiresAt).toLocaleDateString()}. Uploading does not automatically start an AI review;
              send this link in the chat when you are ready.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
function ResearchPlay() {
  const [run, setRun] = useState<ResearchRun | null>(null),
    [loaded, setLoaded] = useState(false),
    [length, setLength] = useState(60);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [uploadError, setUploadError] = useState('');
  const [status, setStatus] = useState({ saved: 0, uploaded: 0 }),
    [link, setLink] = useState(''),
    [uploading, setUploading] = useState(false);
  const [raising, setRaising] = useState(false);
  const [raiseTo, setRaiseTo] = useState(''),
    [note, setNote] = useState(''),
    [realism, setRealism] = useState(0),
    [enjoyment, setEnjoyment] = useState(0);
  const [archives, setArchives] = useState<{ id: string; startedAt: number; link: string }[]>([]);
  const current = useRef(run),
    locked = useRef(false),
    lastTime = useRef(performance.now());
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    let live = true;
    loadResearch()
      .then((r) => {
        if (live) {
          current.current = r;
          setRun(r);
          setLoaded(true);
        }
      })
      .catch((e) => {
        if (live) {
          setError(e.message);
          setLoaded(true);
        }
      });
    researchArchives()
      .then(async (list) => {
        const rows = await Promise.all(
          list.map(async (a) => ({ id: a.id, startedAt: a.metadata.startedAt, link: await privateResearchLink(a.id) })),
        );
        if (live) setArchives(rows);
      })
      .catch(() => {});
    return () => {
      live = false;
      alive.current = false;
    };
  }, []);
  const upload = async (id: string) => {
    setUploading(true);
    setUploadError('');
    try {
      await syncResearch(id);
    } catch (e) {
      if (alive.current) setUploadError((e as Error).message);
    } finally {
      try {
        const [nextStatus, nextLink] = await Promise.all([researchUploadStatus(id), privateResearchLink(id)]);
        if (alive.current && current.current?.id === id) {
          setStatus(nextStatus);
          setLink(nextLink);
        }
      } catch (e) {
        if (alive.current) setUploadError((e as Error).message);
      }
      if (alive.current) setUploading(false);
    }
  };
  useEffect(() => {
    if (!run) return;
    const id = run.id;
    researchUploadStatus(id)
      .then((s) => {
        if (alive.current) setStatus(s);
      })
      .catch(() => {});
    privateResearchLink(id)
      .then((l) => {
        if (alive.current) setLink(l);
      })
      .catch(() => {});
    if (run.recorded) void upload(id);
  }, [run?.id, run?.index, run?.recorded]);
  useEffect(() => {
    const retry = () => {
      if (current.current) void upload(current.current.id);
    };
    window.addEventListener('online', retry);
    return () => window.removeEventListener('online', retry);
  }, []);
  useEffect(() => {
    setNote(run?.feedback.note ?? '');
    setRealism(run?.feedback.realism ?? 0);
    setEnjoyment(run?.feedback.enjoyment ?? 0);
    setRaiseTo('');
    setRaising(false);
  }, [run?.index, run?.id]);
  const commit = async (change: (next: ResearchRun) => void) => {
    if (locked.current || !current.current) return false;
    locked.current = true;
    setBusy(true);
    setError('');
    try {
      const next = structuredClone(current.current),
        now = performance.now();
      if (!next.paused && !next.game.hand!.result) {
        const elapsed = Math.max(0, now - lastTime.current);
        next.elapsedMs += elapsed;
        next.handElapsedMs += elapsed;
      }
      lastTime.current = now;
      change(next);
      if (document.hidden) next.paused = true;
      const hand = next.game.hand!.result ? completeResearchHand(next) : undefined;
      await saveResearch(next, hand);
      current.current = next;
      if (alive.current) setRun(next);
      return true;
    } catch (e) {
      if (alive.current) setError((e as Error).message);
      return false;
    } finally {
      locked.current = false;
      if (alive.current) setBusy(false);
    }
  };
  useEffect(() => {
    if (!run || run.paused || run.recorded || busy || error || document.hidden) return;
    const h = run.game.hand!,
      actor = run.game.players.find((p) => p.id === h.toAct);
    if (!actor?.bot && !h.runout && h.nextStreetAt == null && h.showdownAt == null) return;
    const timer = setTimeout(
      () => {
        void commit((next) => stepResearch(next));
      },
      actor?.bot ? 850 : 600,
    );
    return () => clearTimeout(timer);
  }, [run, busy, error]);
  useEffect(() => {
    const pause = () => {
      if (document.hidden && current.current && !current.current.paused)
        void commit((r) => {
          r.paused = true;
        });
    };
    document.addEventListener('visibilitychange', pause);
    return () => document.removeEventListener('visibilitychange', pause);
  }, []);
  const start = async () => {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError('');
    try {
      const r = startResearch(crypto.randomUUID(), crypto.getRandomValues(new Uint32Array(1))[0], length);
      await createResearchStorage(r);
      current.current = r;
      lastTime.current = performance.now();
      setRun(r);
      setStatus({ saved: 0, uploaded: 0 });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      locked.current = false;
      setBusy(false);
    }
  };
  const draftFeedback = (r: ResearchRun) => ({
    odd: r.feedback.odd,
    note,
    ...(realism ? { realism } : {}),
    ...(enjoyment ? { enjoyment } : {}),
  });
  const pause = async () => {
    await commit((r) => {
      r.feedback = draftFeedback(r);
      r.paused = true;
    });
    if (current.current) void upload(current.current.id);
  };
  const leave = async () => {
    await pause();
    leaveResearchScreen();
  };
  const saveFeedback = async () => {
    const saved = await commit((r) => {
      r.feedback = draftFeedback(r);
    });
    if (saved && current.current?.recorded) void upload(current.current.id);
    return saved;
  };
  const nextHand = async () => {
    if (await saveFeedback()) await commit(nextResearchHand);
  };
  const act = (move: Move, to?: number) => {
    setRaiseTo('');
    setRaising(false);
    void commit((r) => stepResearch(r, { move, to }));
  };
  if (!loaded)
    return (
      <div className="screen research">
        <BackBar title="Bot research" />
        <p role="status">Opening your saved research…</p>
      </div>
    );
  const game = run && researchView(run),
    h = game?.hand,
    hero = game && researchHero(game),
    own = h?.seats.find((s) => s.playerId === hero?.id);
  const finished = !!run?.recorded && run.index + 1 >= run.limit;
  const turn = !!run && !run.paused && !run.recorded && h?.toAct === hero?.id;
  const o = run && researchOptions(run);
  return (
    <div className="screen research">
      <BackBar
        title="Bot research"
        onBack={
          run
            ? () => {
                void leave();
              }
            : leaveResearchScreen
        }
      />
      <main className="screen-body research-page">
        {error && (
          <div role="alert">
            <p>{error}</p>
            <button className="btn btn-ghost" onClick={() => setError('')}>
              Try again
            </button>
          </div>
        )}
        {!run && (
          <>
            <h1>Help shape the bots</h1>
            <p>Play selected situations, then a continuous table. Play naturally; there is no answer key.</p>
            <label className="research-field">
              Session length
              <select value={length} onChange={(e) => setLength(Number(e.target.value))}>
                <option value={12}>12 hands · quick check</option>
                <option value={60}>60 hands · about an hour</option>
                <option value={120}>120 hands · extended session</option>
              </select>
            </label>
            <p className="muted">
              Starting records your moves, active timing, optional notes and the bots’ private decision records. Completed hands upload to
              FlipUp for research and expire from the server after 30 days. No name, device identity or regular-game history is included.
              These selected research deals do not count toward your stats.
            </p>
            <button
              className="btn btn-blue"
              disabled={busy}
              onClick={() => {
                void start();
              }}
            >
              Start research session
            </button>
            <p>
              You can pause or stop whenever you like. Keep the private review link and send it in the chat when you want the findings
              reviewed.
            </p>
            {archives.length > 0 && (
              <>
                <h2>Previous sessions</h2>
                {archives.map((a) => (
                  <div key={a.id} className="stack">
                    <a href={a.link}>Review session · {new Date(a.startedAt).toLocaleDateString()}</a>
                    <div className="research-buttons">
                      <button
                        className="btn btn-ghost"
                        onClick={() => {
                          void syncResearch(a.id)
                            .then(() => toast('Saved research uploaded.'))
                            .catch((e) => setError(e.message));
                        }}
                      >
                        Upload saved hands
                      </button>
                      <button
                        className="btn btn-ghost"
                        onClick={() => {
                          void localResearchReport(a.id)
                            .then((r) => download(r, `flipup-research-${a.id}.json`))
                            .catch((e) => setError(e.message));
                        }}
                      >
                        Download saved hands
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </>
        )}
        {run && game && h && hero && own && o && (
          <>
            <header>
              <p className="muted">
                Hand {run.index + 1} of {run.limit} · {Math.round(run.elapsedMs / 60000)} active minutes
              </p>
              <h1>{SCENARIOS[run.scenario].title}</h1>
              {run.scenario !== 'continuous' && (
                <p className="research-caption">
                  Selected research deal{run.events.some((e) => e.kind === 'setup') ? ' · preflop setup is in the hand history' : ''}
                </p>
              )}
            </header>
            {(run.paused || finished) && (
              <section className="research-status" aria-label="Session status">
                <h2>{finished ? 'Session finished' : 'Session paused'}</h2>
                <p role="status">
                  {status.saved} hands saved on this phone · {status.uploaded} uploaded{uploading ? ' · uploading…' : ''}
                </p>
                {uploadError && <p role="alert">{uploadError}</p>}
                <div className="research-buttons">
                  <button
                    className="btn btn-ghost"
                    disabled={uploading}
                    onClick={() => {
                      void upload(run.id);
                    }}
                  >
                    Retry upload
                  </button>
                  <button
                    className="btn btn-ghost"
                    onClick={() => {
                      void localResearchReport(run.id)
                        .then((r) => download(r, `flipup-research-${run.id}.json`))
                        .catch((e) => setError(e.message));
                    }}
                  >
                    Download saved hands
                  </button>
                </div>
                {link && (
                  <label className="research-field">
                    Private review link
                    <input aria-label="Private review link" readOnly value={link} onFocus={(e) => e.currentTarget.select()} />
                  </label>
                )}
                {link && (
                  <button
                    className="btn btn-ghost"
                    onClick={() => {
                      void navigator.clipboard
                        .writeText(link)
                        .then(() => toast('Private review link copied.'))
                        .catch(() => toast('Tap the link to select and copy it.'));
                    }}
                  >
                    Copy private review link
                  </button>
                )}
                <p className="muted">
                  Anyone with this link can access your uploaded research. Send it in the chat for review; an upload does not start a review
                  automatically.
                </p>
                {!finished && (
                  <button
                    className="btn btn-blue"
                    disabled={busy}
                    onClick={() => {
                      lastTime.current = performance.now();
                      void commit((r) => {
                        r.paused = false;
                      });
                    }}
                  >
                    Resume session
                  </button>
                )}
                {finished && (
                  <button
                    className="btn btn-ghost"
                    onClick={() => {
                      current.current = null;
                      setRun(null);
                      void researchArchives()
                        .then(async (list) =>
                          setArchives(
                            await Promise.all(
                              list.map(async (a) => ({ id: a.id, startedAt: a.metadata.startedAt, link: await privateResearchLink(a.id) })),
                            ),
                          ),
                        )
                        .catch((e) => setError(e.message));
                    }}
                  >
                    Start another session
                  </button>
                )}
              </section>
            )}
            <section className="research-opponents" aria-label="Opponents">
              {game.players
                .filter((p) => p.id !== hero.id)
                .map((p) => {
                  const seat = h.seats.find((s) => s.playerId === p.id)!;
                  return (
                    <div key={p.id} className={`research-seat${h.toAct === p.id ? ' acting' : ''}${seat.folded ? ' folded' : ''}`}>
                      <b>
                        {p.emoji} {p.name} · BOT
                      </b>
                      <small>
                        {chips(p.stack)} chips{h.buttonId === p.id ? ' · BTN' : ''}
                        {seat.allIn ? ' · all in' : ''}
                      </small>
                      <div className="research-cards">
                        {[0, 1].map((k) => (
                          <PlayingCard key={k} size="sm" card={seat.cards[k]} />
                        ))}
                      </div>
                      <small>
                        {seat.last?.move ?? 'Waiting'}
                        {seat.bet ? ` · ${chips(seat.bet)} in` : ''}
                      </small>
                    </div>
                  );
                })}
            </section>
            <section className="research-board" aria-label="Board">
              <p>
                Pot {chips(h.seats.reduce((s, p) => s + p.total, 0))} · {h.street}
              </p>
              <div className="research-cards">
                {Array.from({ length: 5 }, (_, k) =>
                  h.board[k] ? <PlayingCard key={k} size="md" card={h.board[k]} /> : <CardSlot key={k} size="md" />,
                )}
              </div>
            </section>
            <section className="research-own" aria-label="Your hand">
              <div className="research-cards">
                {own.cards.map((c, k) => (
                  <PlayingCard key={k} card={c} dim={own.folded} />
                ))}
              </div>
              <p>
                You · {chips(hero.stack)} chips{h.buttonId === hero.id ? ' · BTN' : ''}
                {own.folded ? ' · folded' : own.allIn ? ' · all in' : ''}
              </p>
            </section>
            {run.recorded && (
              <section className="research-result">
                <h2>
                  {Object.entries(h.result!.won)
                    .filter(([, n]) => n > 0)
                    .map(([id, n]) => `${game.players.find((p) => p.id === id)?.name} wins ${chips(n)}`)
                    .join(' · ')}
                </h2>
                <p>
                  {Object.entries(h.result!.names ?? {})
                    .map(([id, name]) => `${game.players.find((p) => p.id === id)?.name}: ${name}`)
                    .join(' · ')}
                </p>
                {!finished && !run.paused && (
                  <button
                    className="btn btn-blue"
                    disabled={busy}
                    onClick={() => {
                      void nextHand();
                    }}
                  >
                    Next research hand
                  </button>
                )}
              </section>
            )}
            {!run.recorded && !run.paused && (
              <div className="research-actions">
                <p role="status">
                  {turn
                    ? `Your turn${o.toCall ? ` · ${chips(o.toCall)} to call` : ''}`
                    : h.runout
                      ? 'Running it out…'
                      : h.toAct
                        ? `${game.players.find((p) => p.id === h.toAct)?.name} is thinking…`
                        : 'Dealing…'}
                </p>
                {turn && (
                  <>
                    <div className="research-buttons">
                      {o.canFold && (
                        <button className="btn btn-red" disabled={busy} onClick={() => act('fold')}>
                          Fold
                        </button>
                      )}
                      <button className="btn btn-blue" disabled={busy} onClick={() => act(o.canCheck ? 'check' : 'call')}>
                        {o.canCheck ? 'Check' : `Call ${chips(o.toCall)}`}
                      </button>
                      {o.canRaise && !raising && (
                        <button className="btn btn-green" disabled={busy} onClick={() => setRaising(true)}>
                          {o.word}
                        </button>
                      )}
                      {raising && (
                        <button className="btn btn-ghost" disabled={busy} onClick={() => setRaising(false)}>
                          Cancel bet
                        </button>
                      )}
                    </div>
                    {o.canRaise && raising && (
                      <>
                        <label className="research-field">
                          {o.word} to
                          <input
                            type="number"
                            inputMode="numeric"
                            min={Math.min(o.minTo, o.maxTo)}
                            max={o.maxTo}
                            step="1"
                            value={raiseTo || Math.min(o.minTo, o.maxTo)}
                            onChange={(e) => setRaiseTo(e.target.value)}
                          />
                        </label>
                        <div className="research-buttons">
                          {[0.33, 0.75, 1].map((f) => (
                            <button
                              className="btn btn-ghost"
                              key={f}
                              disabled={busy}
                              onClick={() => {
                                const pot = h.seats.reduce((s, p) => s + p.total, 0) + o.toCall;
                                setRaiseTo(String(Math.min(o.maxTo, Math.max(o.minTo, own.bet + o.toCall + Math.round(pot * f)))));
                              }}
                            >
                              {f === 1 ? 'Pot' : f === 0.33 ? '⅓ pot' : '¾ pot'}
                            </button>
                          ))}
                          <button className="btn btn-ghost" disabled={busy} onClick={() => setRaiseTo(String(o.maxTo))}>
                            All in
                          </button>
                        </div>
                        <button
                          className="btn btn-green"
                          disabled={busy || !Number.isSafeInteger(Number(raiseTo || Math.min(o.minTo, o.maxTo)))}
                          onClick={() => act(h.currentBet ? 'raise' : 'bet', Number(raiseTo || Math.min(o.minTo, o.maxTo)))}
                        >
                          {o.word} to {raiseTo || Math.min(o.minTo, o.maxTo)}
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            )}
            <div className="research-buttons">
              <button
                className="btn btn-ghost"
                disabled={busy}
                aria-pressed={run.feedback.odd}
                onClick={() => {
                  void commit((r) => {
                    r.feedback.odd = !r.feedback.odd;
                  });
                }}
              >
                {run.feedback.odd ? 'Hand flagged' : 'That felt odd'}
              </button>
              {!run.paused && !finished && (
                <button
                  className="btn btn-ghost"
                  disabled={busy}
                  onClick={() => {
                    void pause();
                  }}
                >
                  Pause & upload
                </button>
              )}
            </div>
            {(run.recorded || run.paused) && (
              <section className="research-feedback">
                <h2>Optional feedback</h2>
                <label className="research-field">
                  What stood out?
                  <textarea
                    maxLength={1000}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Anything clever, repetitive, strange or frustrating"
                  />
                </label>
                {(
                  [
                    ['How believable did the bots feel?', realism, setRealism],
                    ['How enjoyable was this hand?', enjoyment, setEnjoyment],
                  ] as const
                ).map(([title, value, setValue]) => (
                  <label className="research-field" key={title}>
                    {title}
                    <select value={value} onChange={(e) => setValue(Number(e.target.value))}>
                      <option value={0}>Not rated</option>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>
                          {n} of 5
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
                <button
                  className="btn btn-ghost"
                  disabled={busy}
                  onClick={() => {
                    void saveFeedback();
                  }}
                >
                  Save feedback
                </button>
              </section>
            )}
            <details>
              <summary>Hand history</summary>
              <ol className="research-history">
                {run.events.map((e, k) => (
                  <li key={k}>
                    {e.action.street} · {game.players.find((p) => p.id === e.action.playerId)?.name}: {e.action.move}
                    {e.action.to ? ` ${chips(e.action.to)}` : ''}
                    {e.kind === 'setup' ? ' (setup)' : ''}
                  </li>
                ))}
              </ol>
            </details>
            <p className="muted">
              {status.uploaded} uploaded · {status.saved} saved on this phone{uploadError ? ' · upload waiting' : ''}
            </p>
          </>
        )}
      </main>
    </div>
  );
}
