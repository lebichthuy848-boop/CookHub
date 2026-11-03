import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { SettingsPage } from './SettingsPage';
import { SettingsProvider, defaultSettings, parseSettingsImport, useSettings } from '../settings-context';

vi.mock('../auth',()=>({useAuth:()=>({user:{id:'settings-test'}})}));
afterEach(()=>{cleanup();localStorage.removeItem('cookhub:settings:v1:settings-test')});
function Page({initial='/settings'}) {return <MemoryRouter initialEntries={[initial]}><SettingsProvider><SettingsPage/></SettingsProvider></MemoryRouter>}

it('shows only active tabs and maps legacy cooking links to appearance',()=>{
  render(<Page initial="/settings?tab=cooking"/>);
  const nav=screen.getByRole('navigation',{name:'Nhóm cài đặt'});
  expect(nav.querySelectorAll('button')).toHaveLength(2);
  expect(screen.queryByRole('switch',{name:'Hiện dinh dưỡng'})).not.toBeInTheDocument();
  expect(screen.queryByRole('button',{name:'Khi nấu ăn'})).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Dữ liệu & khôi phục'}));
  expect(screen.getByRole('button',{name:'Mở sao lưu & khôi phục'})).toBeInTheDocument();
  expect(screen.queryByRole('button',{name:'Xóa bộ nhớ tạm'})).not.toBeInTheDocument();
  expect(screen.getByText(/toàn bộ món trong thực đơn/)).toBeInTheDocument();
});

it('rejects unknown or malformed imports without changing saved settings',()=>{
  expect(()=>parseSettingsImport({version:1,settings:{theme:'dark',token:'secret'}})).toThrow();
  expect(()=>parseSettingsImport({version:1,settings:{volume:500}})).toThrow();
  expect(parseSettingsImport({version:1,settings:{theme:'dark'}})).toEqual({...defaultSettings,theme:'dark'});
  expect(parseSettingsImport({version:1,settings:{theme:'dark',showNutrition:false}})).toEqual({...defaultSettings,theme:'dark'});
});

function SettingProbe(){const {settings,update}=useSettings();return <><span>{settings.theme}</span><button onClick={()=>update('theme','dark')}>Đổi giao diện</button></>}
it('persists a browser setting through remount',()=>{
  const first=render(<SettingsProvider><SettingProbe/></SettingsProvider>);
  fireEvent.click(screen.getByRole('button',{name:'Đổi giao diện'}));
  expect(JSON.parse(localStorage.getItem('cookhub:settings:v1:settings-test')).theme).toBe('dark');
  first.unmount();render(<SettingsProvider><SettingProbe/></SettingsProvider>);
  expect(screen.getByText('dark')).toBeInTheDocument();
});
