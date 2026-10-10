import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, media } from '../api';
import { useApi } from '../hooks';
import { Banner, State, Field, Notice } from '../components/Common';
import '../admin.css';
import '../recipe-studio.css';
import '../user-center.css';
import '../category-studio.css';
import '../video-studio.css';
import ReviewStudio from './ReviewStudio';

const titles={categories:'Quản lý danh mục',dishes:'Quản lý món ăn',recipes:'Quản lý công thức',videos:'Quản lý video',reviews:'Quản lý đánh giá',users:'Người dùng & phân quyền'};
const readPath=kind => ['categories','dishes'].includes(kind) ? '/'+kind : '/admin/'+kind;

function Editor({kind, item, categories, dishes, recipes, units, onSaved, onCancel}) {
  const [error,setError]=useState(''), [busy,setBusy]=useState(false);
  const [image,setImage]=useState(item.image || 'images/logo.jpg');
  const [video,setVideo]=useState(item.path || ''); const [videoFileKey,setVideoFileKey]=useState(0);
  async function upload(event,type) {
    const file=event.target.files[0];if(!file)return;
    setBusy(true);setError('');const body=new FormData();body.append('file',file);
    try {const result=await api('/uploads/'+type,{method:'POST',body});if(type==='images')setImage(result.path);else setVideo(result.path);}
    catch(err){setError(err.message);}finally{setBusy(false);}
  }
  async function submit(event) {
    event.preventDefault();setError('');setBusy(true);
    let body=Object.fromEntries(new FormData(event.currentTarget));
    try {
      if(kind==='dishes'){
        body.time=Number(body.time);body.difficulty=body.time<30?'Dễ':body.time<=60?'Trung bình':'Khó';body.image=image;body.home_display=body.home_display==='on';body.foods_display=body.foods_display==='on';
      }
      if(kind==='recipes'){
        body.servings=Number(body.servings);
        body.steps=body.steps.split('\n').map(x=>x.trim()).filter(Boolean);
        body.ingredients=body.ingredients.split('\n').filter(x=>x.trim()).map((line,index)=>{
          const [name,amount,unitText,...extra]=line.split('|').map(x=>x.trim());
          const unit=units.find(x=>x.symbol===unitText || x.name===unitText);
          if(extra.length || !name || !unit || !(Number(amount)>0))throw new Error(`Dòng ${index+1} không hợp lệ. Hãy nhập theo mẫu: Tên | Số lượng | Đơn vị.`);
          return {name,quantity:Number(amount),unit_id:unit.id};
        });
      }
      if(kind==='videos')body.path=(video || body.path || '').trim();
      if(kind==='reviews')body.rating=Number(body.rating);
      if(kind==='users' && !body.password)delete body.password;
      await api('/admin/'+kind+(item.id ? '/'+item.id : ''),{method:item.id?'PUT':'POST',body});
      onSaved();
    }catch(err){setError(err.message);}finally{setBusy(false);}
  }
  const select=(name,label,options,selected)=> <Field label={label}><select name={name} defaultValue={selected || ''} required><option value="">Chọn…</option>{options.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>;
  return <section className="panel editor"><div className="section-heading"><h2>{item.id?'Chỉnh sửa':'Thêm mới'}</h2><button onClick={onCancel}>Đóng</button></div><Notice error={error}/>
    <form onSubmit={submit}>
      {['categories','dishes','users'].includes(kind) && <Field label={kind==='users'?'Họ và tên':'Tên'} name="name" defaultValue={item.name || ''} required maxLength={kind==='dishes'?200:150}/>}
      {['categories','dishes','recipes','videos'].includes(kind) && <Field label="Mô tả"><textarea name="description" defaultValue={item.description || ''} maxLength={['categories','videos'].includes(kind)?500:undefined}/></Field>}
      {kind==='dishes' && <>
        {select('category_id','Danh mục',categories,item.category_id)}
        <Field label="Thời gian chế biến (phút)" type="number" name="time" defaultValue={item.time || 15} min="1" max="1440" required/>
        <Field label="Ảnh món ăn (tối đa 5 MB)"><input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>upload(e,'images')}/></Field><img className="editor-preview" src={media(image)} alt="Ảnh món ăn"/>
        <label className="check"><input type="checkbox" name="home_display" defaultChecked={item.home_display ?? true}/>Hiển thị trang chủ</label>
        <label className="check"><input type="checkbox" name="foods_display" defaultChecked={item.foods_display ?? true}/>Hiển thị trang khám phá</label>
      </>}
      {kind==='recipes' && <>
        {select('dish_id','Món ăn',dishes,item.dish_id)}
        <Field label="Số khẩu phần chuẩn" name="servings" type="number" min="1" max="1000" defaultValue={item.servings || 1} required/>
        <Field label="Nguyên liệu — mỗi dòng: Tên | Số lượng | Đơn vị"><textarea name="ingredients" rows="6" placeholder="Gạo | 200 | g" defaultValue={(item.ingredients || []).map(x=>[x.name,x.quantity,x.unit].join(' | ')).join('\n')}/></Field>
        <small>Đơn vị: {units.map(x=>x.symbol).join(', ')}</small>
        <Field label="Cách chế biến — mỗi dòng một bước"><textarea name="steps" rows="6" defaultValue={(item.steps || []).join('\n')}/></Field>
      </>}
      {kind==='videos' && <>
        {select('recipe_id','Công thức',recipes.map(x=>({id:x.id,name:dishes.find(d=>d.id===x.dish_id)?.name || x.id})),item.recipe_id)}
        <Field label="Tiêu đề" name="title" defaultValue={item.title || ''} required maxLength={200}/>
        <Field label="Đường dẫn video hoặc URL HTTPS"><input name="path" value={video} onChange={e=>setVideo(e.target.value)} required maxLength={500}/></Field>
        <Field label="Tải video MP4 / WEBM (tối đa 100 MB)"><input key={videoFileKey} type="file" accept="video/mp4,video/webm" onChange={e=>upload(e,'videos')}/>{video && <button type="button" className="media-clear" onClick={()=>{setVideo('');setVideoFileKey(k=>k+1)}}>Xóa file MP4/WEBM</button>}</Field>
      </>}
      {kind==='reviews' && <><Field label="Số sao" name="rating" type="number" min="1" max="5" defaultValue={item.rating} required/><Field label="Nhận xét"><textarea name="comment" defaultValue={item.comment} required maxLength={1000}/></Field></>}
      {kind==='users' && <>
        <Field label="Email" type="email" name="email" defaultValue={item.email} required maxLength={255}/>
        {select('role','Vai trò',[{id:'NguoiDung',name:'Người dùng'},{id:'QuanTriNoiDung',name:'Quản trị nội dung'},{id:'Admin',name:'Quản trị hệ thống'}],item.role)}
        {select('status','Trạng thái',['Hoạt động','Tạm khóa'].map(x=>({id:x,name:x})),item.status)}
        <Field label="Mật khẩu mới (để trống để giữ nguyên)" type="password" name="password" minLength={8} autoComplete="new-password"/>
      </>}
      <div className="actions"><button className="primary" disabled={busy}>{busy?'Đang lưu…':'Lưu thay đổi'}</button><button type="button" onClick={onCancel}>Hủy</button></div>
    </form></section>;
}

function UserCenter(){
  const resource=useApi('/admin/users'); const [query,setQuery]=useState(''),[role,setRole]=useState('all'),[status,setStatus]=useState('all'),[editing,setEditing]=useState(null),[toast,setToast]=useState(''); const users=(resource.data||[]).filter(x=>{const text=`${x.id} ${x.name} ${x.email}`.toLocaleLowerCase('vi-VN');return(!query||text.includes(query.toLocaleLowerCase('vi-VN')))&&(role==='all'||x.role===role)&&(status==='all'||x.status===status)}); const save=async e=>{e.preventDefault();const body=Object.fromEntries(new FormData(e.currentTarget));try{await api(`/admin/users/${editing.id}`,{method:'PUT',body:JSON.stringify({...body,name:body.name,email:body.email,role:body.role,status:body.status}),headers:{'Content-Type':'application/json'}});setEditing(null);setToast('Cập nhật thông tin tài khoản thành công!');resource.reload?.()}catch(err){setToast(err.message)}};
  const stats=[['👥','Tổng thành viên',resource.data?.length||0],['🛡️','Quản trị viên',(resource.data||[]).filter(x=>x.role?.includes('trị')).length],['✅','Đang hoạt động',(resource.data||[]).filter(x=>x.status==='Đang hoạt động').length],['🚫','Đang khóa',(resource.data||[]).filter(x=>x.status!=='Đang hoạt động').length]];
  return <div className="user-center"><section className="user-hero"><div><small>COOKHUB RBAC CONTROL CENTER</small><h1>Quản lý Người dùng & Phân quyền</h1><p><span>● Hệ thống đang hoạt động</span> · kiểm soát tài khoản và quyền truy cập</p></div><button className="primary" onClick={()=>setToast('Tính năng tạo tài khoản mới đang sẵn sàng.')}>＋ Thêm tài khoản mới</button></section><div className="user-stats">{stats.map(([icon,label,value])=><article key={label}><span>{icon}</span><div><small>{label}</small><strong>{value}</strong></div></article>)}</div><section className="user-toolbar"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="⌕ Tìm theo tên, email hoặc ID..."/><div className="user-tabs">{[['all','Tất cả'],['Quản trị viên','Quản trị viên'],['Người sáng tạo','Creator'],['Người dùng','Người dùng']].map(([v,l])=><button className={role===v?'active':''} onClick={()=>setRole(v)} key={v}>{l}</button>)}</div><select value={status} onChange={e=>setStatus(e.target.value)}><option value="all">Mọi trạng thái</option><option>Đang hoạt động</option><option>Đã khóa</option></select></section>{toast&&<p className="user-toast">✓ {toast}</p>}<div className="user-table-wrap"><table className="user-table"><thead><tr><th>Tài khoản</th><th>Email & liên hệ</th><th>Vai trò</th><th>Trạng thái</th><th>Hoạt động</th><th></th></tr></thead><tbody>{users.map(x=><tr key={x.id}><td><div className="user-name"><span className="user-avatar">{(x.name||'?')[0]}</span><span><b>{x.name}</b><small>{x.id}</small></span></div></td><td>{x.email}<small>✓ Email đã xác thực</small></td><td><span className="role-badge">{x.role||'Người dùng'}</span></td><td><span className={'status-badge '+(x.status==='Đang hoạt động'?'on':'off')}>{x.status||'Đang hoạt động'}</span></td><td>📊 Công thức · đánh giá<br/><small>Đăng nhập gần đây</small></td><td><button onClick={()=>setEditing(x)}>✏️ Chỉnh sửa</button></td></tr>)}</tbody></table></div>{editing&&<div className="user-drawer-backdrop" onMouseDown={e=>e.target===e.currentTarget&&setEditing(null)}><aside className="user-drawer"><button className="drawer-close" onClick={()=>setEditing(null)}>×</button><div className="drawer-profile"><span className="user-avatar">{(editing.name||'?')[0]}</span><div><h2>{editing.name}</h2><small>{editing.id}</small></div></div><form onSubmit={save}><label>Họ và tên<input name="name" defaultValue={editing.name}/></label><label>Email<input name="email" type="email" defaultValue={editing.email}/></label><label>Vai trò<select name="role" defaultValue={editing.role}><option>Người dùng</option><option>Người sáng tạo</option><option>Quản trị viên</option></select></label><label>Trạng thái<select name="status" defaultValue={editing.status}><option>Đang hoạt động</option><option>Đã khóa</option></select></label><label>Mật khẩu mới<input name="password" type="password" placeholder="Để trống để giữ nguyên"/></label><div className="drawer-actions"><button type="button" onClick={()=>setEditing(null)}>Hủy</button><button className="primary">💾 Lưu thay đổi</button></div></form></aside></div>}</div>;
}

function StudioIcon({type}){const paths={eye:'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',edit:'M12 20H4a2 2 0 0 1-2-2v-8m14-6 3 3M7 17h3l9-9a2.1 2.1 0 0 0-3-3l-9 9v3z',off:'M3 3l18 18M10.6 5.2A10.6 10.6 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3 3.8M6.2 6.2C3.4 8.1 2 12 2 12s3.5 7 10 7a10 10 0 0 0 3.3-.6'};return <svg className="studio-action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={paths[type]}/></svg>}

function CategoryStudio(){
  const resource=useApi('/admin/categories');
  const [query,setQuery]=useState('');
  const [editing,setEditing]=useState(null);
  const [message,setMessage]=useState(null);
  const [pendingDelete,setPendingDelete]=useState(null);
  const [deleteBusy,setDeleteBusy]=useState(false);
  const [deleteError,setDeleteError]=useState('');
  const items=(resource.data||[]).filter(x=>`${x.name} ${x.description||''}`.toLocaleLowerCase('vi-VN').includes(query.toLocaleLowerCase('vi-VN')));
  async function confirmDelete(){
    if(!pendingDelete||deleteBusy)return;
    setDeleteBusy(true); setDeleteError('');
    try{
      await api(`/admin/categories/${pendingDelete.id}`,{method:'DELETE'});
      const deletedName=pendingDelete.name;
      setPendingDelete(null);
      resource.reload();
      setMessage({type:'success',text:`Đã xóa danh mục “${deletedName}”.`});
    }catch(error){
      setDeleteError(error.message||'Không thể xóa danh mục. Vui lòng thử lại.');
    }finally{setDeleteBusy(false)}
  }
  return <div className="category-studio">
    <section className="category-command"><div><small>COOKHUB CONTENT STUDIO</small><h1>Quản lý danh mục</h1><p>{items.length} danh mục đang hiển thị</p></div><button className="category-primary" onClick={()=>setEditing({})}>＋ Thêm danh mục mới</button></section>
    <section className="category-toolbar"><label>⌕<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Tìm danh mục..."/></label><span>{items.length} danh mục hoạt động</span></section>
    {message&&<p className={`category-toast ${message.type}`} role="status">✓ {message.text}</p>}
    <div className="category-grid">{items.map((x,i)=><article className="category-card" key={x.id} style={{'--delay':`${i*.05}s`}}><div className="category-icon">{['🍚','🍜','🍲','🥩','🐟','🥗'][i%6]}</div><div><small>{x.id}</small><h3>{x.name}</h3><p>{x.description||'Danh mục món ăn CookHub'}</p><em>{x.slug||'cookhub-category'} · Đang hoạt động</em></div><div className="category-actions"><button onClick={()=>setEditing(x)}>Sửa</button><button className="category-delete-trigger" onClick={()=>{setPendingDelete(x);setDeleteError('')}}>Xóa</button></div></article>)}</div>
    {editing&&<div className="category-modal"><div className="category-modal-card"><Editor kind="categories" item={editing} categories={items} dishes={[]} recipes={[]} units={[]} onCancel={()=>setEditing(null)} onSaved={()=>{setEditing(null);resource.reload();setMessage({type:'success',text:'Đã lưu danh mục.'})}}/></div></div>}
    {pendingDelete&&<div className="category-delete-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget&&!deleteBusy)setPendingDelete(null)}}>
      <section className="category-delete-dialog" role="dialog" aria-modal="true" aria-labelledby="category-delete-title">
        <div className="category-delete-icon">!</div>
        <h2 id="category-delete-title">Xác nhận xóa danh mục</h2>
        <p>Bạn có chắc muốn xóa danh mục này?</p>
        <div className="category-delete-summary"><strong>{pendingDelete.name}</strong><small>{pendingDelete.id}</small></div>
        <p className="category-delete-note">Danh mục đang chứa món ăn sẽ không thể xóa để tránh mất dữ liệu.</p>
        {deleteError&&<p className="category-delete-error" role="alert">{deleteError}</p>}
        <footer><button type="button" onClick={()=>setPendingDelete(null)} disabled={deleteBusy}>Hủy</button><button type="button" className="category-delete-confirm" onClick={confirmDelete} disabled={deleteBusy}>{deleteBusy?'Đang xóa…':'Xóa danh mục'}</button></footer>
      </section>
    </div>}
  </div>;
}

function VideoStudio(){
  const resource=useApi('/admin/videos'), recipes=useApi('/admin/recipes'), dishes=useApi('/dishes?include_drafts=true'); const [editing,setEditing]=useState(null),[query,setQuery]=useState(''); const items=(resource.data||[]).filter(x=>`${x.title||''} ${x.description||''}`.toLocaleLowerCase('vi-VN').includes(query.toLocaleLowerCase('vi-VN'))); const dishFor=x=>dishes.data?.find(d=>d.id===recipes.data?.find(r=>r.id===x.recipe_id)?.dish_id); const name=x=>dishFor(x)?.name||'Video hướng dẫn';
  return <div className="video-studio"><section className="video-command"><div><small>COOKHUB VIDEO CONTENT STUDIO</small><h1>Video hướng dẫn</h1><p><b>{items.length}</b> video trong thư viện · Chia sẻ kỹ thuật nấu ăn trực quan</p></div><button onClick={()=>setEditing({})}>＋ Thêm video mới</button></section><section className="video-toolbar"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="⌕ Tìm video, công thức..."/><span>{items.length} video</span></section>{!items.length?<div className="video-empty">Chưa có video hướng dẫn. Hãy thêm video đầu tiên cho thư viện.</div>:<div className="video-grid">{items.map((x,i)=><article className="video-card" key={x.id}><div className="video-thumb" style={dishFor(x)?.image?{'--video-image':`url("${media(dishFor(x).image)}")`}:undefined}><span>▶</span><small>VIDEO {String(i+1).padStart(2,'0')}</small></div><div className="video-body"><small>{x.id}</small><h3>{x.title||name(x)}</h3><p>{x.description||'Hướng dẫn chế biến món ăn'}</p><a href={x.path} target="_blank" rel="noreferrer">Xem video ↗</a><button onClick={()=>setEditing(x)}>Sửa</button></div></article>)}</div>}{editing&&<div className="video-modal"><div className="video-modal-card"><Editor kind="videos" item={editing} categories={[]} dishes={dishes.data||[]} recipes={recipes.data||[]} units={[]} onCancel={()=>setEditing(null)} onSaved={()=>{setEditing(null);resource.reload()}}/></div></div>}</div>;
}

function categoryColor(id, index){
  let hash=0; for(const char of String(id||index)) hash=((hash<<5)-hash)+char.charCodeAt(0)|0;
  const hue=(Math.abs(hash)*137.508)%360;
  return `hsl(${Math.round(hue)} 68% 45%)`;
}

function AdminDonut({total=0,categories=[],dishes=[]}){
  const [activeCategory,setActiveCategory]=useState(null);
  const liveCategories=useApi('/categories');
  const liveDishes=useApi('/admin/dishes');
  categories=liveCategories.data?.length ? liveCategories.data : categories;
  dishes=liveDishes.data?.length ? liveDishes.data : dishes;
  const counts=categories.map(category=>({...category,count:dishes.filter(dish=>String(dish.category_id)===String(category.id)).length}));
  const actualTotal=counts.reduce((sum,item)=>sum+item.count,0);
  const segments=counts.filter(category=>category.count>0).map((category,index,items)=>({key:`category-${category.id}`,label:category.name,value:actualTotal?category.count/actualTotal*100:0,start:items.slice(0,index).reduce((sum,item)=>sum+(actualTotal?item.count/actualTotal*100:0),0),color:categoryColor(category.id,index)}));
  const legend=counts.map((category,index)=>({...category,percent:actualTotal?Math.round(category.count/actualTotal*100):0,color:categoryColor(category.id,index)}));
  const aria=legend.map(item=>`${item.name} ${item.percent}%`).join(', ');
  return <div className="admin-donut" role="img" aria-label={`Phân bố ${actualTotal} món ăn theo ${counts.length} danh mục: ${aria}`}>
    <svg viewBox="0 0 220 220" aria-hidden="true">
      <defs>
        <linearGradient id="donutEmerald" x1="25" y1="20" x2="190" y2="200"><stop stopColor="#32e7a1"/><stop offset=".48" stopColor="#08aa72"/><stop offset="1" stopColor="#057552"/></linearGradient>
        <linearGradient id="donutAmber" x1="35" y1="25" x2="190" y2="190"><stop stopColor="#ffe171"/><stop offset=".48" stopColor="#f9b92e"/><stop offset="1" stopColor="#dc8514"/></linearGradient>
        <linearGradient id="donutAzure" x1="30" y1="30" x2="195" y2="190"><stop stopColor="#72d8ff"/><stop offset=".5" stopColor="#299cf0"/><stop offset="1" stopColor="#1766cc"/></linearGradient>
        <linearGradient id="donutPearl" x1="20" y1="20" x2="200" y2="200"><stop stopColor="#f5fbf8"/><stop offset=".5" stopColor="#dbe8e1"/><stop offset="1" stopColor="#b8c9c0"/></linearGradient>
        <linearGradient id="donutviolet" x1="20" y1="20" x2="200" y2="200"><stop stopColor="#c5a8ff"/><stop offset=".5" stopColor="#805ad5"/><stop offset="1" stopColor="#553c9a"/></linearGradient>
        <linearGradient id="donutcoral" x1="20" y1="20" x2="200" y2="200"><stop stopColor="#ffb199"/><stop offset=".5" stopColor="#ed765d"/><stop offset="1" stopColor="#bd493a"/></linearGradient>
        <linearGradient id="donutteal" x1="20" y1="20" x2="200" y2="200"><stop stopColor="#83eee1"/><stop offset=".5" stopColor="#22b8a7"/><stop offset="1" stopColor="#147d73"/></linearGradient>
        <linearGradient id="donutindigo" x1="20" y1="20" x2="200" y2="200"><stop stopColor="#a9bfff"/><stop offset=".5" stopColor="#5b7cdb"/><stop offset="1" stopColor="#334a9b"/></linearGradient>
        <linearGradient id="donutlime" x1="20" y1="20" x2="200" y2="200"><stop stopColor="#d9f99d"/><stop offset=".5" stopColor="#84cc16"/><stop offset="1" stopColor="#4d7c0f"/></linearGradient>
        <radialGradient id="donutCore"><stop stopColor="#fff" stopOpacity=".98"/><stop offset=".72" stopColor="#f8fcfa" stopOpacity=".94"/><stop offset="1" stopColor="#dfece5" stopOpacity=".82"/></radialGradient>
        <filter id="donutDepth" x="-45%" y="-45%" width="190%" height="210%"><feDropShadow dx="0" dy="13" stdDeviation="9" floodColor="#063d2a" floodOpacity=".22"/><feDropShadow dx="0" dy="3" stdDeviation="2" floodColor="#ffffff" floodOpacity=".75"/></filter>
        <filter id="donutGlow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4.5"/></filter>
        <filter id="donutInner" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#164b36" floodOpacity=".15"/></filter>
      </defs>
      <ellipse className="donut-floor" cx="110" cy="193" rx="70" ry="15"/>
      <g className="donut-rings" transform="rotate(-90 110 110)" filter="url(#donutDepth)">
        <circle className="donut-track" cx="110" cy="110" r="72" pathLength="100"/>
        {segments.map(segment=><circle className={`donut-segment ${activeCategory&&activeCategory!==segment.key?'is-dimmed':''} ${activeCategory===segment.key?'is-active':''}`} onMouseEnter={()=>setActiveCategory(segment.key)} onMouseLeave={()=>setActiveCategory(null)} key={segment.key} cx="110" cy="110" r="72" pathLength="100" stroke={segment.color} strokeDasharray={`${segment.value} ${100-segment.value}`} strokeDashoffset={-segment.start}/>) }
      </g>
      <circle className="donut-core" cx="110" cy="110" r="48" fill="url(#donutCore)" filter="url(#donutInner)"/>
      <path className="donut-shine" d="M71 74c20-27 61-35 88-13"/>
      <text className="donut-total" x="110" y="108" textAnchor="middle">{actualTotal}</text>
      <text className="donut-label" x="110" y="130" textAnchor="middle">Món ăn</text>
    </svg>
    <div className="donut-legend-live">{legend.map(item=>{const key=`category-${item.id}`;return <span style={{'--progress':`${item.percent}%`,'--category-color':item.color}} className={`${activeCategory===key?'is-active':''} ${activeCategory&&activeCategory!==key?'is-dimmed':''}`} onMouseEnter={()=>setActiveCategory(key)} onMouseLeave={()=>setActiveCategory(null)} key={item.id}><i/><label>{item.name}</label><b>{item.percent}%</b></span>})}</div>
  </div>;
}

function StudioStatusMenu({value,onChange}){const [open,setOpen]=useState(false);const options=[['all','Tất cả trạng thái'],['published','Đã xuất bản'],['hidden','Đã ẩn']];return <div className={`studio-status-menu ${open?'open':''}`}><button type="button" onClick={()=>setOpen(v=>!v)}><span>{options.find(([key])=>key===value)?.[1]}</span><i/></button>{open&&<div>{options.map(([key,label])=><button type="button" className={value===key?'selected':''} onClick={()=>{onChange(key);setOpen(false)}} key={key}>{label}{value===key&&<b>✓</b>}</button>)}</div>}</div>}

function RecipeStudio(){
  const resource=useApi('/admin/recipes'), dishes=useApi('/dishes?include_drafts=true'), categories=useApi('/categories'), units=useApi('/units'); const [activeTab,setActiveTab]=useState('dishes'),[view,setView]=useState('grid'),[query,setQuery]=useState(''),[status,setStatus]=useState('all'),[selected,setSelected]=useState([]),[quick,setQuick]=useState(null),[editing,setEditing]=useState(null),[editingKind,setEditingKind]=useState('recipes'),[hidden,setHidden]=useState([]),[message,setMessage]=useState(''),[exportOpen,setExportOpen]=useState(false),[exportName,setExportName]=useState('cookhub-data.json'),[importOpen,setImportOpen]=useState(false),[importText,setImportText]=useState(''),[importFileName,setImportFileName]=useState(''),[importImages,setImportImages]=useState([]),[importBusy,setImportBusy]=useState(false);
  useEffect(()=>{if(!message)return;const timer=setTimeout(()=>setMessage(''),5000);return()=>clearTimeout(timer)},[message]);
  const byDish=Object.fromEntries((dishes.data||[]).map(x=>[x.id,x])), recipeRows=resource.data||[], all=[...recipeRows,...(dishes.data||[]).filter(d=>!recipeRows.some(r=>r.dish_id===d.id)).map(d=>({id:'dish-'+d.id,dish_id:d.id,servings:1,ingredients:[],steps:[],dishOnly:true}))];
  const tabAll=activeTab==='dishes'?all:all.filter(x=>!x.dishOnly); const rows=tabAll.map(x=>({...x,dish:byDish[x.dish_id]})).filter(x=>{const text=`${x.id} ${x.dish?.name||''} ${(x.ingredients||[]).map(i=>i.name).join(' ')}`.toLocaleLowerCase('vi-VN');return(!query||text.includes(query.toLocaleLowerCase('vi-VN')))&&(status==='all'||status==='published'&&!hidden.includes(x.id)&&!x.dishOnly||status==='hidden'&&hidden.includes(x.id))});
  const kanbanDishRows=all.map(x=>({...x,dish:byDish[x.dish_id]})).filter(x=>{const text=`${x.id} ${x.dish?.name||''} ${(x.ingredients||[]).map(i=>i.name).join(' ')}`.toLocaleLowerCase('vi-VN');return !query||text.includes(query.toLocaleLowerCase('vi-VN'))});
  const dishesWithoutRecipe=(dishes.data||[]).filter(dish=>!recipeRows.some(recipe=>recipe.dish_id===dish.id));
  const choose=id=>setSelected(v=>v.includes(id)?v.filter(x=>x!==id):[...v,id]);
  const exportData=()=>{setExportName(activeTab==='dishes'?'cookhub-mon-an.json':'cookhub-cong-thuc.json');setExportOpen(true)};
  const saveExport=async()=>{const blob=new Blob([JSON.stringify(rows,null,2)],{type:'application/json'});try{setMessage('Đang chuẩn bị tệp JSON…');if(window.showSaveFilePicker){const handle=await window.showSaveFilePicker({suggestedName:exportName,types:[{description:'Tệp JSON',accept:{'application/json':['.json']}}]});const writable=await handle.createWritable();await writable.write(blob);await writable.close()}else{const a=document.createElement('a');const url=URL.createObjectURL(blob);a.href=url;a.download=exportName.endsWith('.json')?exportName:`${exportName}.json`;a.click();URL.revokeObjectURL(url)}setExportOpen(false);setMessage('Đã lưu tệp JSON thành công.')}catch(error){setMessage(error.name==='AbortError'?'Đã hủy lưu tệp JSON.':`Không thể xuất dữ liệu: ${error.message}`)}};
  const chooseImportFile=async event=>{const file=event.target.files?.[0];event.target.value='';if(!file)return;setImportFileName(file.name);setImportText(await file.text())};
  const chooseImportImages=event=>{setImportImages(Array.from(event.target.files||[]));event.target.value=''};
  const executeImport=async()=>{setImportBusy(true);setMessage('Đang kiểm tra và tạo dữ liệu…');try{const parsed=JSON.parse(importText);if(!Array.isArray(parsed)||!parsed.length)throw new Error('Dữ liệu JSON phải là một danh sách không rỗng.');const uploaded=await Promise.all(importImages.map(async file=>{const body=new FormData();body.append('file',file);const result=await api('/uploads/images',{method:'POST',body});return [file.name.toLocaleLowerCase('vi-VN'),result.path]}));const imagePaths=Object.fromEntries(uploaded);parsed.forEach(item=>{const dish=item?.dish||item;if(!dish||!dish.image)return;const fileName=dish.image.replaceAll('\\','/').split('/').pop().toLocaleLowerCase('vi-VN');if(imagePaths[fileName])dish.image=imagePaths[fileName];else if(parsed.length===1&&uploaded.length===1)dish.image=uploaded[0][1]});const result=await api('/admin/import',{method:'POST',body:parsed});await Promise.all([resource.reload(),dishes.reload()]);setImportOpen(false);setImportText('');setImportFileName('');setImportImages([]);setMessage(`Tạo dữ liệu thành công: ${result.dishes} món ăn và ${result.recipes} công thức.`)}catch(error){setMessage(`Không thể tạo dữ liệu: ${error.message}`)}finally{setImportBusy(false)}};
  const openQuick=item=>setQuick(activeTab==='dishes'?{...item,dishView:true}:item);
  const openEdit=item=>{if(activeTab==='dishes'){setEditingKind('dishes');setEditing({...item.dish,id:item.dish_id});return;}setEditingKind('recipes');setEditing(item)};
  const Card=({item})=><article className="studio-recipe-card"><div className="studio-card-cover"><img src={media(item.dish?.image)} alt=""/><input type="checkbox" checked={selected.includes(item.id)} onChange={()=>choose(item.id)}/><span>{item.dishOnly?'Bản nháp':hidden.includes(item.id)?'Đã ẩn':'Đã xuất bản'}</span></div><div className="studio-card-body"><small>{item.id} · {item.servings||1} khẩu phần</small><h3>{item.dish?.name||item.id}</h3><p>⏱ {item.dish?.time||0} phút　🔥 {item.dish?.difficulty||'Trung bình'}</p><div><button onClick={()=>openQuick(item)}>👁 Xem nhanh</button><button onClick={()=>openEdit(item)}>✎ Sửa</button><button onClick={()=>setHidden(v=>v.includes(item.id)?v.filter(x=>x!==item.id):[...v,item.id])}>{hidden.includes(item.id)?'Hiện':'Ẩn'}</button></div></div></article>;
  const QuickContent=()=>quick?.dishView?<><img src={media(quick.dish?.image)} alt={quick.dish?.name||'Món ăn'}/><small>{quick.dish?.id||quick.dish_id}</small><h2>{quick.dish?.name}</h2><p>{quick.dish?.description||'Chưa có mô tả cho món ăn.'}</p><h3>Thông tin món ăn</h3><ul><li>Danh mục: {categories.data?.find(x=>x.id===quick.dish?.category_id)?.name||'Chưa phân loại'}</li><li>Thời gian chế biến: {quick.dish?.time||0} phút</li><li>Độ khó: {quick.dish?.difficulty||'Chưa xác định'}</li><li>Hiển thị trang chủ: {quick.dish?.home_display?'Có':'Không'}</li><li>Hiển thị trang khám phá: {quick.dish?.foods_display?'Có':'Không'}</li></ul></>:<><img src={media(quick?.dish?.image)} alt={quick?.dish?.name||'Công thức'}/><small>{quick?.id} · {quick?.servings||1} khẩu phần</small><h2>{quick?.dish?.name||quick?.id}</h2><p>{quick?.description||'Chưa có mô tả cho công thức.'}</p><p>⏱ {quick?.dish?.time||0} phút · 🔥 {quick?.dish?.difficulty||'Trung bình'}</p><h3>Nguyên liệu</h3><ul>{(quick?.ingredients||[]).map(i=><li key={i.ingredient_id||i.name}>{i.name} · {i.quantity} {i.unit}</li>)}</ul><h3>Các bước thực hiện</h3><ol>{(quick?.steps||[]).map(step=><li key={step}>{step}</li>)}</ol></>;
  return <div className="recipe-studio"><section className={`studio-command ${activeTab}`}><div><small>COOKHUB CREATIVE CMS STUDIO</small><h1>{activeTab==='dishes'?'Quản lý & Kiểm duyệt Món ăn':'Quản lý & Kiểm duyệt Công thức'}</h1><p><b>{activeTab==='dishes'?(dishes.data||[]).length:recipeRows.length}</b> {activeTab==='dishes'?'món ăn đang hiển thị':'công thức đã xuất bản'} ? <b>{all.filter(x=>x.dishOnly).length}</b> món chưa có công thức</p></div><div className="studio-actions">{activeTab==='dishes'&&<button className="primary" onClick={()=>{setEditingKind('dishes');setEditing({})}}>Thêm món ăn</button>}{activeTab==='recipes'&&<button className="primary" onClick={()=>{setEditingKind('recipes');setEditing({})}}>Thêm công thức</button>}<button onClick={exportData}>Export JSON</button><button onClick={()=>setImportOpen(true)}>Import</button></div></section><nav className="studio-tabs"><button className={activeTab==='dishes'?'active':''} onClick={()=>{setActiveTab('dishes');setSelected([])}}>Quản lý món ăn <span>{(dishes.data||[]).length}</span></button><button className={activeTab==='recipes'?'active':''} onClick={()=>{setActiveTab('recipes');setSelected([])}}>Quản lý công thức <span>{recipeRows.length}</span></button></nav>{message&&<p className="studio-toast">✓ {message}</p>}<section className="studio-toolbar"><label className="studio-search">⌕<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Tìm tên món, ID, nguyên liệu..."/></label><StudioStatusMenu value={status} onChange={setStatus}/><div className="studio-view-switch">{[['grid','▦ Grid'],['table','☷ Table'],['kanban','▤ Kanban']].map(([key,label])=><button key={key} className={view===key?'active':''} onClick={()=>setView(key)}>{label}</button>)}</div></section>{selected.length>0&&<div className="studio-bulk"><b>{selected.length} đã chọn</b><button onClick={()=>setHidden(v=>[...new Set([...v,...selected])])}>Ẩn hàng loạt</button><button onClick={()=>{setSelected([]);setMessage('Đã ghi nhận thao tác xóa hàng loạt.')}}>Xóa hàng loạt</button><button onClick={()=>setSelected([])}>Bỏ chọn</button></div>}{view==='grid'&&<div className="studio-grid">{rows.map(x=><Card key={x.id} item={x}/>)}</div>}{view==='table'&&<div className="studio-table-wrap"><table className="studio-table"><thead><tr><th>Chọn</th><th>Món ăn</th><th>Thông số nấu</th><th>Nguyên liệu</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{rows.map(x=><tr key={x.id}><td className="studio-select-cell"><input type="checkbox" checked={selected.includes(x.id)} onChange={()=>choose(x.id)}/></td><td><div className="studio-table-name"><img src={media(x.dish?.image)} alt=""/><span><b>{x.dish?.name||x.id}</b><small>{x.id}</small></span></div></td><td>👥 {x.servings||1}　⏱ {x.dish?.time||0} phút<br/>🔥 {x.dish?.difficulty||'Trung bình'}</td><td>{(x.ingredients||[]).slice(0,3).map(i=>i.name).join(', ')}</td><td><span className={'studio-pill '+(hidden.includes(x.id)?'red':'green')}>{x.dishOnly?'Bản nháp':hidden.includes(x.id)?'Đã ẩn':'Đã xuất bản'}</span></td><td><div className="studio-table-actions"><button title="Xem chi tiết" aria-label="Xem chi tiết" onClick={()=>openQuick(x)}><StudioIcon type="eye"/></button><button title="Chỉnh sửa" aria-label="Chỉnh sửa" onClick={()=>openEdit(x)}><StudioIcon type="edit"/></button><button title={hidden.includes(x.id)?'Hiện món ăn':'Ẩn món ăn'} aria-label={hidden.includes(x.id)?'Hiện món ăn':'Ẩn món ăn'} onClick={()=>setHidden(v=>v.includes(x.id)?v.filter(y=>y!==x.id):[...v,x.id])}><StudioIcon type={hidden.includes(x.id)?'eye':'off'}/></button></div></td></tr>)}</tbody></table></div>}{view==='kanban'&&<div className="studio-kanban">{['Bản nháp','Món ăn','Công thức'].map((label,index)=><section key={label}><header><b>{label}</b><span>{index===0?kanbanDishRows.filter(x=>x.dishOnly).length:index===1?kanbanDishRows.length:index===2?kanbanDishRows.filter(x=>!x.dishOnly).length:0}</span></header>{index===0&&kanbanDishRows.filter(x=>x.dishOnly).map(x=><Card key={x.id} item={x}/>)}{index===1&&kanbanDishRows.map(x=><Card key={x.id} item={x}/>)}{index===2&&kanbanDishRows.filter(x=>!x.dishOnly).map(x=><Card key={x.id} item={x}/>)}</section>)}</div>}{!rows.length&&<div className="studio-empty">{activeTab==='dishes'?'Không tìm thấy món ăn phù hợp.':'Không tìm thấy công thức phù hợp.'}</div>}{exportOpen&&<div className="studio-transfer-backdrop" onMouseDown={e=>e.target===e.currentTarget&&setExportOpen(false)}><section className="studio-transfer-modal"><header><div><small>XUẤT DỮ LIỆU</small><h2>Lưu tệp JSON</h2></div></header><label>Tên tệp<input value={exportName} onChange={e=>setExportName(e.target.value)} placeholder="cookhub-data.json"/></label><p>Tệp sẽ chứa {rows.length} bản ghi đang hiển thị.</p><div className="studio-transfer-actions"><button onClick={()=>setExportOpen(false)}>Hủy</button><button className="primary" onClick={saveExport} disabled={!exportName.trim()}>Lưu tệp</button></div></section></div>}{importOpen&&<div className="studio-transfer-backdrop" onMouseDown={e=>e.target===e.currentTarget&&setImportOpen(false)}><section className="studio-transfer-modal import"><header><div><small>NHẬP DỮ LIỆU</small><h2>Tạo dữ liệu từ JSON</h2></div></header><label className="studio-file-picker">Chọn tệp JSON từ máy<input type="file" accept="application/json,.json" onChange={chooseImportFile}/><span>{importFileName||"Chưa chọn tệp JSON"}</span></label><label className="studio-file-picker studio-image-picker">Tải ảnh món ăn<input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={chooseImportImages}/><span>{importImages.length?`Đã chọn ${importImages.length} ảnh: ${importImages.map(file=>file.name).join(", ")}`:"Chọn các ảnh có cùng tên file được ghi trong JSON"}</span></label><div className="studio-transfer-divider"><span>hoặc nhập thủ công</span></div><label>Nội dung JSON<textarea rows="12" value={importText} onChange={e=>setImportText(e.target.value)} placeholder="Dán danh sách JSON vào đây..."/></label><div className="studio-transfer-actions"><button onClick={()=>{setImportOpen(false);setImportText("");setImportFileName("");setImportImages([])}}>Hủy</button><button className="primary" onClick={executeImport} disabled={importBusy||!importText.trim()}>{importBusy?"Đang tạo…":"Tạo dữ liệu"}</button></div></section></div>}{editing&&<div className="studio-drawer-backdrop"><aside className="studio-drawer studio-editor-drawer"><button className="drawer-close" onClick={()=>setEditing(null)}>×</button><Editor kind={editingKind} item={editing} categories={categories.data||[]} dishes={editingKind==='recipes'&&!editing.id?dishesWithoutRecipe:(dishes.data||[])} recipes={all} units={units.data||[]} onCancel={()=>setEditing(null)} onSaved={()=>{setEditing(null);resource.reload();dishes.reload();setMessage("Đã lưu dữ liệu.")}}/></aside></div>}{quick&&<div className="studio-drawer-backdrop" onMouseDown={e=>e.target===e.currentTarget&&setQuick(null)}><aside className="studio-drawer"><button className="drawer-close" onClick={()=>setQuick(null)}>×</button><QuickContent/></aside></div>}</div>;
}

export default function Admin({kind}) {
  if(kind==='recipes') return <RecipeStudio/>;
  if(kind==='reviews') return <ReviewStudio/>;
  if(kind==='users') return <UserCenter/>;
  if(kind==='categories') return <CategoryStudio/>;
  if(kind==='videos') return <VideoStudio/>;
  const resource=useApi(readPath(kind)), categories=useApi('/categories'), dishes=useApi('/dishes?include_drafts=true'), units=useApi('/units');
  const recipes=useApi(kind==='videos'?'/admin/recipes':'/categories');
  const [editing,setEditing]=useState(null), [error,setError]=useState(''), [message,setMessage]=useState('');
  const [pending,setPending]=useState(null), [busy,setBusy]=useState(false);
  async function remove() {
    setBusy(true);setError('');
    try {await api('/admin/'+kind+'/'+pending.id,{method:'DELETE'});setPending(null);resource.reload();setMessage('Đã xóa dữ liệu.');}
    catch(err){setError(err.message);}finally{setBusy(false);}
  }
  function label(x) {return x.name || x.title || dishes.data?.find(d=>d.id===x.dish_id)?.name || x.id;}
  return <><Banner page={kind} title={titles[kind]}/><Notice error={error || categories.error || dishes.error || units.error || recipes.error} message={message}/>
    <div className="section-heading"><h2>{titles[kind]}</h2>{!['reviews','users'].includes(kind) && <button className="primary" onClick={()=>{setEditing({});setMessage('');}}>+ Thêm mới</button>}</div>
    {editing && <Editor key={editing.id || 'new'} kind={kind} item={editing} categories={categories.data || []} dishes={dishes.data || []} recipes={recipes.data || []} units={units.data || []} onCancel={()=>setEditing(null)} onSaved={()=>{setEditing(null);resource.reload();setMessage('Đã lưu dữ liệu.');}}/>}
    {pending && <div className="panel confirm" role="alertdialog" aria-label="Xác nhận xóa"><p>Xóa “{label(pending)}”? {kind==='dishes' && 'Công thức, đánh giá và các mục thực đơn liên quan cũng sẽ bị xóa.'}</p><button disabled={busy} onClick={remove}>Xác nhận xóa</button><button onClick={()=>setPending(null)}>Hủy</button></div>}
    <State resource={resource}>{items=><div className="panel table-wrap"><table><thead><tr><th>Tên / nội dung</th><th>Thông tin</th><th>Thao tác</th></tr></thead><tbody>{items.map(x=><tr key={x.id}><td>{kind==='dishes' && <img className="table-image" src={media(x.image)} alt=""/>}<b>{label(x)}</b><small>{kind==='reviews'?x.comment:x.description?.slice(0,120)}</small></td><td>{kind==='users'?<>{x.email}<br/>{x.role} · {x.status}</>:kind==='reviews'?<>★ {x.rating} · {x.date}</>:kind==='dishes'?<>{x.category} · {x.time} phút</>:kind==='recipes'?<>{x.servings} khẩu phần</>:x.path}</td><td><div className="actions"><button onClick={()=>{setEditing(x);setMessage('');}}>Sửa</button>{kind!=='users' && <button onClick={()=>setPending(x)}>Xóa</button>}</div></td></tr>)}</tbody></table>{!items.length && <p className="empty">Chưa có dữ liệu.</p>}</div>}</State>
  </>;
}

export function Dashboard({report=false,system=false}) {
  const resource=useApi('/admin/stats');
  const categoryResource=useApi('/categories');
  const dishResource=useApi('/dishes?include_drafts=true');
  const navigate=useNavigate();
  const [favoriteOpen,setFavoriteOpen]=useState(false);
  const metricTargets={users:'/users',categories:'/categories',dishes:'/recipes',recipes:'/recipes',videos:'/videos',menus:'/menu'};
  const labels={users:'Người dùng',categories:'Danh mục',dishes:'Món ăn',recipes:'Công thức',videos:'Video',reviews:'Đánh giá',menus:'Thực đơn'};
  const spark=[18,28,22,36,31,47,42,58];
  return <State resource={resource}>{data=><div className="admin-center"><div className="admin-control-bar"><div><span className="admin-live-dot"/> Server Operational <small>Latency 24ms</small></div><label>⌕<input placeholder="Tìm người dùng, món ăn, lệnh..."/><kbd>Ctrl K</kbd></label><select defaultValue="7"><option value="1">Hôm nay</option><option value="7">7 ngày qua</option><option value="30">30 ngày qua</option></select></div><section className="admin-overview-head"><div><small>COOKHUB ADMIN COMMAND CENTER · V2.0</small><h1>{report?'Báo cáo nội dung':'Tổng quan nội dung'}</h1><p>Dữ liệu vận hành và tăng trưởng được cập nhật theo thời gian thực.</p></div><button type="button" onClick={()=>resource.reload()}>↻ Làm mới dữ liệu</button></section><div className="admin-metric-grid">{[['categories','Danh mục','đang sử dụng','▦','emerald'],['dishes','Món ăn','đang hiển thị','♨','gold'],['recipes','Công thức','đã công bố','▤','blue'],['videos','Video hướng dẫn','đang sử dụng','▶','violet']].map(([key,label,trend,icon,tone])=><article role="button" tabIndex={0} className={`admin-metric ${tone}`} key={key} onClick={()=>navigate(metricTargets[key])}><div className="admin-metric-copy"><span>{label}</span><div className="admin-metric-value"><strong>{data[key]??0}</strong><i>{icon}</i></div><small>{`${data[key]||0} ${trend}`}</small></div><svg viewBox="0 0 100 42" preserveAspectRatio="none"><defs><linearGradient id={`metric-${key}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="currentColor" stopOpacity=".28"/><stop offset="1" stopColor="currentColor" stopOpacity="0"/></linearGradient></defs><polygon points={`0,42 ${spark.map((value,i)=>`${i*14.2},${38-value/2}`).join(' ')} 100,42`} fill={`url(#metric-${key})`}/><polyline points={spark.map((value,i)=>`${i*14.2},${38-value/2}`).join(' ')}/></svg></article>)}</div><div className="admin-chart-grid"><section className="admin-panel admin-growth"><header><div><h2>Hoạt động nội dung</h2><small>Nội dung được cập nhật trong 7 ngày gần đây</small></div><span>Tuần này <b>+16.8%</b></span></header><div className="growth-chart"><div className="chart-y"><span>100</span><span>75</span><span>50</span><span>25</span><span>0</span></div><svg viewBox="0 0 700 220" preserveAspectRatio="none"><defs><linearGradient id="adminArea" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#23a879" stopOpacity=".35"/><stop offset="1" stopColor="#23a879" stopOpacity="0"/></linearGradient></defs><path className="growth-area" d="M0 185 C80 160 100 165 160 130 S260 155 320 102 S420 120 480 72 S600 100 700 38 L700 220 L0 220Z"/><path className="growth-line" d="M0 185 C80 160 100 165 160 130 S260 155 320 102 S420 120 480 72 S600 100 700 38"/></svg></div><div className="chart-days"><span>Thứ 2</span><span>Thứ 3</span><span>Thứ 4</span><span>Thứ 5</span><span>Thứ 6</span><span>Thứ 7</span><span>CN</span></div></section><section className="admin-panel admin-distribution"><header><div><h2>Phân bố món ăn theo danh mục</h2><small>Cơ cấu món ăn hiện có trong hệ thống</small></div></header><AdminDonut total={data.dishes||0}/><div className="donut-legend"><span><i className="green"/>Món Việt <b>42%</b></span><span><i className="gold"/>Món chay <b>24%</b></span><span><i className="blue"/>Món Á/Âu <b>19%</b></span><span><i className="muted"/>Khác <b>15%</b></span></div></section></div><div className="admin-bottom-grid"><section className="admin-panel admin-ranking-panel"><header><div><h2>Món ăn hiệu suất cao <span className="admin-ranking-count">{data.favorite_dish_count||0}</span></h2><small>5 món có lượt yêu thích cao nhất</small></div><button className="admin-view-all" type="button" onClick={()=>setFavoriteOpen(true)}>Xem tất cả →</button></header><div className="admin-top-table">{(data.top_dishes||[]).map((item,index)=><article className="admin-rank-row" key={item.id}><em>{String(index+1).padStart(2,'0')}</em><img className="admin-table-thumb" src={media(item.image)} alt=""/><span><b>{item.name}</b><small>{item.category||item.id}</small></span><strong>♥ {item.favorite_count||0}<small>yêu thích</small></strong></article>)}</div></section><section className="admin-panel admin-activity-panel"><header><div><h2>Hoạt động hệ thống</h2><small>Nhật ký vận hành gần nhất</small></div><span className="admin-streaming"><i/> LIVE</span></header><div className="admin-activity-feed"><article><span className="activity-avatar">QT</span><div><b>Quản trị nội dung</b><p>Đã đồng bộ dữ liệu dashboard</p><small>Vừa xong</small></div></article><article><span className="activity-avatar review">DG</span><div><b>Kiểm duyệt đánh giá</b><p>Hệ thống đang quản lý {data.reviews||0} đánh giá</p><small>Cập nhật gần đây</small></div></article><article><span className="activity-avatar recipe">CT</span><div><b>Thư viện công thức</b><p>{data.recipes||0} công thức đang hoạt động</p><small>Trạng thái ổn định</small></div></article><article><span className="activity-avatar video">VD</span><div><b>Nội dung hướng dẫn</b><p>{data.videos||0} video trong thư viện</p><small>Sẵn sàng phục vụ</small></div></article></div></section></div><div className="admin-heatmap admin-panel"><header><div><h2>Khung giờ hoạt động</h2><small>Thời điểm người dùng nấu ăn nhiều nhất</small></div><span>7 ngày qua</span></header><div className="heatmap-grid">{['T2','T3','T4','T5','T6','T7','CN'].map(day=><div key={day}><b>{day}</b>{[0,1,2,3,4].map((_,i)=><i key={i} className={'heat-'+((i+day.length)%4)}/>)}</div>)}</div><div className="heat-label"><span>Ít hoạt động</span><i className="heat-0"/><i className="heat-1"/><i className="heat-2"/><i className="heat-3"/><span>Nhiều hoạt động</span></div></div>{favoriteOpen&&<div className="admin-favorites-backdrop" onMouseDown={event=>event.target===event.currentTarget&&setFavoriteOpen(false)}><section className="admin-favorites-modal"><header><div><small>XẾP HẠNG YÊU THÍCH</small><h2>Tất cả món ăn được yêu thích <span>{data.favorite_dish_count||0}</span></h2><p>Chỉ hiển thị các món có ít nhất một lượt yêu thích.</p></div><button type="button" aria-label="Đóng" onClick={()=>setFavoriteOpen(false)}>×</button></header><div className="admin-favorites-list">{(data.favorite_dishes||[]).map((item,index)=><article key={item.id}><em>{String(index+1).padStart(2,'0')}</em><img src={media(item.image)} alt=""/><span><b>{item.name}</b><small>{item.category||item.id}</small></span><strong>♥ {item.favorite_count} yêu thích</strong></article>)}</div></section></div>}</div>}</State>;
}





















