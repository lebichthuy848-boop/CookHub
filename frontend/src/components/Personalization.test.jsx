import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { OnboardingSurvey, PreferencesSettings } from './Personalization';
const mocks=vi.hoisted(()=>({api:vi.fn(),setUser:vi.fn(),favorites:[],user:{id:'new',survey_pending:true},saved:null}));
vi.mock('../api',()=>({api:mocks.api,media:path=>'/'+path}));
vi.mock('../auth',()=>({useAuth:()=>({user:mocks.user,setUser:mocks.setUser})}));
vi.mock('../hooks',()=>({useApi:path=>({data:path==='/favorites'?mocks.favorites:{answers:mocks.saved},loading:false,error:'',reload:vi.fn()})}));
beforeEach(()=>{
  vi.stubGlobal('matchMedia',vi.fn(()=>({matches:true,addListener:vi.fn(),removeListener:vi.fn(),addEventListener:vi.fn(),removeEventListener:vi.fn()})));
  mocks.api.mockImplementation(path=>Promise.resolve(path.includes('claim')?{show:true}:null));
});
afterEach(()=>{cleanup();vi.resetAllMocks();mocks.saved=null;vi.unstubAllGlobals();});
it('collects ten questions, previews without saving, persists favorites, and retries a failed save',async()=>{
  const complete=vi.fn(), favorites=vi.fn();
  render(<OnboardingSurvey onComplete={complete} onFavorites={favorites}/>);
  await screen.findByRole('dialog');
  expect(screen.getByRole('button',{name:'Tiếp theo →'})).toBeDisabled();
  for(const label of ['Thịt gà','Bữa ăn 1 người','Đậm đà / Mặn mà','Vừa đủ · 15–30 phút','Bếp gas / Bếp từ','Miền Bắc','Không kiêng','Tiết kiệm · <50k','Mới bắt đầu']) {
    fireEvent.click(await screen.findByRole('button',{name:new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'))}));
    fireEvent.click(screen.getByRole('button',{name:'Tiếp theo →'}));
  }
  fireEvent.click(await screen.findByRole('button',{name:'Bữa sáng nhanh'}));
  mocks.api.mockResolvedValueOnce([{id:'dish1',name:'Cơm gà',image:'images/logo.jpg',time:25,difficulty:'Dễ',match_percent:70,match_reasons:['Nguyên liệu']}]);
  fireEvent.click(screen.getByRole('button',{name:'Xem nhận định & món gợi ý ✦'}));
  await screen.findByText('Phong cách ăn uống của bạn');
  expect(screen.getByText('Gu đậm vị, thích nấu gọn')).toBeInTheDocument();
  expect(screen.getByText('Cơm gà')).toBeInTheDocument();
  expect(screen.queryByText('70% Hợp vị')).not.toBeInTheDocument();
  expect(mocks.api).not.toHaveBeenCalledWith('/v1/user/preferences',expect.anything());
  mocks.api.mockResolvedValueOnce(null);
  fireEvent.click(screen.getByRole('button',{name:'Yêu thích Cơm gà'}));
  await waitFor(()=>expect(favorites).toHaveBeenCalled());
  expect(mocks.api).toHaveBeenCalledWith('/favorites/dish1',{method:'PUT'});
  mocks.api.mockRejectedValueOnce(new Error('Không thể lưu lúc này'));
  fireEvent.click(screen.getByRole('button',{name:'Lưu sở thích & bắt đầu khám phá ✦'}));
  await screen.findByText('Không thể lưu lúc này');
  expect(complete).not.toHaveBeenCalled();expect(screen.getByRole('dialog')).toBeInTheDocument();
  mocks.api.mockResolvedValueOnce({id:'new',has_completed_survey:true,survey_pending:false});
  fireEvent.click(screen.getByRole('button',{name:'Lưu sở thích & bắt đầu khám phá ✦'}));
  await waitFor(()=>expect(complete).toHaveBeenCalledTimes(1));
  expect(mocks.api).toHaveBeenCalledWith('/v1/user/onboarding-preferences',{method:'POST',body:{ingredients:['chicken'],occasions:['solo'],tastes:['savory'],time:'medium',tools:['stove'],regions:['north'],avoid:['none'],budget:'saving',skill:'beginner',meals:['breakfast']}});
});
it('does not display the survey after the database claim was used',async()=>{
  mocks.api.mockResolvedValue({show:false});
  render(<OnboardingSurvey onComplete={vi.fn()} onFavorites={vi.fn()}/>);
  await waitFor(()=>expect(mocks.api).toHaveBeenCalledWith('/v1/user/survey/claim',{method:'POST'}));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
it('loads and edits saved preferences with a static form',async()=>{
  mocks.saved={ingredients:['chicken'],occasions:['solo'],tastes:['savory'],time:'medium',tools:['stove'],regions:['north'],avoid:['none'],budget:'saving',skill:'beginner',meals:['breakfast']};
  render(<PreferencesSettings/>);
  expect(screen.getByRole('button',{name:/Thịt gà/})).toHaveAttribute('aria-pressed','true');
  fireEvent.click(screen.getByRole('button',{name:/Nhanh gọn/}));
  mocks.api.mockResolvedValue({id:'new',has_completed_survey:true});
  fireEvent.click(screen.getByRole('button',{name:'Cập nhật sở thích'}));
  await screen.findByText('Đã cập nhật sở thích. Gợi ý món ăn đã sẵn sàng.');
  expect(mocks.api).toHaveBeenCalledWith('/v1/user/preferences',{method:'POST',body:{...mocks.saved,time:'quick'}});
});
