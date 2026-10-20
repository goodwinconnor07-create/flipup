// Shapes returned by the GTO coach service (gto/flipup_gto/api.py).

export type Colour = 'green' | 'yellow' | 'red';
export type Grade = 'best' | 'correct' | 'inaccuracy' | 'mistake' | 'blunder';

export interface GtoOption {
  action: string;
  /** How often GTO takes this action with this exact hand (null if GTO wouldn't hold the hand here). */
  frequency: number | null;
  ev_bb: number;
}

export interface LessonSection {
  title: string;
  body: string[];
}

export interface PracticeHand {
  hand: string;
  category?: string;
  class?: string;
  options: { action: string; frequency: number; ev_bb: number }[];
  best_action: string;
}

/** Action frequencies for one hand class in a 13x13 grid ("weight" = how much of it reaches here). */
export type GridCell = Record<string, number>;
export type Grid = Record<string, GridCell>;

export interface Decision {
  street: 'preflop' | 'flop' | 'turn' | 'river';
  player: string;
  position: string;
  hand?: string;
  hand_class?: string;
  board: string[];
  pot_bb: number;
  to_call_bb: number;
  effective_stack_bb?: number;
  spr?: number | null;
  action: { move: string; to_bb: number } | null;
  matched_action?: string | null;
  method: string;
  gto?: GtoOption[];
  best_action?: string;
  ev_loss_bb?: number | null;
  ev_loss_pct_pot?: number;
  grade: Grade | null;
  colour: Colour | null;
  colour_reason?: string | null;
  equity?: number | null;
  in_gto_range?: boolean;
  scenario?: string;
  lesson?: LessonSection[];
  explanation: string[];
  practice?: PracticeHand[];
  grid?: Grid;
  /** Custom-hand analysis: GTO's whole-range frequencies and the action labels. */
  gto_range?: Record<string, number>;
  actions?: string[];
  /** The hand stops here: this is what to do next. */
  pending?: boolean;
  spot_text?: string;
  hand_features?: { made: string; draws?: string[]; blockers?: string[]; strength?: string };
  note?: string;
  assumptions?: string[];
}

export interface HandReport {
  hand_id: string;
  players: Record<string, { position: string; name: string }>;
  board: string[];
  summary: {
    decisions: number;
    graded: number;
    colours?: Record<Colour, number>;
    total_ev_loss_bb: number;
    grades: Record<Grade, number>;
  };
  decisions: Decision[];
  notes: string[];
}

export interface Job<T> {
  status: 'running' | 'done' | 'error';
  progress: number;
  total: number;
  result: T | null;
  error?: string;
}

export interface Scenario {
  id: string;
  group: string;
  title: string;
  description: string;
  available: boolean;
  spots: number | null;
}

export interface DrillOption {
  action: string;
  frequency: number;
  ev_bb: number;
  ev_loss_bb: number;
  colour: Colour | null;
  why: string | null;
}

export interface Drill {
  scenario: string;
  street: string;
  position: string;
  villain?: string;
  players?: number;
  history: string[];
  board: string[];
  pot_bb: number;
  to_call_bb: number;
  stack_bb: number;
  hand: string;
  hand_class: string;
  actions: string[];
  answer: { options: DrillOption[]; best_action: string };
  tips: string[];
  grid?: Grid;
}

/** The hand-history format the service reads (gto/flipup_gto/handhistory.py). */
export interface HandHistory {
  id: string;
  small_blind: number;
  big_blind: number;
  ante?: number;
  button: string;
  players: { id: string; name: string; seat: number; stack: number; cards: string[] | null }[];
  actions: { street: string; player: string; move: string; to: number; out_of_turn?: boolean }[];
  board: string[];
}

// ── Custom hands (POST /custom/spot) ────────────────────────────────────────

export interface CustomRequest {
  players: number;
  stacks_bb: number[];
  hero: number;
  hero_cards: string | null;
  preflop: number[];
  flop: number[];
  turn: number[];
  river: number[];
  board: string[];
}

export interface CustomOption {
  id: number;
  label: string;
  kind: 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'allin';
  to_bb?: number;
  /** How often GTO takes it: with your exact hand on your turn, otherwise with the actor's whole range. */
  freq: number | null;
  range_freq: number | null;
  ev_bb: number | null;
}

export interface CustomSpot {
  status: 'ready' | 'solving';
  job?: string;
  message?: string;
  street?: 'preflop' | 'flop' | 'turn' | 'river' | 'runout' | 'done';
  positions?: string[];
  players?: { position: string; stack_bb: number; behind_bb?: number; invested_bb?: number; folded?: boolean }[];
  hero?: number;
  board?: string[];
  pot_bb?: number;
  to_act?: number | null;
  to_act_position?: string;
  to_call_bb?: number;
  options?: CustomOption[];
  hand_specific?: boolean;
  hand?: string;
  equity?: number;
  needs_cards?: { street: string; count: number } | null;
  multiway?: boolean;
  history?: { street: string; position: string; player: number; text: string }[];
  notes?: string[];
}
