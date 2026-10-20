import { useState } from 'react';
import { fetchTableInfo } from '../state/api';
import { loadLastTable, loadStats, saveLastTable } from '../state/persist';
import { navigate, openSheet, toast, toggleDark, toggleGlass, useApp } from '../state/store';
import { Avatar, PlayingCard } from '../ui/components';
import { InsightsTab } from './HomeInsights';
import { TrainTab } from './HomeTrain';
import { colourWipe } from '../ui/effects';
import { ArrowIcon, CardsIcon, ChartIcon, GlassIcon, MoonIcon, QrIcon, SparkIcon } from '../ui/Icons';
import { signed } from './Final';

function ago(at: number): string {
  const mins = Math.max(1, Math.round((Date.now() - at) / 60_000));
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  return `${Math.round(hours / 24)} days ago`;
}

type Tab = 'play' | 'insights' | 'train';
const TABS: { id: Tab; label: string; Icon: typeof CardsIcon }[] = [
  { id: 'play', label: 'Play', Icon: CardsIcon },
  { id: 'insights', label: 'Insights', Icon: ChartIcon },
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
  const dark = useApp((s) => s.dark);
  const glass = useApp((s) => s.glass);
  const active = session && (session.mode === 'online' || (game && game.status !== 'ended'));
  const named = profile.name.trim().length > 0;
  const [stats] = useState(loadStats);
  const [last, setLast] = useState(() => (active ? null : loadLastTable()));
  const [looking, setLooking] = useState(false);

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
    if (then === 'join') return navigate({ name: 'join' });
    if (!named) return navigate({ name: 'profile', then });
    navigate({ name: 'setup', mode: then === 'host' ? 'online' : 'local' });
  };

  const active_ = !!active;
  const index = TABS.findIndex((t) => t.id === tab);

  return (
    <div className="screen home">
      <div className="home-backdrop" aria-hidden>
        <i className="glow glow-1" />
        <i className="glow glow-2" />
        <PlayingCard card="As" size="lg" className="home-card home-card-1" />
        <PlayingCard card="Kh" size="lg" className="home-card home-card-2" />
      </div>
      <div className="home-head">
        <h1 className="logo">
          Flip<span>Up</span>
        </h1>
        <div className="home-quick">
          <button type="button" className="quick-btn glass press" aria-pressed={dark} aria-label="Dark mode" onClick={toggleDark}>
            <MoonIcon width={22} height={22} />
          </button>
          <button type="button" className="quick-btn glass press" aria-pressed={glass} aria-label="Liquid Glass" onClick={toggleGlass}>
            <GlassIcon width={22} height={22} />
          </button>
        </div>
        <button
          type="button"
          className="me-chip glass press"
          aria-label={named ? `Your profile: ${profile.name}` : 'Set up your profile'}
          onClick={() => navigate({ name: 'profile', then: 'done' })}
        >
          <Avatar emoji={profile.emoji} size={32} />
          <span>{named ? profile.name : 'You'}</span>
        </button>
      </div>
      <div className="home-sheet">
        <div className="home-scroll">
          <div className="home-title">
            <h2 className="h1">{named ? `Welcome back, ${profile.name}` : 'Welcome to FlipUp'}</h2>
            <p>{statusLine(stats, active_)}</p>
          </div>
          <div key={tab} className="home-pane">
            {tab === 'play' && (
              <>
                {last && (
                  <button type="button" className="home-row home-rejoin press" disabled={looking} onClick={() => void rejoin()}>
                    <ArrowIcon width={22} height={22} />
                    <span className="home-row-text">
                      <b>{looking ? 'Looking for the table…' : `Rejoin table ${last.code}`}</b>
                      <small>Last played {ago(last.at)}</small>
                    </span>
                  </button>
                )}
                {active && (
                  <button type="button" className="home-row press" onClick={() => navigate({ name: 'table' })}>
                    <ArrowIcon width={22} height={22} />
                    <span className="home-row-text">
                      <b>Back to your table</b>
                      <small>{session.mode === 'online' ? `Code ${session.code}` : 'You vs the bots'}</small>
                    </span>
                  </button>
                )}
                <button type="button" className="btn btn-dark btn-xl" onClick={(e) => colourWipe(e, () => go('host'))}>
                  Host a table
                </button>
                <div className="home-links">
                  <button type="button" className="btn btn-outline" onClick={() => go('join')}>
                    Join with a code
                  </button>
                  <button type="button" className="btn btn-outline" onClick={() => go('bots')}>
                    Play the bots
                  </button>
                </div>
                <button type="button" className="btn btn-link" onClick={() => openSheet({ name: 'rankings' })}>
                  Hand rankings
                </button>
                {stats.tables > 0 && (
                  <div className="home-stats" aria-label="Your totals">
                    <div className="stat">
                      <small>Lifetime</small>
                      <b className={`num ${stats.net > 0 ? 'good' : stats.net < 0 ? 'bad' : ''}`}>{signed(stats.net)}</b>
                    </div>
                    <div className="stat">
                      <small>Tables</small>
                      <b className="num">{stats.tables}</b>
                    </div>
                    <div className="stat">
                      <small>Hands</small>
                      <b className="num">{stats.hands}</b>
                    </div>
                  </div>
                )}
              </>
            )}
            {tab === 'insights' && <InsightsTab />}
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
        <button type="button" className="tab-round glass press" aria-label="Quick join" onClick={() => go('join')}>
          <QrIcon width={26} height={26} />
        </button>
      </nav>
    </div>
  );
}
