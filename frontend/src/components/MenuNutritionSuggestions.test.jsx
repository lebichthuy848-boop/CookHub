import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import MenuNutritionSuggestions from './MenuNutritionSuggestions';

afterEach(cleanup);
const goals={nang_luong:6050,chat_dam:226.9,chat_bot_duong:907.5,chat_beo:168.1,chat_xo:75,natri:6000};
const totals={nang_luong:4294.4,chat_dam:207.1,chat_bot_duong:441.8,chat_beo:150,chat_xo:18.5,natri:5600};
const soup={nang_luong:281.97,chat_dam:19.09,chat_bot_duong:13.68,chat_beo:16.84,chat_xo:.92,natri:2184.32};
const safe={nang_luong:300,chat_dam:8,chat_bot_duong:50,chat_beo:2,chat_xo:10,natri:100};
function view(props){return <MemoryRouter><MenuNutritionSuggestions {...props}/></MemoryRouter>;}
function base(){return {result:{totals},goals,items:[],options:{data:[{id:'MA109',totals:soup},{id:'SAFE',totals:safe}]},
  dishes:[{id:'MA109',name:'Canh sườn hầm hạt sen'},{id:'SAFE',name:'Món phù hợp'}],onAdd:vi.fn().mockResolvedValue()};}

it('does not recommend the high-sodium soup while recommending a fitting alternative',()=>{
  render(view(base()));
  expect(screen.queryByRole('link',{name:'Canh sườn hầm hạt sen'})).not.toBeInTheDocument();
  expect(screen.getByRole('link',{name:'Món phù hợp'})).toBeInTheDocument();
});

it('shows a clear no-addition state instead of an empty suggestion heading',()=>{
  const props=base();
  props.result={totals:{nang_luong:6050,chat_dam:226.9,chat_bot_duong:907.5,chat_beo:168.1,chat_xo:75,natri:5900},view_label:'Cả nhóm · 3 người',equal_split_items:[{id:'a'}]};
  render(view(props));
  expect(screen.queryByRole('heading',{name:/Món nên thêm/})).not.toBeInTheDocument();
  expect(screen.queryByText(/Đang xem:/)).not.toBeInTheDocument();
  expect(screen.queryByText(/Khẩu phần của/)).not.toBeInTheDocument();
});

it('uses the no-addition state while a separate warning reports an excess',()=>{
  const props=base();
  props.result={totals:{nang_luong:6050,chat_dam:240,chat_bot_duong:907.5,chat_beo:168.1,chat_xo:75,natri:5900},view_label:'Cả nhóm · 3 người',equal_split_items:[{id:'a'}]};
  render(view(props));
  expect(screen.queryByRole('heading',{name:/Món nên thêm/})).not.toBeInTheDocument();
  expect(screen.getByLabelText('Cảnh báo thực đơn')).toBeInTheDocument();
  expect(screen.queryByText(/Đang xem:/)).not.toBeInTheDocument();
});

it('shows an estimated per-person portion when recommending to a household',()=>{
  const props=base();
  props.result={...props.result,view_label:'Cả nhóm · 3 người',view_members:[{id:'a',name:'A'},{id:'b',name:'B'},{id:'c',name:'C'}]};
  render(view(props));
  expect(screen.getByText(/Chia đều ước tính: 0,3 phần\/người/)).toBeInTheDocument();
});

it('shows a useful partial recommendation and identifies missing sodium on the dish',()=>{
  const props=base();props.result={...props.result,view_complete:false};
  props.options.data[1]={...props.options.data[1],totals:{...safe,natri:100},missing_metrics:['natri']};
  render(view(props));
  expect(screen.getByRole('link',{name:'Món phù hợp'})).toBeInTheDocument();
  expect(screen.getByText(/Chưa tính đủ: Natri/)).toBeInTheDocument();
  expect(screen.queryByText(/Số dinh dưỡng và gợi ý là phần đã tính được/)).not.toBeInTheDocument();
  expect(screen.getAllByRole('button',{name:/Thêm 1 phần · xem lưu ý/})).toHaveLength(1);
});

it('still shows a reduction estimate from known nutrients when the menu total is partial',()=>{
  const props=base();
  props.result={totals:{...totals,chat_beo:200,natri:7000},view_complete:false,
    item_totals:{CT1:{...soup,missing_metrics:['chat_beo','natri']}}};
  props.items=[{id:'CT1',dish_id:'MA109',dish_name:'Canh sườn hầm hạt sen',servings:1,meal:'Tối'}];
  render(view(props));
  expect(screen.getByText('↘ Món nên giảm')).toBeInTheDocument();
  expect(screen.getByText('Canh sườn hầm hạt sen')).toBeInTheDocument();
  expect(screen.getByText(/−1 phần/)).toBeInTheDocument();
  expect(screen.getByText(/Chất béo ≥/)).toBeInTheDocument();
});

it('estimates a reduction from the known exceeded nutrient without requiring every nutrient',()=>{
  const props=base();
  props.result={totals:{...totals,chat_beo:200,natri:7000},view_complete:false,
    item_totals:{CT1:{chat_beo:20}}};
  props.items=[{id:'CT1',dish_id:'MA109',dish_name:'Canh sườn hầm hạt sen',servings:1,meal:'Tối'}];
  render(view(props));
  expect(screen.getByText('↘ Món nên giảm')).toBeInTheDocument();
  expect(screen.getByText('Canh sườn hầm hạt sen')).toBeInTheDocument();
  expect(screen.getAllByText(/Chất béo/).length).toBeGreaterThan(0);
});

it('does not suggest a deficit match that would immediately need to be removed',()=>{
  const props=base();
  props.result={totals:{...totals,chat_beo:200}};
  render(view(props));
  expect(screen.queryByRole('link',{name:'Món phù hợp'})).not.toBeInTheDocument();
  expect(screen.queryByRole('link',{name:'Canh sườn hầm hạt sen'})).not.toBeInTheDocument();
  expect(screen.getByText(/Tạm thời chưa nên bổ sung món/)).toBeInTheDocument();
});

it('does not offer a dish that fills energy but creates an immediate carbs excess',()=>{
  const props=base();
  props.result={totals:{...totals,nang_luong:5910,chat_bot_duong:950}};
  props.options.data=[{id:'PEARL',totals:{nang_luong:107.2,chat_dam:0,chat_bot_duong:27,chat_beo:0,chat_xo:0,natri:.4}}];
  props.dishes=[{id:'PEARL',name:'Trân châu phô mai'}];
  render(view(props));
  expect(screen.queryByRole('link',{name:'Trân châu phô mai'})).not.toBeInTheDocument();
  expect(screen.queryByRole('button',{name:/Thêm 1 phần/})).not.toBeInTheDocument();
  expect(screen.getByText(/Tạm thời chưa nên bổ sung món/)).toBeInTheDocument();
});

it('does not suggest a whole serving that exceeds a small remaining energy gap',()=>{
  const props=base();
  props.result={totals:{nang_luong:5902.1,chat_dam:232.4,chat_bot_duong:940.2,chat_beo:174.9,chat_xo:97.4,natri:5836}};
  render(view(props));
  expect(screen.getByText(/Năng lượng 147,9 kcal/)).toBeInTheDocument();
  expect(screen.queryByRole('link')).not.toBeInTheDocument();
  expect(screen.getByText(/Tạm thời chưa nên bổ sung món/)).toBeInTheDocument();
  expect(screen.queryByText('Các chỉ số theo dõi đã gần hoặc đạt mục tiêu ngày.')).not.toBeInTheDocument();
});

it('suggests a whole serving when its energy fits the remaining gap',()=>{
  const props=base();
  props.result={totals:{nang_luong:5902.1,chat_dam:200,chat_bot_duong:800,chat_beo:150,chat_xo:70,natri:5800}};
  props.options.data=[{id:'LIGHT',totals:{nang_luong:120,chat_dam:4,chat_bot_duong:20,chat_beo:1,chat_xo:2,natri:50}}];
  props.dishes=[{id:'LIGHT',name:'Món nhẹ 120 kcal'}];
  render(view(props));
  expect(screen.getByRole('link',{name:'Món nhẹ 120 kcal'})).toBeInTheDocument();
  expect(screen.getByRole('button',{name:/Thêm 1 phần/})).toBeInTheDocument();
});

it('shows three valid dishes first and reveals every remaining dish on request',()=>{
  const props=base();
  props.result={totals:{...totals,nang_luong:5000}};
  props.dishes=Array.from({length:5},(_,index)=>({id:'LIGHT'+index,name:'Món nhẹ '+index}));
  props.options.data=props.dishes.map((dish,index)=>({id:dish.id,totals:{...safe,nang_luong:100+index*10}}));
  render(view(props));
  expect(screen.getAllByRole('article')).toHaveLength(3);
  expect(screen.queryByText(/Natri chỉ dùng để kiểm tra giới hạn tối đa/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:/Xem thêm >> \(2 món\)/}));
  expect(screen.getAllByRole('article')).toHaveLength(5);
  expect(screen.getByRole('button',{name:'Thu gọn ↑'})).toHaveAttribute('aria-expanded','true');
  fireEvent.click(screen.getByRole('button',{name:'Thu gọn ↑'}));
  expect(screen.getAllByRole('article')).toHaveLength(3);
});

it('distinguishes dishes already planned from missing nutrient data',()=>{
  const props=base();props.items=[{id:'a',dish_id:'MA109'},{id:'b',dish_id:'SAFE'}];
  render(view(props));
  expect(screen.getByText(/Tạm thời chưa nên bổ sung món vì các món phù hợp đều đã có/)).toBeInTheDocument();
  expect(screen.queryByText(/Chưa đủ số liệu:/)).not.toBeInTheDocument();
});

it('does not display a negative-score option just to fill the list',()=>{
  const goal={nang_luong:1000,chat_dam:100,chat_bot_duong:100,chat_beo:100,chat_xo:100,natri:1000};
  const current={...goal,nang_luong:940,chat_dam:94};
  const candidate={nang_luong:110,chat_dam:0,chat_bot_duong:5,chat_beo:5,chat_xo:0,natri:0};
  const props=base();props.goals=goal;props.result={totals:current};props.dishes=[{id:'NEG',name:'Không có lợi'}];
  props.options.data=[{id:'NEG',totals:candidate}];
  render(view(props));
  expect(screen.queryByRole('link',{name:'Không có lợi'})).not.toBeInTheDocument();
});

it('waits for both menu and nutrition refresh before offering the next addition',async()=>{
  const props=base();const page=render(view(props));
  fireEvent.click(screen.getByRole('button',{name:/Thêm 1 phần/}));
  await waitFor(()=>expect(props.onAdd).toHaveBeenCalledWith('SAFE','Sáng'));
  expect(screen.getByText('Đang cập nhật dinh dưỡng và gợi ý món…')).toBeInTheDocument();
  const items=[{id:'CT1',dish_id:'SAFE',dish_name:'Món phù hợp',servings:1,meal:'Sáng'}];
  page.rerender(view({...props,items}));
  expect(screen.getByText('Đang cập nhật dinh dưỡng và gợi ý món…')).toBeInTheDocument();
  page.rerender(view({...props,items,result:{totals:{...totals,natri:5700}}}));
  await waitFor(()=>expect(screen.queryByText('Đang cập nhật dinh dưỡng và gợi ý món…')).not.toBeInTheDocument());
  expect(screen.queryByRole('link',{name:'Món phù hợp'})).not.toBeInTheDocument();
  expect(screen.queryByRole('link',{name:'Canh sườn hầm hạt sen'})).not.toBeInTheDocument();
  expect(screen.getByText(/Tạm thời chưa nên bổ sung món/)).toBeInTheDocument();
});

it('allows retrying after a failed add',async()=>{
  const props=base();props.onAdd.mockRejectedValueOnce(new Error('Không lưu được'));
  render(view(props));fireEvent.click(screen.getByRole('button',{name:/Thêm 1 phần/}));
  await waitFor(()=>expect(screen.getByRole('alert')).toHaveTextContent('Không lưu được'));
  expect(screen.getByRole('button',{name:/Thêm 1 phần/})).toBeEnabled();
});

it.each(['goals','totals'])('waits safely for %s during a goal change, then recalculates', missing=>{
  const props=base();
  props.items=[{id:'CT1',dish_id:'MA109',dish_name:'Canh sườn hầm hạt sen',servings:1,meal:'Sáng'}];
  props.result={totals,item_totals:{CT1:soup}};
  const page=render(view(props));
  const pending=missing==='goals'
    ? {...props,goals:null}
    : {...props,result:{...props.result,totals:null}};
  page.rerender(view(pending));
  expect(screen.getByText('Cần dữ liệu thực đơn và mục tiêu dinh dưỡng để gợi ý món.')).toBeInTheDocument();
  expect(screen.queryByLabelText('Cảnh báo thực đơn')).not.toBeInTheDocument();
  expect(screen.queryByRole('button',{name:/Thêm 1 phần/})).not.toBeInTheDocument();
  page.rerender(view({...props,goals:{...goals,natri:4000}}));
  expect(screen.getByLabelText('Cảnh báo thực đơn')).toHaveTextContent('Vượt mục tiêu');
  expect(screen.queryByText('Cần dữ liệu thực đơn và mục tiêu dinh dưỡng để gợi ý món.')).not.toBeInTheDocument();
});
