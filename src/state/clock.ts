// A fast bot table runs its clock at twice the speed: the same waits, half as long. The clock is fixed
// per table (`game.fast`), so nothing moves if the setting changes mid-game.

export const FAST = 2;
const FROM = Date.UTC(2020, 0, 1);

/** Real time as the table sees it. */
export const toTableTime = (real: number, fast?: boolean): number => (fast ? FROM + (real - FROM) * FAST : real);
