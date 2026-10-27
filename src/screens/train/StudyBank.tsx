// The study bank: Scroll hands and table hands you saved with a name, kept until you delete them, and
// the Scroll hands you played in the last 24 hours (unsaved hands go after a day).

import { useEffect, useState } from 'react';
import type { Colour } from '../../gto/types';
import { loadBank, loadRecent, removeBanked, renameBanked, restoreBanked, saveToBank, type BankHand, type PlayedQuiz } from '../../quiz/save';
import { navigate, toast, undoToast } from '../../state/store';
import { loadHistory, loadSaved, renameSaved, unsaveHand } from '../../state/training';
import { REPLAY_ON } from '../../train/replay';
import { CoachSays } from '../../train/Coach';
import { Dots, MiniCards } from '../../train/widgets';

const when = (at: number) =>
  new Date(at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) +
  ' · ' +
  new Date(at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

const play = (id: string) => navigate({ name: 'scroll', hand: id });

export function StudyBank() {
  const [bank, setBank] = useState(loadBank);
  const [recent, setRecent] = useState(() => loadRecent());
  useEffect(() => {
    const refresh = () => { setRecent(loadRecent()); setBank(loadBank()); };
    const timer = setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    return () => { clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, []);
  const [saved, setSaved] = useState(loadSaved);
  const [history] = useState(() => new Map(loadHistory().map((h) => [h.key, h])));
  const tableHands = saved.flatMap((s) => {
    const h = history.get(s.key);
    return h ? [{ ...s, hand: h }] : [];
  });
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState('');
  const banked = new Set(bank.map((h) => h.id));
  const unsaved = recent.filter((h) => !banked.has(h.id));

  // No "are you sure": it goes at once, and the toast can bring it back.
  const del = (h: BankHand) => {
    const index = bank.findIndex((b) => b.id === h.id);
    setBank(removeBanked(h.id));
    undoToast(`Deleted "${h.name}"`, () => setBank(restoreBanked(h, Math.max(0, index))));
  };

  const edit = (h: PlayedQuiz & { name?: string }) => {
    setEditing(h.id);
    setName(h.name ?? h.title);
  };
  const commit = (h: PlayedQuiz) => {
    try {
      setBank(banked.has(h.id) ? renameBanked(h.id, name) : saveToBank(h, name || h.title));
      setEditing(null);
    } catch (e) { toast(e instanceof Error ? e.message : 'Could not save this hand.', 'error'); }
  };

  const nameForm = (h: PlayedQuiz) => (
    <form
      className="quiz-save sb-form"
      onSubmit={(e) => {
        e.preventDefault();
        commit(h);
      }}
    >
      <input className="field" aria-label="Name" value={name} maxLength={60} autoFocus onChange={(e) => setName(e.target.value)} />
      <div className="quiz-save-actions">
        <button type="button" className="btn btn-link" onClick={() => setEditing(null)}>
          Cancel
        </button>
        <button type="submit" className="btn btn-sm btn-dark">
          {banked.has(h.id) ? 'Rename' : 'Save'}
        </button>
      </div>
    </form>
  );

  const renameForm = (key: string) => (
    <form
      className="quiz-save sb-form"
      onSubmit={(e) => {
        e.preventDefault();
        setSaved(renameSaved(key, name));
        setEditing(null);
      }}
    >
      <input className="field" aria-label="Name" value={name} maxLength={60} autoFocus onChange={(e) => setName(e.target.value)} />
      <div className="quiz-save-actions">
        <button type="button" className="btn btn-link" onClick={() => setEditing(null)}>
          Cancel
        </button>
        <button type="submit" className="btn btn-sm btn-dark">
          Rename
        </button>
      </div>
    </form>
  );

  if (bank.length === 0 && unsaved.length === 0 && tableHands.length === 0) {
    return (
      <div className="t-empty">
        <h2 className="h2">Nothing saved yet</h2>
        <p className="muted">
          Tap Save during a Scroll hand to keep it here with a name. Hands you don't save stay for 24 hours, then they're gone.
        </p>
        <button type="button" className="btn btn-dark" onClick={() => navigate({ name: 'scroll' })}>
          Play a hand
        </button>
      </div>
    );
  }

  return (
    <>
      <CoachSays lines={['Saved hands stay until you delete them. Play one again to have another go at every decision.']} />
      <h2 className="section-head">Saved</h2>
      {bank.length === 0 && tableHands.length === 0 ? (
        <p className="muted">No saved hands yet. Save one from the list below or during a hand.</p>
      ) : (
        <div className="t-list">
          {tableHands.map((s) => (
            <Row key={s.key} cards={s.hand.record.holes[s.hand.heroId] ?? []} title={s.name} sub={`Table hand · saved ${when(s.saved)}`}>
              {editing === s.key ? (
                renameForm(s.key)
              ) : (
                <div className="sb-actions">
                  <button type="button" className="btn btn-link danger" onClick={() => setSaved(unsaveHand(s.key))}>
                    Delete
                  </button>
                  <button type="button" className="btn btn-link" onClick={() => (setEditing(s.key), setName(s.name))}>
                    Rename
                  </button>
                  {REPLAY_ON && (
                    <button type="button" className="btn btn-link" onClick={() => navigate({ name: 'replay', key: s.key })}>
                      Replay
                    </button>
                  )}
                  <button type="button" className="btn btn-sm btn-dark" onClick={() => navigate({ name: 'lesson', key: s.key })}>
                    Review
                  </button>
                </div>
              )}
            </Row>
          ))}
          {bank.map((h) => (
            <Row key={h.id} cards={h.cards ?? []} grades={h.grades} title={h.name} sub={`Scroll hand · saved ${when(h.saved)}`}>
              {editing === h.id ? (
                nameForm(h)
              ) : (
                <div className="sb-actions">
                  <button type="button" className="btn btn-link danger" onClick={() => del(h)}>
                    Delete
                  </button>
                  <button type="button" className="btn btn-link" onClick={() => edit(h)}>
                    Rename
                  </button>
                  <button type="button" className="btn btn-sm btn-dark" onClick={() => play(h.id)}>
                    Play again
                  </button>
                </div>
              )}
            </Row>
          ))}
        </div>
      )}
      {unsaved.length > 0 && (
        <>
          <h2 className="section-head">Last 24 hours</h2>
          <p className="muted">Not saved, so these go a day after you play them.</p>
          <div className="t-list">
            {unsaved.map((h) => (
              <Row key={h.id} cards={h.cards ?? []} grades={h.grades} title={h.title} sub={when(h.at)}>
                {editing === h.id ? (
                  nameForm(h)
                ) : (
                  <div className="sb-actions">
                    <button type="button" className="btn btn-link" onClick={() => play(h.id)}>
                      Play again
                    </button>
                    <button type="button" className="btn btn-sm btn-dark" onClick={() => edit(h)}>
                      Save
                    </button>
                  </div>
                )}
              </Row>
            ))}
          </div>
        </>
      )}
    </>
  );
}

function Row({ cards, grades, title, sub, children }: { cards: string[]; grades?: Colour[]; title: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="t-row sb-row">
      <div className="sb-top">
        <MiniCards cards={cards} />
        <span className="t-row-main">
          <b>{title}</b>
          <small>{sub}</small>
        </span>
        {grades && <Dots colours={grades} />}
      </div>
      {children}
    </div>
  );
}
