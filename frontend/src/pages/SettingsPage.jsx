import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSettings, parseSettingsImport } from '../settings-context';
import { api } from '../api';
import '../settings-page.css';
import '../settings-page-review.css';

const tabs = [['appearance','Giao diện'],['data','Dữ liệu & khôi phục']];
const legacy = {navigation:'appearance',food:'appearance',experience:'appearance',cooking:'appearance',support:'appearance'};
const tabFor = value => tabs.some(([key]) => key === value) ? value : legacy[value] || 'appearance';
function Toggle({value,onChange,label,disabled=false}) {return <button type="button" role="switch" aria-checked={value} aria-label={label} disabled={disabled} className={`sp-toggle ${value?'on':''}`} onClick={()=>onChange(!value)}><i/></button>}
function Choice({value,onChange,options}) {return <div className="sp-choice">{options.map(([key,label])=><button type="button" key={key} className={value===key?'active':''} aria-pressed={value===key} onClick={()=>onChange(key)}>{label}</button>)}</div>}
function Row({title,hint,children}) {return <div className="sp-row"><div><b>{title}</b>{hint&&<small>{hint}</small>}</div>{children}</div>}
function Card({title,children}) {return <article className="sp-card"><h2>{title}</h2>{children}</article>}

export function SettingsPage() {
  const {settings,update,reset,exportSettings,importSettings} = useSettings();
  const [params,setParams] = useSearchParams();
  const tab = tabFor(params.get('tab'));
  const [message,setMessage] = useState('');
  const [modal,setModal] = useState(null);
  const [importData,setImportData] = useState(null);
  const fileRef = useRef(null);
  useEffect(()=>{if(params.get('tab')!==tab)setParams({tab},{replace:true})},[params,tab,setParams]);
  useEffect(()=>{const onKey=event=>{if(event.key==='Escape')setModal(null)};window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey)},[]);
  function notice(value){setMessage(value)}
  async function download(){
    try {
      const accountBackup = await api('/account-backup');
      const blob=new Blob([JSON.stringify({...accountBackup,settings:exportSettings().settings},null,2)],{type:'application/json'});
      const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='cookhub-account-backup.json';link.click();
      window.setTimeout(()=>URL.revokeObjectURL(url),1000);notice('Đã xuất hồ sơ, thực đơn và cài đặt.');
    } catch(error) {notice(error.message || 'Không thể xuất bản sao lưu.');}
  }
  async function chooseFile(event){
    const file=event.target.files?.[0];event.target.value='';if(!file)return;
    if(file.size>5_000_000){notice('File sao lưu vượt quá 5 MB.');return}
    try{const parsed=JSON.parse(await file.text());
      if(parsed.version!==1 || !parsed.account || !Array.isArray(parsed.account.menu) || !parsed.settings) throw new Error('File sao lưu không đúng định dạng.');
      parseSettingsImport({version:1,settings:parsed.settings});setImportData(parsed);setModal('import')}
    catch(error){notice(error.message || 'File sao lưu không hợp lệ.')}
  }
  async function restore(){
    try{const result=await api('/account-backup/restore',{method:'POST',body:{version:importData.version,account:importData.account}});
      importSettings({version:1,settings:importData.settings});setImportData(null);setModal(null);
      notice(`Đã khôi phục hồ sơ và cài đặt; thêm ${result.restored_menu_items} món vào thực đơn. Vui lòng tải lại trang để xem dữ liệu mới.`)}
    catch(error){notice(error.message || 'Không thể khôi phục dữ liệu.');setModal(null)}
  }
  return <div className="settings-page-new">
    <header className="sp-hero"><div><small>COOKHUB / CÀI ĐẶT</small><h1>Cài đặt CookHub</h1><p>Tùy chỉnh trải nghiệm sử dụng trên trình duyệt này.</p></div><button type="button" className="sp-help" onClick={()=>setModal('help')}>? Trợ giúp</button></header>
    <nav className="sp-tabs" aria-label="Nhóm cài đặt">{tabs.map(([key,label])=><button type="button" key={key} className={tab===key?'active':''} aria-current={tab===key?'page':undefined} onClick={()=>setParams({tab:key})}>{label}</button>)}</nav>
    {message&&<p className="sp-message" role="status">{message}</p>}
    <section className="sp-content">
      {tab==='appearance'&&<>
        <Card title="Chế độ giao diện"><Choice value={settings.theme} onChange={value=>update('theme',value)} options={[["system","Theo hệ thống"],["light","Sáng"],["dark","Tối"]]}/></Card>
        <Card title="Cỡ chữ & mật độ"><label className="sp-label">Cỡ chữ</label><Choice value={settings.fontScale} onChange={value=>update('fontScale',value)} options={[["small","Nhỏ"],["medium","Vừa"],["large","Lớn"]]}/><label className="sp-label">Mật độ hiển thị</label><Choice value={settings.density} onChange={value=>update('density',value)} options={[["comfortable","Thoáng"],["compact","Gọn"]]}/></Card>
        <Card title="Tùy chọn hiển thị"><Row title="Giảm hiệu ứng chuyển động"><Toggle value={settings.reducedMotion} onChange={value=>update('reducedMotion',value)} label="Giảm hiệu ứng"/></Row><Row title="Hiện thông tin dinh dưỡng" hint="Chỉ ẩn thông tin trên màn hình; dữ liệu món ăn vẫn được giữ."><Toggle value={settings.showNutrition} onChange={value=>update('showNutrition',value)} label="Hiện dinh dưỡng"/></Row></Card>
      </>}
      {tab==='data'&&<>
        <Card title="Sao lưu & khôi phục dữ liệu"><p>File JSON gồm tên hồ sơ, lựa chọn khảo sát, toàn bộ món trong thực đơn và cài đặt trình duyệt. Không chứa mật khẩu hoặc phiên đăng nhập. Chỉ khôi phục vào cùng email; các món đã có không bị thêm trùng.</p><button type="button" className="sp-secondary" onClick={()=>setModal('backup')}>Mở sao lưu & khôi phục</button><input ref={fileRef} hidden type="file" accept="application/json,.json" onChange={chooseFile}/></Card>
        <Card title="Khôi phục mặc định"><p>Đặt lại lựa chọn giao diện, không xóa dữ liệu tài khoản.</p><button type="button" className="sp-danger" onClick={()=>setModal('reset')}>Khôi phục cài đặt mặc định</button></Card>
      </>}
    </section>
    {modal&&<div className="sp-modal-backdrop" onMouseDown={event=>event.target===event.currentTarget&&setModal(null)}><section className="sp-modal" role="dialog" aria-modal="true" aria-label="Tùy chọn cài đặt"><button type="button" className="sp-close" aria-label="Đóng" onClick={()=>setModal(null)}>×</button>
      {modal==='reset'&&<><h2>Khôi phục cài đặt mặc định?</h2><p>Các lựa chọn giao diện sẽ về mặc định trên trình duyệt này.</p><button className="sp-primary" onClick={()=>{reset();setModal(null);notice('Đã khôi phục cài đặt mặc định.')}}>Khôi phục</button></>}
      {modal==='backup'&&<><h2>Sao lưu & khôi phục dữ liệu</h2><button className="sp-secondary" onClick={download}>Xuất dữ liệu JSON</button><button className="sp-secondary" onClick={()=>fileRef.current?.click()}>Nhập dữ liệu JSON</button></>}
      {modal==='import'&&<><h2>Khôi phục dữ liệu?</h2><p>Tên hồ sơ, khảo sát và cài đặt sẽ theo file. Món trong thực đơn được bổ sung nếu chưa có; món hiện tại không bị xóa. File phải thuộc email của tài khoản đang đăng nhập.</p><button className="sp-primary" onClick={restore}>Xác nhận khôi phục</button></>}
      {modal==='help'&&<><h2>Trợ giúp CookHub</h2><p>Khám phá món ăn để tìm công thức, dùng biểu tượng tim để lưu yêu thích và Thực đơn để lập kế hoạch.</p><button className="sp-secondary" onClick={()=>setModal('shortcuts')}>Phím tắt</button><button className="sp-secondary" onClick={()=>setModal('feedback')}>Báo lỗi & góp ý</button><p>CookHub · Nấu ngon mỗi ngày</p></>}
      {modal==='shortcuts'&&<><h2>Phím tắt</h2><p>Esc: đóng hộp thoại đang mở.</p></>}
      {modal==='feedback'&&<Feedback onDone={notice}/>}
    </section></div>}
  </div>;
}

function Feedback({onDone}) {
  const [value,setValue]=useState('');
  async function copy(event){event.preventDefault();if(!value.trim())return;
    try{await navigator.clipboard.writeText(`CookHub góp ý:\n${value.trim()}\nTrang: ${location.href}`);onDone('Đã sao chép báo cáo góp ý; bạn cần tự gửi cho nhóm phát triển.')}
    catch{onDone('Không thể sao chép. Vui lòng sao chép nội dung thủ công.')}
  }
  return <form onSubmit={copy}><h2>Báo lỗi & góp ý</h2><p>Nội dung chỉ được sao chép vào clipboard, chưa được gửi đi.</p><textarea className="sp-textarea" value={value} onChange={event=>setValue(event.target.value)} placeholder="Mô tả lỗi hoặc góp ý..." required/><button className="sp-primary">Sao chép báo cáo</button></form>;
}
