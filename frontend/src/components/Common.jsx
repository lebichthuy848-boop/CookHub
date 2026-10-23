import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { media } from '../api';
import { useAuth } from '../auth';
import './hide-dish.css';
export function State({resource,children}){if(resource.loading)return <p className="empty">Đang tải dữ liệu…</p>;if(resource.error)return <div className="error" role="alert">{resource.error} <button onClick={resource.reload}>Thử lại</button></div>;return children(resource.data);}
export function Banner({page,title,subtitle}){return <section className={'banner banner-'+page+' '+(page==='suggest'?'recommendation-banner':'')}><span>COOKHUB / NẤU NGON MỖI NGÀY</span><h1>{title}</h1>{subtitle&&<p>{subtitle}</p>}</section>}
export function MatchProgress({ value = 0 }) { const score = Math.max(0, Math.min(100, Number(value) || 0)); return <div className="match-progress" aria-label={`${score}% Hợp vị`}><div className="match-progress-fill" style={{width:`${score}%`}}/><span>✨ Mức độ phù hợp</span><b>{score}% Hợp vị</b></div>; }
export function DishCard({dish,favorite,favoriteCount=dish.favorite_count,onFavorite,onHide}){
  const {favoriteCounts}=useAuth();
  const [confirmHide,setConfirmHide]=useState(false);
  const count=favoriteCounts[dish.id] ?? favoriteCount;
  return <><article className="dish-card premium-dish-card">
    <Link className="dish-image" to={'/dish/'+dish.id}><img src={media(dish.image)} alt={dish.name} loading="lazy"/></Link>
    {onHide&&<button type="button" className="hide-dish" aria-label={'Ẩn món '+dish.name} title="Ẩn món và lưu vào Hồ sơ" onClick={()=>setConfirmHide(true)}><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8"/><path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c5.2 0 8.8 4.3 10 7-.4 1-1.3 2.4-2.6 3.7M6.1 6.1C4.1 7.4 2.7 9.5 2 12c1.2 2.7 4.8 7 10 7 1.6 0 3.1-.4 4.4-1"/></svg></button>}
    <button type="button" className={'heart '+(favorite?'selected':'')} aria-label={(favorite?'Bỏ yêu thích ':'Yêu thích ')+dish.name} onClick={()=>onFavorite(dish.id)}>{favorite?'♥':'♡'}</button>
    <div className="dish-body"><small className="dish-category">{dish.category}</small>{dish.match_percent!==undefined&&<MatchProgress value={dish.match_percent}/>}<h3><Link to={'/dish/'+dish.id}>{dish.name}</Link></h3><p className="dish-meta"><b>★ {dish.rating}</b><span className="favorite-count">♥ {count||0}</span><span>◷ {dish.time} phút</span></p><Link className="add-menu-button" to={'/dish/'+dish.id+'#them-vao-thuc-don'}>＋ Thêm vào thực đơn</Link></div>
  </article>{confirmHide&&createPortal(<div className="hide-confirm-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)setConfirmHide(false)}}><section className="hide-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby={'hide-confirm-'+dish.id} onKeyDown={event=>{if(event.key==='Escape')setConfirmHide(false)}}><h2 id={'hide-confirm-'+dish.id}>Ẩn món ăn?</h2><p>Bạn có chắc muốn ẩn <strong>{dish.name}</strong>? Món sẽ được lưu trong Hồ sơ → Món đã ẩn.</p><div className="hide-confirm-actions"><button type="button" autoFocus onClick={()=>setConfirmHide(false)}>Không</button><button type="button" className="primary" onClick={()=>{setConfirmHide(false);onHide(dish.id)}}>Có, ẩn món</button></div></section></div>,document.body)}</>;
}
export function Notice({error,message}){return <>{error&&<p className="error" role="alert">{error}</p>}{message&&<p className="notice">{message}</p>}</>}
export function Field({label,children,...props}){return <label className="field">{label&&<span>{label}</span>}{children||<input {...props}/>}</label>}


