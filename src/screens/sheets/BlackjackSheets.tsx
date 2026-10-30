import { useEffect, useState } from 'react';
import { BJ, DEALER, rouletteLimit } from '../../game';
import { bjMidHand, declineInvite, getBj, hasBjTable, inviteFriend, joinBlackjack, leaveBlackjack, openBlackjackForFriends, useBj } from '../../state/blackjack';
import { useCampaign } from '../../state/campaign';
import { loadPals, PALS_CHANGED, refreshPals } from '../../state/pals';
import { closeSheet, getState, navigate, openSheet, toast, useApp } from '../../state/store';
import { Avatar, Sheet } from '../../ui/components';
import { haptic } from '../../ui/effects';
import { CheckIcon } from '../../ui/Icons';
import { short } from '../HomeCampaign';

const RULES = [
  'Get closer to 21 than the dealer without going over. Picture cards count 10, aces 1 or 11.',
  'An ace and a ten-card is a blackjack and pays 3 to 2. Any other win pays even money.',
  'Hit for a card, stand to stop, double your bet for exactly one more card, or split a pair into two hands (once).',
  'Vincent deals from a six-deck shoe and stands on every 17. If he shows an ace or a ten, he checks for blackjack first.',
  'Bets come from your bankroll and wins go straight back into it.',
];

/** Blackjack's card on the Campaign tab opens this: Vincent says hello, the rules, and who to play with. */
export function BjStartSheet() {
  const c = useCampaign();
  const named = useApp((s) => s.profile.name.trim().length > 0);
  const [busy, setBusy] = useState(false);
  const waiting = hasBjTable();
  const online = useBj((s) => s.mode === 'online');

  const needName = () => {
    if (named) return false;
    closeSheet();
    navigate({ name: 'profile', then: 'done' });
    toast('Add your name first.');
    return true;
  };
  const play = () => {
    if (needName()) return;
    closeSheet();
    navigate({ name: 'blackjack' });
  };
  const fresh = () => {
    if (bjMidHand()) return toast('Finish this hand first.');
    leaveBlackjack();
    play();
  };
  const friends = async () => {
    if (needName() || busy) return;
    if (bjMidHand()) return toast('Finish this hand first.');
    setBusy(true);
    try {
      await openBlackjackForFriends();
      closeSheet();
      navigate({ name: 'blackjack' });
      setTimeout(() => openSheet({ name: 'bjInvite' }), 450);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't open a table.", 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet>
      <div className="bj-start">
        <div className="bj-start-head" aria-hidden>
          <span className="bj-start-face">{DEALER.emoji}</span>
          <span className="bj-start-cards">
            <i>
              A<small>♠</small>
            </i>
            <i>
              K<small>♥</small>
            </i>
          </span>
        </div>
        <h2 className="game-start-title">Blackjack</h2>
        <p className="bj-start-line">“Evening. I’m {DEALER.name}, and this is my table. Pull up a chair.”</p>
        <div className="game-start-go">
          {waiting ? (
            <>
              <button type="button" className="btn btn-xl btn-green" onClick={play}>
                Back to your table
              </button>
              {!online && (
                <button type="button" className="btn btn-xl btn-blue" onClick={() => void friends()} disabled={busy}>
                  {busy ? 'Opening…' : 'Start a table with friends'}
                </button>
              )}
              <button type="button" className="btn btn-ghost" onClick={fresh}>
                Leave it and sit at a new table
              </button>
            </>
          ) : (
            <>
              <button type="button" className="btn btn-xl btn-green" onClick={play} disabled={c.chips < BJ.minBet}>
                Play with bots
              </button>
              <button type="button" className="btn btn-xl btn-blue" onClick={() => void friends()} disabled={busy || c.chips < BJ.minBet}>
                {busy ? 'Opening…' : 'Invite friends'}
              </button>
            </>
          )}
        </div>
        <p className="muted bj-start-note">
          You play with one or two bots. Invite friends from your friends list and they bet from their own bankrolls. Up to {short(rouletteLimit(c))} a hand.
        </p>
        <h3 className="section-head game-start-how">How it plays</h3>
        <ul className="game-rules">
          {RULES.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </div>
    </Sheet>
  );
}

/** Your friends list, with an Invite button each. A table on its own moves online first. */
export function BjInviteSheet() {
  const [pals, setPals] = useState(loadPals);
  const [sending, setSending] = useState<string | null>(null);
  const invited = useBj((s) => s.invited);
  const online = useBj((s) => s.mode === 'online');
  const [opening, setOpening] = useState(false);
  useEffect(() => {
    const reload = () => setPals(loadPals());
    window.addEventListener(PALS_CHANGED, reload);
    void refreshPals();
    return () => window.removeEventListener(PALS_CHANGED, reload);
  }, []);

  const invite = async (code: string) => {
    if (sending) return;
    setSending(code);
    try {
      if (getBj().mode !== 'online') {
        if (bjMidHand()) {
          toast('Finish this hand first.');
          return;
        }
        // Friends can only join a table on the server: this one starts over there, with new bots.
        setOpening(true);
        await openBlackjackForFriends();
        await new Promise<void>((done) => {
          const t0 = Date.now();
          const wait = () => (getBj().game?.code || Date.now() - t0 > 6000 ? done() : setTimeout(wait, 100));
          wait();
        });
        setOpening(false);
      }
      await inviteFriend(code);
      haptic('success');
      toast('Invite sent.', 'success');
    } catch (e) {
      setOpening(false);
      toast(e instanceof Error ? e.message : "Couldn't send the invite.", 'error');
    } finally {
      setSending(null);
    }
  };

  return (
    <Sheet title="Invite friends">
      <p className="muted" style={{ marginTop: 0 }}>
        {online ? 'They’ll see your invite in FlipUp and join with one tap.' : 'Your table moves online with new bots, and your friends get an invite in FlipUp.'}
      </p>
      {opening && <p className="muted">Opening your table…</p>}
      {pals.length === 0 ? (
        <div className="bj-empty">
          <p>No friends yet. Add them with their friend code on the Party tab, then invite them here.</p>
          <button
            type="button"
            className="btn btn-blue"
            onClick={() => {
              closeSheet();
              setTimeout(() => openSheet({ name: 'addPal' }), 250);
            }}
          >
            Add a friend
          </button>
        </div>
      ) : (
        <div className="settings-list">
          {pals.map((p) => {
            const done = invited.includes(p.code);
            return (
              <div key={p.code} className="group-row bj-invite-row">
                <Avatar emoji={p.emoji} size={36} />
                <span className="gr-text">{p.name}</span>
                <button type="button" className={`btn btn-sm ${done ? 'btn-ghost' : 'btn-blue'} press`} disabled={!!sending} onClick={() => void invite(p.code)}>
                  {sending === p.code ? 'Sending…' : done ? (
                    <>
                      <CheckIcon width={16} height={16} /> Sent
                    </>
                  ) : (
                    'Invite'
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </Sheet>
  );
}

/** A friend's invite, floating over whatever screen you're on. */
export function BjInviteBanner() {
  const invite = useBj((s) => s.invites[0]);
  if (!invite) return null;
  const join = () => {
    if (!getState().profile.name.trim()) {
      navigate({ name: 'profile', then: 'done' });
      return toast('Add your name first.');
    }
    if (bjMidHand()) return toast('Finish this hand first, then join.');
    joinBlackjack(invite);
    haptic('success');
    const top = getState().stack[getState().stack.length - 1];
    if (top.name !== 'blackjack') navigate({ name: 'blackjack' });
  };
  return (
    <div className="bj-banner glass" role="alert">
      <Avatar emoji={invite.emoji} size={40} />
      <span className="bj-banner-text">
        <b>{invite.name}</b>
        <small>invited you to Blackjack</small>
      </span>
      <button type="button" className="rl-small press" onClick={() => declineInvite(invite)}>
        Not now
      </button>
      <button type="button" className="bj-banner-go press" onClick={join}>
        Join
      </button>
    </div>
  );
}
