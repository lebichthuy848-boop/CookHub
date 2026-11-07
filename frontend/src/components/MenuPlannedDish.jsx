import { Link } from 'react-router-dom';
import { media } from '../api';
import { useApi } from '../hooks';
import './menu-planned-dish.css';

export default function MenuPlannedDish({item,dish,onRemove,onPortions,disabled=false}) {
  const dishId=String(item.dish_id || item.maMonAn || item.dish?.id || '').trim();
  const knownName=item.dish_name || item.name || item.dish?.name || dish?.name;
  // Older running backends may return only IDs. Resolve that dish explicitly.
  const detail=useApi(!knownName && dishId ? '/dishes/'+encodeURIComponent(dishId) : null);
  const name=knownName || detail.data?.name || (detail.error?'Không tải được món':'Đang tải tên món…');
  const image=item.dish_image || item.image || item.dish?.image || dish?.image || detail.data?.image;

  return <article className="menu-planned-card">
    <Link className="menu-planned-link" to={'/dish/'+dishId}>
      {image?<img src={media(image)} alt={name} loading="lazy" onError={event=>{event.currentTarget.onerror=null;event.currentTarget.src=media('images/logo.jpg');}}/>:<span className="menu-planned-placeholder" aria-label="Đang tải ảnh món"><svg viewBox="0 0 24 24" width="23" height="23" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M4 13h16a8 8 0 0 1-16 0ZM3 21h18M8 3v5m4-5v5m4-5v5"/></svg></span>}
      <span className="menu-planned-info"><strong>{name}</strong><small>{item.servings || 1} phần ăn</small></span>
    </Link>
    <div className="menu-planned-actions">
      {detail.error&&!knownName&&<button type="button" className="menu-planned-portions" onClick={detail.reload}>Thử tải lại</button>}
      {onPortions&&<button type="button" className="menu-planned-portions" disabled={disabled} onClick={onPortions}>Chia khẩu phần</button>}
      <button type="button" className="menu-planned-remove" disabled={disabled} aria-label={'Xóa món '+name} title="Xóa khỏi thực đơn" onClick={onRemove}>×</button>
    </div>
  </article>;
}
