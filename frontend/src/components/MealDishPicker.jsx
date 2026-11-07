import { useEffect, useState } from 'react';
import { media } from '../api';
import './meal-dish-picker.css';

export default function MealDishPicker({meal,resource,onAdd}) {
  const [open,setOpen]=useState(false),[menuOpen,setMenuOpen]=useState(false),[query,setQuery]=useState(''),[selected,setSelected]=useState(''),[servings,setServings]=useState(1),[busy,setBusy]=useState(false),[error,setError]=useState(''),[added,setAdded]=useState(false);
  const dishes=Array.isArray(resource.data)?resource.data:[];
  useEffect(()=>{const closeOther=event=>{if(event.detail!==meal){setOpen(false);setMenuOpen(false);}};window.addEventListener('cookhub-meal-picker-open',closeOther);return()=>window.removeEventListener('cookhub-meal-picker-open',closeOther);},[meal]);
  const normalize=value=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase();
  const visible=dishes.filter(d=>normalize(d.name).includes(normalize(query)));
  async function submit(event){event.preventDefault();if(!selected)return;setBusy(true);setError('');try{await onAdd(selected,Number(servings));setOpen(false);setMenuOpen(false);setSelected('');setQuery('');setServings(1);setAdded(true);window.setTimeout(()=>setAdded(false),1400);}catch(e){setError(e.message);}finally{setBusy(false);}}
  return <div className="meal-picker-wrap">
    <button type="button" className={'meal-picker-open '+(added?'is-added':'')} aria-expanded={open} onClick={()=>{setError('');setOpen(value=>{const next=!value;if(next)window.dispatchEvent(new CustomEvent('cookhub-meal-picker-open',{detail:meal}));return next;});}}>{added?'✓ Đã thêm':'＋ Thêm món'}</button>
    {open&&<form className="meal-picker-popover" onSubmit={submit}>
      <button type="button" className="meal-picker-select" aria-expanded={menuOpen} onClick={()=>setMenuOpen(value=>!value)}>{selected?dishes.find(d=>d.id===selected)?.name:'Chọn món'}<span>⌄</span></button>
      <label className="meal-picker-serving"><span className="sr-only">Số phần ăn</span><input aria-label="Số phần ăn" type="number" min="1" max="99" step="1" required value={servings} onChange={e=>setServings(e.target.value)}/></label>
      <button className="primary meal-picker-confirm" disabled={busy||!selected||resource.loading}>{busy?'…':'Thêm'}</button>
      {menuOpen&&<div className="meal-picker-list" aria-label="Danh sách món ăn" aria-busy={resource.loading}>
        <label className="meal-picker-search"><span className="sr-only">Tìm và chọn món ăn</span><input autoFocus type="search" placeholder="Tìm món…" value={query} onChange={e=>setQuery(e.target.value)}/></label>
        {resource.loading?<p role="status">Đang tải món…</p>:resource.error?<div role="alert"><p>{resource.error}</p><button type="button" onClick={resource.reload}>Thử tải lại</button></div>:visible.length?visible.map(dish=><button type="button" className={'meal-picker-option '+(selected===dish.id?'selected':'')} key={dish.id} aria-pressed={selected===dish.id} onClick={()=>setSelected(dish.id)}><img src={media(dish.image)} alt="" loading="lazy"/><span><b>{dish.name}</b><small>{dish.time ? dish.time+' phút':'Món trong thư viện'}</small></span><i aria-hidden="true">{selected===dish.id?'✓':''}</i></button>):<p>{query?'Không tìm thấy món phù hợp.':'Chưa có món đã công bố.'}</p>}
      </div>}
      {error&&<p className="meal-picker-error" role="alert">{error}</p>}
      <button type="button" className="meal-picker-cancel" disabled={busy} onClick={()=>setOpen(false)}>Hủy</button>
    </form>}
  </div>;
}
