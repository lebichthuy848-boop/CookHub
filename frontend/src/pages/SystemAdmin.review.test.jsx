import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import SystemUsers from './SystemUsers';
import SystemReports from './SystemReports';
import AdminAccount from './AdminAccount';

const mocks = vi.hoisted(() => ({api:vi.fn(),reload:vi.fn(),logout:vi.fn(),responses:{}}));
vi.mock('../api',() => ({api:mocks.api}));
vi.mock('../hooks',() => ({useApi:path => mocks.responses[path] || {data:null,error:'',loading:false,reload:mocks.reload}}));
vi.mock('../auth',() => ({useAuth:() => ({logout:mocks.logout})}));
afterEach(() => {cleanup();vi.clearAllMocks();mocks.responses={};});
const row=(id,name,status='Đang hoạt động') => ({id,name,email:`${id}@test.local`,role:'Người dùng',status,created_at:'2026-10-10T12:00:00'});

it('filters users, paginates, and requires confirmation before locking',async()=>{
  mocks.responses['/admin/users']={data:Array.from({length:12},(_,i)=>row(`ND${i+1}`,`Tên ${i+1}`)),error:'',loading:false,reload:mocks.reload};
  mocks.api.mockResolvedValue({});
  render(<MemoryRouter><SystemUsers/></MemoryRouter>);
  expect(screen.getByText('Trang 1 / 2')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:/Đang sắp xếp tăng dần/}));
  expect(screen.getByRole('button',{name:/Đang sắp xếp giảm dần/})).toHaveTextContent('↓');
  fireEvent.change(screen.getByLabelText('Tìm tài khoản'),{target:{value:'ND12'}});
  expect(screen.getByText('1 / 12 tài khoản phù hợp · giờ tạo theo máy chủ')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Chỉnh sửa'}));
  fireEvent.change(screen.getByLabelText('Trạng thái'),{target:{value:'Tạm khóa'}});
  fireEvent.click(screen.getByRole('button',{name:'Lưu thay đổi'}));
  expect(screen.getByText('Xác nhận khóa tài khoản')).toBeInTheDocument();
  expect(mocks.api).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:'Xác nhận'}));
  await waitFor(()=>expect(mocks.api).toHaveBeenCalledWith('/admin/users/ND12',expect.objectContaining({method:'PUT',body:expect.objectContaining({status:'Tạm khóa'})})));
});

it('validates custom report dates before requesting data',()=>{
  render(<MemoryRouter><SystemReports/></MemoryRouter>);
  fireEvent.change(screen.getByLabelText('Chọn kỳ báo cáo'),{target:{value:'custom'}});
  expect(screen.getByRole('alert')).toHaveTextContent('Chọn cả hai ngày');
  expect(screen.getByRole('button',{name:/Xuất CSV/})).toBeDisabled();
});

it('shows the signed-in role and confirms logout',async()=>{
  mocks.responses['/profile']={data:{id:'ND001',name:'Admin',email:'admin@test.local',role:'Quản trị hệ thống',status:'Đang hoạt động'},error:'',loading:false,reload:mocks.reload};
  mocks.logout.mockResolvedValue();
  render(<MemoryRouter><AdminAccount/></MemoryRouter>);
  expect(screen.getByText('Đăng xuất khỏi tài khoản Quản trị hệ thống.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Đăng xuất'}));
  expect(mocks.logout).not.toHaveBeenCalled();
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Đăng xuất'}));
  await waitFor(()=>expect(mocks.logout).toHaveBeenCalledTimes(1));
});
