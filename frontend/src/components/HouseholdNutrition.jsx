import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './household-nutrition.css';

const format = value => Number(value || 0).toLocaleString('vi-VN', { maximumFractionDigits: 1 });
const fields = [['nang_luong','Năng lượng','kcal'],['chat_dam','Protein','g'],['chat_bot_duong','Carbs','g'],['chat_beo','Chất béo','g'],['chat_xo','Chất xơ','g'],['natri','Natri','mg']];
const goalLabels = { maintain:'Duy trì', lose:'Giảm cân', gain:'Tăng cân' };
export function memberPayload(member) {
  const { id,name,sex,age,height,weight,activity,goal }=member;
  return {id,name,sex,age:Number(age),height:height ? Number(height) : null,weight:weight ? Number(weight) : null,activity,goal:Number(age)<18?'maintain':goal};
}
export function householdPayload(model, changes={}) {
  return {revision:model.revision,members:model.members.map(memberPayload),active_ids:model.active_ids,portions:model.portions,...changes};
}

export function HouseholdDialog({title,children,onClose}) {
  const ref=useRef(null);
  useEffect(()=>{
    const previous=document.activeElement;
    const overflow=document.body.style.overflow;
    document.body.style.overflow='hidden';
    ref.current?.querySelector('button,input,select')?.focus();
    return()=>{ document.body.style.overflow=overflow; previous?.focus?.(); };
  },[]);
  function keyDown(event) {
    if(event.key==='Escape'){event.preventDefault();onClose();}
    if(event.key!=='Tab')return;
    const items=[...ref.current.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),a[href]')];
    const first=items[0],last=items[items.length-1];
    if(event.shiftKey && document.activeElement===first){event.preventDefault();last?.focus();}
    else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first?.focus();}
  }
  return createPortal(<div className="household-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}><section ref={ref} className="household-dialog" role="dialog" aria-modal="true" aria-label={title} onKeyDown={keyDown}><header><div><small>COOKHUB · CÙNG ĂN, CÙNG KHỎE</small><h2>{title}</h2></div><button type="button" className="household-close" aria-label="Đóng hộp thoại" onClick={onClose}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></header>{children}</section></div>,document.body);
}

function MembersEditor({model,onSave,onClose}) {
  const [members,setMembers]=useState(model.members.map(memberPayload));
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const update=(id,key,value)=>setMembers(previous=>previous.map(m=>m.id===id?{...m,[key]:value,...(key==='age'&&Number(value)<18?{goal:'maintain'}:{})}:m));
  async function save(event) {
    event.preventDefault();setBusy(true);setError('');
    try{
      const oldIds=new Set(model.members.map(m=>m.id));
      const active=members.filter(m=>model.active_ids.includes(m.id)||!oldIds.has(m.id)).map(m=>m.id);
      const same=active.length===model.active_ids.length&&active.every(id=>model.active_ids.includes(id));
      await onSave(householdPayload(model,{members:members.map(memberPayload),active_ids:active,portions:same?model.portions:{}}));
      onClose();
    }catch(e){setError(e.message);}finally{setBusy(false);}
  }
  return <HouseholdDialog title="Thành viên cùng ăn" onClose={()=>{if(!busy)onClose();}}><form onSubmit={save}>
    <p className="household-help">Lưu hồ sơ một lần, chọn người cùng ăn cho từng ngày. Thông tin chỉ nằm trong tài khoản của bạn.</p>
    <div className="household-edit-list">{members.map((m,index)=><fieldset key={m.id}><legend><span>{index+1}</span> {m.name||'Thành viên mới'}</legend><div className="household-form-grid">
      <label className="household-name">Tên thành viên<input required maxLength={60} value={m.name} onChange={e=>update(m.id,'name',e.target.value)}/></label>
      <label>Giới tính<select value={m.sex} onChange={e=>update(m.id,'sex',e.target.value)}><option value="female">Nữ</option><option value="male">Nam</option></select></label>
      <label>Tuổi<input type="number" min="1" max="100" required value={m.age} onChange={e=>update(m.id,'age',e.target.value)}/></label>
      <label>Chiều cao (cm)<input type="number" min="50" max="250" step="0.1" value={m.height??''} onChange={e=>update(m.id,'height',e.target.value)} placeholder="Chưa nhập"/></label>
      <label>Cân nặng (kg)<input type="number" min="5" max="350" step="0.1" value={m.weight??''} onChange={e=>update(m.id,'weight',e.target.value)} placeholder="Chưa nhập"/></label>
      <label>Mức vận động<select value={m.activity} onChange={e=>update(m.id,'activity',e.target.value)}><option value="1.4">Ít vận động · 1,4</option><option value="1.6">Nhẹ · 1,6</option><option value="1.8">Vừa · 1,8</option><option value="2.0">Nhiều · 2,0</option></select></label>
      <label>Mục tiêu<select value={m.goal} onChange={e=>update(m.id,'goal',e.target.value)} disabled={Number(m.age)<18}>{Object.entries(goalLabels).map(([key,label])=><option value={key} key={key}>{label}</option>)}</select></label>
    </div>{Number(m.age)<18&&<p className="household-note">Trẻ dưới 18 tuổi: theo dõi lượng ăn; cần mục tiêu theo tuổi và tăng trưởng do chuyên gia hướng dẫn.</p>}
    <button type="button" className="household-remove" onClick={()=>setMembers(members.filter(x=>x.id!==m.id))}>Xóa thành viên</button></fieldset>)}</div>
    {!members.length&&<div className="household-empty">Thêm người đầu tiên để bắt đầu theo dõi riêng.</div>}
    <button type="button" className="household-add" disabled={members.length>=20||busy} onClick={()=>setMembers([...members,{id:crypto.randomUUID(),name:'',sex:'female',age:30,height:null,weight:null,activity:'1.4',goal:'maintain'}])}>＋ Thêm thành viên</button>
    {error&&<p role="alert" className="error">{error}</p>}
    <footer><button type="button" disabled={busy} onClick={onClose}>Hủy</button><button className="primary" disabled={busy}>{busy?'Đang lưu…':'Lưu thành viên'}</button></footer>
  </form></HouseholdDialog>;
}

export function PortionEditor({item,name,model,onSave,onClose}) {
  const members=model.members.filter(m=>model.active_ids.includes(m.id));
  const [shares,setShares]=useState(()=>Object.fromEntries(members.map(m=>[m.id,model.portions[item.id]?.[m.id]??Number(item.servings||1)/members.length])));
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const total=Object.values(shares).reduce((sum,n)=>sum+Number(n||0),0),expected=Number(item.servings||1);
  async function save(e){e.preventDefault();setBusy(true);setError('');try{await onSave(householdPayload(model,{portions:{...model.portions,[item.id]:Object.fromEntries(Object.entries(shares).map(([k,v])=>[k,Number(v)]))}}));onClose();}catch(e){setError(e.message);}finally{setBusy(false);}}
  return <HouseholdDialog title="Chia khẩu phần" onClose={()=>{if(!busy)onClose();}}><form onSubmit={save}><p className="household-help"><strong>{name}</strong><br/>Món có {format(expected)} phần. Nhập số phần từng người ăn; tổng phải bằng số phần của món.</p>
    {members.length?members.map(m=><label key={m.id} className="portion-line"><span><b>{m.name}</b><small>{m.age} tuổi</small></span><input aria-label={'Khẩu phần của '+m.name} type="number" min="0" max={expected} step="any" required value={shares[m.id]} onChange={e=>setShares({...shares,[m.id]:e.target.value})}/><span>phần</span></label>):<p>Hãy chọn thành viên cùng ăn trước.</p>}
    <p className={'portion-sum '+(Math.abs(total-expected)>.001?'invalid':'')}>Đã chia {format(total)} / {format(expected)} phần{Math.abs(total-expected)>.001&&<small className="portion-sum-note">Lưu ý: Tổng khẩu phần phải bằng {format(expected)} phần của món. Bạn có thể điều chỉnh lại hoặc bấm “Chia đều cho mọi người”.</small>}</p>
    <button type="button" className="household-text-button" onClick={()=>setShares(Object.fromEntries(members.map(m=>[m.id,expected/members.length])))}>Chia đều cho mọi người</button>
    {error&&<p role="alert" className="error">{error}</p>}<footer><button type="button" disabled={busy} onClick={onClose}>Hủy</button><button className="primary" disabled={busy||!members.length||Math.abs(total-expected)>.001}>{busy?'Đang lưu…':'Lưu khẩu phần'}</button></footer></form></HouseholdDialog>;
}

export default function HouseholdNutrition({day,nutrition,household,onSave,diners,onDinersChange,busy}) {
  const [selected,setSelected]=useState('group'),[manage,setManage]=useState(false),[error,setError]=useState('');
  const model=household.data?.date===day?household.data:null;
  const result=nutrition.data?.date===day?nutrition.data:null;
  const active=model?.members.filter(m=>model.active_ids.includes(m.id))||[];
  const raw=result?.household;
  const ready=raw?.revision===model?.revision;
  const person=active.find(m=>m.id===selected);
  const personNutrition=ready?raw?.members.find(m=>m.id===selected):null;
  const view=person?'person':active.length?'group':'average';
  const totals=view==='person'?personNutrition?.totals:view==='group'?result?.totals:diners&&result?.totals?Object.fromEntries(fields.map(([k])=>[k,result.totals[k]/Number(diners)])):null;
  const goals=view==='person'?person?.goals:view==='group'&&ready?raw?.group_goals:null;
  const energy=totals?.nang_luong,target=goals?.nang_luong;
  const percent=target&&energy!=null?Math.round(energy/target*100):null;
  useEffect(()=>{if(selected!=='group'&&!active.some(m=>m.id===selected))setSelected('group');},[day,model?.revision]);
  async function save(payload){setError('');try{await onSave(payload);}catch(e){setError(e.message);throw e;}}
  async function choose(id){const ids=model.active_ids.includes(id)?model.active_ids.filter(x=>x!==id):[...model.active_ids,id];try{await save(householdPayload(model,{active_ids:ids,portions:{}}));}catch{}}
  return <section className="household-nutrition" id="nutrition-detail" aria-label="Dinh dưỡng theo thành viên">
    <header className="household-card-heading"><div><small>ĂN CÙNG NHAU · HIỂU RIÊNG MÌNH</small><h3>Dinh dưỡng hôm nay</h3><p>{new Intl.DateTimeFormat('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(day+'T12:00:00'))}</p></div><span className="household-header-icon" aria-hidden="true"><svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5.2a3 3 0 0 1 0 5.6M21 20v-2a6 6 0 0 0-4-5.65"/></svg></span></header>
    <div className="household-section"><div className="household-section-title"><h4>Thành viên cùng ăn</h4><button type="button" disabled={!model||busy} onClick={()=>setManage(true)}>Quản lý ↗</button></div>
      {household.loading&&!model?<p role="status">Đang tải thành viên…</p>:model?.members.length?<div className="household-chips">{model.members.map((m,i)=><label key={m.id} className={model.active_ids.includes(m.id)?'selected':''}><input type="checkbox" checked={model.active_ids.includes(m.id)} disabled={busy} onChange={()=>choose(m.id)}/><span className={'household-avatar tone-'+i%4}>{m.name.slice(0,1).toUpperCase()}</span><span>{m.name}</span></label>)}</div>:<div className="household-empty"><span aria-hidden="true">＋</span><p>Mỗi người một khẩu phần,<br/>cùng nhau ăn đủ chất.</p><button disabled={!model} onClick={()=>setManage(true)}>Thêm thành viên đầu tiên</button></div>}
      {!active.length&&<label className="household-view-label">Chia đều nhanh<select aria-label="Số người cùng ăn" value={diners} onChange={e=>onDinersChange(Number(e.target.value)||'')}><option value="">Chọn số người</option>{Array.from({length:20},(_,i)=>i+1).map(n=><option key={n} value={n}>{n} người</option>)}</select></label>}
      {active.length>0&&<label className="household-view-label">Xem dinh dưỡng<select value={person?person.id:'group'} onChange={e=>setSelected(e.target.value)}><option value="group">Cả nhóm · {active.length} người</option>{active.map(m=><option key={m.id} value={m.id}>{m.name} · {m.age} tuổi</option>)}</select></label>}
    </div>
    {(error||household.error||nutrition.error)&&<div role="alert" className="household-note warning">{error||household.error||nutrition.error}<button type="button" onClick={()=>{household.reload();nutrition.reload();}}>Thử tải lại</button></div>}
    {person&&<div className="household-section household-goal"><div className="household-section-title"><h4>Mục tiêu của {person.name}</h4><button onClick={()=>setManage(true)}>Chỉnh hồ sơ</button></div><div className="household-goal-tabs">{Object.entries(goalLabels).map(([key,label])=><button type="button" key={key} className={person.goal===key?'active':''} disabled={busy||person.age<18} onClick={()=>{save(householdPayload(model,{members:model.members.map(m=>memberPayload(m.id===person.id?{...m,goal:key}:m))})).catch(()=>{});}}>{label}</button>)}</div><p className="household-goal-note">{person.goals?<><b>{format(person.goals.nang_luong)} kcal</b> / ngày · Ước tính cá nhân</>:person.goal_note}</p></div>}
    <div className="household-section household-progress-section"><div className="household-section-title"><h4>{view==='group'?'Tổng dinh dưỡng cả nhóm':view==='person'?'Khẩu phần của '+person.name:'Trung bình mỗi người'}</h4><span className="household-estimate">Ước tính</span></div>
      {(nutrition.loading||active.length>0&&!ready)&&<p role="status">Đang cập nhật dinh dưỡng…</p>}
      <div className={'household-energy '+(percent>110?'over':'')}><div className="household-ring" style={{'--progress':Math.min(100,percent||0)+'%'}}><b>{percent==null?'—':percent+'%'}</b></div><div><strong>{energy==null?'—':format(energy)} <small>kcal</small></strong><p>{target?'trên '+format(target)+' kcal mục tiêu':view==='average'?'Chia đều, chưa có mục tiêu cá nhân':'Chưa đủ hồ sơ để tính mục tiêu'}</p>{energy!=null&&target&&<span className="household-energy-difference">{energy>target?'Vượt khoảng '+format(energy-target):'Còn khoảng '+format(target-energy)} kcal</span>}</div></div>
      <div className="household-macro-list">{fields.slice(1,4).map(([key,label,unit])=><div className={'household-macro '+key} key={key}><div><span>{label}</span><b>{totals?format(totals[key]):'—'} <small>{unit}{goals?' / '+format(goals[key])+' '+unit:''}</small></b></div><div className="household-track"><i style={{width:goals&&totals?Math.min(100,totals[key]/goals[key]*100)+'%':'0%'}}/></div></div>)}</div>
      {view==='group'&&active.some(m=>!m.goals)&&<p className="household-note">Chưa so sánh mục tiêu cả nhóm vì có thành viên chưa đủ hồ sơ hoặc cần mục tiêu riêng theo độ tuổi.</p>}
      <div className="household-macro-list household-extra-macros">{fields.slice(4).map(([key,label,unit])=><div className={'household-macro '+key} key={key}><div><span>{label}</span><b>{totals?format(totals[key]):'—'} <small>{unit}{goals?' / '+format(goals[key])+' '+unit:''}</small></b></div><div className="household-track"><i style={{width:goals&&totals?Math.min(100,totals[key]/goals[key]*100)+'%':'0%'}}/></div></div>)}</div>
    </div>
    {manage&&model&&<MembersEditor model={model} onSave={save} onClose={()=>setManage(false)}/>}
  </section>;
}
