// The study bank: Scroll hands you saved with a name, kept until you delete them, and the hands you
// played in the last 24 hours (saved or not, those go after a day).

import { useState } from 'react';
import type { Colour } from '../../gto/types';
import { loadBank, loadRecent, removeBanked, renameBanked, saveToBank, type BankHand, type PlayedQuiz } from '../../quiz/save';
import { navigate } from '../../state/store';
import { CoachSays } from '../../train/Coach';
import { Dots, MiniCards } from '../../train/widgets';

const when = (at: number) =>
  new Date(at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) +
  ' · ' +
  new Date(at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

const play = (id: string) => navigate({ name: 'scroll', hand: id });

export function StudyBank() {
  const [bank, setBank] = useState(loadBank);
  const [recent] = useState(() => loadRecent());
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState('');
  const banked = new Set(bank.map((h) => h.id));
  const unsaved = recent.filter((h) => !banked.has(h.id));

  const edit = (h: PlayedQuiz & { name?: string }) => {
    setEditing(h.id);
    setName(h.name ?? h.title);
  };
  const commit = (h: PlayedQuiz) => {
    setBank(banked.has(h.id) ? renameBanked(h.id, name) : saveToBank(h, name || h.title));
    setEditing(null);
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

  if (bank.length === 0 && unsaved.length === 0) {
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
      {bank.length === 0 ? (
        <p className="muted">No saved hands yet. Save one from the list below or during a hand.</p>
      ) : (
        <div className="t-list">
          {bank.map((h) => (
            <Row key={h.id} hand={h} title={h.name} sub={`Saved ${when(h.saved)}`}>
              {editing === h.id ? (
                nameForm(h)
              ) : (
                <div className="sb-actions">
                  <button type="button" className="btn btn-link danger" onClick={() => setBank(removeBanked(h.id))}>
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
              <Row key={h.id} hand={h} title={h.title} sub={when(h.at)}>
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

function Row({ hand, title, sub, children }: { hand: PlayedQuiz | BankHand; title: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="t-row sb-row">
      <div className="sb-top">
        <MiniCards cards={hand.cards ?? []} />
        <span className="t-row-main">
          <b>{title}</b>
          <small>{sub}</small>
        </span>
        <Dots colours={hand.grades as Colour[]} />
      </div>
      {children}
    </div>
  );
}
