import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { HomeDashboard } from './Catalog';

vi.mock('../auth', () => ({ useAuth: () => ({ user: { name: 'Minh' }, favoriteCounts: {} }) }));
afterEach(cleanup);

it('links each home topic to matching content', () => {
  render(<MemoryRouter><HomeDashboard dishes={[]} favorites={[]} onFavorite={vi.fn()}/></MemoryRouter>);
  expect(screen.getByRole('link', { name: /Món ăn dưới 15 phút/ })).toHaveAttribute('href', '/search?max_time=15');
  expect(screen.getByRole('link', { name: /Thực đơn Eat Clean/ })).toHaveAttribute('href', '/menu?tab=templates&template=clean');
  expect(screen.getByRole('link', { name: /Món canh ấm bụng/ })).toHaveAttribute('href', '/search?q=canh');
});
