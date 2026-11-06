import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, media, money, today } from '../api';
import { useApi } from '../hooks';
import { State, Field, Notice } from '../components/Common';
import { useAuth } from '../auth';
import { useSettings } from '../settings-context';

function DetailFavoriteManager({ dishId, onClose, onAdded }) {
  const collections = useApi('/favorite-collections/for-dish/' + dishId);
  const [creating, setCreating] = useState(false), [name, setName] = useState(''), [error, setError] = useState('');
  async function add(collectionId) { try { await api('/favorite-collections/' + collectionId + '/dishes', {method:'POST', body:{dish_id:dishId}}); onAdded(); } catch (err) { setError(err.message); } }
  async function create(event) { event.preventDefault(); if (!name.trim()) return; try { const item=await api('/favorite-collections',{method:'POST',body:{name:name.trim()}}); setName(''); setCreating(false); if(item?.MaBoSuuTap) await add(item.MaBoSuuTap); else collections.reload(); } catch(err) { setError(err.message); } }
  return <div className="favorite-manager-popover" role="dialog" aria-label="Quản lý bộ sưu tập">{!creating ? <><button type="button" className="manager-create" onClick={()=>setCreating(true)}>⊕ Tạo bộ sưu tập mới</button><State resource={collections}>{items => items.length ? items.map(item=><button type="button" key={item.MaBoSuuTap} onClick={()=>add(item.MaBoSuuTap)}>{item.DaChuaMon?'✓ ':'＋ '}{item.TenBoSuuTap}<small>{item.SoLuongMon||0} món</small></button>) : <p>Chưa có bộ sưu tập.</p>}</State></> : <form onSubmit={create}><b>Tạo bộ sưu tập mới</b><input autoFocus required value={name} onChange={event=>setName(event.target.value)} placeholder="Tên bộ sưu tập"/><div><button type="button" onClick={()=>setCreating(false)}>Hủy</button><button type="submit">Tạo mới</button></div></form>}{error&&<p className="manager-error">{error}</p>}<button type="button" className="manager-close" onClick={onClose}>×</button></div>;
}

function StepList({ steps = [] }) {
  const [active, setActive] = useState(0); const refs = useRef([]);
  useEffect(() => {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) setActive(Number(entry.target.dataset.step)); }), { threshold: .56 });
    refs.current.forEach(item => item && observer.observe(item)); return () => observer.disconnect();
  }, [steps.length]);
  return <div className="recipe-steps">{steps.map((step, index) => { const text=String(step||''); const noteMatch=text.match(/(?:^|\n)\s*(Lưu ý|Mách nhỏ):?\s*/i); const noteIndex=noteMatch?.index ?? -1; const noteLabel=noteMatch?.[1] || ''; const main=noteIndex>=0?text.slice(0,noteIndex).trim():text; const note=noteIndex>=0?text.slice(noteIndex).replace(/^\s*(?:Lưu ý|Mách nhỏ):?\s*/i,'').trim():''; const noteItems=note.split(/\n+/).map(item=>item.trim()).filter(Boolean).map(item=>item.replace(/^[-*]\s*/,'').trim()); const titleMatch=main.match(/^~\s*(.*?)\s*~(?:\s*\n|\s*$)/); const title=titleMatch?.[1]?.trim(); const body=titleMatch?main.slice(titleMatch[0].length).trim():main; const isTip=noteLabel.toLocaleLowerCase('vi-VN')==='mách nhỏ'; return <article ref={item => { refs.current[index] = item; }} data-step={index} key={index} tabIndex={0} role="button" onClick={()=>setActive(index)} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();setActive(index)}}} className={(active === index ? 'active ' : '')+(note ? 'has-note' : '')}><b>{index + 1}</b><div className="step-content">{title&&<h3 className="step-title">~ {title} ~</h3>}<p>{body}</p>{note&&<div className={'step-note '+(isTip?'tip':'')}><strong>{isTip?'✨ Mách nhỏ':'💡 Lưu ý'}</strong><ul>{noteItems.map((item,n)=><li key={n}>{item}</li>)}</ul></div>}</div></article>; })}</div>;
}

function CookingTools({steps=[]}) {
  const {settings,update}=useSettings();
  const [speaking,setSpeaking]=useState(false);
  const [issue,setIssue]=useState('');
  useEffect(()=>{
    if(!settings.wakeLock || !navigator.wakeLock?.request)return undefined;
    let lock;let active=true;
    const acquire=async()=>{if(document.visibilityState==='hidden'||!active||lock&&!lock.released)return;try{lock=await navigator.wakeLock.request('screen');if(!active)await lock.release();else setIssue('')}catch{if(active)setIssue('Không thể giữ màn hình sáng trên thiết bị này.')}};
    const visibility=()=>{if(document.visibilityState==='visible')acquire();else{lock?.release?.();lock=null}};
    acquire();document.addEventListener('visibilitychange',visibility);
    return()=>{active=false;document.removeEventListener('visibilitychange',visibility);lock?.release?.()};
  },[settings.wakeLock]);
  useEffect(()=>()=>{window.speechSynthesis?.cancel?.()},[]);
  function toggleSpeech(){
    if(!window.speechSynthesis){setIssue('Trình duyệt không hỗ trợ đọc hướng dẫn.');return}
    if(speaking){window.speechSynthesis.cancel();setSpeaking(false);return}
    const text=steps.map((step,index)=>`Bước ${index+1}. ${step}`).join('. ');
    if(!text)return;
    const utterance=new SpeechSynthesisUtterance(text);utterance.lang='vi-VN';
    utterance.onend=()=>setSpeaking(false);utterance.onerror=()=>{setSpeaking(false);setIssue('Không thể đọc hướng dẫn trên thiết bị này.')};
    window.speechSynthesis.cancel();window.speechSynthesis.speak(utterance);setSpeaking(true);setIssue('');
  }
  return <div className="cooking-tools">
    <button type="button" onClick={()=>update('wakeLock',!settings.wakeLock)} disabled={!navigator.wakeLock?.request} aria-pressed={settings.wakeLock}>{settings.wakeLock?'☀ Tắt giữ màn hình sáng':'☀ Giữ màn hình sáng'}</button>
    {settings.readAloud&&<button type="button" onClick={toggleSpeech} disabled={!steps.length}>{speaking?'■ Dừng đọc':'▶ Đọc hướng dẫn'}</button>}
    {issue&&<small role="status">{issue}</small>}
  </div>;
}

function youtubeId(value = '') {
  try { const url = new URL(value); if (url.hostname === 'youtu.be') return url.pathname.slice(1).split('/')[0]; if (url.hostname.endsWith('youtube.com')) return url.searchParams.get('v') || url.pathname.match(/\/embed\/([^/]+)/)?.[1] || url.pathname.match(/\/shorts\/([^/]+)/)?.[1] || ''; } catch { return ''; } return '';
}

function VideoSection({ videos = [], image }) {
  const { settings } = useSettings(); const [selected, setSelected] = useState(0); const [failed, setFailed] = useState(false); const [autoNext, setAutoNext] = useState(false);
  useEffect(() => { setSelected(0); setFailed(false); }, [videos]);
  const current = videos.length ? videos[Math.min(selected, videos.length - 1)] : null; const id = current ? youtubeId(current.path) : '';
  const advance = () => { if (!settings.autoplayVideo || selected >= videos.length - 1) return; setAutoNext(true); setSelected(index => index + 1); setFailed(false); };
  useEffect(() => { const handler = event => { if (!id || !settings.autoplayVideo || event.origin !== 'https://www.youtube-nocookie.com') return; try { const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data; if (data?.event === 'onStateChange' && data.info === 0) advance(); } catch {} }; window.addEventListener('message', handler); return () => window.removeEventListener('message', handler); }, [id, selected, settings.autoplayVideo]);
  if (!videos.length) return <section className="recipe-panel video-panel"><div className="panel-title"><div><small>WATCH & COOK</small><h2>Video hướng dẫn</h2></div></div><div className="video-empty-state">🎬<b>Món ăn này chưa có video hướng dẫn.</b><span>Video sẽ xuất hiện tại đây khi được bổ sung.</span></div></section>;
  const thumbnail = current.thumbnail || (id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : media(image));
  const youtubeReady = event => { const target = event.currentTarget.contentWindow; const send = message => target.postMessage(JSON.stringify(message), 'https://www.youtube-nocookie.com'); send({ event: 'listening', id: 1, channel: 'cookhub' }); window.setTimeout(() => send({ event: 'command', func: 'addEventListener', args: ['onStateChange'], id: 1, channel: 'cookhub' }), 100); };
  return <section className="recipe-panel video-panel"><div className="panel-title"><div><small>WATCH & COOK</small><h2>🎬 Video hướng dẫn</h2><p className="video-subtitle">Xem các cách chế biến món ăn qua video hướng dẫn.</p></div><span className="video-count">{videos.length} video</span></div><div className="video-playlist-layout"><div className="video-main"><div className="video-stage">{failed ? <div className="video-failure">Không thể phát video này.<a href={current.path} target="_blank" rel="noreferrer">Mở video gốc ↗</a><button type="button" onClick={() => setFailed(false)}>Thử lại</button></div> : id ? <iframe title={current.title || 'Video hướng dẫn'} src={`https://www.youtube-nocookie.com/embed/${id}?enablejsapi=1&autoplay=${autoNext ? 1 : 0}&origin=${encodeURIComponent(window.location.origin)}`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen onLoad={youtubeReady} onError={() => setFailed(true)}/> : <video controls preload="metadata" poster={thumbnail} autoPlay={autoNext} src={current.path.startsWith('http') ? current.path : media(current.path)} onEnded={advance} onError={() => setFailed(true)}/>}</div><h3>{current.title}</h3>{current.description&&<p>{current.description}</p>}</div><div className="video-playlist" role="listbox" aria-label="Danh sách video">{videos.map((video, index) => { const videoId = youtubeId(video.path); return <button type="button" role="option" aria-selected={index === selected} className={'video-playlist-item '+(index === selected ? 'active' : '')} key={video.id || index} onClick={() => { setSelected(index); setAutoNext(false); setFailed(false); }}><img src={video.thumbnail || (videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : media(image))} alt="" loading="lazy"/><span className="video-playlist-index">{index + 1}</span><span className="video-playlist-copy"><b>{video.title || `Video hướng dẫn ${index + 1}`}</b><small>{index === selected ? 'Đang chọn' : '▶ Xem video'}</small></span></button>; })}</div></div></section>;
}

function ReviewItem({ item, dishId, onSaved }) {
  const [editing, setEditing] = useState(false), [comment, setComment] = useState(item.comment || ''), [rating, setRating] = useState(item.rating || 5), [saving, setSaving] = useState(false);
  async function save(event) { event.preventDefault(); setSaving(true); try { await api(`/dishes/${dishId}/reviews/${item.id}`, { method: 'PUT', body: { rating, comment } }); setEditing(false); onSaved(); } finally { setSaving(false); } }
  return <article className="review"><div className="review-avatar">{(item.name || 'C').slice(0, 1)}</div><div className="review-content">{editing ? <form className="review-edit-form" onSubmit={save}><div className="star-picker">{[1,2,3,4,5].map(star=><button type="button" key={star} className={star <= rating ? 'selected' : ''} onClick={()=>setRating(star)}>★</button>)}</div><textarea required maxLength={1000} value={comment} onChange={event=>setComment(event.target.value)}/><button type="submit" className="primary" disabled={saving}>Lưu thay đổi</button> <button type="button" onClick={()=>setEditing(false)}>Hủy</button></form> : <><div className="review-head"><b>{item.name}</b><span>★ {item.rating} · {item.date}</span></div><p>{item.comment}</p>{item.editable && <button type="button" className="review-edit" onClick={()=>setEditing(true)}>✎ Sửa</button>}<button type="button" className="review-like">♡ Hữu ích</button></>}</div></article>;
}

function fractionText(value) {
  const whole = Math.floor(value);
  const part = value - whole;
  if (part < 0.000001) return String(whole);
  let bestN = 0, bestD = 1, bestError = 1;
  for (let denominator = 1; denominator <= 24; denominator += 1) {
    const numerator = Math.round(part * denominator);
    const error = Math.abs(part - numerator / denominator);
    if (error < bestError) {
      bestN = numerator;
      bestD = denominator;
      bestError = error;
    }
  }
  if (!bestN) return '0';
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  const divisor = gcd(bestN, bestD);
  const fraction = `${bestN / divisor}/${bestD / divisor}`;
  return whole ? `${whole} ${fraction}` : fraction;
}

function formatApproxGrams(value) {
  if (!Number.isFinite(value)) return '';
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, '');
}

function ingredientKey(item) {
  return String(item?.ingredient_id ?? item?.MaNguyenLieu ?? item?.ingredientId ?? '');
}

function nutritionKcal(item) {
  return item?.nang_luong ?? item?.NangLuong ?? item?.kcal ?? item?.calories ?? null;
}

function formatIngredientQuantity(item, amount) {
  const unit = String(item.unit || '').trim();
  const numeric = Number(amount);
  const unitIsCountable = /muỗng|thìa|vá|ít|bát|chén|cốc|ly|quả|trái|củ|con|miếng|lá|nhánh/i.test(unit);
  const keepOne = unit.toLowerCase() === 'ít' && Number(item.quantity) === 1;
  const display = Number.isFinite(numeric)
    ? (keepOne ? '1' : unitIsCountable ? fractionText(numeric) : numeric.toFixed(2))
    : item.quantity;
  const gramsPerUnit = Number(item.grams_per_unit);
  const approxGrams = Number.isFinite(gramsPerUnit) && gramsPerUnit > 0 && Number.isFinite(numeric) && !/^(g|gam|kg|ml|l)$/i.test(unit)
    ? numeric * gramsPerUnit
    : null;
  return { text: `${display} ${unit}`.trim(), approxGrams };
}

function IngredientQuantity({ item, scale }) {
  const raw = Number(item.quantity);
  const amount = Number.isFinite(raw) ? raw * scale : item.quantity;
  const quantity = formatIngredientQuantity(item, amount);
  return <span className="ingredient-quantity">
    <b>{quantity.text}</b>
    {quantity.approxGrams != null && <small className="ingredient-approx">≈ {formatApproxGrams(quantity.approxGrams)} g</small>}
  </span>;
}

export default function Dish() {
  const { id } = useParams(); const dish = useApi('/dishes/' + id); const reviews = useApi('/dishes/' + id + '/reviews'); const favorites = useApi('/favorites'); const { favoriteCounts, updateFavoriteCount } = useAuth();
  const [error, setError] = useState(''); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false); const [favoriteToast, setFavoriteToast] = useState(false); const [favoriteManagerOpen, setFavoriteManagerOpen] = useState(false); const [menuSuccess, setMenuSuccess] = useState(false); const [servings, setServings] = useState(1); const [prepared, setPrepared] = useState({}); const [rating, setRating] = useState(5); const favoriteToastTimer = useRef(null);
  useEffect(() => () => window.clearTimeout(favoriteToastTimer.current), []);
  useEffect(() => { if (!favoriteManagerOpen) return; const close = event => { if (event.key === 'Escape') { setFavoriteManagerOpen(false); setFavoriteToast(false); } }; window.addEventListener('keydown', close); return () => window.removeEventListener('keydown', close); }, [favoriteManagerOpen]);
  const nutrition = useApi('/dishes/' + id + '/nutrition?servings=' + servings);
  useEffect(() => { const heading = document.querySelector('.ingredients-panel .panel-title h2'); if (heading) heading.textContent = 'Nguyên liệu & Gia vị'; const title = document.querySelector('.ingredients-panel .panel-title'); if (title) { let standard = title.querySelector('.standard-serving'); if (!standard) { standard = document.createElement('span'); standard.className = 'standard-serving'; heading?.parentElement?.appendChild(standard); } standard.textContent = `Khẩu phần chuẩn: ${dish.data?.recipe?.servings || 1} phần`; } }, [dish.data]);
  useEffect(() => { const title = document.querySelector('.steps-panel .panel-title'); const heading = title?.querySelector('h2'); if (title && heading) { let standard = title.querySelector('.standard-serving'); if (!standard) { standard = document.createElement('span'); standard.className = 'standard-serving'; heading.parentElement.appendChild(standard); } standard.textContent = `Khẩu phần chuẩn: ${dish.data?.recipe?.servings || 1} phần`; } }, [dish.data]);
  useEffect(() => { if (message === 'Đã gửi đánh giá.') { reviews.reload(); dish.reload(); } }, [message]);
  async function action(fn, success) { setError(''); setMessage(''); setBusy(true); try { await fn(); setMessage(success); return true; } catch (err) { setError(err.message); return false; } finally { setBusy(false); } }
  return <State resource={dish}>{data => {
    const baseServings = data.recipe?.servings || 1; const scale = servings / baseServings; const ingredients = data.recipe?.ingredients || []; const videos = data.recipe?.videos || []; const kcalByIngredient = Object.fromEntries((nutrition.data?.breakdown || []).map(item => [ingredientKey(item), nutritionKcal(item)]).filter(([key, value]) => key && value != null)); const isFavorite = data.is_favorited ?? favorites.data?.includes(id); const favoriteCount = favoriteCounts[id] ?? data.favorite_count ?? 0;
    return <div className="recipe-detail">{favoriteToast && <div className="favorite-toast-wrap"><div className="favorite-toast" role="status">✓ <b>Đã thêm vào mục Yêu thích</b><button type="button" onClick={()=>{window.clearTimeout(favoriteToastTimer.current);setFavoriteManagerOpen(true)}}>Quản lý ›</button></div>{favoriteManagerOpen&&<DetailFavoriteManager dishId={id} onClose={()=>{setFavoriteManagerOpen(false);setFavoriteToast(false)}} onAdded={()=>{setFavoriteManagerOpen(false);setFavoriteToast(false)}}/>}</div>}<Link className="recipe-back" to="/foods">← Khám phá món ăn</Link><Notice error={error || favorites.error} message={message}/>
      <section className="recipe-hero"><div className="recipe-image"><img src={media(data.image)} alt={data.name}/><span className="recipe-steam steam-one"/><span className="recipe-steam steam-two"/><span className="recipe-steam steam-three"/><span className="recipe-image-light"/></div><div className="recipe-summary"><small className="recipe-category">{data.category}</small><h1>{data.name}</h1><p className="recipe-description">{data.description}</p><div className="recipe-badges"><div className="recipe-time-badges" aria-label="Thời gian thực hiện"><span className="recipe-time-prep"><i>🧺</i> Chuẩn bị: {data.prep_time || '—'}{data.prep_time ? ' phút' : ''}</span><span className="recipe-time-cook"><i>◷</i> Chế biến: {data.time || '—'}{data.time ? ' phút' : ''}</span></div><div className="recipe-info-badges"><span>★ {data.rating} / 5</span><span>{data.difficulty === 'Dễ' ? '☘️' : data.difficulty === 'Khó' ? '🔥' : '🍳'} {data.difficulty || 'Dễ'}</span><span>♥ {favoriteCount} yêu thích</span><span>🔥 ~{nutrition.data?.totals ? Math.round(nutrition.data.totals.nang_luong) : '—'} kcal</span></div></div><p className="recipe-cost">Chi phí tham khảo <b>{data.cost == null ? 'Chưa đủ dữ liệu giá' : money(data.cost)}</b> / công thức</p><button type="button" aria-label={isFavorite ? 'Bỏ yêu thích' : 'Yêu thích'} aria-pressed={Boolean(isFavorite)} className={'recipe-favorite ' + (isFavorite ? 'selected' : '')} disabled={busy} onClick={async () => { const completed = await action(async () => { const adding = !isFavorite; updateFavoriteCount(id, adding ? 1 : -1); try { await api('/favorites/' + id, { method: adding ? 'PUT' : 'DELETE' }); if (adding) { setFavoriteToast(true); window.clearTimeout(favoriteToastTimer.current); favoriteToastTimer.current = window.setTimeout(() => setFavoriteToast(false), 3000); } } catch (error) { updateFavoriteCount(id, adding ? -1 : 1); throw error; } finally { favorites.reload(); dish.reload(); } }, 'Đã cập nhật yêu thích.'); if (!completed) setFavoriteToast(false); }}><span className="favorite-heart" aria-hidden="true">{isFavorite ? '♥' : '♡'}</span>Yêu thích</button></div></section>
      <div className="recipe-layout"><div className="recipe-main"><section className="recipe-panel ingredients-panel"><div className="panel-title"><div><small>CHUẨN BỊ</small><h2>Nguyên liệu</h2></div><div className="serving-stepper"><button type="button" aria-label="Giảm khẩu phần" onClick={() => setServings(value => Math.max(1, value - 1))}>−</button><b key={servings}>{servings} phần</b><button type="button" aria-label="Tăng khẩu phần" onClick={() => setServings(value => Math.min(99, value + 1))}>+</button></div></div>{ingredients.length ? <ul className="interactive-ingredients">{ingredients.map((item, index) => <li className={prepared[index] ? 'prepared' : ''} key={index}><button type="button" className="ingredient-check" aria-label={'Đã chuẩn bị ' + item.name} onClick={() => setPrepared(current => ({ ...current, [index]: !current[index] }))}>{prepared[index] ? '✓' : ''}</button><span>{item.name}</span><IngredientQuantity item={item} scale={scale}/>{kcalByIngredient[ingredientKey(item)] != null && <small className="ingredient-kcal">{Number(kcalByIngredient[ingredientKey(item)]).toFixed(2).replace(/\.?0+$/, '')} kcal</small>}</li>)}</ul> : <p>Chưa có công thức.</p>}</section><section className="recipe-panel nutrition-detail"><div className="panel-title"><div><small>TÍNH TỪ NGUYÊN LIỆU CÔNG THỨC</small><h2>Dinh dưỡng của khẩu phần</h2></div></div>{nutrition.loading ? <p>Đang tính dinh dưỡng…</p> : nutrition.data?.totals ? <><div className="nutrition-metrics"><span><b>{nutrition.data.totals.nang_luong} kcal</b>Năng lượng</span><span><b>{nutrition.data.totals.chat_dam}g</b>Protein</span><span><b>{nutrition.data.totals.chat_bot_duong}g</b>Carbs</span><span><b>{nutrition.data.totals.chat_beo}g</b>Chất béo</span><span><b>{nutrition.data.totals.chat_xo}g</b>Chất xơ</span><span><b>{nutrition.data.totals.natri}mg</b>Natri</span></div>{!nutrition.data.complete && <p className="nutrition-missing">Đã tính các nguyên liệu có dữ liệu. Chưa có dữ liệu: {nutrition.data.missing_ingredients?.join(', ') || 'một số nguyên liệu'}.</p>}</> : <p className="nutrition-missing">Chưa có dữ liệu dinh dưỡng để tính.</p>}</section>
        <section className="recipe-panel steps-panel"><div className="panel-title"><div><small>COOKHUB GUIDE</small><h2>Cách chế biến</h2></div><span className="step-hint">Cuộn để theo dõi từng bước</span></div><CookingTools steps={data.recipe?.steps}/><StepList steps={data.recipe?.steps}/></section>
        <VideoSection videos={videos} image={data.image}/>
        <section className="recipe-panel reviews-panel"><div className="panel-title"><div><small>CHIA SẺ CẢM NHẬN</small><h2>Đánh giá món ăn</h2></div></div><form className="review-form" onSubmit={event => { event.preventDefault(); const body = Object.fromEntries(new FormData(event.currentTarget)); body.rating = rating; action(async () => { await api('/dishes/' + id + '/reviews', { method: 'POST', body }); reviews.reload(); dish.reload(); }, 'Đã gửi đánh giá.'); }}><div className="star-picker" role="radiogroup" aria-label="Chọn số sao">{[1, 2, 3, 4, 5].map(star => <button type="button" key={star} className={star <= rating ? 'selected' : ''} aria-label={`${star} sao`} onClick={() => setRating(star)}>★</button>)}</div><textarea required name="comment" maxLength={1000} placeholder="Món ăn có hợp khẩu vị của bạn không?"/><button className="review-submit primary" disabled={busy}>Gửi đánh giá <span>→</span></button></form><State resource={reviews}>{items => items.length ? <div className="review-list">{items.map(item => <ReviewItem key={item.id} item={item} dishId={id} onSaved={() => reviews.reload()} />)}</div> : <p>Chưa có đánh giá.</p>}</State></section></div>
        <aside><section id="them-vao-thuc-don" className="recipe-panel menu-widget"><small>PLAN YOUR MEAL</small><h2>Thêm vào thực đơn</h2><p>Đưa món ngon này vào kế hoạch ăn uống của bạn.</p><form onSubmit={async event => { event.preventDefault(); const body = Object.fromEntries(new FormData(event.currentTarget)); body.dish_id = id; body.servings = Number(body.servings); const completed = await action(() => api('/menu', { method: 'POST', body }), 'Đã thêm vào thực đơn.'); if (completed) { setMenuSuccess(true); window.setTimeout(() => setMenuSuccess(false), 4200); } }}><Field label="Ngày" type="date" name="date" required defaultValue={today()}/><Field label="Bữa ăn"><select name="meal">{['Sáng', 'Trưa', 'Tối', 'Ăn nhẹ'].map(item => <option key={item}>{item}</option>)}</select></Field><Field label="Khẩu phần" name="servings" type="number" min="1" max="99" value={servings} onChange={event => { const count=Number(event.target.value); if(Number.isInteger(count) && count>=1 && count<=99) setServings(count); }} required/><button className="add-dish-submit primary" disabled={busy}><span>＋</span> Thêm món</button></form>{menuSuccess && <div className="menu-success" role="status"><span className="success-check">✓</span><div><b>Đã thêm món thành công!</b><small>{data.name} đã có trong thực đơn của bạn.</small></div><button type="button" aria-label="Đóng thông báo" onClick={() => setMenuSuccess(false)}>×</button></div>}<Link to="/menu">Xem thực đơn của bạn →</Link></section></aside></div>
    </div>;
  }}</State>;
}


