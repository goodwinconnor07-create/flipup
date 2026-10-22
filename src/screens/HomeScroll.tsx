import { useMemo } from 'react';
import { themeForm } from '../scroll/feed';
import { levelOf } from '../scroll/save';
import { THEMES, type Theme } from '../scroll/types';
import { navigate, openScroll, useApp } from '../state/store';
import { CoachSays } from '../train/Coach';
import { ChevronIcon, FlameIcon } from '../ui/Icons';
import { TEMPLATES } from '../scroll/templates';

const ORDER: Theme[] = ['open', 'defend', 'exploit', 'odds'];

/** What the coach opens with on the Scroll tab. */
function hello(cards: number, combo: number, weak: Theme | null): string {
  if (cards === 0)
    return 'Swipe through short poker spots, one at a time. Each one has a goal, a bot to beat and a quick word from me afterwards.';
  if (weak) return `${THEMES[weak].title} cards have been tough lately, so you'll see a few more of those.`;
  if (combo >= 3) return `${combo} in a row. Keep it going.`;
  return 'Ready for another card?';
}

/** The Scroll tab: where you stand, and a big button to keep going. */
export function ScrollTab() {
  const save = useApp((s) => s.scroll);
  const level = levelOf(save.stars);
  const forms = useMemo(() => ORDER.map((theme) => ({ theme, form: themeForm(save, theme) })), [save]);
  const weak = forms.filter((f) => f.form !== null && f.form < 0.6).sort((a, b) => (a.form ?? 0) - (b.form ?? 0))[0]?.theme ?? null;
  const left = level.span ? level.span - level.into : 0;
  return (
    <>
      <button
        type="button"
        className="hero scroll-hero press"
        onClick={openScroll}
        aria-label={save.cards ? 'Keep scrolling' : 'Start scrolling'}
      >
        <span className="hero-top">
          <span className="hero-eyebrow">
            Level {level.level} · {level.name}
          </span>
          <span className="hero-title">{save.cards ? 'Keep scrolling' : 'Start scrolling'}</span>
          <span className="hero-sub">
            {save.cards
              ? `${save.cards} cards done · ${save.stars} stars${left ? ` · ${left} to level ${level.level + 1}` : ''}`
              : `${TEMPLATES.length} spots to learn, and the bots to learn them against.`}
          </span>
        </span>
        <span className="hero-foot">
          {save.cards ? 'Next card' : 'Deal the first card'}
          <ChevronIcon width={18} height={18} />
        </span>
      </button>
      <button type="button" className="glass-card scroll-solved press" onClick={() => navigate({ name: 'solved' })}>
        <span>
          <b>Solved hands</b>
          <small>Whole hands, every move graded by the solver.</small>
        </span>
        <ChevronIcon width={18} height={18} />
      </button>
      <div className="glass-card coach-card">
        <CoachSays lines={[hello(save.cards, save.combo, weak)]} />
      </div>
      <div className="scroll-tiles">
        <div className="glass-card tile">
          <small className="eyebrow">Passed</small>
          <b className="num">{save.cards ? `${Math.round((save.passed / save.cards) * 100)}%` : '–'}</b>
        </div>
        <div className="glass-card tile">
          <small className="eyebrow">Best streak</small>
          <b className="num scroll-flame">
            <FlameIcon width={18} height={18} /> {save.bestCombo}
          </b>
        </div>
      </div>
      <div className="glass-card scroll-forms">
        <small className="eyebrow">How you're doing</small>
        {forms.map(({ theme, form }) => (
          <div key={theme} className="scroll-form">
            <span>
              <b>{THEMES[theme].title}</b>
              <small>{THEMES[theme].blurb}</small>
            </span>
            <i className="scroll-bar" aria-label={form === null ? 'Not enough cards yet' : `${Math.round(form * 100)} out of 100`}>
              <span style={{ width: form === null ? 0 : `${Math.round(Math.min(1, form) * 100)}%` }} />
            </i>
          </div>
        ))}
      </div>
    </>
  );
}
