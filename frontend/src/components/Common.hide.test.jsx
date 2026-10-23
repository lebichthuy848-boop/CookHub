import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { DishCard } from './Common';

vi.mock('../auth', () => ({ useAuth: () => ({ favoriteCounts: {} }) }));
afterEach(cleanup);

it('asks before hiding and respects both answers', () => {
  const hide = vi.fn();
  const dish = { id: 'MA001', name: 'Phở bò viên', category: 'Phở', image: 'images/mon-an/pho-bo-vien.jpg', rating: 5, time: 120 };
  const { container } = render(<MemoryRouter><DishCard dish={dish} favorite={false} onFavorite={vi.fn()} onHide={hide}/></MemoryRouter>);
  const hideButton = screen.getByRole('button', { name: 'Ẩn món Phở bò viên' });
  expect(hideButton).toHaveClass('hide-dish');
  expect(container.querySelector('.heart')).toBeInTheDocument();
  fireEvent.click(hideButton);
  expect(screen.getByRole('dialog', { name: 'Ẩn món ăn?' })).toBeInTheDocument();
  expect(hide).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Không' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(hide).not.toHaveBeenCalled();
  fireEvent.click(hideButton);
  fireEvent.click(screen.getByRole('button', { name: 'Có, ẩn món' }));
  expect(hide).toHaveBeenCalledWith('MA001');
});
