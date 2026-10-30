import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, media, money, today } from '../api';
import { useApi } from '../hooks';
import { State, Field, Notice } from '../components/Common';
import { useAuth } from '../auth';
import { useSettings } from '../settings-context';

function StepList({ steps = [] }) {
  const [active, setActive] = useState(0); const refs = useRef([]);
  useEffect(() => {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) setActive(Number(entry.target.dataset.step)); }), { threshold: .56 });
    refs.current.forEach(item => item && observer.observe(item)); return () => observer.disconnect();
  }, [steps.length]);
  return <div className="recipe-steps">{steps.map((step, index) => <article ref={item => { refs.current[index] = item; }} data-step={index} key={index} className={active === index ? 'active' : ''}><b>{index + 1}</b><p>{step}</p></article>)}</div>;
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

export default function Dish() {
  const { id } = useParams(); const dish = useApi('/dishes/' + id); const reviews = useApi('/dishes/' + id + '/reviews'); const favorites = useApi('/favorites'); const { favoriteCounts, updateFavoriteCount } = useAuth();
  const [error, setError] = useState(''); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false); const [favoriteToast, setFavoriteToast] = useState(false); const [menuSuccess, setMenuSuccess] = useState(false); const [servings, setServings] = useState(1); const [prepared, setPrepared] = useState({}); const [rating, setRating] = useState(5);
  const nutrition = useApi('/dishes/' + id + '/nutrition?servings=' + servings);
  async function action(fn, success) { setError(''); setMessage(''); setBusy(true); try { await fn(); setMessage(success); return true; } catch (err) { setError(err.message); return false; } finally { setBusy(false); } }
  return <State resource={dish}>{data => {
    const baseServings = data.recipe?.servings || 1; const scale = servings / baseServings; const ingredients = data.recipe?.ingredients || []; const videos = data.recipe?.videos || []; const isFavorite = data.is_favorited ?? favorites.data?.includes(id); const favoriteCount = favoriteCounts[id] ?? data.favorite_count ?? 0;
    return <div className="recipe-detail">{favoriteToast && <div className="favorite-toast" role="status">✓ <b>Đã thêm vào mục Yêu thích</b><Link to="/favorites">Quản lý ›</Link></div>}<Link className="recipe-back" to="/foods">← Khám phá món ăn</Link><Notice error={error || favorites.error} message={message}/>
      <section className="recipe-hero"><div className="recipe-image"><img src={media(data.image)} alt={data.name}/><span className="recipe-steam steam-one"/><span className="recipe-steam steam-two"/><span className="recipe-steam steam-three"/><span className="recipe-image-light"/></div><div className="recipe-summary"><small className="recipe-category">{data.category}</small><h1>{data.name}</h1><p className="recipe-description">{data.description}</p><div className="recipe-badges"><span>★ {data.rating} / 5</span><span><i>◷</i> {data.time} phút</span><span>{data.difficulty === 'Dễ' ? '☘️' : data.difficulty === 'Khó' ? '🔥' : '🍳'} {data.difficulty || 'Dễ'}</span><span>♥ {favoriteCount} yêu thích</span><span>🔥 ~{nutrition.data?.totals ? Math.round(nutrition.data.totals.nang_luong) : '—'} kcal</span></div><p className="recipe-cost">Chi phí tham khảo <b>{data.cost == null ? 'Chưa đủ dữ liệu giá' : money(data.cost)}</b> / công thức</p><button type="button" aria-label={isFavorite ? 'Bỏ yêu thích' : 'Yêu thích'} aria-pressed={Boolean(isFavorite)} className={'recipe-favorite ' + (isFavorite ? 'selected' : '')} disabled={busy} onClick={async () => { const completed = await action(async () => { const adding = !isFavorite; updateFavoriteCount(id, adding ? 1 : -1); try { await api('/favorites/' + id, { method: adding ? 'PUT' : 'DELETE' }); if (adding) { setFavoriteToast(true); window.setTimeout(() => setFavoriteToast(false), 6000); } } catch (error) { updateFavoriteCount(id, adding ? -1 : 1); throw error; } finally { favorites.reload(); dish.reload(); } }, 'Đã cập nhật yêu thích.'); if (!completed) setFavoriteToast(false); }}><span className="favorite-heart" aria-hidden="true">{isFavorite ? '♥' : '♡'}</span>Yêu thích</button></div></section>
      <div className="recipe-layout"><div className="recipe-main"><section className="recipe-panel ingredients-panel"><div className="panel-title"><div><small>CHUẨN BỊ</small><h2>Nguyên liệu</h2></div><div className="serving-stepper"><button type="button" aria-label="Giảm khẩu phần" onClick={() => setServings(value => Math.max(1, value - 1))}>−</button><b key={servings}>{servings} phần</b><button type="button" aria-label="Tăng khẩu phần" onClick={() => setServings(value => Math.min(99, value + 1))}>+</button></div></div>{ingredients.length ? <ul className="interactive-ingredients">{ingredients.map((item, index) => <li className={prepared[index] ? 'prepared' : ''} key={index}><button type="button" className="ingredient-check" aria-label={'Đã chuẩn bị ' + item.name} onClick={() => setPrepared(current => ({ ...current, [index]: !current[index] }))}>{prepared[index] ? '✓' : ''}</button><span>{item.name}</span><b>{Number.isFinite(Number(item.quantity)) ? Number(item.quantity) * scale : item.quantity} {item.unit}</b></li>)}</ul> : <p>Chưa có công thức.</p>}</section><section className="recipe-panel nutrition-detail"><div className="panel-title"><div><small>TÍNH TỪ NGUYÊN LIỆU CÔNG THỨC</small><h2>Dinh dưỡng của khẩu phần</h2></div></div>{nutrition.loading ? <p>Đang tính dinh dưỡng…</p> : nutrition.data?.complete ? <div className="nutrition-metrics"><span><b>{nutrition.data.totals.nang_luong} kcal</b>Năng lượng</span><span><b>{nutrition.data.totals.chat_dam}g</b>Protein</span><span><b>{nutrition.data.totals.chat_bot_duong}g</b>Carbs</span><span><b>{nutrition.data.totals.chat_beo}g</b>Chất béo</span><span><b>{nutrition.data.totals.chat_xo}g</b>Chất xơ</span><span><b>{nutrition.data.totals.natri}mg</b>Natri</span></div> : <p className="nutrition-missing">Chưa đủ dữ liệu để tính chính xác: {nutrition.data?.missing_ingredients?.join(', ') || nutrition.error || 'đang kiểm tra'}.</p>}</section>
        <section className="recipe-panel steps-panel"><div className="panel-title"><div><small>COOKHUB GUIDE</small><h2>Cách chế biến</h2></div><span className="step-hint">Cuộn để theo dõi từng bước</span></div><CookingTools steps={data.recipe?.steps}/><StepList steps={data.recipe?.steps}/></section>
        <VideoSection videos={videos} image={data.image}/>
        <section className="recipe-panel reviews-panel"><div className="panel-title"><div><small>CHIA SẺ CẢM NHẬN</small><h2>Đánh giá món ăn</h2></div></div><form className="review-form" onSubmit={event => { event.preventDefault(); const body = Object.fromEntries(new FormData(event.currentTarget)); body.rating = rating; action(async () => { await api('/dishes/' + id + '/reviews', { method: 'POST', body }); reviews.reload(); dish.reload(); }, 'Đã gửi đánh giá.'); }}><div className="star-picker" role="radiogroup" aria-label="Chọn số sao">{[1, 2, 3, 4, 5].map(star => <button type="button" key={star} className={star <= rating ? 'selected' : ''} aria-label={`${star} sao`} onClick={() => setRating(star)}>★</button>)}</div><textarea required name="comment" maxLength={1000} placeholder="Món ăn có hợp khẩu vị của bạn không?"/><button className="review-submit primary" disabled={busy}>Gửi đánh giá <span>→</span></button></form><State resource={reviews}>{items => items.length ? <div className="review-list">{items.map(item => <article className="review" key={item.id}><div className="review-avatar">{(item.name || 'C').slice(0, 1)}</div><div><div className="review-head"><b>{item.name}</b><span>★ {item.rating} · {item.date}</span></div><p>{item.comment}</p><button type="button" className="review-like">♡ Hữu ích</button></div></article>)}</div> : <p>Chưa có đánh giá.</p>}</State></section></div>
        <aside><section id="them-vao-thuc-don" className="recipe-panel menu-widget"><small>PLAN YOUR MEAL</small><h2>Thêm vào thực đơn</h2><p>Đưa món ngon này vào kế hoạch ăn uống của bạn.</p><form onSubmit={async event => { event.preventDefault(); const body = Object.fromEntries(new FormData(event.currentTarget)); body.dish_id = id; body.servings = Number(body.servings); const completed = await action(() => api('/menu', { method: 'POST', body }), 'Đã thêm vào thực đơn.'); if (completed) { setMenuSuccess(true); window.setTimeout(() => setMenuSuccess(false), 4200); } }}><Field label="Ngày" type="date" name="date" required defaultValue={today()}/><Field label="Bữa ăn"><select name="meal">{['Sáng', 'Trưa', 'Tối', 'Ăn nhẹ'].map(item => <option key={item}>{item}</option>)}</select></Field><Field label="Khẩu phần" name="servings" type="number" min="1" max="99" value={servings} onChange={event => { const count=Number(event.target.value); if(Number.isInteger(count) && count>=1 && count<=99) setServings(count); }} required/><button className="add-dish-submit primary" disabled={busy}><span>＋</span> Thêm món</button></form>{menuSuccess && <div className="menu-success" role="status"><span className="success-check">✓</span><div><b>Đã thêm món thành công!</b><small>{data.name} đã có trong thực đơn của bạn.</small></div><button type="button" aria-label="Đóng thông báo" onClick={() => setMenuSuccess(false)}>×</button></div>}<Link to="/menu">Xem thực đơn của bạn →</Link></section></aside></div>
    </div>;
  }}</State>;
}


