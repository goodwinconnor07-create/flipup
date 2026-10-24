# Scroll

Scroll is whole poker hands, solved ahead of time, one after another. Every hand is plain GTO: there are
no bot play styles and nothing to exploit.

## The hands

- Made by `gto/scripts/quiz_multiway.py` and packed into `public/gto/quiz` by `gto/scripts/export_quiz.py`.
- Preflop is the solved 6-max game. Every seat plays its own GTO mix for its cards and nobody is forced
  to fold; only hands where three or four players see the flop are kept.
- After the flop each street is solved for everyone still in with the multiway solver
  (`gto/engine/src/multiway.cpp`), from ranges narrowed by every move so far.
- Each of your decisions stores every option with GTO's frequency for your exact cards and its EV, plus
  your share of the pot against the players still in. Grading needs no server and is instant.

## Playing a hand

`src/screens/train/SolvedHands.tsx` plays the hand on the replay table and stops at each of your
decisions, preflop to river. Pick a move and the coach says straight away whether it was right
(Good / Close call / Costly) and why: `readSpot()` in `src/quiz/read.ts` reads the spot and `quizWhy()`
in `src/train/coach.ts` writes the reasons. The hand then carries on the way it was solved.

## Saving hands

- Save (top right during a hand, or "Save to study bank" at the end) keeps a hand under a name you choose
  in `flipup.quizbank`, until you delete it.
- Every finished hand also goes into `flipup.quizrecent`, and anything older than 24 hours is deleted from
  there, so nothing piles up.
- The study bank (Train → Study bank, and a row on the Scroll tab) lists saved hands (play again, rename,
  delete) and the last 24 hours (play again, save).
