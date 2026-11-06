import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { Menu } from './Personal';

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
