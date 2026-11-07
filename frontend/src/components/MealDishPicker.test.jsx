import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import MealDishPicker from './MealDishPicker';
afterEach(cleanup);
it('searches dishes and submits the selected dish and servings',async()=>{
 const add=vi.fn().mockResolvedValue({});
 render(<MealDishPicker meal="Trưa" resource={{data:[{id:'MA1',name:'Canh chua',image:'https://example.com/a.png',time:20},{id:'MA2',name:'Cơm gà',time:25}]}} onAdd={add}/>);
 fireEvent.click(screen.getByRole('button',{name:'＋ Thêm món'}));
  expect(screen.getByRole('button',{name:'Thêm'})).toBeDisabled();
  fireEvent.click(screen.getByRole('button',{name:/Chọn món/}));
 fireEvent.change(screen.getByLabelText('Tìm và chọn món ăn'),{target:{value:'canh'}});
 expect(screen.queryByRole('button',{name:/Cơm gà/})).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:/Canh chua/}));
 fireEvent.change(screen.getByLabelText('Số phần ăn'),{target:{value:'3'}});
  fireEvent.click(screen.getByRole('button',{name:'Thêm'}));
 await waitFor(()=>expect(add).toHaveBeenCalledWith('MA1',3));
 await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
});
it('shows a retry action instead of a silent empty dropdown',()=>{
 const reload=vi.fn();
 render(<MealDishPicker meal="Tối" resource={{data:null,error:'Không tải được danh sách',reload}} onAdd={vi.fn()}/>);
 fireEvent.click(screen.getByRole('button',{name:'＋ Thêm món'}));
  fireEvent.click(screen.getByRole('button',{name:/Chọn món/}));
 expect(screen.getByRole('alert')).toHaveTextContent('Không tải được danh sách');
 fireEvent.click(screen.getByRole('button',{name:'Thử tải lại'}));
 expect(reload).toHaveBeenCalledOnce();
});
