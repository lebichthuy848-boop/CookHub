import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSettings, parseSettingsImport } from '../settings-context';
import '../settings-page.css';
import '../settings-page-review.css';

const tabs = [['appearance','Giao diện'],['cooking','Khi nấu ăn'],['data','Dữ liệu & khôi phục']];
const legacy = {navigation:'appearance',food:'appearance',experience:'cooking',support:'appearance'};
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
  const audioRef = useRef(null);
  useEffect(()=>{if(params.get('tab')!==tab)setParams({tab},{replace:true})},[params,tab,setParams]);
  useEffect(()=>{const onKey=event=>{if(event.key==='Escape')setModal(null)};window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey)},[]);
  useEffect(()=>()=>{audioRef.current?.close?.()},[]);
  function notice(value){setMessage(value)}
  function download(){
    const blob=new Blob([JSON.stringify(exportSettings(),null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='cookhub-settings.json';link.click();
    window.setTimeout(()=>URL.revokeObjectURL(url),1000);notice('Đã xuất cài đặt trình duyệt.');
  }
  async function chooseFile(event){
    const file=event.target.files?.[0];event.target.value='';if(!file)return;
    if(file.size>100_000){notice('File cài đặt vượt quá 100 KB.');return}
    try{const parsed=JSON.parse(await file.text());parseSettingsImport(parsed);setImportData(parsed);setModal('import')}
    catch(error){notice(error.message || 'File cài đặt không hợp lệ.')}
  }
  async function playSound(){
    if(!settings.soundEnabled){notice('Hãy bật âm thanh trước khi nghe thử.');return}
    const Audio=window.AudioContext||window.webkitAudioContext;
    if(!Audio){notice('Trình duyệt không hỗ trợ âm thanh.');return}
    try{
      await audioRef.current?.close?.();const context=new Audio();audioRef.current=context;
      await context.resume();const oscillator=context.createOscillator();const gain=context.createGain();
      oscillator.frequency.value=settings.alertSound==='kitchen'?660:settings.alertSound==='soft'?440:880;
      gain.gain.value=settings.volume/100*.08;oscillator.connect(gain);gain.connect(context.destination);
      oscillator.start();oscillator.stop(context.currentTime+.18);
      oscillator.onended=()=>{context.close();if(audioRef.current===context)audioRef.current=null};
    }catch{notice('Không thể phát âm báo trên trình duyệt này.')}
  }
  function clearCache(){
    try{const keys=Object.keys(localStorage).filter(key=>key.startsWith('cookhub:cache:'));
      keys.forEach(key=>localStorage.removeItem(key));notice(keys.length?`Đã xóa ${keys.length} mục bộ nhớ tạm.`:'Không có bộ nhớ tạm của CookHub để xóa.');setModal(null)}
    catch{notice('Không thể xóa bộ nhớ tạm.');setModal(null)}
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
      {tab==='cooking'&&<>
        <Card title="Âm báo"><Row title="Bật âm thanh" hint="Dùng cho nút nghe thử âm báo."><Toggle value={settings.soundEnabled} onChange={value=>update('soundEnabled',value)} label="Bật âm thanh"/></Row><label className="sp-label" htmlFor="alert-sound">Âm báo</label><select id="alert-sound" className="sp-select" value={settings.alertSound} onChange={event=>update('alertSound',event.target.value)}><option value="beep">Tiếng bíp</option><option value="kitchen">Chuông bếp</option><option value="soft">Âm thanh nhẹ</option></select><label className="sp-label" htmlFor="alert-volume">Âm lượng: {settings.volume}%</label><input id="alert-volume" className="sp-range" type="range" min="0" max="100" value={settings.volume} onChange={event=>update('volume',Number(event.target.value))}/><button type="button" className="sp-secondary" onClick={playSound}>▶ Nghe thử</button></Card>
        <Card title="Hỗ trợ khi nấu ăn"><Row title="Giữ màn hình sáng" hint={navigator.wakeLock?.request?'Áp dụng khi xem trang công thức.':'Trình duyệt không hỗ trợ giữ màn hình sáng.'}><Toggle value={settings.wakeLock} onChange={value=>update('wakeLock',value)} label="Giữ màn hình sáng" disabled={!navigator.wakeLock?.request}/></Row><Row title="Đọc hướng dẫn nấu ăn" hint={window.speechSynthesis?'Bấm nút đọc trên trang công thức để bắt đầu; không tự phát.':'Trình duyệt không hỗ trợ đọc hướng dẫn.'}><Toggle value={settings.readAloud} onChange={value=>update('readAloud',value)} label="Đọc hướng dẫn" disabled={!window.speechSynthesis}/></Row><Row title="Tự phát video kế tiếp" hint="Chỉ áp dụng khi món có danh sách video hướng dẫn."><Toggle value={settings.autoplayVideo} onChange={value=>update('autoplayVideo',value)} label="Tự phát video kế tiếp"/></Row></Card>
      </>}
      {tab==='data'&&<>
        <Card title="Bộ nhớ tạm"><p>Chỉ xóa các khóa bộ nhớ tạm có tiền tố <code>cookhub:cache:</code> nếu có. Cài đặt, phiên đăng nhập và dữ liệu thực đơn không bị xóa.</p><button type="button" className="sp-secondary" onClick={()=>setModal('cache')}>Xóa bộ nhớ tạm</button></Card>
        <Card title="Sao lưu & khôi phục cài đặt"><p>File JSON chỉ chứa tùy chọn trình duyệt, không chứa dữ liệu thực đơn hoặc thông tin đăng nhập.</p><button type="button" className="sp-secondary" onClick={()=>setModal('backup')}>Mở sao lưu & khôi phục</button><input ref={fileRef} hidden type="file" accept="application/json,.json" onChange={chooseFile}/></Card>
        <Card title="Khôi phục mặc định"><p>Đặt lại lựa chọn giao diện và khi nấu ăn, không xóa dữ liệu tài khoản.</p><button type="button" className="sp-danger" onClick={()=>setModal('reset')}>Khôi phục cài đặt mặc định</button></Card>
      </>}
    </section>
    {modal&&<div className="sp-modal-backdrop" onMouseDown={event=>event.target===event.currentTarget&&setModal(null)}><section className="sp-modal" role="dialog" aria-modal="true" aria-label="Tùy chọn cài đặt"><button type="button" className="sp-close" aria-label="Đóng" onClick={()=>setModal(null)}>×</button>
      {modal==='cache'&&<><h2>Xóa bộ nhớ tạm?</h2><p>Chỉ các khóa <code>cookhub:cache:</code> được xóa. Không xóa cài đặt hay dữ liệu tài khoản.</p><button className="sp-primary" onClick={clearCache}>Xác nhận xóa</button></>}
      {modal==='reset'&&<><h2>Khôi phục cài đặt mặc định?</h2><p>Giao diện, âm báo, video và hỗ trợ nấu ăn sẽ về mặc định trên trình duyệt này.</p><button className="sp-primary" onClick={()=>{reset();setModal(null);notice('Đã khôi phục cài đặt mặc định.')}}>Khôi phục</button></>}
      {modal==='backup'&&<><h2>Sao lưu & khôi phục cài đặt</h2><button className="sp-secondary" onClick={download}>Xuất cài đặt JSON</button><button className="sp-secondary" onClick={()=>fileRef.current?.click()}>Nhập cài đặt JSON</button></>}
      {modal==='import'&&<><h2>Ghi đè cài đặt hiện tại?</h2><p>Các lựa chọn trên trình duyệt này sẽ được thay bằng nội dung file vừa chọn.</p><button className="sp-primary" onClick={()=>{importSettings(importData);setImportData(null);setModal(null);notice('Đã nhập cài đặt.')}}>Xác nhận nhập</button></>}
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
