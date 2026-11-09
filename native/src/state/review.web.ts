// The web build has no App Store prompt.
export const reviewDue = (): boolean => false;
export async function maybeAskForReview(): Promise<void> {}
