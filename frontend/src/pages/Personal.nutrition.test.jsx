import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { DailyNutritionCard } from './Personal';

afterEach(cleanup);

it('keeps household totals separate from an estimated share per person', () => {
  const nutrition={data:{date:'2026-10-23',totals:{nang_luong:1218.96,chat_dam:103.06,chat_bot_duong:20.7,chat_beo:80.12},goals:{nang_luong:2200,chat_dam:100,chat_bot_duong:250,chat_beo:70}}};
  render(<DailyNutritionCard day="2026-10-23" nutrition={nutrition}/>);
  expect(screen.getByText(/Tổng tất cả phần ăn: 1\.218,96 kcal/)).toBeInTheDocument();
  expect(screen.getByText('—')).toBeInTheDocument();
  expect(screen.queryByText('55%')).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Số người cùng ăn'),{target:{value:'3'}});
  expect(screen.getByText('18%')).toBeInTheDocument();
  expect(screen.getByText(/406,32 \/ 2\.200 kcal/)).toBeInTheDocument();
});
