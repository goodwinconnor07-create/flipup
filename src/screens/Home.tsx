import { useState } from 'react';
import { fetchTableInfo } from '../state/api';
import { BOTS } from '../game/botStyles';
import type { Settings } from '../game';
import { loadLastBots, loadLastTable, loadStats, loadStreak, saveLastTable } from '../state/persist';
import { navigate, openSheet, toast, useApp } from '../state/store';
import { Avatar } from '../ui/components';
import { InsightsTab } from './HomeInsights';
import { QuickGames, startBots } from './HomeQuick';
import { TrainTab } from './HomeTrain';
import { colourWipe } from '../ui/effects';
import { CardsIcon, ChartIcon, ChevronIcon, GearIcon, QrIcon, SparkIcon, UsersIcon } from '../ui/Icons';
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
  const active = session && (session.mode === 'online' || (game && game.status !== 'ended'));
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
    if (then === 'join') return navigate({ name: 'join' });
    if (!named) return navigate({ name: 'profile', then });
    navigate({ name: 'setup', mode: then === 'host' ? 'online' : 'local' });
  };

  const playAgain = (names: string[], settings: Settings) => startBots(names, settings, named);
  const lastBots = loadLastBots();
  const lastBotFaces = lastBots ? lastBots.bots.map((n) => BOTS.find((b) => b.name === n)).filter((b): b is (typeof BOTS)[number] => !!b) : [];
  // One clear next step: your open table, the online table you left, your last bots game, or a fresh start.
  const hero: { kind: 'table' | 'rejoin' | 'again' | 'new'; title: string; sub: string; cta: string; run: () => void; bots: typeof lastBotFaces } = active
    ? { kind: 'table', title: 'Your table is waiting', sub: session.mode === 'online' ? `Code ${session.code}` : 'You vs the bots', cta: 'Back to the table', run: () => navigate({ name: 'table' }), bots: [] }
    : last
      ? { kind: 'rejoin', title: `Table ${last.code}`, sub: `Last played ${ago(last.at)}`, cta: looking ? 'Looking…' : 'Rejoin', run: () => void rejoin(), bots: [] }
      : lastBots && lastBotFaces.length
        ? {
            kind: 'again',
            title: lastBotFaces.length === 1 ? `Play ${lastBotFaces[0].name} again` : `Same ${lastBotFaces.length} bots again`,
            sub: `Last played ${ago(lastBots.at)}`,
            cta: 'Play again',
            run: () => void playAgain(lastBots.bots, lastBots.settings),
            bots: lastBotFaces,
          }
        : { kind: 'new', title: 'Play your first hand', sub: 'Take on the bots now, or host a table for friends.', cta: 'Start playing', run: () => go('bots'), bots: [] };
  const active_ = !!active;
  const index = TABS.findIndex((t) => t.id === tab);

  return (
    <div className="screen home">
      <div className="home-backdrop" aria-hidden>
        <i className="glow glow-1" />
        <i className="glow glow-2" />
      </div>
      <div className="home-head">
        <div className={`streak-pill${streak.today ? ' lit' : ''}`} role="img" aria-label={`${streak.days} day streak${streak.today ? '' : ', play today to keep it'}`}>
          <span className="streak-fire" aria-hidden>🔥</span>
          <b>{streak.days}</b>
        </div>
        <div className="capsule glass">
          <button type="button" className="capsule-btn press" aria-label="Settings" onClick={() => openSheet({ name: 'prefs' })}>
            <GearIcon width={22} height={22} />
          </button>
          <button
            type="button"
            className="capsule-btn press"
            aria-label={named ? `Your profile: ${profile.name}` : 'Set up your profile'}
            onClick={() => navigate({ name: 'profile', then: 'done' })}
          >
            <Avatar emoji={profile.emoji} size={30} />
          </button>
        </div>
      </div>
      <div className="home-sheet">
        <div className="home-scroll">
          <div className="home-title">
            <h2 className="large-title">{tab === 'insights' ? 'Insights' : tab === 'train' ? 'Train' : 'Play'}</h2>
            <p>{tab === 'insights' ? 'How your hands and tables are going.' : tab === 'train' ? 'Quick drills, graded against GTO.' : `${named ? `Hi ${profile.name}. ` : ''}${statusLine(stats, active_)}`}</p>
          </div>
          <div key={tab} className="home-pane">
            {tab === 'play' && (
              <>
                <button type="button" className="hero press" disabled={looking} onClick={(e) => colourWipe(e, hero.run)} aria-label={`${hero.title}. ${hero.cta}`}>
                  <span className="hero-top">
                    <small className="hero-eyebrow">{hero.kind === 'new' ? 'Get started' : 'Pick up where you left off'}</small>
                    {hero.kind === 'again' && (
                      <span className="hero-faces" aria-hidden>
                        {hero.bots.slice(0, 5).map((b) => (
                          <Avatar key={b.name} emoji={b.emoji} size={36} />
                        ))}
                      </span>
                    )}
                    <span className="hero-title">{hero.title}</span>
                    <span className="hero-sub">{hero.sub}</span>
                  </span>
                  <span className="hero-foot">
                    {hero.cta}
                    <ChevronIcon width={18} height={18} />
                  </span>
                </button>
                <section className="group" aria-label="Start a game">
                  <button type="button" className="group-row press" onClick={() => go('host')}>
                    <span className="gr-icon" style={{ background: 'var(--blue)' }}>
                      <UsersIcon />
                    </span>
                    <span className="gr-text">Host a table</span>
                    <ChevronIcon className="gr-chev" width={16} height={16} />
                  </button>
                  <button type="button" className="group-row press" onClick={() => go('join')}>
                    <span className="gr-icon" style={{ background: 'var(--green)' }}>
                      <QrIcon />
                    </span>
                    <span className="gr-text">Join with a code</span>
                    <ChevronIcon className="gr-chev" width={16} height={16} />
                  </button>
                  <button type="button" className="group-row press" onClick={() => go('bots')}>
                    <span className="gr-icon" style={{ background: 'var(--violet)' }}>
                      <CardsIcon />
                    </span>
                    <span className="gr-text">Play the bots</span>
                    <ChevronIcon className="gr-chev" width={16} height={16} />
                  </button>
                </section>
                <QuickGames showAgain={hero.kind !== 'again'} />
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
