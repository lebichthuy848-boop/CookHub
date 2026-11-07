import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import MenuPlannedDish from './MenuPlannedDish';
const mocks=vi.hoisted(()=>({useApi:vi.fn()}));
vi.mock('../hooks',()=>({useApi:mocks.useApi}));
afterEach(()=>{cleanup();vi.resetAllMocks();});
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
