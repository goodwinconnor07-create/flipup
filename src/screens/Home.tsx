import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { fetchTableInfo } from '../state/api';
import { loadLastTable, loadStats, saveLastTable } from '../state/persist';
import { homeView, navigate, openSheet, toast, useApp } from '../state/store';
import { Avatar } from '../ui/components';
import { GameShelf } from './HomeGames';
import { LegendShelf } from './HomeLegends';
import { LEGENDS_ON } from '../game';
import { PartyTab } from './HomeParty';
import { CampaignTab } from './HomeCampaign';
import { loadPartyRef } from '../state/party';
import { colourWipe } from '../ui/effects';
import { ChevronIcon, CloseIcon, ChipIcon, PencilIcon, PersonIcon, KeypadIcon, PlusIcon, SpadeIcon, UsersIcon } from '../ui/Icons';
import { variantInfo } from '../game';

function ago(at: number): string {
  const mins = Math.max(1, Math.round((Date.now() - at) / 60_000));
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  return `${Math.round(hours / 24)} days ago`;
}

type Tab = typeof homeView.tab;
const TABS: { id: Tab; label: string; Icon: typeof SpadeIcon; title: string }[] = [
  { id: 'play', label: 'Play', Icon: SpadeIcon, title: 'Play' },
  { id: 'campaign', label: 'Campaign', Icon: ChipIcon, title: 'Campaign' },
  { id: 'party', label: 'Party', Icon: UsersIcon, title: 'Party' },
];

/** One line under the greeting: your table, or how your last game went. Chips reset every game, so they're never the measure. */
function statusLine(active: boolean): string {
  if (active) return 'Your table is waiting.';
  const last = loadStats().games.at(-1);
  if (last) {
    const info = variantInfo(last.variant as never);
    return `Last time: ${info.emoji} ${info.name}${last.place ? `, ${last.place === 1 ? 'you won' : `finished ${last.place === 2 ? '2nd' : last.place === 3 ? '3rd' : `${last.place}th`}`}` : ''}.`;
  }
  return 'Pick a game and deal yourself in.';
}

export function Home() {
  // Coming back from another screen lands on the same tab, at the same place on the page.
  const [tab, setTabState] = useState<Tab>(homeView.tab);
  const sheet = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (sheet.current) sheet.current.scrollTop = homeView.scroll;
  }, []);
  const setTab = (t: Tab) => {
    if (t === homeView.tab) return;
    homeView.tab = t;
    homeView.scroll = 0;
    if (sheet.current) sheet.current.scrollTop = 0;
    setTabState(t);
  };
  // Only these are read from the table, as plain values, so a bot's move at a table you're not looking at doesn't redraw Home.
  const gameOn = useApp((s) => !!s.game && s.game.status !== 'ended');
  const gameFaces = useApp((s) => (s.game ? s.game.players.map((p) => p.emoji).join('|') : ''));
  const session = useApp((s) => s.session);
  const profile = useApp((s) => s.profile);
  const active = session && (session.mode === 'online' || gameOn);
  const named = profile.name.trim().length > 0;
  const [last, setLast] = useState(() => (active ? null : loadLastTable()));
  const [looking, setLooking] = useState(false);
  // A table you left may have closed since. Look quietly and drop the banner if it has.
  useEffect(() => {
    if (!last) return;
    let live = true;
    fetchTableInfo(last.code)
      .then((info) => {
        if (!live || (info && info.status !== 'ended')) return;
        saveLastTable(null);
        setLast(null);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [last?.code]);
  const dismissLast = () => {
    saveLastTable(null);
    setLast(null);
  };
  const [party] = useState(loadPartyRef);
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
  const go = (then: 'host' | 'bots') => {
    if (!named) return navigate({ name: 'profile', then });
    navigate({ name: 'setup', mode: then === 'host' ? 'online' : 'local' });
  };

  // The banner only shows when there's one clear next step: your open table, or the online table you left.
  const banner: { title: string; sub: string; cta: string; run: () => void; faces: string[]; tone: string; dismiss?: () => void } | null = active
    ? { title: 'Back to your table', sub: session.mode === 'online' ? `Table ${session.code}` : 'You vs the bots', cta: 'Back to the table', run: () => navigate({ name: 'table' }), faces: gameFaces ? gameFaces.split('|') : [], tone: 'slate' }
    : party
      ? { title: 'Your party', sub: `Code ${party.code}`, cta: 'Open the party', run: () => navigate({ name: 'party' }), faces: [], tone: 'slate' }
      : last
      ? { title: `Table ${last.code}`, sub: `Left ${ago(last.at)}`, cta: looking ? 'Looking…' : 'Rejoin', run: () => void rejoin(), faces: last.faces ?? [], tone: 'slate', dismiss: dismissLast }
      : null;
  const index = TABS.findIndex((t) => t.id === tab);
  const current = TABS[index];
  const subtitle =
    tab === 'party'
        ? 'Mini game tournaments with your friends.'
        : tab === 'campaign'
          ? 'Your bankroll against the bots. Climb from the Garage to the Yacht.'
          : `${named ? `Hi ${profile.name}. ` : ''}${statusLine(!!active)}`;

  return (
    <div className="screen home">
      <div className="home-sheet" ref={sheet} onScroll={(e) => (homeView.scroll = e.currentTarget.scrollTop)}>
        <div className="home-scroll">
          <header className="home-title">
            <div className="title-row">
              <h1 className="large-title">{current.title}</h1>
              <button
                type="button"
                className="avatar-btn press"
                aria-label={named ? `Your profile and settings: ${profile.name}` : 'Set up your profile'}
                onClick={() => navigate({ name: 'profile', then: 'done' })}
              >
                {named ? (
                  <Avatar emoji={profile.emoji} size={52} />
                ) : (
                  <span className="avatar-empty" aria-hidden>
                    <PersonIcon width={30} height={30} />
                  </span>
                )}
                <span className="avatar-badge" aria-hidden>
                  {named ? <PencilIcon width={12} height={12} /> : <PlusIcon width={13} height={13} />}
                </span>
              </button>
            </div>
            <p>{subtitle}</p>
          </header>
          <div key={tab} className="home-pane">
            {tab === 'play' && (
              <>
                {banner && (
                  <div className={`hero hero-row hero-${banner.tone}`}>
                    <button type="button" className="hero-main press" disabled={looking} onClick={(e) => colourWipe(e, banner.run)} aria-label={`${banner.title}. ${banner.sub}. ${banner.cta}`}>
                      <span className="hero-badge" aria-hidden>
                        {banner.faces.length > 0 ? <Avatar emoji={banner.faces[0]} size={36} /> : <UsersIcon width={22} height={22} />}
                      </span>
                      <span className="hero-text">
                        <span className="hero-title">{banner.title}</span>
                        <span className="hero-sub">{banner.sub}</span>
                      </span>
                      <span className="hero-go">
                        {banner.cta}
                        <ChevronIcon width={16} height={16} />
                      </span>
                    </button>
                    {banner.dismiss && (
                      <button type="button" className="hero-x press" aria-label="Forget this table" onClick={banner.dismiss}>
                        <CloseIcon width={16} height={16} />
                      </button>
                    )}
                  </div>
                )}
                <h3 className="section-head">Quick start</h3>
                <GameShelf />
                <section className="start-row" aria-label="Start a table">
                  <button type="button" className="start-tile start-blue press" onClick={() => go('host')}>
                    <span className="start-faces" aria-hidden>
                      <span>🥳</span>
                      <span>😄</span>
                      <span>🤓</span>
                    </span>
                    <b>Play with friends</b>
                    <small>Share a code. They join on their phones.</small>
                  </button>
                  <button type="button" className="start-tile start-green press" onClick={() => go('bots')}>
                    <span className="start-faces" aria-hidden>
                      <span>🦁</span>
                      <span>🤩</span>
                      <span>🦊</span>
                    </span>
                    <b>Play with bots</b>
                    <small>On this phone, no timer.</small>
                  </button>
                </section>
                {LEGENDS_ON && <LegendShelf />}
              </>
            )}
            {tab === 'campaign' && <CampaignTab />}
            {tab === 'party' && <PartyTab />}
          </div>
        </div>
      </div>
      <nav className="home-tabs" aria-label="Home">
        <div className="tabbar glass" role="tablist" style={{ ['--i' as string]: index, ['--n' as string]: TABS.length }}>
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
        <button type="button" className="tab-round glass press" aria-label="Join with a code" onClick={() => openSheet({ name: 'join' })}>
          <KeypadIcon width={26} height={26} />
        </button>
      </nav>
    </div>
  );
}
