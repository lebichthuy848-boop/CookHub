import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { getWeekDates, Menu } from './Personal';

vi.mock('../api', () => ({
  api: vi.fn(),
  today: () => '2026-10-23',
  media: path => path,
}));
vi.mock('../hooks', () => ({ useApi: () => ({ loading: false, error: null, reload: vi.fn(), data: [] }) }));
afterEach(cleanup);

it('shows only schedule and history, including for an old template link', () => {
  render(<MemoryRouter initialEntries={['/menu?tab=templates&template=clean']}><Menu/></MemoryRouter>);
  expect(screen.getByRole('button', { name: /Lịch trình tuần này/ })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Lịch sử thực đơn/ })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Bộ sưu tập thực đơn mẫu/ })).not.toBeInTheDocument();
  expect(screen.queryByText('Clean Eating 7 ngày thanh lọc')).not.toBeInTheDocument();
});

it('keeps Sunday in the week that started on the previous Monday', () => {
  const week = getWeekDates('2026-11-08');
  expect(week.map(date => [date.getFullYear(), date.getMonth() + 1, date.getDate()])).toEqual([
    [2026, 11, 2], [2026, 11, 3], [2026, 11, 4], [2026, 11, 5],
    [2026, 11, 6], [2026, 11, 7], [2026, 11, 8],
  ]);
});
