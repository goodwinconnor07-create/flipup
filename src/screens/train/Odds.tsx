// Odds and outs: poker maths you can do at the table. A list of topics, each with a formula card and a quiz;
// every answer comes with the worked sum from the coach. The questions and their sums live in src/train/odds.

import { useMemo, useState } from 'react';
import type { Card } from '../../game';
import { deal, questionsFor, type Question, type TopicId } from '../../train/odds/bank';
import { lessonFor, LESSONS, loadOdds, recordOdds, SOURCES } from '../../train/odds/lessons';
import { CoachSays } from '../../train/Coach';
import { CardText, PlayingCard } from '../../ui/components';
import { ChevronIcon } from '../../ui/Icons';
import { haptic } from '../../ui/effects';

const ROUND = 10;

type View = { kind: 'topics' } | { kind: 'lesson'; topic: TopicId } | { kind: 'quiz'; topic: TopicId | 'mixed'; qs: Question[] };

export function OddsTrainer() {
  const [view, setView] = useState<View>({ kind: 'topics' });
  const start = (topic: TopicId | 'mixed') => setView({ kind: 'quiz', topic, qs: deal(topic, ROUND, Math.random) });
  if (view.kind === 'lesson') return <LessonCard topic={view.topic} onStart={() => start(view.topic)} onBack={() => setView({ kind: 'topics' })} />;
  if (view.kind === 'quiz')
    return <Quiz key={view.qs.map((q) => q.id).join()} topic={view.topic} qs={view.qs} onAgain={() => start(view.topic)} onDone={() => setView({ kind: 'topics' })} />;
  return <Topics onOpen={(topic) => setView({ kind: 'lesson', topic })} onMixed={() => start('mixed')} />;
}

function Topics({ onOpen, onMixed }: { onOpen: (t: TopicId) => void; onMixed: () => void }) {
  const progress = useMemo(loadOdds, []);
  const asked = Object.values(progress).reduce((n, t) => n + (t?.asked ?? 0), 0);
  const right = Object.values(progress).reduce((n, t) => n + (t?.right ?? 0), 0);
  return (
    <>
      <CoachSays
        quick={asked > 0}
        lines={[
          asked
            ? `You've got ${right} of ${asked} right so far. Pick a topic, or mix them up.`
            : "Poker maths you can do in your head at the table. Read the formula, then try 10 questions. I'll show the working every time.",
        ]}
      />
      <button type="button" className="hero hero-blue press" onClick={onMixed}>
        <span className="hero-top">
          <span className="hero-eyebrow">Odds and outs</span>
          <span className="hero-title">Mixed quiz</span>
          <span className="hero-sub">10 questions from every topic: outs, pot odds, MDF, combos, EV and more.</span>
        </span>
        <span className="hero-foot">
          Start
          <ChevronIcon width={18} height={18} />
        </span>
      </button>
      <div className="group">
        {LESSONS.map((l) => {
          const p = progress[l.id];
          return (
            <button key={l.id} type="button" className="group-row press" onClick={() => onOpen(l.id)}>
              <span className="gr-icon odds-emoji" aria-hidden>
                {l.emoji}
              </span>
              <span className="gr-text">
                {l.title}
                <small>{p?.asked ? `${l.hint} · ${p.right}/${p.asked} right` : l.hint}</small>
              </span>
              <ChevronIcon className="gr-chev" width={16} height={16} />
            </button>
          );
        })}
      </div>
      <p className="muted odds-sources">{SOURCES}</p>
    </>
  );
}

function LessonCard({ topic, onStart, onBack }: { topic: TopicId; onStart: () => void; onBack: () => void }) {
  const l = lessonFor(topic);
  const n = questionsFor(topic).length;
  return (
    <>
      <button type="button" className="btn btn-link odds-back" onClick={onBack}>
        ‹ All topics
      </button>
      <h2 className="h2">
        {l.emoji} {l.title}
      </h2>
      <div className="odds-formula">
        <small className="eyebrow">Formula</small>
        <b>{l.formula}</b>
      </div>
      <h3 className="section-head">How to use it</h3>
      <ul className="odds-how">
        {l.how.map((h) => (
          <li key={h}>
            <CardText text={h} />
          </li>
        ))}
      </ul>
      <CoachSays quick lines={[<CardText key="e" text={`Example: ${l.example}`} />, l.tip]} />
      <button type="button" className="btn btn-dark" onClick={onStart}>
        Start the quiz ({Math.min(ROUND, n)} of {n} questions)
      </button>
    </>
  );
}

function Hand({ label, cards }: { label: string; cards: Card[] }) {
  return (
    <div className="odds-hand">
      <small className="eyebrow">{label}</small>
      <div className="odds-row">
        {cards.map((c) => (
          <PlayingCard key={c} card={c} size="md" />
        ))}
      </div>
    </div>
  );
}

function Quiz({ topic, qs, onAgain, onDone }: { topic: TopicId | 'mixed'; qs: Question[]; onAgain: () => void; onDone: () => void }) {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const q = qs[i];
  const title = topic === 'mixed' ? 'Mixed quiz' : lessonFor(topic).title;

  if (!q) {
    const share = score / qs.length;
    return (
      <div className="odds-done">
        <h2 className="h2">{title}</h2>
        <b className="num odds-score">
          {score}/{qs.length}
        </b>
        <CoachSays
          lines={[
            share >= 0.9
              ? 'Brilliant. You know this cold.'
              : share >= 0.6
                ? 'Good work. Read the working on the ones you missed and go again.'
                : "This one takes practice. Have another look at the formula, then try again: it sticks after a couple of goes.",
          ]}
        />
        <button type="button" className="btn btn-dark" onClick={onAgain}>
          Another 10
        </button>
        <button type="button" className="btn btn-outline" onClick={onDone}>
          All topics
        </button>
      </div>
    );
  }

  const choose = (k: number) => {
    if (picked != null) return;
    const right = k === q.answer;
    setPicked(k);
    if (right) setScore((s) => s + 1);
    haptic(right ? 'success' : 'error');
    recordOdds(q.topic, right);
  };
  const next = () => {
    setPicked(null);
    setI(i + 1);
  };

  return (
    <div className="odds-quiz">
      <div className="odds-progress">
        <span>{title}</span>
        <span>
          {i + 1} of {qs.length}
        </span>
      </div>
      <div className="odds-bar" aria-hidden>
        <i style={{ width: `${(i / qs.length) * 100}%` }} />
      </div>
      {(q.hero || q.villain || q.board) && (
        <div className="odds-table">
          {q.hero && <Hand label="You" cards={q.hero} />}
          {q.villain && <Hand label="Them" cards={q.villain} />}
          {q.board && <Hand label="Board" cards={q.board} />}
        </div>
      )}
      {q.facts && (
        <div className="odds-facts">
          {q.facts.map(([k, v]) => (
            <div key={k} className="tile tile-flat">
              <small className="eyebrow">{k}</small>
              <b className="num">{v}</b>
            </div>
          ))}
        </div>
      )}
      <p className="odds-prompt">{q.prompt}</p>
      <div className={`odds-choices${q.choices.length === 2 ? ' two' : ''}`}>
        {q.choices.map((c, k) => (
          <button
            key={c}
            type="button"
            className={`btn answer-btn ${picked == null ? 'btn-outline' : k === q.answer ? 'green' : k === picked ? 'red' : 'btn-outline'}${picked === k ? ' picked' : ''}`}
            disabled={picked != null}
            onClick={() => choose(k)}
          >
            {c}
          </button>
        ))}
      </div>
      {picked != null && (
        <>
          <CoachSays
            quick
            tone={picked === q.answer ? 'green' : 'red'}
            status={picked === q.answer ? 'Right' : `It's ${q.choices[q.answer]}`}
            lines={q.steps.map((s, k) => <CardText key={k} text={s} />)}
          />
          <button type="button" className="btn btn-dark" onClick={next}>
            {i + 1 < qs.length ? 'Next question' : 'See your score'}
          </button>
        </>
      )}
    </div>
  );
}
