import { describe, expect, it } from 'vitest';
import { nutritionAlerts, weeklyNutritionAlerts } from './nutrition-alerts';

const goals = { nang_luong: 2000, chat_dam: 100, chat_bot_duong: 250, chat_beo: 70, chat_xo: 25, natri: 2300 };
const totals = { nang_luong: 1000, chat_dam: 50, chat_bot_duong: 125, chat_beo: 35, chat_xo: 12.5, natri: 1000 };

describe('nutrition plan alerts', () => {
  it('does not warn about a low intake while the day is unfinished', () => {
    expect(nutritionAlerts(totals, goals, 1, false)).toEqual([]);
    expect(nutritionAlerts(totals, goals, 1, true).some(item => item.key === 'nang_luong')).toBe(true);
  });

  it('compares the average per diner and warns about a high intake even before completion', () => {
    const household = { ...totals, nang_luong: 6000 };
    expect(nutritionAlerts(household, goals, 3, false).some(item => item.key === 'nang_luong')).toBe(false);
    expect(nutritionAlerts(household, goals, 1, false).find(item => item.key === 'nang_luong'))
      .toMatchObject({ direction: 'high', severe: true, percent: 300 });
    expect(nutritionAlerts(household, goals, 0, true)).toEqual([]);
  });

  it('separates modest from large deviations at 50% and 150%', () => {
    const atHalf = nutritionAlerts({ ...goals, nang_luong: 1000 }, goals, 1, true)
      .find(item => item.key === 'nang_luong');
    const modestLow = nutritionAlerts({ ...goals, nang_luong: 1200 }, goals, 1, true)
      .find(item => item.key === 'nang_luong');
    const atOneAndHalf = nutritionAlerts({ ...goals, nang_luong: 3000 }, goals, 1, true)
      .find(item => item.key === 'nang_luong');
    const modestHigh = nutritionAlerts({ ...goals, nang_luong: 2800 }, goals, 1, true)
      .find(item => item.key === 'nang_luong');
    expect(atHalf.severe).toBe(true);
    expect(modestLow.severe).toBe(false);
    expect(atOneAndHalf.severe).toBe(true);
    expect(modestHigh.severe).toBe(false);
  });

  it('evaluates seven complete days using their daily average', () => {
    const days = Array.from({ length: 7 }, (_, index) => ({
      date: `2026-11-${String(index + 2).padStart(2, '0')}`,
      main_meals: 3,
      nutrition: { complete: true, totals: { ...goals, nang_luong: 3200 }, goals },
    }));
    expect(weeklyNutritionAlerts(days, 1).find(item => item.key === 'nang_luong'))
      .toMatchObject({ direction: 'high', severe: true, percent: 160 });
    expect(weeklyNutritionAlerts(days, 2).some(item => item.key === 'nang_luong')).toBe(false);
    const lowWeek = days.map(day => ({ ...day, nutrition: { ...day.nutrition, totals: { ...goals, nang_luong: 1000 } } }));
    expect(weeklyNutritionAlerts(lowWeek, 1).find(item => item.key === 'nang_luong'))
      .toMatchObject({ direction: 'low', percent: 50 });
    expect(weeklyNutritionAlerts(days.map((day, index) => index === 6 ? { ...day, main_meals: 2 } : day), 1)).toBeNull();
  });
});
