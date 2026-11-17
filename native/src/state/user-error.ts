// Errors whose words are written for the player ("You're offline. Try again in a moment."). Anything else that gets
// thrown (a database, StoreKit, the engine, a network library) has text meant for developers, so it is never shown:
// `userMessage()` gives the fallback sentence for it instead.
export class UserError extends Error {}

/** The sentence to show for a caught error: its own words if we wrote them for the player, else `fallback`. */
export function userMessage(e: unknown, fallback: string): string {
  return e instanceof UserError && e.message ? e.message : fallback;
}
