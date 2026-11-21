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
  const onSelectedViewChange=vi.fn();
  render(<HouseholdNutrition day="2026-11-07" household={resource} nutrition={nutrition} diners="" onDinersChange={()=>{}} onSave={vi.fn()} onSelectedViewChange={onSelectedViewChange}/>);
  expect(screen.getByText('Tổng dinh dưỡng cả nhóm')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Xem dinh dưỡng'),{target:{value:'a'}});
  expect(onSelectedViewChange).toHaveBeenCalledWith('a');
  expect(screen.getByText('Mục tiêu của Bạn')).toBeInTheDocument();
  expect(screen.getByText('Khẩu phần của Bạn')).toBeInTheDocument();
  expect(screen.getByText('Chất xơ')).toBeInTheDocument();
  expect(screen.getByText(/Natri · không nên vượt/)).toBeInTheDocument();
});
it('labels a processing subtotal and preserves that label when viewing a member',()=>{
  const issue={name:'Dầu ăn',reason:'Chưa xác định dầu hấp thụ.'};
  const partial={data:{...nutrition.data,complete:false,processing_issues:[issue],household:{...nutrition.data.household,
    members:[{...nutrition.data.household.members[0],complete:false,processing_issues:[issue]}]}}};
  render(<HouseholdNutrition day="2026-11-07" household={resource} nutrition={partial} onSave={vi.fn()}/>);
  expect(screen.getByText('Đã tính một phần')).toHaveAttribute('title','Dầu ăn: Chưa xác định dầu hấp thụ.');
  fireEvent.change(screen.getByLabelText('Xem dinh dưỡng'),{target:{value:'a'}});
  expect(screen.getByText('Đã tính một phần')).toBeInTheDocument();
});
it('presents sodium as a maximum limit instead of a nutrient deficit',()=>{
  const sodiumNutrition={data:{...nutrition.data,totals:{...goals,natri:1900},household:{...nutrition.data.household,
    members:[{...nutrition.data.household.members[0],totals:{...goals,natri:1900}}]}}};
  render(<HouseholdNutrition day="2026-11-07" household={resource} nutrition={sodiumNutrition} onSave={vi.fn()}/>);
  expect(screen.getByText(/Natri · không nên vượt/)).toBeInTheDocument();
  expect(screen.getByText(/Còn cách giới hạn tối đa 100 mg · không cần ăn đủ/)).toBeInTheDocument();
  expect(screen.queryByText(/Thiếu 100 mg/)).not.toBeInTheDocument();
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
it.each([['lose','Giảm cân'],['gain','Tăng cân']])('keeps %s selectable with a warning and preserves the group comparison', (goal,label)=>{
  const warning='BMI cần lưu ý với mục tiêu đã chọn.';
  const person={...member,goal,goal_warnings:[warning]};
  const members=[person,{...member,id:'b',name:'Hai'},{...member,id:'c',name:'Ba'}];
  const groupGoals=Object.fromEntries(Object.entries(goals).map(([key,value])=>[key,value*3]));
  const updatedModel={...model,members,active_ids:['a','b','c']};
  const updatedNutrition={data:{...nutrition.data,household:{...updatedModel,
    members:members.map(m=>({...m,totals:goals})),group_goals:groupGoals}}};
  const save=vi.fn().mockResolvedValue({});
  render(<HouseholdNutrition day="2026-11-07" household={{data:updatedModel}}
    nutrition={updatedNutrition} onSave={save}/>);
  fireEvent.change(screen.getByLabelText('Xem dinh dưỡng'),{target:{value:'a'}});
  expect(screen.getByRole('button',{name:label})).toBeEnabled();
  expect(screen.getByRole('button',{name:label})).toHaveClass('active');
  expect(screen.getByRole('alert')).toHaveTextContent(warning);
  expect(screen.getByText('trên 2.000 kcal mục tiêu')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:label}));
  expect(save).toHaveBeenCalledWith(expect.objectContaining({members:expect.arrayContaining([expect.objectContaining({goal})])}));
  fireEvent.change(screen.getByLabelText('Xem dinh dưỡng'),{target:{value:'group'}});
  expect(screen.getByText('Tổng dinh dưỡng cả nhóm')).toBeInTheDocument();
  expect(screen.getByText('trên 6.000 kcal mục tiêu')).toBeInTheDocument();
  expect(screen.getByRole('alert')).toHaveTextContent('Mục tiêu cần lưu ý');
  expect(screen.queryByText('Chưa đủ hồ sơ để tính mục tiêu')).not.toBeInTheDocument();
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
