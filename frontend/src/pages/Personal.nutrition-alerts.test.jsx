import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { DailyNutritionCard } from './Personal';

afterEach(cleanup);

const goals = { nang_luong: 2000, chat_dam: 100, chat_bot_duong: 250, chat_beo: 70, chat_xo: 25, natri: 2300 };
const nutrition = { data: { date: '2026-11-03', complete: true, totals: {
  nang_luong: 3200, chat_dam: 110, chat_bot_duong: 260, chat_beo: 80, chat_xo: 28, natri: 2400,
}, goals } };

it('shows an in-page warning for one diner and uses the per-person total', () => {
  render(<DailyNutritionCard day="2026-11-03" nutrition={nutrition} diners={1} mainMeals={3}/>);
  expect(screen.getByRole('status', { name: 'Cảnh báo dinh dưỡng Ngày đã chọn' })).toHaveTextContent('Calo rất cao');
  cleanup();
  render(<DailyNutritionCard day="2026-11-03" nutrition={nutrition} diners={2} mainMeals={3}/>);
  expect(screen.queryByText(/Calo rất cao/)).not.toBeInTheDocument();
});

it('uses a familiar label for a high sodium warning', () => {
  const highSodium = { data: { ...nutrition.data, totals: { ...goals, natri: 4000 } } };
  render(<DailyNutritionCard day="2026-11-03" nutrition={highSodium} diners={1} mainMeals={3}/>);
  expect(screen.getByRole('status', { name: 'Cảnh báo dinh dưỡng Ngày đã chọn' })).toHaveTextContent('Muối (natri) rất cao');
});
