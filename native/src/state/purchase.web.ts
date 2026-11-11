// The web build has no App Store: Premium isn't sold here (the web app's own PREMIUM_ON_SALE is false too).
import type { Plan, StoreState } from './purchase';

const STATE: StoreState = { plans: { monthly: null, yearly: null }, owned: null, busy: false, error: null, pending: false, period: null };

export type { Plan, PlanPrice, StoreState } from './purchase';
export const useStore = (): StoreState => STATE;
export const startStore = async (): Promise<boolean> => false;
export const buyPremium = async (_plan?: Plan): Promise<boolean> => false;
export const restorePremium = async (): Promise<boolean> => false;
export const manageSubscription = async (): Promise<void> => {};
export const yearlySaving = (_plans: StoreState['plans']): number | null => null;
export const stopStore = (): void => {};
export const storeError = (): string | null => null;
export const introDaysOf = (_json: string | null | undefined, _periods: number, _unit: string): number | null => null;
export const ON_SALE = false;
