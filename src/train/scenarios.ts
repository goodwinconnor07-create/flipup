// Practice scenarios, matching the GTO service's library (gto/flipup_gto/library.py) and the
// scenario labels its reviews put on each decision (gto/flipup_gto/coach.py).

export const SCENARIO_TITLES: Record<string, string> = {
  rfi: 'Opening the pot',
  vs_open_ip: 'Facing an open in position',
  vs_open_blinds: 'Defending the blinds',
  vs_3bet: 'Facing a 3-bet',
  vs_4bet: 'Facing a 4-bet',
  vs_limp: 'Facing a limp',
  cbet_ip: 'C-betting in position',
  cbet_oop: 'C-betting out of position',
  vs_cbet_oop: 'Facing a c-bet out of position',
  vs_cbet_ip: 'Facing a c-bet in position',
  vs_checkraise: 'Facing a check-raise',
  check_raise: 'Check-raising',
  '3bet_pot_ip': '3-bet pot in position',
  '3bet_pot_oop': '3-bet pot out of position',
  double_barrel: 'Double barrelling',
  vs_double_barrel: 'Facing a double barrel',
  probe_or_delay: 'After the flop checks through',
  triple_barrel: 'Triple barrelling',
  vs_triple_barrel: 'Facing a triple barrel',
  river_decision: 'River decisions',
  multiway: 'Multiway pots',
};

/** The drill to practise a review scenario with (some labels share a drill). */
export const DRILL_FOR: Record<string, string | null> = {
  check_raise: 'vs_cbet_oop',
  river_decision: 'vs_triple_barrel',
  multiway: null,
};

export function drillFor(scenario: string): string | null {
  if (Object.hasOwn(DRILL_FOR, scenario)) return DRILL_FOR[scenario];
  return Object.hasOwn(SCENARIO_TITLES, scenario) ? scenario : null;
}

export const scenarioTitle = (id: string) => (Object.hasOwn(SCENARIO_TITLES, id) ? SCENARIO_TITLES[id] : id);
