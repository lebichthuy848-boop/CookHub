// Product thresholds relative to the user's goals, shared by warnings and adds.
// Fiber has no upper target in this UI; sodium has no deficiency target.
export const upperTargetKeys = ['nang_luong', 'chat_dam', 'chat_bot_duong', 'chat_beo', 'natri'];

export function exceedsNutritionTarget(key, amount, goal) {
  return Number.isFinite(amount) && Number.isFinite(goal) && goal > 0 &&
    amount > goal * (key === 'natri' ? 1 : 1.05);
}

export function nutritionProfileIssues(totals, goals, profile) {
  const requiredKeys = ['nang_luong','chat_dam','chat_bot_duong','chat_beo','chat_xo','natri'];
  const missing = requiredKeys.filter(key => !Number.isFinite(profile?.[key]) || profile[key] < 0)
    .map(key => ({key, type:'missing'}));
  const evaluated = upperTargetKeys.flatMap(key => {
    const current = totals?.[key], goal = goals?.[key], addition = profile?.[key];
    if (!Number.isFinite(current) || !Number.isFinite(goal) || goal <= 0)
      return [{key, type:'unavailable'}];
    if (!Number.isFinite(addition) || addition < 0) return [{key, type:'missing'}];
    const limit = goal * (key === 'natri' ? 1 : 1.05);
    // No newly exceeded threshold; an already exceeded metric cannot increase.
    return current + addition <= Math.max(current, limit) + 1e-9
      ? [] : [{key, type:'excess'}];
  });
  const seen = new Set();
  return [...missing, ...evaluated].filter(issue => {
    const signature = `${issue.key}:${issue.type}`;
    if (seen.has(signature)) return false;
    seen.add(signature);
    return true;
  });
}

export function canAddNutritionProfile(totals, goals, profile) {
  return nutritionProfileIssues(totals, goals, profile).length === 0;
}
