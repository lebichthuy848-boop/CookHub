import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { OnboardingSurvey, describeEatingStyle } from './Personalization';

const mocks = vi.hoisted(() => ({ api: vi.fn(), setUser: vi.fn(), favorites: [] }));
vi.mock('../api', () => ({ api: mocks.api, media: path => '/' + path }));
vi.mock('../auth', () => ({ useAuth: () => ({ user: { id: 'new', survey_pending: true }, setUser: mocks.setUser }) }));
vi.mock('../hooks', () => ({ useApi: () => ({ data: mocks.favorites, loading: false, error: '', reload: vi.fn() }) }));

beforeEach(() => {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  mocks.api.mockImplementation(path => Promise.resolve(path.includes('/claim') ? { show: true } : path.includes('/preview') ? [] : { id: 'new', has_completed_survey: true }));
});
afterEach(() => { cleanup(); vi.resetAllMocks(); vi.unstubAllGlobals(); });

it('shows a personal eating style before saving all ten answers', async () => {
  const onComplete = vi.fn();
  render(<OnboardingSurvey onComplete={onComplete} onFavorites={vi.fn()} />);
  await screen.findByRole('dialog');
  const choices = [
    'Thịt gà', 'Cân bằng, đa dạng', 'Đậm đà / Mặn mà',
    '15–30 phút', 'Bếp gas / Bếp từ', 'Cơm, cháo, món nước',
    'Không kiêng', 'Xào / áp chảo', 'Dễ làm', 'Bữa sáng',
  ];
  for (const [index, choice] of choices.entries()) {
    const option = await screen.findByRole('button', { name: choice });
    expect(screen.getByRole('progressbar', { name: 'Tiến trình khảo sát' })).toHaveAttribute('aria-valuenow', String(index + 1));
    fireEvent.click(option);
    fireEvent.click(screen.getByRole('button', { name: index === 9 ? 'Xem nhận định & món gợi ý ✦' : 'Tiếp theo →' }));
  }
  await screen.findByText('Phong cách ăn uống của bạn');
  expect(screen.getByText('Thiên về bữa ăn cân bằng, dễ duy trì')).toBeInTheDocument();
  expect(screen.getByText(/Các món một chảo/)).toBeInTheDocument();
  expect(mocks.api).toHaveBeenCalledWith('/v1/user/preferences/preview', expect.objectContaining({ method: 'POST' }));
  expect(onComplete).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Lưu sở thích & bắt đầu khám phá ✦' }));
  await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
  expect(mocks.api).toHaveBeenCalledWith('/v1/user/onboarding-preferences', {
    method: 'POST',
    body: {
      ingredients: ['chicken'], occasions: 'balanced', tastes: ['savory'],
      time: 'medium', tools: ['stove'], dish_types: ['rice_noodles'], avoid: ['none'],
      method: 'stir_fry', skill: 'beginner', meals: ['breakfast'],
    },
  });
});

it('draws a conclusion from combinations instead of listing every selected answer', () => {
  const style = describeEatingStyle({
    ingredients: ['pork', 'vegetables', 'beef'], occasions: 'none',
    tastes: ['savory'], time: 'medium', tools: ['air_fryer', 'stove'],
    dish_types: ['soup'], avoid: ['fish'], method: 'grill',
    skill: 'basic', meals: ['lunch', 'dinner'],
  });
  expect(style.title).toBe('Gu đậm đà, bữa chính nấu gọn');
  expect(style.details.join(' ')).toMatch(/món xào hoặc áp chảo có rau/);
  expect(style.details.join(' ')).toMatch(/cá và nước mắm/);
  expect(style.details.join(' ')).not.toMatch(/Bạn thích vị đậm đà và thường chọn/);
});
