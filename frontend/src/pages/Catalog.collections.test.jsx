import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { CollectionDishCards } from './Catalog';

vi.mock('../auth', () => ({ useAuth: () => ({ favoriteCounts: {} }) }));
afterEach(cleanup);

it('adds only favorite dishes outside the collection and removes without changing favorites', async () => {
  const pho = { id: 'MA001', name: 'Phở bò viên', category: 'Phở', image: 'images/mon-an/pho-bo-vien.jpg', rating: 5, time: 120 };
  const salmon = { id: 'MA004', name: 'Cá hồi áp chảo', category: 'Cá', image: 'images/mon-an/ca-hoi.jpg', rating: 5, time: 25 };
  const add = vi.fn().mockResolvedValue(undefined);
  const remove = vi.fn().mockResolvedValue(undefined);
  const favorite = vi.fn();
  render(<MemoryRouter><CollectionDishCards collection={{ MaBoSuuTap: 'BST1', TenBoSuuTap: 'Favorite' }} dishes={[pho]} favoriteItems={[pho, salmon]} onClose={vi.fn()} onFavorite={favorite} onAddDish={add} onRemoveDish={remove}/></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: '＋ Thêm từ yêu thích' }));
  fireEvent.click(screen.getByRole('button', { name: /Cá hồi áp chảo/ }));
  await waitFor(() => expect(add).toHaveBeenCalledWith(salmon));
  fireEvent.click(screen.getByRole('button', { name: 'Gỡ Phở bò viên khỏi bộ sưu tập' }));
  expect(remove).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Không' }));
  expect(remove).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Gỡ Phở bò viên khỏi bộ sưu tập' }));
  fireEvent.click(screen.getByRole('button', { name: 'Có, gỡ món' }));
  await waitFor(() => expect(remove).toHaveBeenCalledWith(pho));
  expect(favorite).not.toHaveBeenCalled();
});
