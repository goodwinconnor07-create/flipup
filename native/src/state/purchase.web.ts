// The web build has no App Store: Premium isn't sold here (the web app's own PREMIUM_ON_SALE is false too).
import type { StoreState } from './purchase';

const STATE: StoreState = { price: null, busy: false, error: null };

export type { StoreState };
export const useStore = (): StoreState => STATE;
export const startStore = async (): Promise<boolean> => false;
export const buyPremium = async (): Promise<boolean> => false;
export const restorePremium = async (): Promise<boolean> => false;
export const stopStore = (): void => {};
export const ON_SALE = false;
