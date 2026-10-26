import type { ScrollScenario } from './scenarios';
export interface FullHand {
  schema: 3; id: string; assumptions: string; publicationApproved: boolean;
  preflop: { player: number; type: string; to: number }[];
  decisions: { scenario: ScrollScenario; line: number; event: number }[];
}
