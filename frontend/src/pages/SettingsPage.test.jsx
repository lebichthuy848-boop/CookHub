import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { SettingsPage } from './SettingsPage';
import { SettingsProvider, defaultSettings, parseSettingsImport, useSettings } from '../settings-context';

vi.mock('../auth',()=>({useAuth:()=>({user:{id:'settings-test'}})}));
afterEach(()=>{cleanup();localStorage.removeItem('cookhub:settings:v1:settings-test')});
function Page({initial='/settings'}) {return <MemoryRouter initialEntries={[initial]}><SettingsProvider><SettingsPage/></SettingsProvider></MemoryRouter>}

it('shows exactly three tabs and maps a legacy tab to a working one',()=>{
  render(<Page initial="/settings?tab=food"/>);
  const nav=screen.getByRole('navigation',{name:'Nhóm cài đặt'});
  expect(nav.querySelectorAll('button')).toHaveLength(3);
  expect(screen.getByRole('switch',{name:'Hiện dinh dưỡng'})).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Khi nấu ăn'}));
  expect(screen.getByRole('button',{name:/Nghe thử/})).toBeInTheDocument();
});

it('rejects unknown or malformed imports without changing saved settings',()=>{
  expect(()=>parseSettingsImport({version:1,settings:{theme:'dark',token:'secret'}})).toThrow();
  expect(()=>parseSettingsImport({version:1,settings:{volume:500}})).toThrow();
  expect(parseSettingsImport({version:1,settings:{theme:'dark'}})).toEqual({...defaultSettings,theme:'dark'});
});

function SettingProbe(){const {settings,update}=useSettings();return <><span>{settings.theme}</span><button onClick={()=>update('theme','dark')}>Đổi giao diện</button></>}
it('persists a browser setting through remount',()=>{
  const first=render(<SettingsProvider><SettingProbe/></SettingsProvider>);
  fireEvent.click(screen.getByRole('button',{name:'Đổi giao diện'}));
  expect(JSON.parse(localStorage.getItem('cookhub:settings:v1:settings-test')).theme).toBe('dark');
  first.unmount();render(<SettingsProvider><SettingProbe/></SettingsProvider>);
  expect(screen.getByText('dark')).toBeInTheDocument();
});
