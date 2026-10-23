import { useState } from 'react';
import { fetchTableInfo } from '../state/api';
import { loadLastTable, loadStats, loadStreak, saveLastTable } from '../state/persist';
import { navigate, openSheet, toast, useApp } from '../state/store';
import { Avatar, Emoji } from '../ui/components';
import { ScrollTab } from './HomeScroll';
import { QuickGames } from './HomeQuick';
import { BotsArt, HostArt } from './CardArt';
import { TrainTab } from './HomeTrain';
import { colourWipe } from '../ui/effects';
import { CardsIcon, ChevronIcon, GearIcon, QrIcon, ScrollIcon, SparkIcon } from '../ui/Icons';
import { signed } from './Final';

function ago(at: number): string {
  const mins = Math.max(1, Math.round((Date.now() - at) / 60_000));
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  return `${Math.round(hours / 24)} days ago`;
}

type Tab = 'play' | 'scroll' | 'train';
const TABS: { id: Tab; label: string; Icon: typeof CardsIcon }[] = [
  { id: 'play', label: 'Play', Icon: CardsIcon },
  { id: 'scroll', label: 'Scroll', Icon: ScrollIcon },
  { id: 'train', label: 'Train', Icon: SparkIcon },
];

// Kept for the session, so coming back from a training screen lands on the same tab.
let lastTab: Tab = 'play';

const WEEK = 7 * 24 * 3_600_000;

/** One line under the greeting: how the week went, or how the night's going. */
function statusLine(stats: ReturnType<typeof loadStats>, active: boolean): string {
  if (active) return 'Your table is waiting.';
  const week = stats.games.filter((g) => g.at > Date.now() - WEEK).reduce((n, g) => n + g.net, 0);
  if (stats.games.some((g) => g.at > Date.now() - WEEK) && week !== 0) {
    return `You're ${week > 0 ? 'up' : 'down'} ${signed(Math.abs(week)).replace(/^[+−]/, '')} chips this week.`;
  }
  return stats.tables > 0 ? 'Ready for another hand?' : 'Deal yourself in.';
}

export function Home() {
  const [tab, setTabState] = useState<Tab>(lastTab);
  const setTab = (t: Tab) => {
    lastTab = t;
    setTabState(t);
  };
  const game = useApp((s) => s.game);
  const session = useApp((s) => s.session);
  const profile = useApp((s) => s.profile);
  const active = session && !session.scroll && (session.mode === 'online' || (game && game.status !== 'ended'));
  const named = profile.name.trim().length > 0;
  const [stats] = useState(loadStats);
  const [last, setLast] = useState(() => (active ? null : loadLastTable()));
  const [looking, setLooking] = useState(false);
  const [streak] = useState(loadStreak);

  // The last online table, if it's still open, is one tap away.
  const rejoin = async () => {
    if (!last || looking) return;
    setLooking(true);
    try {
      const info = await fetchTableInfo(last.code);
      if (!info || info.status === 'ended') {
        saveLastTable(null);
        setLast(null);
        toast('That table has closed.', 'error');
        return;
      }
      navigate({ name: 'joinTable', info });
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't reach the table.", 'error');
    } finally {
      setLooking(false);
    }
  };

  // No name yet: ask for one first, then carry on.
  const go = (then: 'host' | 'bots' | 'join') => {
    if (then === 'join') return openSheet({ name: 'join' });
    if (!named) return navigate({ name: 'profile', then });
    navigate({ name: 'setup', mode: then === 'host' ? 'online' : 'local' });
  };

  // The rejoin card only shows when there's somewhere to go back to: your open table or the online table you left.
  const rejoinCard: { title: string; sub: string; cta: string; run: () => void; faces: string[] } | null = active
    ? { title: 'Rejoin Lobby', sub: session.mode === 'online' ? `Table ${session.code}` : 'You vs the bots', cta: 'Back to the table', run: () => navigate({ name: 'table' }), faces: game ? game.players.map((p) => p.emoji) : [] }
    : last
      ? { title: 'Rejoin Lobby', sub: `Table ${last.code} · last played ${ago(last.at)}`, cta: looking ? 'Looking…' : 'Rejoin', run: () => void rejoin(), faces: last.faces ?? [] }
      : null;
  const active_ = !!active;
  const index = TABS.findIndex((t) => t.id === tab);

  return (
    <div className="screen home">
      <div className="home-backdrop" aria-hidden>
        <i className="glow glow-1" />
        <i className="glow glow-2" />
      </div>
      <div className="home-head">
        <h1 className="logo">
          GTO<span>Duel</span>
        </h1>
        <button
          type="button"
          className={`streak-pill press${streak.today ? ' lit' : ''}`}
          aria-label={`${streak.days} day streak${streak.today ? '' : ', play today to keep it'}. Show details`}
          onClick={() => openSheet({ name: 'streak' })}
        >
          <span className="streak-fire" aria-hidden>
            <Emoji emoji="🔥" size={22} />
          </span>
          <b>{streak.days}</b>
        </button>
        <div className="capsule glass">
          <button type="button" className="capsule-btn press" aria-label="Settings" onClick={() => openSheet({ name: 'prefs' })}>
            <GearIcon width={22} height={22} />
          </button>
        </div>
      </div>
      <div className="home-sheet">
        <div className="home-scroll">
          <div className="home-title">
            <h2 className="large-title">{tab === 'scroll' ? 'Scroll' : tab === 'train' ? 'Train' : 'Play'}</h2>
            <p>{tab === 'scroll' ? 'Whole hands, graded at every move.' : tab === 'train' ? 'Quick drills, graded against GTO.' : `${named ? `Hi ${profile.name}. ` : ''}${statusLine(stats, active_)}`}</p>
          </div>
          <div key={tab} className="home-pane">
            {tab === 'play' && (
              <>
                <section className="modes" aria-label="Start a game">
                  <button type="button" className="mode mode-blue press" onClick={() => go('host')}>
                    <span className="mode-text">
                      <span className="mode-title">Play with Friends</span>
                      <span className="mode-sub">Share a code. Friends join on their phones.</span>
                    </span>
                    <span className="mode-art">
                      <HostArt />
                    </span>
                  </button>
                  <button type="button" className="mode mode-violet press" onClick={() => go('bots')}>
                    <span className="mode-text">
                      <span className="mode-title">Play with Bots</span>
                      <span className="mode-sub">Practise on this phone, no timer.</span>
                    </span>
                    <span className="mode-art">
                      <BotsArt />
                    </span>
                  </button>
                  <button type="button" className="join-btn press" onClick={() => go('join')}>
                    <QrIcon width={22} height={22} />
                    Join with a code
                  </button>
                </section>
                {rejoinCard && (
                  <button type="button" className="hero rejoin-card press" disabled={looking} onClick={(e) => colourWipe(e, rejoinCard.run)} aria-label={`${rejoinCard.title}. ${rejoinCard.sub}`}>
                    <span className="hero-top">
                      {rejoinCard.faces.length > 0 && (
                        <span className="hero-faces" aria-hidden>
                          {rejoinCard.faces.slice(0, 6).map((emoji, i) => (
                            <Avatar key={i} emoji={emoji} size={36} />
                          ))}
                        </span>
                      )}
                      <span className="hero-title">{rejoinCard.title}</span>
                      <span className="hero-sub">{rejoinCard.sub}</span>
                    </span>
                    <span className="hero-foot">
                      {rejoinCard.cta}
                      <ChevronIcon width={18} height={18} />
                    </span>
                  </button>
                )}
                <QuickGames />
              </>
            )}
            {tab === 'scroll' && <ScrollTab />}
            {tab === 'train' && <TrainTab />}
          </div>
        </div>
      </div>
      <nav className="home-tabs" aria-label="Home">
        <div className="tabbar glass" style={{ ['--i' as string]: index }}>
          <i className="tab-capsule" aria-hidden />
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              className={`tab press${tab === id ? ' on' : ''}`}
              onClick={() => setTab(id)}
            >
              <Icon width={24} height={24} />
              <span>{label}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          className="tab-round glass press"
          aria-label={named ? `Your profile: ${profile.name}` : 'Set up your profile'}
          onClick={() => navigate({ name: 'profile', then: 'done' })}
        >
          <Avatar emoji={profile.emoji} size={36} />
        </button>
      </nav>
    </div>
  );
}
