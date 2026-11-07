import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import HouseholdNutrition, { PortionEditor } from './HouseholdNutrition';
afterEach(cleanup);
const goals={nang_luong:2000,chat_dam:75,chat_bot_duong:300,chat_beo:55.56,chat_xo:25,natri:2000};
const member={id:'a',name:'Bạn',sex:'female',age:30,height:160,weight:60,activity:'1.4',goal:'maintain',goals};
const model={date:'2026-11-07',revision:1,members:[member],active_ids:['a'],portions:{}};
const nutrition={data:{date:'2026-11-07',totals:{...goals,nang_luong:1500},missing_ingredients:[],household:{...model,members:[{...member,totals:{...goals,nang_luong:1500}}],group_goals:goals,equal_split_items:['x']}}};
const resource={data:model,reload:vi.fn()};
it('switches between the group and a member without applying the account goal to everyone',()=>{
  render(<HouseholdNutrition day="2026-11-07" household={resource} nutrition={nutrition} diners="" onDinersChange={()=>{}} onSave={vi.fn()}/>);
  expect(screen.getByText('Tổng dinh dưỡng cả nhóm')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Xem dinh dưỡng'),{target:{value:'a'}});
  expect(screen.getByText('Mục tiêu của Bạn')).toBeInTheDocument();
  expect(screen.getByText('Khẩu phần của Bạn')).toBeInTheDocument();
  expect(screen.getByText('Chất xơ')).toBeInTheDocument();
  expect(screen.getByText('Natri')).toBeInTheDocument();
  expect(screen.getByText('Natri')).toBeInTheDocument();
});
it('saves profile goals through the provided API handler',async()=>{
  const save=vi.fn().mockResolvedValue({});
  render(<HouseholdNutrition day="2026-11-07" household={resource} nutrition={nutrition} onSave={save}/>);
  fireEvent.change(screen.getByLabelText('Xem dinh dưỡng'),{target:{value:'a'}});
  fireEvent.click(screen.getByRole('button',{name:'Tăng cân'}));
  await waitFor(()=>expect(save).toHaveBeenCalledWith(expect.objectContaining({revision:1,members:[expect.objectContaining({goal:'gain'})]})));
  expect(save.mock.calls[0][0].members[0]).not.toHaveProperty('goals');
});
it('does not display adult weight targets for children',()=>{
  const child={...member,age:12,goals:null,goal_note:'Trẻ em: cần hướng dẫn chuyên gia.'};
  render(<HouseholdNutrition day="2026-11-07" household={{data:{...model,members:[child]}}} nutrition={nutrition} onSave={vi.fn()}/>);
  fireEvent.change(screen.getByLabelText('Xem dinh dưỡng'),{target:{value:'a'}});
  expect(screen.getByRole('button',{name:'Giảm cân'})).toBeDisabled();
  expect(screen.getByText(child.goal_note)).toBeInTheDocument();
});
it('prevents a portion save until all available portions are accounted for',async()=>{
  const save=vi.fn().mockResolvedValue({});
  render(<PortionEditor item={{id:'x',servings:3}} name="Món thử" model={model} onSave={save} onClose={()=>{}}/>);
  fireEvent.change(screen.getByLabelText('Khẩu phần của Bạn'),{target:{value:'2'}});
  expect(screen.getByRole('button',{name:'Lưu khẩu phần'})).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Khẩu phần của Bạn'),{target:{value:'3'}});
  fireEvent.click(screen.getByRole('button',{name:'Lưu khẩu phần'}));
  await waitFor(()=>expect(save).toHaveBeenCalledWith(expect.objectContaining({portions:{x:{a:3}}})));
});
