import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { Menu } from './Personal';

const mocks = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock('../api', () => ({
  api: mocks.api,
  today: () => '2026-10-23',
  media: path => path,
  money: value => String(value),
}));
vi.mock('../hooks', () => ({ useApi: path => ({
  loading: false,
  error: null,
  reload: vi.fn(),
  data: path === '/dishes' ? [
    { id: 'MA004', name: 'Cá hồi áp chảo', image: 'salmon.jpg' },
    { id: 'MA007', name: 'Salad ức gà', image: 'salad.jpg' },
    { id: 'MA046', name: 'Yến mạch trái cây', image: 'oats.jpg' },
    { id: 'MA053', name: 'Rau củ hấp', image: 'vegetables.jpg' },
  ] : [],
}) }));
afterEach(() => { cleanup(); mocks.api.mockClear(); });

it('opens the exact seven-day template schedule without adding dishes', () => {
  render(<MemoryRouter><Menu/></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: /Bộ sưu tập thực đơn mẫu/ }));
  fireEvent.click(screen.getAllByRole('button', { name: 'Xem chi tiết' })[0]);
  const dialog = screen.getByRole('dialog', { name: /Clean Eating 7 ngày thanh lọc/ });
  expect(dialog.querySelectorAll('.template-preview-day')).toHaveLength(7);
  expect(dialog.querySelectorAll('.template-preview-meal')).toHaveLength(21);
  expect(within(dialog).getAllByText('Cá hồi áp chảo').length).toBeGreaterThan(0);
  expect(mocks.api).not.toHaveBeenCalled();
  fireEvent.click(within(dialog).getByRole('button', { name: 'Đóng chi tiết thực đơn' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('opens the Clean Eating template from the home page link', () => {
  render(<MemoryRouter initialEntries={['/menu?tab=templates&template=clean']}><Menu/></MemoryRouter>);
  expect(screen.getByRole('dialog', { name: /Clean Eating 7 ngày thanh lọc/ })).toBeInTheDocument();
  expect(mocks.api).not.toHaveBeenCalled();
});
