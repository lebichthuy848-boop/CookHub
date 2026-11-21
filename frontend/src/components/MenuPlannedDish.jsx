import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { media } from '../api';
import { useApi } from '../hooks';
import './menu-planned-dish.css';

export default function MenuPlannedDish({item,dish,onRemove,onPortions,onUpdate,onMove,disabled=false}) {
  const navigate = useNavigate();
  const hold = useRef(null), drag = useRef(null), suppressClick = useRef(false);
  const [dragging,setDragging] = useState(false);
  const [updateError,setUpdateError] = useState('');
  async function changeServings(amount) {
    setUpdateError('');
    try { await onUpdate({meal:item.meal,servings:Number(item.servings||1)+amount}); }
    catch(error) { setUpdateError(error.message); }
  }
  useEffect(()=>()=>clearTimeout(hold.current),[]);
  function pointerDown(event) {
    if(!onMove||disabled||!event.isPrimary||event.button!==0||event.target.closest('button')) return;
    suppressClick.current=false;
    const element=event.currentTarget, x=event.clientX, y=event.clientY, pointerId=event.pointerId;
    drag.current={x,y,active:false};
    hold.current=setTimeout(()=>{
      drag.current.active=true;
      suppressClick.current=true;
      element.setPointerCapture(pointerId);
      setDragging(true);
    },350);
  }
  function pointerMove(event) {
    if(!drag.current) return;
    if(!drag.current.active){
      if(Math.hypot(event.clientX-drag.current.x,event.clientY-drag.current.y)<=8) return;
      clearTimeout(hold.current);
      drag.current.active=true;
      suppressClick.current=true;
      event.currentTarget.setPointerCapture(event.pointerId);
      setDragging(true);
    }
    event.preventDefault();
    const target=document.elementFromPoint(event.clientX,event.clientY)?.closest('[data-menu-meal]');
    document.querySelectorAll('.meal-drop-active').forEach(element=>element.classList.remove('meal-drop-active'));
    target?.classList.add('meal-drop-active');
  }
  function finishDrag(event) {
    clearTimeout(hold.current);
    if(drag.current?.active&&event.type==='pointerup'){
      const meal=document.elementFromPoint(event.clientX,event.clientY)?.closest('[data-menu-meal]')?.dataset.menuMeal;
      if(meal&&meal!==item.meal) onMove(meal);
    }
    drag.current=null;
    setDragging(false);
    document.querySelectorAll('.meal-drop-active').forEach(element=>element.classList.remove('meal-drop-active'));
  }
  const dishId=String(item.dish_id || item.maMonAn || item.dish?.id || '').trim();
  const knownName=item.dish_name || item.name || item.dish?.name || dish?.name;
  // Older running backends may return only IDs. Resolve that dish explicitly.
  const detail=useApi(!knownName && dishId ? '/dishes/'+encodeURIComponent(dishId) : null);
  const name=knownName || detail.data?.name || (detail.error?'Không tải được món':'Đang tải tên món…');
  const image=item.dish_image || item.image || item.dish?.image || dish?.image || detail.data?.image;
  function openDish(event) {
    if(event.target.closest('button')) return;
    if(suppressClick.current){
      suppressClick.current=false;
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if(dishId&&!event.target.closest('a')) navigate('/dish/'+dishId);
  }

  return <article className={'menu-planned-card'+(onUpdate?' menu-planned-card-editing':'')+(onMove?' menu-card-movable':'')+(dragging?' menu-card-dragging':'')} onClickCapture={openDish} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={finishDrag} onPointerCancel={finishDrag} onLostPointerCapture={finishDrag} onPointerLeave={()=>{if(!drag.current?.active){clearTimeout(hold.current);drag.current=null;}}} onDragStart={event=>onMove&&event.preventDefault()}>
    <div className="menu-planned-link">
      {image?<img src={media(image,{width:100,height:100})} alt={name} loading="eager" decoding="async" width="50" height="50" onError={event=>{event.currentTarget.onerror=null;event.currentTarget.src=media('images/logo.jpg',{width:100,height:100});}}/>:<span className="menu-planned-placeholder" aria-label="Món chưa có ảnh"><svg viewBox="0 0 24 24" width="23" height="23" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M4 13h16a8 8 0 0 1-16 0ZM3 21h18M8 3v5m4-5v5m4-5v5"/></svg></span>}
      <span className="menu-planned-info"><strong><Link to={'/dish/'+dishId}>{name}</Link></strong><small className="menu-serving-stepper">{onUpdate&&<button type="button" aria-label={'Giảm khẩu phần '+name} disabled={disabled||Number(item.servings||1)<=1} onClick={event=>{event.preventDefault();event.stopPropagation();changeServings(-1);}}>−</button>}<span>{item.servings || 1} phần ăn</span>{onUpdate&&<button type="button" aria-label={'Tăng khẩu phần '+name} disabled={disabled||Number(item.servings||1)>=1000} onClick={event=>{event.preventDefault();event.stopPropagation();changeServings(1);}}>+</button>}
      {onPortions&&<button type="button" className="menu-planned-portions menu-planned-share" aria-label="Chia khẩu phần" title="Chia khẩu phần" disabled={disabled} onClick={onPortions}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><circle cx="9" cy="7" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 4a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 5v2"/></svg>
      </button>}
      </small></span>
    </div>
    {updateError&&<p role="alert" className="menu-serving-error">{updateError}</p>}
    <div className="menu-planned-actions">
      {detail.error&&!knownName&&<button type="button" className="menu-planned-portions" onClick={detail.reload}>Thử tải lại</button>}
      <button type="button" className="menu-planned-remove" disabled={disabled} aria-label={'Xóa món '+name} title="Xóa khỏi thực đơn" onClick={onRemove}>×</button>
    </div>
  </article>;
}
