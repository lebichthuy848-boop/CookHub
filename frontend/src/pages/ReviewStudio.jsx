import { useMemo, useState } from 'react';
import { api, media } from '../api';
import { useApi } from '../hooks';
import '../review-studio-new.css';

const dateText = value => value ? new Intl.DateTimeFormat('vi-VN').format(new Date(value)) : '—';

function DishThumbnail({ path, name }) {
  const [failed, setFailed] = useState(false);
  if (!path || failed) return <span className="review-new-image" role="img" aria-label={`${name} chưa có ảnh`}>Chưa có ảnh</span>;
  return <img src={media(path)} alt={name} onError={() => setFailed(true)}/>;
}

export default function ReviewStudio() {
  const reviews = useApi('/admin/reviews');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const groups = useMemo(() => {
    const map = new Map();
    for (const review of reviews.data || []) {
      if (!map.has(review.dish_id)) map.set(review.dish_id, { id: review.dish_id, name: review.dish_name, image: review.dish_image, items: [] });
      map.get(review.dish_id).items.push(review);
    }
    return [...map.values()].map(group => ({ ...group,
      average: group.items.reduce((total, item) => total + item.rating, 0) / group.items.length,
      latest: Math.max(...group.items.map(item => new Date(item.date).getTime() || 0)),
      items: group.items.sort((a, b) => new Date(b.date) - new Date(a.date)),
    })).sort((a, b) => b.latest - a.latest || a.name.localeCompare(b.name, 'vi'));
  }, [reviews.data]);
  const filtered = groups.filter(group => `${group.name} ${group.id}`.toLocaleLowerCase('vi-VN').includes(query.trim().toLocaleLowerCase('vi-VN')));
  const current = groups.find(group => group.id === selected);

  async function removeReview() {
    if (!toDelete) return;
    setBusy(true);
    setMessage('');
    try {
      await api(`/admin/reviews/${encodeURIComponent(toDelete.id)}`, { method: 'DELETE' });
      setToDelete(null);
      setMessage('Đã xóa đánh giá.');
      reviews.reload();
    } catch (error) {
      setMessage(error.message || 'Không thể xóa đánh giá.');
    } finally {
      setBusy(false);
    }
  }

  return <div className="review-studio-new">
    <header className="review-new-hero"><small>QUẢN TRỊ NỘI DUNG</small><h1>Đánh giá món ăn</h1><p>Người dùng có thể đăng đánh giá ngay. Bạn có thể xem phản hồi theo từng món và xóa nội dung không phù hợp.</p></header>
    <div className="review-new-summary"><span><b>{reviews.data?.length || 0}</b> đánh giá</span><span><b>{groups.length}</b> món đã được đánh giá</span></div>
    {message && <p className="review-new-message" role="status">{message}</p>}
    <div className="review-new-layout">
      <section className="review-new-list" aria-label="Các món được đánh giá">
        <label className="review-new-search">Tìm món ăn<input value={query} onChange={event => setQuery(event.target.value)} placeholder="Nhập tên món ăn..."/></label>
        {reviews.loading ? <p>Đang tải đánh giá…</p> : reviews.error ? <p role="alert">{reviews.error} <button onClick={reviews.reload}>Thử lại</button></p> : filtered.length ? filtered.map(group => <button key={group.id} type="button" className={'review-new-dish' + (selected === group.id ? ' active' : '')} onClick={() => setSelected(group.id)}>
          <DishThumbnail path={group.image} name={group.name}/>
          <span className="review-new-dish-info"><b>{group.name}</b><small>{group.items.length} đánh giá · ★ {group.average.toFixed(1)}</small></span><span aria-hidden="true">›</span>
        </button>) : <p className="review-new-empty">{query ? 'Không tìm thấy món ăn phù hợp.' : 'Chưa có đánh giá nào.'}</p>}
      </section>
      <section className="review-new-detail" aria-label="Đánh giá của món ăn">
        {current ? <><header><div><small>ĐÁNH GIÁ THEO MÓN</small><h2>{current.name}</h2><p>{current.items.length} đánh giá · Trung bình ★ {current.average.toFixed(1)}/5</p></div></header>
          <div className="review-new-items">{current.items.map(item => <article key={item.id} className="review-new-item"><div className="review-new-item-head"><div><b>{item.user_name}</b><small>{dateText(item.date)}</small></div><strong aria-label={`${item.rating} trên 5 sao`}>★ {item.rating}/5</strong></div><p>{item.comment || 'Không có nội dung.'}</p><button type="button" onClick={() => setToDelete(item)}>Xóa đánh giá</button></article>)}</div>
        </> : <div className="review-new-placeholder">{reviews.loading ? 'Đang tải…' : 'Chọn một món ăn để xem từng đánh giá.'}</div>}
      </section>
    </div>
    {toDelete && <div className="review-new-backdrop" onMouseDown={event => { if (event.target === event.currentTarget && !busy) setToDelete(null); }}><section role="dialog" aria-modal="true" aria-labelledby="review-delete-title" className="review-new-confirm"><h2 id="review-delete-title">Xóa đánh giá?</h2><p>Đánh giá của {toDelete.user_name} về món {toDelete.dish_name} sẽ bị xóa vĩnh viễn.</p><blockquote>{toDelete.comment}</blockquote><div><button type="button" disabled={busy} onClick={() => setToDelete(null)}>Hủy</button><button type="button" disabled={busy} className="danger" onClick={removeReview}>{busy ? 'Đang xóa…' : 'Xóa đánh giá'}</button></div></section></div>}
  </div>;
}
