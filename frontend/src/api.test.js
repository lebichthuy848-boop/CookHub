import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, media, today } from './api';
afterEach(()=>vi.unstubAllGlobals());
describe('API client',()=>{
  it('sends the HttpOnly cookie and CSRF header, serializes JSON',async()=>{
    const fetch=vi.fn().mockResolvedValue({ok:true,status:201,json:async()=>({id:'x'})});vi.stubGlobal('fetch',fetch);
    expect(await api('/menu',{method:'POST',body:{meal:'Trưa'}})).toEqual({id:'x'});
    expect(fetch).toHaveBeenCalledWith('/api/menu',expect.objectContaining({credentials:'include',method:'POST',headers:{'X-CookHub-Client':'web','Content-Type':'application/json'},body:'{"meal":"Trưa"}'}));
  });
  it('handles empty 204 responses',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,status:204}));expect(await api('/favorites/x',{method:'DELETE'})).toBeNull();
  });
  it('preserves validation errors',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:false,status:422,json:async()=>({detail:[{msg:'Invalid meal'}]})}));
    await expect(api('/menu')).rejects.toThrow('Invalid meal');
  });
  it('signals expired sessions without treating server failures as logout',async()=>{
    const listener=vi.fn();window.addEventListener('session-expired',listener);
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:false,status:401,json:async()=>({detail:'Expired'})}));
    await expect(api('/profile')).rejects.toThrow('Expired');expect(listener).toHaveBeenCalledOnce();
    window.removeEventListener('session-expired',listener);
  });
  it('does not set multipart boundary manually',async()=>{
    const fetch=vi.fn().mockResolvedValue({ok:true,status:201,json:async()=>({path:'images/test.webp'})});vi.stubGlobal('fetch',fetch);
    const body=new FormData();body.append('file',new Blob(['test']));await api('/uploads/images',{method:'POST',body});
    expect(fetch.mock.calls[0][1].headers).not.toHaveProperty('Content-Type');
  });
});
it('restricts media URLs',()=>{
  expect(media('javascript:alert(1)')).toBe('/images/logo.jpg');
  expect(media('images/../secret')).toBe('/images/logo.jpg');
  expect(media('images/mon-an/test.jpg')).toMatch(/^\/images\/mon-an\/test\.jpg\?v=\d{8}-\d+$/);
  expect(media('videos/uploads/test.mp4')).toBe('/media/videos/uploads/test.mp4');
});
it('uses a local calendar date',()=>expect(today()).toMatch(/^\d{4}-\d{2}-\d{2}$/));

