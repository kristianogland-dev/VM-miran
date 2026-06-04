// Returns H (home win), D (draw), A (away win)
function getOutcome(home, away) {
  if (home > away) return 'H';
  if (home === away) return 'D';
  return 'A';
}

const ROUND_RULES = {
  group:  { outcome: 1, exact: 4, advance: 0, max: 5 },
  r32:    { outcome: 2, exact: 2, advance: 2, max: 6 },
  r16:    { outcome: 3, exact: 3, advance: 2, max: 8 },
  qf:     { outcome: 3, exact: 4, advance: 3, max: 10 },
  sf:     { outcome: 4, exact: 5, advance: 3, max: 12 },
  bronze: { outcome: 5, exact: 6, advance: 3, max: 14 },
  final:  { outcome: 5, exact: 5, advance: 5, max: 50 },
};

/**
 * Calculate points for a standard match prediction.
 * advancingTeam: the team that actually advanced (null for group stage)
 * predictedAdvancing: the team the player predicted would advance
 */
function calcMatchPoints(round, actual, predicted, advancingTeam = null, predictedAdvancing = null) {
  const rules = ROUND_RULES[round];
  if (!rules) return { points: 0, breakdown: {} };

  const actualOutcome = getOutcome(actual.home, actual.away);
  const predictedOutcome = getOutcome(predicted.home, predicted.away);

  const breakdown = {};
  let points = 0;

  const correctOutcome = actualOutcome === predictedOutcome;
  const exactScore = actual.home === predicted.home && actual.away === predicted.away;

  if (exactScore) {
    points += rules.outcome + rules.exact;
    breakdown.exact = rules.outcome + rules.exact;
  } else if (correctOutcome) {
    points += rules.outcome;
    breakdown.outcome = rules.outcome;
  }

  if (round !== 'group' && advancingTeam && predictedAdvancing) {
    if (advancingTeam === predictedAdvancing) {
      points += rules.advance;
      breakdown.advance = rules.advance;
    }
  }

  return { points, breakdown };
}

/**
 * Calculate final bonus points (corners, throw-ins, etc.)
 */
function calcFinalBonus(actual, predicted) {
  const fields = ['corners', 'throw_ins', 'yellow_cards', 'red_cards', 'offsides', 'free_kicks'];
  const breakdown = {};
  let points = 0;

  for (const f of fields) {
    if (actual[f] != null && predicted[f] != null && actual[f] === predicted[f]) {
      points += 5;
      breakdown[f] = 5;
    }
  }

  if (actual.first_goalscorer && predicted.first_goalscorer &&
      actual.first_goalscorer.toLowerCase().trim() === predicted.first_goalscorer.toLowerCase().trim()) {
    points += 5;
    breakdown.first_goalscorer = 5;
  }

  return { points, breakdown };
}

module.exports = { calcMatchPoints, calcFinalBonus, getOutcome, ROUND_RULES };
