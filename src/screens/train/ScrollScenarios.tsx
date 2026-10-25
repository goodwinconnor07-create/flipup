import { useEffect, useState } from 'react';
import { BackBar, PlayingCard } from '../../ui/components';
import { CoachSays } from '../../train/Coach';
import type { Colour } from '../../gto/types';
import { GRADE_WORD } from '../../train/coach';
import { getScenario, nextScenario, feedback, formatFrequency, requestSize, scenarioGrade, sizeResult, type ScrollScenario, type ScenarioOption } from '../../quiz/scenarios';
import { isBanked, loadQuiz, recordPlayed, saveQuizHand, saveToBank } from '../../quiz/save';
import { markPlayedToday } from '../../state/persist';

export function ScrollScenarios({ handId, provided, onNext, onAnswered }: { handId?: string; provided?: ScrollScenario; onNext?: () => void; onAnswered?: (colour: Colour, pick: number) => void }) {
  const [s, setScenario] = useState<ScrollScenario | null>(null);
  const [error, setError] = useState('');
  const [choice, setChoice] = useState<ScenarioOption | null>(null);
  const [banked, setBanked] = useState(false);
  const [name, setName] = useState('');
  const [naming, setNaming] = useState(false);
  const [details, setDetails] = useState(false);
  const [percent, setPercent] = useState(50);
  const [queued, setQueued] = useState<string | null>(null);
  const [queueNote, setQueueNote] = useState('');
  const [custom, setCustom] = useState<ScenarioOption | null>(null);
  const deal = async (id?: string) => {
    setError(''); setScenario(null); setChoice(null); setQueued(null); setQueueNote(''); setCustom(null); setNaming(false); setDetails(false);
    try { const h = provided ?? await (id ? getScenario(id) : nextScenario(loadQuiz().seen)); setScenario(h); setBanked(isBanked(h.id)); setName(`${h.players}-way ${h.cards.join(' ')} on ${h.board.join(' ')}`); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not load a scenario.'); }
  };
  useEffect(() => { void deal(handId); }, [handId, provided]);
  useEffect(() => {
    if (!queued) return;
    let cancelled = false;
    const timer = setInterval(() => { void sizeResult(queued).then(r => {
      if (cancelled) return;
      if (r.status === 'done' && r.result) { setScenario(r.result.scenario); setBanked(isBanked(r.result.scenario.id)); setCustom(null); setQueueNote('Your size is solved. You can now choose it.'); setQueued(null); }
      else if (r.status === 'failed') { setQueueNote('This size needs more solving time. It has not been graded.'); setQueued(null); }
    }).catch(() => {}); }, 5000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [queued]);
  const grade = s && choice ? scenarioGrade(s, choice) : null;
  const played = () => ({ id: s!.id, at: Date.now(), title: name, cards: s!.cards, picks: choice ? [s!.options.indexOf(choice)] : [], grades: grade ? [grade.colour] : [], snapshot: s! });
  const answer = (o: ScenarioOption) => {
    if (!s || choice) return;
    const g = scenarioGrade(s, o); setChoice(o); if (onAnswered) onAnswered(g.colour,s.options.indexOf(o)); else saveQuizHand(s.id, [g.colour]);
    if (!provided) recordPlayed({ id: s.id, at: Date.now(), title: name, cards: s.cards, picks: [s.options.indexOf(o)], grades: [g.colour], snapshot: s }); markPlayedToday();
  };
  const queueSize = async () => {
    if (!s) return;
    const to = Math.min(s.wagers[s.hero] + s.stacks[s.hero], (s.toCall ? Math.max(...s.wagers) : s.wagers[s.hero]) + (s.pot + s.toCall) * percent / 100);
    const existing = s.options.find(o => Math.abs(o.to - to) < .001 && ['bet', 'raise', 'allin'].includes(o.kind));
    if (existing) { answer(existing); return; }
    try { setQueued(await requestSize(s, to)); setQueueNote('Queued for an exact solve on the laptops. This choice is ungraded until it is ready.'); }
    catch (e) { setQueueNote(e instanceof Error ? e.message : 'Could not queue that size.'); }
  };
  return <div className="screen train quiz">
    <BackBar title="Scroll" right={s && <button className="chip-btn" onClick={() => setNaming(!naming)}>{banked ? 'Saved' : 'Save'}</button>} />
    <div className="screen-body">
      {!s ? <CoachSays quick lines={[error || 'Loading a verified scenario…']}><button className="btn" onClick={() => void deal(handId)}>Check for new solves</button></CoachSays> : <>
        <div className="glass-card">
          <p className="eyebrow">{s.players}-way · {s.board.length === 5 ? 'River' : s.board.length === 4 ? 'Turn' : 'Flop'} · {s.difficulty === 'mixed' ? 'Mixed strategy' : s.difficulty === 'close' ? 'Close decision' : 'Find the better line'}</p>
          <div className="chips-row">{s.board.map(c => <PlayingCard key={c} card={c} size="sm" />)}</div>
          <p>Pot <b>{s.pot.toFixed(2)}bb</b> · Your stack {s.stacks[s.hero].toFixed(2)}bb{s.toCall > 0 ? ` · ${s.toCall.toFixed(2)}bb to call` : ' · No bet to face'}</p>
          <div className="chips-row">{s.cards.map(c => <PlayingCard key={c} card={c} size="sm" />)}</div>
          {s.history.length > 0 && <p className="muted">{s.history.map(a => `${a.player != null ? `Player ${a.player + 1} ` : ''}${a.type}${a.amount ? ` to ${a.amount.toFixed(2)}bb` : ''}`).join(' → ')}</p>}
        </div>
        {naming && <form className="quiz-save" onSubmit={e => { e.preventDefault(); try { saveToBank(played(), name); setBanked(true); setNaming(false); } catch (error) { setQueueNote(error instanceof Error ? error.message : 'Could not save this hand.'); } }}><input className="field" aria-label="Save name" maxLength={60} value={name} onChange={e => setName(e.target.value)} /><button className="btn btn-blue" type="submit">Save</button></form>}
        <div className="quiz-options" role="group" aria-label="Your move">
          {[...s.options, ...(custom ? [custom] : [])].map((o, i) => <button key={i} disabled={!!choice} className={`btn btn-outline answer-btn${choice === o && grade ? ` ${grade.colour}` : ''}`} onClick={() => answer(o)}><span>{o.label}</span>{choice && <small>{o.freq === 0 ? 'Solved frequency 0%' : `Solved frequency ${formatFrequency(o.freq)}`}</small>}</button>)}
        </div>
        {!choice && <form className="quiz-save" onSubmit={e => { e.preventDefault(); void queueSize(); }}>
          <label htmlFor="scroll-size">{s.toCall ? 'Raise above the call (% of pot after calling)' : 'Bet (% of pot)'}</label>
          <input id="scroll-size" className="field" type="number" min={0} step="any" value={percent} onChange={e => setPercent(Number(e.target.value))} />
          <button className="btn btn-blue" disabled={!!queued || !Number.isFinite(percent) || percent <= 0}>Choose this size</button>
        </form>}
        {queueNote && <p role="status">{queueNote}</p>}
        {choice && grade ? <CoachSays quick tone={grade.colour} lines={[<b key="grade">{GRADE_WORD[grade.colour]}</b>, ...feedback(s, choice)]}><button className="btn btn-dark" onClick={() => onNext ? onNext() : void deal()}>{onNext ? 'Continue hand' : 'Next scenario'}</button></CoachSays> : <CoachSays quick lines={['Your move. Choose a line, then compare the reasons and the solved mix.']} />}
        <button className="btn btn-link" aria-expanded={details} onClick={() => setDetails(!details)}>{details ? 'Less detail' : 'Ranges and solution details'}</button>
        {details && <div className="glass-card"><p>{s.assumptions}</p>{s.ranges.map(r => <p key={r.player}>Player {r.player + 1}{r.player === s.hero ? ' (you)' : ''}{!r.active ? ' (folded)' : ''}: {r.combos} weighted combos. Most represented classes: {r.classes.join(', ')}.</p>)}<p>Full future-street solve · measured gap {s.quality.gapPct.toFixed(3)}% of pot · {s.quality.iterations} iterations. Accuracy is for these ranges and bet sizes.</p></div>}
      </>}
    </div>
  </div>;
}
