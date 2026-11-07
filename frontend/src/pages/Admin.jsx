import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, media } from '../api';
import { useApi } from '../hooks';
import { Banner, State, Field, Notice } from '../components/Common';
import '../admin.css';
import '../recipe-studio.css';
import '../user-center.css';
import '../category-studio.css';
import '../category-theme.css';
import '../video-studio.css';
import '../admin-content-theme.css';
import '../admin-distribution-compact.css';
import ReviewStudio from './ReviewStudio';

const titles={categories:'Quản lý danh mục',dishes:'Quản lý món ăn',recipes:'Quản lý công thức',videos:'Quản lý video',reviews:'Quản lý đánh giá',users:'Người dùng & phân quyền'};
const readPath=kind => ['categories','dishes'].includes(kind) ? '/'+kind : '/admin/'+kind;
const splitStepTitle = value => { const text=String(value||'').trim(); const match=text.match(/^~\s*(.*?)\s*~\s*(?:\r?\n)?([\s\S]*)$/); return match ? {title:match[1].trim(),text:match[2].trim()} : {title:'',text}; };

function RecipeLookupMenu({row, catalog, onChoose, onNameChange, label = "nguyên liệu"}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const custom = row.customIngredient || (!row.ingredient_id && !!row.name);
  const normalize = value => value.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replaceAll('đ', 'd');
  const matches = (catalog.data || []).filter(item =>
    normalize(`${item.name} ${item.searchName || ''} ${item.id}`).includes(normalize(query.trim()))
  );
  const close = () => { setOpen(false); setQuery(''); };
  const choose = (event, item) => {
    const input = event.currentTarget.closest('.recipe-ingredient-menu').querySelector('input');
    input.focus();
    onChoose(item, item ? '' : query.trim());
    close();
  };

  return (
    <div className="recipe-ingredient-menu"
      onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) close(); }}
      onKeyDown={event => {
        if (event.key === 'Escape' && open) {
          event.stopPropagation();
          event.currentTarget.querySelector('input').focus();
          close();
        }
      }}>
      <div className="recipe-ingredient-control">
        <input
          aria-label={custom ? `Tên ${label} mới` : `Tìm ${label}`}
          placeholder={custom ? `Nhập ${label} mới` : label === 'đơn vị' ? 'Tìm đơn vị…' : 'Tìm tên hoặc mã…'}
          value={custom ? row.name : open ? query : row.name.split('\n')[0]}
          onFocus={() => { if (!custom) setOpen(true); }}
          onChange={event => {
            if (custom) onNameChange(event.target.value);
            else { setQuery(event.target.value); setOpen(true); }
          }}
        />
        <button type="button" aria-label={custom ? `Quay lại tìm ${label}` : `Mở danh sách ${label}`} aria-expanded={open&&!custom}
          onClick={event => {
            if (open && !custom) { close(); return; }
            if (custom) onChoose(undefined, '');
            event.currentTarget.parentElement.querySelector('input').focus();
            setOpen(true);
          }}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg></button>
      </div>
      {open&&!custom&&<div className="recipe-ingredient-options">
        <div className="recipe-ingredient-results">
          {matches.map(item=><button key={item.id} type="button" aria-pressed={item.id===row.ingredient_id} onClick={event=>choose(event,item)}><span>{item.name}</span></button>)}
          {!matches.length && <p>{catalog.loading ? 'Đang tải…' : catalog.error ? 'Không tải được danh sách' : `Không tìm thấy ${label}`}</p>}
        </div>
        <button type="button" className="recipe-ingredient-new" onClick={event=>choose(event,null)}>＋ Khác</button>
      </div>}
    </div>
  );
}

function Editor({kind, item, categories, dishes, recipes, units, onSaved, onCancel}) {
  const [error,setError]=useState(''), [busy,setBusy]=useState(false);
  const ingredientCatalog=useApi(kind==='recipes'?'/ingredients':null);
  const [ingredientRows,setIngredientRows]=useState((item.ingredients || []).map(x=>({ingredient_id:x.ingredient_id||'',name:x.name||'',quantity:x.quantity||'',unit_id:x.unit_id||'',custom_unit:x.custom_unit||'',grams_per_unit:x.grams_per_unit||'',note:x.note||''})));
  const [stepRows,setStepRows]=useState(item.steps?.length ? item.steps.map(splitStepTitle) : [{title:'',text:''}]);
  useEffect(()=>{setIngredientRows(rows=>{let changed=false;const next=rows.map(row=>{const unit=units.find(x=>x.id===row.unit_id);if((unit?.symbol||unit?.name)==='g'&&row.grams_per_unit!=='1'){changed=true;return {...row,grams_per_unit:'1'};}return row;});return changed?next:rows;});},[units]);
  useEffect(()=>{document.querySelectorAll('.recipe-step-row input').forEach(input=>input.placeholder='~ Tên bước ~');},[stepRows]);
  useEffect(()=>{document.querySelectorAll('.recipe-step-row input').forEach((input,index)=>{const raw=stepRows[index]?.title||'';const clean=raw.replace(/^~\s*|\s*~$/g,'').trim();input.value=clean?`~ ${clean} ~`:'';});},[stepRows]);
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
        body.prep_time=Number(body.prep_time||0);body.time=Number(body.time);body.difficulty=body.time<30?'Dễ':body.time<=60?'Trung bình':'Khó';body.image=image;body.home_display=body.home_display==='on';body.foods_display=body.foods_display==='on';
      }
      if(kind==='recipes'){
        body.servings=Number(body.servings);
        body.ingredients=ingredientRows.filter(x=>x.name.trim()).map((x,index)=>{
          const custom=x.unit_id==='__custom__' ? x.custom_unit.trim() : '';
          if(!(Number(x.quantity)>0) || !(Number(x.grams_per_unit)>0) || (!x.unit_id || (x.unit_id==='__custom__'&&!custom))) throw new Error(`Nguyên liệu dòng ${index+1} chưa đủ thông tin.`);
          return {ingredient_id:x.ingredient_id||null,name:x.name.trim(),quantity:Number(x.quantity),unit_id:x.unit_id==='__custom__'?null:x.unit_id,custom_unit:custom||null,grams_per_unit:Number(x.grams_per_unit)};
        });
        body.steps=stepRows.map(x=>{const title=x.title.trim().replace(/^~\s*|\s*~$/g,'').trim(),text=x.text.trim();return title&&text?`~ ${title} ~\n${text}`:title?`~ ${title} ~`:text;}).filter(Boolean);
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
        <Field label="Thời gian chuẩn bị (phút)" type="number" name="prep_time" defaultValue={item.prep_time ?? ''} min="0" max="1440" required/>
        <Field label="Thời gian chế biến (phút)" type="number" name="time" defaultValue={item.time || 15} min="1" max="1440" required/>
        <Field label="Ảnh món ăn (tối đa 5 MB)"><input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>upload(e,'images')}/></Field><img className="editor-preview" src={media(image)} alt="Ảnh món ăn"/>
        <label className="check"><input type="checkbox" name="home_display" defaultChecked={item.home_display ?? true}/>Hiển thị trang chủ</label>
        <label className="check"><input type="checkbox" name="foods_display" defaultChecked={item.foods_display ?? true}/>Hiển thị trang khám phá</label>
      </>}
      {kind==='recipes' && <>
        {select('dish_id','Món ăn',dishes,item.dish_id)}
        <Field label="Số khẩu phần chuẩn" name="servings" type="number" min="1" max="1000" defaultValue={item.servings || 1} required/>
        <div className="recipe-input-table"><strong>Nguyên liệu</strong><div className="recipe-input-head"><span>Tên nguyên liệu</span><span>Số lượng</span><span>Đơn vị</span><span>Quy đổi gam</span><span>Ghi chú</span><i/></div>{ingredientRows.map((row,index)=><div className="recipe-input-row" key={index}><div className="recipe-ingredient-picker"><RecipeLookupMenu row={row} catalog={ingredientCatalog}
          onChoose={(chosen,name)=>setIngredientRows(rows=>rows.map((item,i)=>i===index?{...item,ingredient_id:chosen?.id||'',name:chosen?.name||name,customIngredient:chosen===null}:item))}
          onNameChange={name=>setIngredientRows(rows=>rows.map((item,i)=>i===index?{...item,name}:item))}/></div><input type="number" min="0" step="any" value={row.quantity} placeholder="300" onChange={e=>setIngredientRows(v=>v.map((x,i)=>i===index?{...x,quantity:e.target.value}:x))}/><div className="recipe-ingredient-picker">
          <RecipeLookupMenu label="đơn vị" catalog={{data:units.map(unit=>({...unit,searchName:unit.name,name:unit.symbol||unit.name}))}}
            row={{
              ingredient_id:row.unit_id==='__custom__'?'':row.unit_id,
              name:row.unit_id==='__custom__'?row.custom_unit:(units.find(unit=>unit.id===row.unit_id)?.symbol||units.find(unit=>unit.id===row.unit_id)?.name||''),
              customIngredient:row.unit_id==='__custom__',
            }}
            onChoose={(chosen,name)=>setIngredientRows(rows=>rows.map((item,i)=>i===index?{...item,unit_id:chosen?.id||(chosen===null?'__custom__':''),custom_unit:chosen===null?name:''}:item))}
            onNameChange={name=>setIngredientRows(rows=>rows.map((item,i)=>i===index?{...item,custom_unit:name}:item))}/>
        </div><input type="number" min="0" step="any" value={row.grams_per_unit} placeholder="gam/1 đơn vị" disabled={units.some(unit=>unit.id===row.unit_id&&(unit.symbol||unit.name)==='g')} onChange={e=>setIngredientRows(v=>v.map((x,i)=>i===index?{...x,grams_per_unit:e.target.value}:x))}/><input value={row.note} placeholder="Không bắt buộc" onChange={e=>setIngredientRows(v=>v.map((x,i)=>i===index?{...x,note:e.target.value}:x))}/><button type="button" onClick={()=>setIngredientRows(v=>v.filter((_,i)=>i!==index))}>×</button></div>)}<button type="button" onClick={()=>setIngredientRows(v=>[...v,{name:'',quantity:'',unit_id:'',custom_unit:'',grams_per_unit:'',note:''}])}>＋ Thêm nguyên liệu</button></div>
        <div className="recipe-step-editor"><strong>Cách chế biến</strong><small className="recipe-step-note">Dùng từ khóa "Lưu ý" hoặc "Mách nhỏ" để nhấn mạnh khi cần</small>{stepRows.map((row,index)=><div className="recipe-step-row" key={index}><b>{index+1}</b><div className="recipe-step-title"><span aria-hidden="true">~</span><input value={row.title?row.title.replace(/^~\s*|\s*~$/g,'').trim():''} placeholder="Tên bước" onChange={e=>setStepRows(v=>v.map((x,i)=>i===index?{...x,title:e.target.value.replace(/^~\s*|\s*~$/g,'').trim()}:x))}/><span aria-hidden="true">~</span></div><textarea value={row.text} placeholder="Mô tả chi tiết cách thực hiện" onChange={e=>setStepRows(v=>v.map((x,i)=>i===index?{...x,text:e.target.value}:x))}/><button type="button" onClick={()=>setStepRows(v=>v.length>1?v.filter((_,i)=>i!==index):v)}>×</button></div>)}<button type="button" onClick={()=>setStepRows(v=>[...v,{title:'',text:''}])}>＋ Thêm bước</button></div>
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

function NutritionStandalone(){
  const resource=useApi('/admin/nutrition');
  const units=useApi('/units');
  return <NutritionStudio resource={resource} units={units.data||[]}/>;
}

function NutritionStudio({dishCount=0, recipeCount=0, resource, units=[]}){
  const [query,setQuery]=useState('');
  const [filter,setFilter]=useState('all');
  const [editor,setEditor]=useState(null);
  const [saving,setSaving]=useState(false);
  const [saveError,setSaveError]=useState('');
  const rows=Array.isArray(resource.data)?resource.data:[];
  const gramUnit=units.find(unit=>unit.symbol==='g')?.id||'';
  const openEditor=item=>{
    setSaveError('');
    setEditor({ingredient_id:item?.id||'',standard_weight:String(item?.standard_weight??100),unit_id:item?.standard_unit_id||gramUnit,energy:item?.energy==null?'':String(item.energy),protein:item?.protein==null?'':String(item.protein),carbs:item?.carbs==null?'':String(item.carbs),fat:item?.fat==null?'':String(item.fat),fiber:item?.fiber==null?'':String(item.fiber),sodium:item?.sodium==null?'':String(item.sodium)});
  };
  const saveEditor=async event=>{
    event.preventDefault();
    setSaving(true);setSaveError('');
    try {
      const payload={...editor,standard_weight:Number(editor.standard_weight),energy:Number(editor.energy),protein:Number(editor.protein),carbs:Number(editor.carbs),fat:editor.fat===''?null:Number(editor.fat),fiber:editor.fiber===''?null:Number(editor.fiber),sodium:editor.sodium===''?null:Number(editor.sodium)};
      await api(`/admin/nutrition/${encodeURIComponent(editor.ingredient_id)}`,{method:'PUT',body:payload});
      await resource.reload();
      setEditor(null);
    } catch(error) {setSaveError(error.message);} finally {setSaving(false);}
  };
  const nutrientKeys=['energy','protein','carbs','fat','fiber','sodium'];
  const filledCount=item=>nutrientKeys.filter(key=>item[key]!==null&&item[key]!==undefined&&item[key]!=='').length;
  const counts={complete:0,partial:0,none:0};
  rows.forEach(item=>{const count=filledCount(item);counts[count===6?'complete':count===0?'none':'partial']+=1;});
  const visibleRows=rows.filter(item=>{
    const matchesSearch=!query||`${item.id} ${item.name}`.toLocaleLowerCase('vi-VN').includes(query.toLocaleLowerCase('vi-VN'));
    const count=filledCount(item);
    return matchesSearch&&(filter==='all'||(filter==='complete'&&count===6)||(filter==='partial'&&count>0&&count<6)||(filter==='none'&&count===0));
  });
  const changeTab=tab=>window.dispatchEvent(new CustomEvent('cookhub-admin-tab',{detail:tab}));
  if (resource.error) return <div className="recipe-studio nutrition-studio"><section className="panel"><h2>Không thể tải dữ liệu dinh dưỡng</h2><p>{resource.error}</p><button type="button" onClick={resource.reload}>Thử lại</button></section></div>;
  return <div className="recipe-studio nutrition-studio">
    <section className="studio-command recipes"><div><small>COOKHUB NUTRITION CONTENT STUDIO</small><h1>Quản lý Dinh dưỡng</h1><p><b>{rows.length}</b> nguyên liệu trong hệ thống</p></div></section>
    <nav className="studio-tabs"><button type="button" onClick={()=>changeTab('dishes')}>Quản lý món ăn <span>{dishCount}</span></button><button type="button" onClick={()=>changeTab('recipes')}>Quản lý công thức <span>{recipeCount}</span></button><button className="active" type="button">Dinh dưỡng <span>{rows.length}</span></button></nav>
    <section className="studio-toolbar nutrition-toolbar"><label className="studio-search">⌕<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Tìm nguyên liệu, mã..."/></label><div className="nutrition-filters" aria-label="Lọc theo mức độ đầy đủ dinh dưỡng">{[['complete','Đủ 6/6'],['partial','Thiếu dinh dưỡng'],['none','Chưa có dinh dưỡng']].map(([key,label])=><button key={key} type="button" className={`nutrition-filter ${filter===key?'active':''}`} aria-pressed={filter===key} onClick={()=>setFilter(filter===key?'all':key)}>{label} <span>{counts[key]}</span></button>)}</div></section>
    <div className="studio-grid nutrition-grid">{visibleRows.map(item=>{const count=filledCount(item);return <article className="studio-recipe-card nutrition-card" key={item.id}><div className="studio-card-body"><div className="nutrition-card-heading"><small>{item.id} · Chuẩn {item.standard_weight??'—'} {item.unit||'g'}</small><span className={`nutrition-status ${count===6?'complete':count===0?'none':'partial'}`}>{count===6?'Đủ 6/6':count===0?'Chưa có':`${count}/6 chỉ số`}</span></div><h3>{item.name}</h3><div className="nutrition-metrics">{[['energy','Năng lượng','kcal'],['protein','Protein','g'],['carbs','Carbs','g'],['fat','Chất béo','g'],['fiber','Chất xơ','g'],['sodium','Natri','mg']].map(([key,label,unit])=><span key={key} className={item[key]===null||item[key]===undefined||item[key]===''?'missing':''}><b>{item[key]??'—'} {unit}</b>{label}</span>)}</div><button type="button" onClick={()=>openEditor(item)}>{count===0?'＋ Bổ sung dinh dưỡng':'✎ Sửa'}</button></div></article>;})}</div>
    {!resource.loading&&visibleRows.length===0&&<p className="nutrition-empty">Không có nguyên liệu phù hợp. Bấm lại bộ lọc đang chọn để xem tất cả.</p>}
    {editor&&<div className="studio-drawer-backdrop" onMouseDown={event=>event.target===event.currentTarget&&setEditor(null)}><aside className="studio-drawer nutrition-editor"><button className="drawer-close" type="button" onClick={()=>setEditor(null)}>×</button><h2>{editor.ingredient_id&&rows.find(item=>item.id===editor.ingredient_id)?.nutrition_id?'Sửa dinh dưỡng':'Thêm dữ liệu dinh dưỡng'}</h2><form onSubmit={saveEditor}><label>Nguyên liệu<input readOnly value={rows.find(item=>item.id===editor.ingredient_id)?.name||editor.ingredient_id}/></label><label>Khối lượng chuẩn<input type="number" min="0.01" step="0.01" required value={editor.standard_weight} onChange={event=>setEditor({...editor,standard_weight:event.target.value})}/></label><label>Đơn vị chuẩn<select required value={editor.unit_id} onChange={event=>setEditor({...editor,unit_id:event.target.value})}><option value="">Chọn đơn vị</option>{units.map(unit=><option key={unit.id} value={unit.id}>{unit.symbol} · {unit.name}</option>)}</select></label><div className="nutrition-editor-fields">{[['energy','Năng lượng (kcal)'],['protein','Protein (g)'],['carbs','Carbs (g)'],['fat','Chất béo (g)'],['fiber','Chất xơ (g)'],['sodium','Natri (mg)']].map(([key,label])=><label key={key}>{label}<input type="number" min="0" step="0.01" required={['energy','protein','carbs'].includes(key)} value={editor[key]} onChange={event=>setEditor({...editor,[key]:event.target.value})}/></label>)}</div>{saveError&&<p className="nutrition-save-error" role="alert">{saveError}</p>}<div className="nutrition-editor-actions"><button type="button" onClick={()=>setEditor(null)}>Hủy</button><button className="primary" type="submit" disabled={saving||!editor.ingredient_id||!editor.unit_id}>{saving?'Đang lưu…':'Lưu dinh dưỡng'}</button></div></form></aside></div>}
  </div>;
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

export function AdminDonut({total=0,categories=[],dishes=[]}){
  const [activeCategory,setActiveCategory]=useState(null);
  const [showAll,setShowAll]=useState(false);
  const liveCategories=useApi('/categories');
  const liveDishes=useApi('/admin/dishes');
  categories=liveCategories.data?.length ? liveCategories.data : categories;
  dishes=liveDishes.data?.length ? liveDishes.data : dishes;
  const counts=categories.map(category=>({...category,count:dishes.filter(dish=>String(dish.category_id)===String(category.id)).length}));
  const actualTotal=counts.reduce((sum,item)=>sum+item.count,0);
  const segments=counts.filter(category=>category.count>0).map((category,index,items)=>({key:`category-${category.id}`,label:category.name,value:actualTotal?category.count/actualTotal*100:0,start:items.slice(0,index).reduce((sum,item)=>sum+(actualTotal?item.count/actualTotal*100:0),0),color:categoryColor(category.id,index)}));
  const legend=counts.map((category,index)=>({...category,percent:actualTotal?Math.round(category.count/actualTotal*100):0,color:categoryColor(category.id,index)}));
  const ranked=[...legend].sort((a,b)=>b.count-a.count || a.name.localeCompare(b.name,'vi'));
  const displayed=showAll?ranked:ranked.slice(0,6);
  const aria=legend.map(item=>`${item.name} ${item.percent}%`).join(', ');
  return <div className="admin-donut admin-donut-compact">
    <svg viewBox="0 0 220 220" role="img" aria-label={`Phân bố ${actualTotal} món ăn theo ${counts.length} danh mục: ${aria}`}>
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
    <div className="compact-category-summary">
      <div className="compact-category-toolbar"><span>{showAll?`Tất cả ${legend.length} danh mục`:'6 danh mục nhiều món nhất'}</span>{legend.length>6&&<button type="button" aria-expanded={showAll} aria-controls="dashboard-category-list" onClick={()=>{setShowAll(value=>!value);setActiveCategory(null);}}>{showAll?'Thu gọn ↑':`Xem tất cả (${legend.length}) ↓`}</button>}</div>
      <div id="dashboard-category-list" className={'compact-category-list '+(showAll?'expanded':'')}>
        {displayed.map(item=>{const key=`category-${item.id}`;return <div style={{'--category-color':item.color}} className={'compact-category-row '+(activeCategory===key?'is-active':'')} onMouseEnter={()=>setActiveCategory(key)} onMouseLeave={()=>setActiveCategory(null)} key={item.id}><i/><span title={item.name}>{item.name}</span><small>{item.count} món</small><b>{item.percent}%</b></div>})}
      </div>
      {!showAll&&legend.length>6&&<p className="compact-category-footnote">Còn {legend.length-6} danh mục khác · Biểu đồ vẫn tính toàn bộ món ăn.</p>}
      {!legend.length&&<p className="compact-category-footnote">Chưa có dữ liệu danh mục.</p>}
    </div>
  </div>;
}

function StudioStatusMenu({value,onChange}){const [open,setOpen]=useState(false);const options=[['all','Tất cả trạng thái'],['published','Đã xuất bản'],['hidden','Đã ẩn']];return <div className={`studio-status-menu ${open?'open':''}`}><button type="button" onClick={()=>setOpen(v=>!v)}><span>{options.find(([key])=>key===value)?.[1]}</span><i/></button>{open&&<div>{options.map(([key,label])=><button type="button" className={value===key?'selected':''} onClick={()=>{onChange(key);setOpen(false)}} key={key}>{label}{value===key&&<b>✓</b>}</button>)}</div>}</div>}

function RecipeStudio(){
  const resource=useApi('/admin/recipes'), dishes=useApi('/dishes?include_drafts=true'), categories=useApi('/categories'), units=useApi('/units'), nutrition=useApi('/admin/nutrition'); const [activeTab,setActiveTab]=useState('dishes'),[view,setView]=useState('grid'),[query,setQuery]=useState(''),[status,setStatus]=useState('all'),[selected,setSelected]=useState([]),[quick,setQuick]=useState(null),[editing,setEditing]=useState(null),[editingKind,setEditingKind]=useState('recipes'),[hidden,setHidden]=useState([]),[message,setMessage]=useState(''),[exportOpen,setExportOpen]=useState(false),[exportName,setExportName]=useState('cookhub-data.json'),[importOpen,setImportOpen]=useState(false),[importText,setImportText]=useState(''),[importFileName,setImportFileName]=useState(''),[importImages,setImportImages]=useState([]),[importBusy,setImportBusy]=useState(false);
  useEffect(() => { const changeTab = event => setActiveTab(event.detail); window.addEventListener('cookhub-admin-tab', changeTab); return () => window.removeEventListener('cookhub-admin-tab', changeTab); }, []);
  useEffect(() => { if (activeTab === 'nutrition') return; const timer = setTimeout(() => { const tabs = document.querySelector('.recipe-studio .studio-tabs'); if (!tabs) return; let button = tabs.querySelector('[data-nutrition-tab]'); if (!button) { button = document.createElement('button'); button.type = 'button'; button.dataset.nutritionTab = 'true'; button.onclick = () => window.dispatchEvent(new CustomEvent('cookhub-admin-tab', { detail: 'nutrition' })); tabs.appendChild(button); } button.textContent = `Dinh dưỡng ${Array.isArray(nutrition.data)?nutrition.data.length:'…'}`; }, 0); return () => clearTimeout(timer); }, [activeTab,nutrition.data]);
  useEffect(()=>{if(!message)return;const timer=setTimeout(()=>setMessage(''),5000);return()=>clearTimeout(timer)},[message]);
  const byDish=Object.fromEntries((dishes.data||[]).map(x=>[x.id,x])), recipeRows=resource.data||[], all=[...recipeRows,...(dishes.data||[]).filter(d=>!recipeRows.some(r=>r.dish_id===d.id)).map(d=>({id:'dish-'+d.id,dish_id:d.id,servings:1,ingredients:[],steps:[],dishOnly:true}))];
  if (activeTab === 'nutrition') return <NutritionStudio dishCount={(dishes.data||[]).length} recipeCount={recipeRows.length} resource={nutrition} units={units.data||[]}/>;
  const tabAll=activeTab==='dishes'?all:all.filter(x=>!x.dishOnly); const rows=tabAll.map(x=>({...x,dish:byDish[x.dish_id]})).filter(x=>{const text=`${x.id} ${x.dish?.name||''} ${(x.ingredients||[]).map(i=>i.name).join(' ')}`.toLocaleLowerCase('vi-VN');return(!query||text.includes(query.toLocaleLowerCase('vi-VN')))&&(status==='all'||status==='published'&&!hidden.includes(x.id)&&!x.dishOnly||status==='hidden'&&hidden.includes(x.id))});
  const kanbanDishRows=all.map(x=>({...x,dish:byDish[x.dish_id]})).filter(x=>{const text=`${x.id} ${x.dish?.name||''} ${(x.ingredients||[]).map(i=>i.name).join(' ')}`.toLocaleLowerCase('vi-VN');return !query||text.includes(query.toLocaleLowerCase('vi-VN'))});
  const dishesWithoutRecipe=(dishes.data||[]).filter(dish=>!recipeRows.some(recipe=>recipe.dish_id===dish.id));
  const choose=id=>setSelected(v=>v.includes(id)?v.filter(x=>x!==id):[...v,id]);
  const exportData=()=>{setExportName(activeTab==='dishes'?'cookhub-mon-an.json':'cookhub-cong-thuc.json');setExportOpen(true)};
  const saveExport=async()=>{const blob=new Blob([JSON.stringify(rows,null,2)],{type:'application/json'});try{setMessage('Đang chuẩn bị tệp JSON…');if(window.showSaveFilePicker){const handle=await window.showSaveFilePicker({suggestedName:exportName,types:[{description:'Tệp JSON',accept:{'application/json':['.json']}}]});const writable=await handle.createWritable();await writable.write(blob);await writable.close()}else{const a=document.createElement('a');const url=URL.createObjectURL(blob);a.href=url;a.download=exportName.endsWith('.json')?exportName:`${exportName}.json`;a.click();URL.revokeObjectURL(url)}setExportOpen(false);setMessage('Đã lưu tệp JSON thành công.')}catch(error){setMessage(error.name==='AbortError'?'Đã hủy lưu tệp JSON.':`Không thể xuất dữ liệu: ${error.message}`)}};
  const chooseImportFile=async event=>{const file=event.target.files?.[0];event.target.value='';if(!file)return;setImportFileName(file.name);setImportText(await file.text())};
  const chooseImportImages=event=>{setImportImages(Array.from(event.target.files||[]));event.target.value=''};
  const executeImport=async()=>{setImportBusy(true);setMessage('Đang kiểm tra và tạo dữ liệu…');try{const parsed=JSON.parse(importText);if(!Array.isArray(parsed)||!parsed.length)throw new Error('Dữ liệu JSON phải là một danh sách không rỗng.');const uploaded=await Promise.all(importImages.map(async file=>{const body=new FormData();body.append('file',file);const result=await api('/uploads/images',{method:'POST',body});return [file.name.toLocaleLowerCase('vi-VN'),result.path]}));const imagePaths=Object.fromEntries(uploaded);parsed.forEach(item=>{const dish=item?.dish||item;if(!dish||!dish.image)return;const fileName=dish.image.replaceAll('\\','/').split('/').pop().toLocaleLowerCase('vi-VN');if(imagePaths[fileName])dish.image=imagePaths[fileName];else if(parsed.length===1&&uploaded.length===1)dish.image=uploaded[0][1]});const result=await api('/admin/import',{method:'POST',body:parsed});await Promise.all([resource.reload(),dishes.reload(),nutrition.reload()]);setImportOpen(false);setImportText('');setImportFileName('');setImportImages([]);setMessage(`Tạo dữ liệu thành công: ${result.dishes} món ăn và ${result.recipes} công thức.`)}catch(error){setMessage(`Không thể tạo dữ liệu: ${error.message}`)}finally{setImportBusy(false)}};
  const openQuick=item=>setQuick(activeTab==='dishes'?{...item,dishView:true}:item);
  const openEdit=item=>{if(activeTab==='dishes'){setEditingKind('dishes');setEditing({...item.dish,id:item.dish_id});return;}setEditingKind('recipes');setEditing(item)};
  const Card=({item})=><article className="studio-recipe-card"><div className="studio-card-cover"><img src={media(item.dish?.image)} alt=""/><input type="checkbox" checked={selected.includes(item.id)} onChange={()=>choose(item.id)}/><span>{item.dishOnly?'Bản nháp':hidden.includes(item.id)?'Đã ẩn':'Đã xuất bản'}</span></div><div className="studio-card-body"><small>{item.id} · {item.servings||1} khẩu phần</small><h3>{item.dish?.name||item.id}</h3><p>⏱ {item.dish?.time||0} phút　🔥 {item.dish?.difficulty||'Trung bình'}</p><div><button onClick={()=>openQuick(item)}>👁 Xem nhanh</button><button onClick={()=>openEdit(item)}>✎ Sửa</button><button onClick={()=>setHidden(v=>v.includes(item.id)?v.filter(x=>x!==item.id):[...v,item.id])}>{hidden.includes(item.id)?'Hiện':'Ẩn'}</button></div></div></article>;
  const QuickContent=()=>quick?.dishView?<><img src={media(quick.dish?.image)} alt={quick.dish?.name||'Món ăn'}/><small>{quick.dish?.id||quick.dish_id}</small><h2>{quick.dish?.name}</h2><p>{quick.dish?.description||'Chưa có mô tả cho món ăn.'}</p><h3>Thông tin món ăn</h3><ul><li>Danh mục: {categories.data?.find(x=>x.id===quick.dish?.category_id)?.name||'Chưa phân loại'}</li><li>Thời gian chế biến: {quick.dish?.time||0} phút</li><li>Độ khó: {quick.dish?.difficulty||'Chưa xác định'}</li><li>Hiển thị trang chủ: {quick.dish?.home_display?'Có':'Không'}</li><li>Hiển thị trang khám phá: {quick.dish?.foods_display?'Có':'Không'}</li></ul></>:<><img src={media(quick?.dish?.image)} alt={quick?.dish?.name||'Công thức'}/><small>{quick?.id} · {quick?.servings||1} khẩu phần</small><h2>{quick?.dish?.name||quick?.id}</h2><p>{quick?.description||'Chưa có mô tả cho công thức.'}</p><p>⏱ {quick?.dish?.time||0} phút · 🔥 {quick?.dish?.difficulty||'Trung bình'}</p><h3>Nguyên liệu</h3><ul>{(quick?.ingredients||[]).map(i=><li key={i.ingredient_id||i.name}>{i.name} · {i.quantity} {i.unit}</li>)}</ul><h3>Các bước thực hiện</h3><ol>{(quick?.steps||[]).map(step=><li key={step}>{step}</li>)}</ol></>;
  return <div className="recipe-studio"><section className={`studio-command ${activeTab}`}><div><small>COOKHUB CREATIVE CMS STUDIO</small><h1>{activeTab==='dishes'?'Quản lý & Kiểm duyệt Món ăn':'Quản lý & Kiểm duyệt Công thức'}</h1><p><b>{activeTab==='dishes'?(dishes.data||[]).length:recipeRows.length}</b> {activeTab==='dishes'?'món ăn đang hiển thị':'công thức đã xuất bản'} ? <b>{all.filter(x=>x.dishOnly).length}</b> món chưa có công thức</p></div><div className="studio-actions">{activeTab==='dishes'&&<button className="primary" onClick={()=>{setEditingKind('dishes');setEditing({})}}>Thêm món ăn</button>}{activeTab==='recipes'&&<button className="primary" onClick={()=>{setEditingKind('recipes');setEditing({})}}>Thêm công thức</button>}<button onClick={exportData}>Export JSON</button><button onClick={()=>setImportOpen(true)}>Import</button></div></section><nav className="studio-tabs"><button className={activeTab==='dishes'?'active':''} onClick={()=>{setActiveTab('dishes');setSelected([])}}>Quản lý món ăn <span>{(dishes.data||[]).length}</span></button><button className={activeTab==='recipes'?'active':''} onClick={()=>{setActiveTab('recipes');setSelected([])}}>Quản lý công thức <span>{recipeRows.length}</span></button></nav>{message&&<p className="studio-toast">✓ {message}</p>}<section className="studio-toolbar"><label className="studio-search">⌕<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Tìm tên món, ID, nguyên liệu..."/></label><StudioStatusMenu value={status} onChange={setStatus}/><div className="studio-view-switch">{[['grid','▦ Grid'],['table','☷ Table'],['kanban','▤ Kanban']].map(([key,label])=><button key={key} className={view===key?'active':''} onClick={()=>setView(key)}>{label}</button>)}</div></section>{selected.length>0&&<div className="studio-bulk"><b>{selected.length} đã chọn</b><button onClick={()=>setHidden(v=>[...new Set([...v,...selected])])}>Ẩn hàng loạt</button><button onClick={()=>{setSelected([]);setMessage('Đã ghi nhận thao tác xóa hàng loạt.')}}>Xóa hàng loạt</button><button onClick={()=>setSelected([])}>Bỏ chọn</button></div>}{view==='grid'&&<div className="studio-grid">{rows.map(x=><Card key={x.id} item={x}/>)}</div>}{view==='table'&&<div className="studio-table-wrap"><table className="studio-table"><thead><tr><th>Chọn</th><th>Món ăn</th><th>Thông số nấu</th><th>Nguyên liệu</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{rows.map(x=><tr key={x.id}><td className="studio-select-cell"><input type="checkbox" checked={selected.includes(x.id)} onChange={()=>choose(x.id)}/></td><td><div className="studio-table-name"><img src={media(x.dish?.image)} alt=""/><span><b>{x.dish?.name||x.id}</b><small>{x.id}</small></span></div></td><td>👥 {x.servings||1}　⏱ {x.dish?.time||0} phút<br/>🔥 {x.dish?.difficulty||'Trung bình'}</td><td>{(x.ingredients||[]).slice(0,3).map(i=>i.name).join(', ')}</td><td><span className={'studio-pill '+(hidden.includes(x.id)?'red':'green')}>{x.dishOnly?'Bản nháp':hidden.includes(x.id)?'Đã ẩn':'Đã xuất bản'}</span></td><td><div className="studio-table-actions"><button title="Xem chi tiết" aria-label="Xem chi tiết" onClick={()=>openQuick(x)}><StudioIcon type="eye"/></button><button title="Chỉnh sửa" aria-label="Chỉnh sửa" onClick={()=>openEdit(x)}><StudioIcon type="edit"/></button><button title={hidden.includes(x.id)?'Hiện món ăn':'Ẩn món ăn'} aria-label={hidden.includes(x.id)?'Hiện món ăn':'Ẩn món ăn'} onClick={()=>setHidden(v=>v.includes(x.id)?v.filter(y=>y!==x.id):[...v,x.id])}><StudioIcon type={hidden.includes(x.id)?'eye':'off'}/></button></div></td></tr>)}</tbody></table></div>}{view==='kanban'&&<div className="studio-kanban">{['Bản nháp','Món ăn','Công thức'].map((label,index)=><section key={label}><header><b>{label}</b><span>{index===0?kanbanDishRows.filter(x=>x.dishOnly).length:index===1?kanbanDishRows.length:index===2?kanbanDishRows.filter(x=>!x.dishOnly).length:0}</span></header>{index===0&&kanbanDishRows.filter(x=>x.dishOnly).map(x=><Card key={x.id} item={x}/>)}{index===1&&kanbanDishRows.map(x=><Card key={x.id} item={x}/>)}{index===2&&kanbanDishRows.filter(x=>!x.dishOnly).map(x=><Card key={x.id} item={x}/>)}</section>)}</div>}{!rows.length&&<div className="studio-empty">{activeTab==='dishes'?'Không tìm thấy món ăn phù hợp.':'Không tìm thấy công thức phù hợp.'}</div>}{exportOpen&&<div className="studio-transfer-backdrop" onMouseDown={e=>e.target===e.currentTarget&&setExportOpen(false)}><section className="studio-transfer-modal"><header><div><small>XUẤT DỮ LIỆU</small><h2>Lưu tệp JSON</h2></div></header><label>Tên tệp<input value={exportName} onChange={e=>setExportName(e.target.value)} placeholder="cookhub-data.json"/></label><p>Tệp sẽ chứa {rows.length} bản ghi đang hiển thị.</p><div className="studio-transfer-actions"><button onClick={()=>setExportOpen(false)}>Hủy</button><button className="primary" onClick={saveExport} disabled={!exportName.trim()}>Lưu tệp</button></div></section></div>}{importOpen&&<div className="studio-transfer-backdrop" onMouseDown={e=>e.target===e.currentTarget&&setImportOpen(false)}><section className="studio-transfer-modal import"><header><div><small>NHẬP DỮ LIỆU</small><h2>Tạo dữ liệu từ JSON</h2></div></header><label className="studio-file-picker">Chọn tệp JSON từ máy<input type="file" accept="application/json,.json" onChange={chooseImportFile}/><span>{importFileName||"Chưa chọn tệp JSON"}</span></label><label className="studio-file-picker studio-image-picker">Tải ảnh món ăn<input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={chooseImportImages}/><span>{importImages.length?`Đã chọn ${importImages.length} ảnh: ${importImages.map(file=>file.name).join(", ")}`:"Chọn các ảnh có cùng tên file được ghi trong JSON"}</span></label><div className="studio-transfer-divider"><span>hoặc nhập thủ công</span></div><label>Nội dung JSON<textarea rows="12" value={importText} onChange={e=>setImportText(e.target.value)} placeholder="Dán danh sách JSON vào đây..."/></label><div className="studio-transfer-actions"><button onClick={()=>{setImportOpen(false);setImportText("");setImportFileName("");setImportImages([])}}>Hủy</button><button className="primary" onClick={executeImport} disabled={importBusy||!importText.trim()}>{importBusy?"Đang tạo…":"Tạo dữ liệu"}</button></div></section></div>}{editing&&<div className="studio-drawer-backdrop"><aside className="studio-drawer studio-editor-drawer"><button className="drawer-close" onClick={()=>setEditing(null)}>×</button><Editor kind={editingKind} item={editing} categories={categories.data||[]} dishes={editingKind==='recipes'&&!editing.id?dishesWithoutRecipe:(dishes.data||[])} recipes={all} units={units.data||[]} onCancel={()=>setEditing(null)} onSaved={()=>{setEditing(null);resource.reload();dishes.reload();nutrition.reload();setMessage("Đã lưu dữ liệu.")}}/></aside></div>}{quick&&<div className="studio-drawer-backdrop" onMouseDown={e=>e.target===e.currentTarget&&setQuick(null)}><aside className="studio-drawer"><button className="drawer-close" onClick={()=>setQuick(null)}>×</button><QuickContent/></aside></div>}</div>;
}

export default function Admin({kind}) {
  if(kind==='recipes' || kind==='dishes') return <RecipeStudio/>;
  if(kind==='nutrition') return <NutritionStandalone/>;
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





















