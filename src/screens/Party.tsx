import { GameThumb } from '../ui/GameIllustrations';
import { useEffect, useRef, useState } from 'react';
import { PARTY_BREAK_SECONDS, partyStandings, variantInfo, type PartyRow, type PartyView } from '../game';
import { addPal, isPal, PALS_CHANGED } from '../state/pals';
import { forgetParty, leaveParty, loadPartyRef, readParty, skipBreak, startParty } from '../state/party';
import { back, closeTable, confirm, getState, joinTable, leaveTable, resetTo, toast, useApp } from '../state/store';
import { Avatar } from '../ui/components';
import { haptic } from '../ui/effects';
import { BackIcon, ShareIcon } from '../ui/Icons';
import { CodeTiles, copy } from './sheets/InviteSheet';

const ROW = 60;

/** Polls the party while a screen is showing it. */
function usePartyView(code: string, onGone: () => void): PartyView | null {
  const [view, setView] = useState<PartyView | null>(null);
  const gone = useRef(onGone);
  gone.current = onGone;
  useEffect(() => {
    let live = true;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const v = await readParty(code);
        if (!live) return;
        if (!v) return gone.current();
        setView(v);
      } catch {
        // Offline for a moment: try again.
      }
      if (live) timer = setTimeout(poll, 1800);
    };
    void poll();
    const wake = () => document.visibilityState === 'visible' && (clearTimeout(timer), void poll());
    document.addEventListener('visibilitychange', wake);
    return () => {
      live = false;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', wake);
    };
  }, [code]);
  return view;
}

/** Counts down to a time, in whole seconds. */
function useCountdown(at: number | null): number | null {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (at === null) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [at]);
  return at === null ? null : Math.max(0, Math.ceil((at - now) / 1000));
}

/** When a round is on, everyone in the party goes to its table. */
function useFollowTable(view: PartyView | null): void {
  const at = useApp((s) => (s.session?.mode === 'online' ? s.session.code : null));
  useEffect(() => {
    if (!view || view.status !== 'playing' || !view.table || !view.you) return;
    if (at !== view.table) joinTable(view.table);
  }, [view?.status, view?.table, view?.you, at]);
}

function PartyBoard({ rows, you, running }: { rows: PartyRow[]; you: string | null; running: boolean }) {
  const [, again] = useState(0);
  useEffect(() => {
    const reload = () => again((n) => n + 1);
    window.addEventListener(PALS_CHANGED, reload);
    return () => window.removeEventListener(PALS_CHANGED, reload);
  }, []);
  const befriend = async (code: string) => {
    try {
      const pal = await addPal(code);
      toast(`${pal.name} is your friend now.`, 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't add them.", 'error');
    }
  };
  // Rows are placed by rank, so when the ranking changes they slide to their new place.
  const byId = new Map(rows.map((r) => [r.id, r]));
  const stable = [...byId.keys()].sort();
  return (
    <div className="board" style={{ height: rows.length * ROW }} role="list" aria-label="Leaderboard">
      {stable.map((id) => {
        const r = byId.get(id)!;
        const me = r.id === you;
        return (
          <div key={id} role="listitem" className={`board-row${me ? ' me' : ''}${r.rank === 1 ? ' first' : ''}${r.out ? ' out' : ''}`} style={{ transform: `translateY(${(r.rank - 1) * ROW}px)` }}>
            <span className="board-rank num">{r.rank}</span>
            <Avatar emoji={r.emoji} size={36} />
            <span className="board-name">
              <span className="board-name-line">
                {r.name}
                {me && <span className="tag tag-you">You</span>}
              </span>
              <small>
                {r.stack !== null ? (r.out ? 'Out' : `${r.stack.toLocaleString()} chips`) : r.points.length > 0 ? `Last game +${r.points[r.points.length - 1]}` : 'Ready'}
              </small>
            </span>
            {r.move !== 0 && <span className={`board-move ${r.move > 0 ? 'up' : 'down'}`}>{r.move > 0 ? `▲${r.move}` : `▼${-r.move}`}</span>}
            <span className="board-pts">
              <b className="num">{r.total}</b>
              {running && <small className="num">+{r.provisional}</small>}
            </span>
            {!me && r.friendCode && !isPal(r.friendCode) && (
              <button type="button" className="board-add press" aria-label={`Add ${r.name} as a friend`} onClick={() => void befriend(r.friendCode!)}>
                + Friend
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** The party itself: lobby, then the leaderboard between games, then the podium. Used as its own screen and in place of a party table's finish screen. */
export function PartyPanel({ code, onGone, embedded = false }: { code: string; onGone: () => void; embedded?: boolean }) {
  const view = usePartyView(code, onGone);
  useFollowTable(view);
  const seconds = useCountdown(view?.status === 'between' ? view.nextAt : null);
  const [busy, setBusy] = useState(false);

  if (!view) return <div className="party-panel center muted">Finding your party…</div>;
  const host = view.you === view.hostId;
  const total = view.settings.games.length;
  const next = view.settings.games[view.round + 1];
  const current = view.settings.games[view.round];
  const rows = partyStandings(view);
  const act = async (run: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    try {
      await run();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Something went wrong. Try again.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="party-panel">
      {view.status === 'lobby' && (
        <>
          <div>
            <h1 className="h1">{host ? 'Invite your friends' : "You're in!"}</h1>
            <p className="muted" style={{ margin: '6px 0 0' }}>
              {host ? `${total} games. Start when everyone's here.` : `Waiting for the host to start. ${total} games to play.`}
            </p>
          </div>
          <div className="invite-panel">
            <CodeTiles code={view.code} label="Party code" />
            <button type="button" className="link-chip press" onClick={() => void copy(view.code, 'Code copied')}>
              <span className="link-host">Tap to copy {view.code}</span>
              <ShareIcon width={20} height={20} />
            </button>
          </div>
          <PlaylistChips games={view.settings.games} round={-1} />
          <p className="section-title">In the party · {view.members.length}</p>
          <PartyBoard rows={rows} you={view.you} running={false} />
          {host ? (
            <button type="button" className="btn btn-xl btn-green" disabled={busy} onClick={() => void act(() => startParty(view.code))}>
              Start the party
            </button>
          ) : null}
        </>
      )}

      {view.status === 'playing' && (
        <>
          <GameHeader eyebrow={`Game ${view.round + 1} of ${total}`} variant={current} line="Standings update after every hand." />
          <PartyBoard rows={rows} you={view.you} running />
          {view.table && (
            <button type="button" className="btn btn-xl btn-blue" onClick={() => joinTable(view.table!)}>
              Go to the table
            </button>
          )}
        </>
      )}

      {view.status === 'between' && (
        <>
          <GameHeader eyebrow={`Up next · game ${view.round + 2} of ${total}`} variant={next} line={`Game ${view.round + 1} is done. The next one starts in ${seconds ?? PARTY_BREAK_SECONDS}s.`} />
          <PartyBoard rows={rows} you={view.you} running={false} />
          {host && (
            <button type="button" className="btn btn-xl btn-blue" disabled={busy} onClick={() => void act(() => skipBreak(view.code))}>
              Start next game now
            </button>
          )}
        </>
      )}

      {view.status === 'done' && (
        <>
          <div className="podium-head">
            <span className="podium-trophy" aria-hidden>
              🏆
            </span>
            <h1 className="h1">{rows[0]?.id === view.you ? 'You won the party!' : `${rows[0]?.name ?? 'Nobody'} won the party`}</h1>
            <p className="muted" style={{ margin: '6px 0 0' }}>
              After {total} games.
            </p>
          </div>
          <PartyBoard rows={rows} you={view.you} running={false} />
          <PlaylistChips games={view.settings.games} round={total} />
          <button
            type="button"
            className="btn btn-xl btn-blue"
            onClick={() => {
              haptic('success');
              void leaveParty(view.code);
              closeTable();
            }}
          >
            Back home
          </button>
        </>
      )}
      {!embedded && view.status !== 'done' && view.status !== 'lobby' && <p className="muted center">Party code {view.code}</p>}
    </div>
  );
}

function GameHeader({ eyebrow, variant, line }: { eyebrow: string; variant: ReturnType<typeof variantInfo>['id'] | undefined; line: string }) {
  const info = variant ? variantInfo(variant) : null;
  return (
    <div className="game-head">
      <small className="eyebrow">{eyebrow}</small>
      {info && (
        <div className="game-head-title">
          <GameThumb variant={info.id} size={44} />
          <h1 className="h1">{info.name}</h1>
        </div>
      )}
      {line && <p className="muted" style={{ margin: 0 }}>{line}</p>}
    </div>
  );
}

/** The playlist as a row of emoji: done, current and to come. */
function PlaylistChips({ games, round }: { games: PartyView['settings']['games']; round: number }) {
  return (
    <div className="playlist-chips" aria-label="Games in this party">
      {games.map((g, i) => (
        <span key={i} className={`pl-chip${i < round ? ' done' : i === round ? ' now' : ''}`} title={variantInfo(g).name}>
          {variantInfo(g).emoji}
        </span>
      ))}
    </div>
  );
}

/** The party screen: opened from the Party tab, from the banner, and from the pill on a party table. */
export function PartyScreen() {
  const ref = loadPartyRef();
  const goHome = () => {
    forgetParty();
    toast('That party has closed.', 'error');
    resetTo();
  };
  if (!ref) {
    return (
      <div className="screen">
        <div className="topbar">
          <button type="button" className="icon-btn press" aria-label="Back" onClick={back}>
            <BackIcon />
          </button>
        </div>
        <div className="screen-body center muted">You're not in a party.</div>
      </div>
    );
  }
  const leave = () =>
    confirm({
      title: 'Leave the party?',
      body: "You'll keep your place on the board, but you won't be able to come back once it has started.",
      confirm: 'Leave',
      danger: true,
      onConfirm: () => {
        void leaveParty(ref.code);
        if (getState().session) leaveTable();
        else resetTo();
      },
    });
  return (
    <div className="screen">
      <div className="topbar">
        <button type="button" className="icon-btn press" aria-label="Back" onClick={back}>
          <BackIcon />
        </button>
        <div className="topbar-title h3">Party</div>
        <button type="button" className="link-btn press" onClick={leave}>
          Leave
        </button>
      </div>
      <div className="screen-body">
        <PartyPanel code={ref.code} onGone={goHome} />
      </div>
    </div>
  );
}
