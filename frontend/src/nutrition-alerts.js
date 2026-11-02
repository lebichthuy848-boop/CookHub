const METRICS = [
  ['nang_luong', 'Năng lượng', 'kcal', 'both'],
  ['chat_dam', 'Protein', 'g', 'both'],
  ['chat_bot_duong', 'Carbs', 'g', 'both'],
  ['chat_beo', 'Chất béo', 'g', 'both'],
  ['chat_xo', 'Chất xơ', 'g', 'low'],
  ['natri', 'Natri', 'mg', 'high'],
];

// Product-level deviations from the account's own goals, not clinical cutoffs.
export function nutritionAlerts(totals, goals, diners, completePlan) {
  if (!totals || !goals || !Number.isInteger(diners) || diners < 1) return [];
  return METRICS.flatMap(([key, label, unit, direction]) => {
    const goal = Number(goals[key]);
    const amount = Number(totals[key]) / diners;
    if (!Number.isFinite(goal) || goal <= 0 || !Number.isFinite(amount)) return [];
    const ratio = amount / goal;
    const low = completePlan && direction !== 'high' && ratio < .7;
    const high = direction !== 'low' && ratio > 1.3;
    if (!low && !high) return [];
    return [{key, label, unit, amount, goal, percent: Math.round(ratio * 100),
      direction: low ? 'low' : 'high', severe: low ? ratio <= .5 : ratio >= 1.5}];
  }).sort((a, b) => Number(b.severe) - Number(a.severe) ||
    Math.abs(b.percent - 100) - Math.abs(a.percent - 100));
}

export function weeklyNutritionAlerts(days, diners) {
  if (!Array.isArray(days) || days.length !== 7 ||
      days.some(day => day.main_meals < 3 || !day.nutrition?.complete || !day.nutrition?.totals)) return null;
  const goals = days[0].nutrition.goals;
  if (!goals) return null;
  const totals = Object.fromEntries(Object.keys(goals).map(key => [key,
    days.reduce((sum, day) => sum + Number(day.nutrition.totals[key] || 0), 0) / 7]));
  return nutritionAlerts(totals, goals, diners, true);
}
