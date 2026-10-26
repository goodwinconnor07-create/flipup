import { useMemo } from 'react';
import { TWIN_READY } from '../../game';
import { back, navigate, startFriendTwin, startTwin, useApp } from '../../state/store';
import { findPlayed } from '../../state/training';
import { loadTwin } from '../../state/twin';
import { bestTwin, loadFriend } from '../../state/friends';
import { loadTwinGames } from '../../state/twinGames';
import { CoachSays } from '../../train/Coach';
import { planIntro, twinBluffLines, twinGameLines, twinHabitsIntro, twinStoryLines } from '../../train/coach';
import { planCheck, planLines, scout } from '../../train/scout';
import { bluffsOnYou, gameStory, habitsOf, lossStories, summarize } from '../../train/twinReport';
import { MiniCards } from '../../train/widgets';
import { chips } from '../../ui/components';
import { BackIcon } from '../../ui/Icons';
import { playBotsToTeach } from '../HomeTwins';

const signed = (n: number) => (n > 0 ? `+${chips(Math.round(n))}` : n < 0 ? `−${chips(Math.round(-n))}` : '0');

/**
 * What your AI twin found in your last game against it: the hands that cost you, and the habits it copied.
 * With `friend` it's your last game against that friend's twin: the same, with how your plan against them did
 * in place of your habits. No solver: just counts.
 */
export function TwinReport({ friend }: { friend?: string }) {
  const named = useApp((s) => s.profile.name.trim().length > 0);
  const game = useMemo(() => loadTwinGames().filter((g) => g.friend === friend).at(-1) ?? null, [friend]);
  const pal = useMemo(() => (friend ? loadFriend(friend) : null), [friend]);
  const plan = useMemo(() => {
    const twin = pal ? bestTwin(pal) : null;
    const kind = twin ? (scout(twin.profile)[0]?.kind ?? null) : null;
    const check = game ? planCheck(game) : null;
    return check ? planLines(check, kind) : [];
  }, [pal, game]);
  const twin = useMemo(loadTwin, []);
  const ready = twin.hands >= TWIN_READY;
  const summary = useMemo(() => (game ? summarize(game) : null), [game]);
  const stories = useMemo(() => (game ? lossStories(game, findPlayed) : []), [game]);
  const bluffs = useMemo(() => (game ? bluffsOnYou(game) : null), [game]);
  const story = useMemo(() => (game ? twinStoryLines(gameStory(game)) : []), [game]);
  const habits = useMemo(() => habitsOf(twin), [twin]);
  const played = !!game && !!summary && summary.hands > 0;

  return (
    <div className="screen train">
      <div className="topbar">
        <button type="button" className="icon-btn press" aria-label="Back" onClick={back}>
          <BackIcon />
        </button>
        <div className="topbar-title h3">{pal ? `${pal.name}'s twin` : friend ? 'A friend\'s twin' : 'Your twin'}</div>
        <span className="icon-btn" aria-hidden />
      </div>
      <div className="screen-body">
        {!played ? (
          <CoachSays lines={[friend ? 'Play a game against their twin first, then I\'ll show you how your plan did.' : 'Play a game against your twin first, then I\'ll show you what it found.']}>
            {friend ? (
              <button type="button" className="btn btn-sm btn-blue coach-cta" onClick={back}>
                Back to scouting
              </button>
            ) : (
              <button type="button" className="btn btn-sm btn-blue coach-cta" onClick={() => (ready ? startTwin() : playBotsToTeach(named))}>
                {ready ? 'Play your twin' : 'Play with Bots'}
              </button>
            )}
          </CoachSays>
        ) : (
          <>
            <div className="glass-card coach-card">
              <CoachSays lines={twinGameLines(summary, game.knew)} />
            </div>
            <div className="insight-tiles">
              <div className="glass-card tile">
                <small className="eyebrow">Chips</small>
                <b className={`num ${summary.net > 0 ? 'good' : summary.net < 0 ? 'bad' : ''}`}>{signed(summary.net)}</b>
              </div>
              <div className="glass-card tile">
                <small className="eyebrow">Hands won</small>
                <b className="num">{Math.round(summary.won * 100)}%</b>
              </div>
              <div className="glass-card tile">
                <small className="eyebrow">Hands</small>
                <b className="num">{summary.hands}</b>
              </div>
              <div className="glass-card tile">
                <small className="eyebrow">Per 100 hands</small>
                <b className="num">{`${summary.bbPer100 > 0 ? '+' : summary.bbPer100 < 0 ? '−' : ''}${Math.abs(Math.round(summary.bbPer100))} BB`}</b>
              </div>
            </div>
            {stories.length > 0 && (
              <>
                <h2 className="section-head">Where it cost you</h2>
                <div className="glass-card recent">
                  {stories.map((s) => (
                    <div key={s.key} className="recent-row twin-story">
                      {s.cards.length > 0 && <MiniCards cards={s.cards} />}
                      <span>
                        <b>{`Hand ${s.number} · ${signed(s.net)}`}</b>
                        <small>{s.line ?? 'This hand is older than the hand history keeps.'}</small>
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
            {bluffs && (
              <>
                <h2 className="section-head">Its bluffs</h2>
                <div className="glass-card coach-card">
                  <CoachSays quick lines={twinBluffLines(bluffs)} />
                </div>
                {bluffs.examples.length > 0 && (
                  <div className="glass-card recent">
                    {bluffs.examples.map((s) => (
                      <div key={s.key} className="recent-row twin-story">
                        <MiniCards cards={s.cards} />
                        <span>
                          <b>{`Hand ${s.number} · ${signed(s.net)}`}</b>
                          <small>{s.line}</small>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
            {story.length > 0 && (
              <>
                <h2 className="section-head">How it went</h2>
                <div className="glass-card coach-card">
                  <CoachSays quick lines={story} />
                </div>
              </>
            )}
            {friend && plan.length > 0 && (
              <>
                <h2 className="section-head">Your plan</h2>
                <div className="glass-card coach-card">
                  <CoachSays quick lines={[planIntro(pal?.name ?? 'their', summary.hands), ...plan]} />
                </div>
              </>
            )}
            {!friend && <h2 className="section-head">Habits your twin copied</h2>}
            {!friend && (
              <div className="glass-card coach-card">
                <CoachSays quick lines={[twinHabitsIntro(habits.length)]} />
              </div>
            )}
            {!friend && habits.map((h) => (
              <div key={h.id} className="glass-card coach-card twin-habit">
                <CoachSays quick compact lines={[h.line, `Try this: ${h.tip}`]} />
                <details className="coach-numbers">
                  <summary>Show me the numbers</summary>
                  <p>{h.numbers}</p>
                </details>
              </div>
            ))}
            {!friend && ready && (
              <button type="button" className="btn btn-xl btn-blue twin-again" onClick={() => startTwin()}>
                Play your twin again
              </button>
            )}
            {friend && pal && bestTwin(pal)?.ready && (
              <button type="button" className="btn btn-xl btn-blue twin-again" onClick={() => startFriendTwin(friend)}>
                {`Play ${pal.name}'s twin again`}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/** Opens the report on your own twin (from the final screen, the Review tab, Insights or the table menu). */
export const openTwinReport = () => navigate({ name: 'twinReport' });

/** Opens the report on your last game against a friend's twin. */
export const openFriendReport = (code: string) => navigate({ name: 'twinReport', friend: code });
