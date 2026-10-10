import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { afterEach, it, vi, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Auth from './Auth';
const mocks=vi.hoisted(()=>({api:vi.fn(),setUser:vi.fn()}));
vi.mock('../api',()=>({api:mocks.api}));
vi.mock('../auth',()=>({useAuth:()=>({user:null,setUser:mocks.setUser}),landing:()=>'/home'}));
afterEach(()=>{cleanup();vi.resetAllMocks();});
it('logs in through the API and updates authenticated state',async()=>{
  mocks.api.mockResolvedValue({id:'u',role:'NguoiDung'});
  render(<MemoryRouter><Auth/></MemoryRouter>);
  fireEvent.change(screen.getByLabelText('Email'),{target:{value:'user@test.local'}});
  fireEvent.change(screen.getByLabelText('Mật khẩu'),{target:{value:'password'}});
  fireEvent.click(screen.getByRole('button',{name:'Đăng nhập'}));
  await waitFor(()=>expect(mocks.setUser).toHaveBeenCalledWith({id:'u',role:'NguoiDung'}));
  expect(mocks.api).toHaveBeenCalledWith('/auth/login',{method:'POST',body:{email:'user@test.local',password:'password'}});
});
it('shows an actionable server error on reset',async()=>{
  mocks.api.mockRejectedValue(new Error('Chưa cấu hình email khôi phục.'));
  render(<MemoryRouter><Auth mode="forgot"/></MemoryRouter>);
  fireEvent.change(screen.getByLabelText('Email'),{target:{value:'user@test.local'}});
  fireEvent.click(screen.getByRole('button',{name:'Gửi liên kết khôi phục'}));
  expect(await screen.findByRole('alert')).toHaveTextContent('Chưa cấu hình email khôi phục.');
});

it('auto logs in after registering and keeps the survey flags',async()=>{
  const user={id:'new',role:'Người dùng',survey_pending:true,has_completed_survey:false};
  mocks.api.mockResolvedValue(user);
  render(<MemoryRouter><Auth mode="register"/></MemoryRouter>);
  fireEvent.change(screen.getByLabelText('Họ và tên'),{target:{value:'New'}});
  fireEvent.change(screen.getByLabelText('Email'),{target:{value:'new@test.local'}});
  fireEvent.change(screen.getByLabelText('Mật khẩu'),{target:{value:'longpassword'}});
  fireEvent.change(screen.getByLabelText('Nhập lại mật khẩu'),{target:{value:'longpassword'}});
  fireEvent.click(screen.getByRole('button',{name:'Tạo tài khoản'}));
  await waitFor(()=>expect(mocks.setUser).toHaveBeenCalledWith(user));
  expect(mocks.api).toHaveBeenCalledWith('/auth/register',{method:'POST',body:{name:'New',email:'new@test.local',password:'longpassword'}});
});
