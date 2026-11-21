import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MemoryRouter, useLocation } from 'react-router-dom';
import MenuPlannedDish from './MenuPlannedDish';
const mocks=vi.hoisted(()=>({useApi:vi.fn()}));
vi.mock('../hooks',()=>({useApi:mocks.useApi}));
afterEach(()=>{cleanup();vi.resetAllMocks();vi.useRealTimers();vi.unstubAllGlobals();});
function Location(){return <output>{useLocation().pathname}</output>;}
function setupCard(props={}){
 mocks.useApi.mockReturnValue({data:null});
 return render(<MemoryRouter><MenuPlannedDish item={{id:'one',dish_id:'MA104',dish_name:'Canh chua',dish_image:'https://example.com/fish.png',meal:'Sáng',servings:2}} onRemove={vi.fn()} {...props}/><Location/></MemoryRouter>);
}
it.each(['image','name','card'])('opens details with one click on the %s while customization is available',(target)=>{
 const {container}=setupCard({onUpdate:vi.fn(),onPortions:vi.fn(),onMove:vi.fn()});
 fireEvent.click(target==='image'?screen.getByRole('img'):target==='name'?screen.getByText('Canh chua'):container.querySelector('article'));
 expect(screen.getByText('/dish/MA104')).toBeInTheDocument();
});
it('keeps serving, sharing and delete buttons separate from navigation',()=>{
 const onUpdate=vi.fn(),onPortions=vi.fn(),onRemove=vi.fn();
 setupCard({onUpdate,onPortions,onRemove,onMove:vi.fn()});
 fireEvent.click(screen.getByRole('button',{name:'Tăng khẩu phần Canh chua'}));
 fireEvent.click(screen.getByRole('button',{name:'Chia khẩu phần'}));
 fireEvent.click(screen.getByRole('button',{name:'Xóa món Canh chua'}));
 expect(onUpdate).toHaveBeenCalledWith({meal:'Sáng',servings:3});
 expect(onPortions).toHaveBeenCalledTimes(1);
 expect(onRemove).toHaveBeenCalledTimes(1);
 expect(screen.getByText('/')).toBeInTheDocument();
});
it('moves a held card to another meal without opening details after the drop',()=>{
 vi.useFakeTimers();
 const onMove=vi.fn();
 const {container}=setupCard({onMove});
 const card=container.querySelector('article');
 card.setPointerCapture=vi.fn();
 const meal=document.createElement('div');meal.dataset.menuMeal='Tối';
 document.elementFromPoint=vi.fn(()=>meal);
 function pointer(type){
  const event=new Event(type,{bubbles:true});
  Object.assign(event,{isPrimary:true,button:0,pointerId:1,clientX:10,clientY:10});
  fireEvent(card,event);
 }
 pointer('pointerdown');
 vi.advanceTimersByTime(350);
 pointer('pointerup');
 fireEvent.click(screen.getByText('Canh chua'));
 expect(onMove).toHaveBeenCalledWith('Tối');
 expect(screen.getByText('/')).toBeInTheDocument();
 fireEvent.click(screen.getByText('Canh chua'));
 expect(screen.getByText('/dish/MA104')).toBeInTheDocument();
});
it('loads a dish name and image when the running menu API returns only an ID',()=>{
 mocks.useApi.mockReturnValue({data:{name:'Canh chua cá lóc',image:'https://example.com/fish.png'},reload:vi.fn()});
 render(<MemoryRouter><MenuPlannedDish item={{id:'one',dish_id:' MA104 ',servings:2}} onRemove={()=>{}}/></MemoryRouter>);
 expect(mocks.useApi).toHaveBeenCalledWith('/dishes/MA104');
 expect(screen.getByText('Canh chua cá lóc')).toBeInTheDocument();
 expect(screen.getByRole('img',{name:'Canh chua cá lóc'})).toHaveAttribute('src','https://example.com/fish.png');
 expect(screen.getByText('2 phần ăn')).toBeInTheDocument();
});
it('uses menu metadata immediately without another dish request',()=>{
 mocks.useApi.mockReturnValue({data:null});
 render(<MemoryRouter><MenuPlannedDish item={{id:'one',dish_id:'MA104',dish_name:'Canh chua',dish_image:'https://example.com/fish.png'}} onRemove={()=>{}}/></MemoryRouter>);
 expect(mocks.useApi).toHaveBeenCalledWith(null);
 expect(screen.getByText('Canh chua')).toBeInTheDocument();
});
