import { useEffect, useMemo, useRef, useState } from 'react';

import { Link, useSearchParams } from 'react-router-dom';

import { api, media, today } from '../api';

import { useApi } from '../hooks';

import { useAuth } from '../auth';

import { Banner, DishCard, State, Notice } from '../components/Common';

import '../favorites.css';
import '../recipe-generator.css';

function FavoriteManagerPopover({ dishId, onClose }) {
  const collections = useApi('/favorite-collections/for-dish/' + dishId);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  async function add(id) {
    try { await api('/favorite-collections/' + id + '/dishes', {method:'POST', body:{dish_id:dishId}}); onClose(); }
    catch (err) { setError(err.message); }
  }
  async function create(event) {
    event.preventDefault(); if (!name.trim()) return;
    try { const item = await api('/favorite-collections', {method:'POST', body:{name:name.trim()}}); if (item?.MaBoSuuTap) await add(item.MaBoSuuTap); else { collections.reload(); setCreating(false); setName(''); } }
    catch (err) { setError(err.message); }
  }
  return <div className="favorite-manager-popover" role="dialog" aria-label="Quản lý bộ sưu tập">
    {!creating ? <><button type="button" className="manager-create" onClick={()=>setCreating(true)}>⊕ Tạo bộ sưu tập mới</button><State resource={collections}>{items => items.length ? items.map(item => <button type="button" key={item.MaBoSuuTap} onClick={()=>add(item.MaBoSuuTap)}>{item.DaChuaMon ? '✓ ' : '＋ '}{item.TenBoSuuTap}<small>{item.SoLuongMon || 0} món</small></button>) : <p>Chưa có bộ sưu tập.</p>}</State></> : <form onSubmit={create}><b>Tạo bộ sưu tập mới</b><input autoFocus required value={name} onChange={event=>setName(event.target.value)} placeholder="Tên bộ sưu tập"/><div><button type="button" onClick={()=>setCreating(false)}>Hủy</button><button type="submit">Tạo mới</button></div></form>}
    {error && <p className="manager-error">{error}</p>}<button type="button" className="manager-close" onClick={onClose}>×</button>
  </div>;
}

import { OnboardingSurvey } from '../components/Personalization';



const filterNames = { q: 'Món', category: 'Danh mục', max_time: 'Thời gian', calories: 'Năng lượng', difficulty: 'Độ khó', ingredient: 'Nguyên liệu' };

function CollectionDishCards({ collection, dishes, onClose, onFavorite }) {
  const [favoriteState, setFavoriteState] = useState({});
  useEffect(() => {
    if (dishes) setFavoriteState(Object.fromEntries(dishes.map(dish => [dish.id, true])));
  }, [dishes]);
  async function toggleFavorite(id) {
    const next = !favoriteState[id];
    const changed = await onFavorite(id, next);
    if (changed) setFavoriteState(current => ({ ...current, [id]: next }));
  }
  return <div className="collection-detail-overlay" role="presentation" onMouseDown={event=>event.target===event.currentTarget&&onClose()}>
    <section className="collection-detail collection-detail-wide" role="dialog" aria-modal="true" aria-labelledby="collection-detail-title">
      <button type="button" className="collection-detail-close" onClick={onClose} aria-label="Đóng">×</button>
      <header className="collection-detail-header"><div><small>BỘ SƯU TẬP CỦA BẠN</small><h2 id="collection-detail-title">{collection.TenBoSuuTap || collection.name || 'Bộ sưu tập'}</h2></div><span>{dishes === null ? 'Đang tải…' : `${dishes.length} món`}</span></header>
      {dishes?.length ? <div className="collection-dish-card-grid">{dishes.map(dish=><DishCard key={dish.id} dish={dish} favorite={favoriteState[dish.id] !== false} onFavorite={toggleFavorite}/>)}</div> : dishes !== null ? <div className="favorites-empty"><span>🍽️</span><h3>Bộ sưu tập chưa có món</h3><p>Hãy thêm món yêu thích vào bộ sưu tập này.</p></div> : <p className="collection-loading" role="status">Đang tải các món ăn trong bộ sưu tập…</p>}
    </section>
  </div>;
}

const collectionData = [

  ['⚡', 'Món ăn dưới 15 phút', 'Nhanh gọn mà vẫn trọn vị', 'goi-cuon-tom-thit.jpg'],

  ['🥬', 'Thực đơn Eat Clean', 'Nhẹ nhàng, đầy năng lượng', 'salad-tron-dau-giam.jpg'],

  ['🍲', 'Món lẩu tụ tập', 'Ấm áp cho những cuộc gặp gỡ', 'lau-hai-san.jpg'],

];

function currentTheme() { const hour = new Date().getHours(); return hour < 11 ? 'morning' : hour < 17 ? 'noon' : 'evening'; }

function TrendingSortControls({ sortBy, direction, onSortBy, onDirection, count }) {

  return <div className="section-heading trending-heading"><h2>Danh sách món ăn</h2><div className="trending-controls"><span>Sắp xếp:</span><button type="button" className={sortBy === 'rating' ? 'active' : ''} onClick={() => onSortBy('rating')}>★ Đánh giá</button><button type="button" className={sortBy === 'favorite' ? 'active' : ''} onClick={() => onSortBy('favorite')}>♥ Yêu thích</button><i>|</i><button type="button" className={direction === 'desc' ? 'active' : ''} onClick={() => onDirection('desc')} title="Cao đến thấp">↑</button><button type="button" className={direction === 'asc' ? 'active' : ''} onClick={() => onDirection('asc')} title="Thấp đến cao">↓</button></div><span>{count} món</span></div>;

}

function labelForCategory(category, index) { return ['🍜', '🥘', '🔥', '🥬', '🧋', '🍰'][index % 6] + ' ' + category; }



function HomeDashboard({ dishes, favorites, favoriteCounts = {}, onFavorite, error }) {

  const { user } = useAuth(); const theme = currentTheme();

  return <div className={'home-dashboard ' + theme}><Notice error={error}/><section className="home-hero"><div><span>COOKHUB · NẤU NGON MỖI NGÀY</span><h1>Chào {user?.name || 'bạn'}, hôm nay bạn muốn nấu gì?</h1><p>Khám phá những món ngon phù hợp với khẩu vị và nhịp sống của bạn.</p></div><div className="hero-orbit"><span>🍅</span><span>🥬</span><span>🍋</span></div></section>

    <section className="home-section"><div className="home-heading"><div><h2>Gợi ý dành cho bạn</h2></div><Link to="/suggest">Xem tất cả →</Link></div><div className="home-carousel">{dishes.slice(0, 7).map((dish, index) => <article className="home-dish" style={{ animationDelay: `-${index * .55}s` }} key={dish.id}><Link to={'/dish/' + dish.id}><img src={media(dish.image)} alt={dish.name}/><span>{dish.match_percent !== undefined ? `${dish.match_percent}% Hợp vị` : `★ ${dish.rating}`}</span><h3>{dish.name}</h3><small>{dish.time} phút · {dish.category}</small></Link><button className={favorites.includes(dish.id) ? 'selected' : ''} onClick={() => onFavorite(dish.id)}>{favorites.includes(dish.id) ? '♥' : '♡'}</button></article>)}</div></section>

    <section className="home-section"><div className="home-heading"><div><small>CHỦ ĐỀ ĐƯỢC YÊU THÍCH</small><h2>Bộ sưu tập nổi bật</h2></div></div><div className="collection-grid">{collectionData.map(([icon, title, text, image], index) => <Link to="/foods" className={'collection-card c' + index} key={title} style={{ backgroundImage: `linear-gradient(120deg,rgba(12,56,40,.76),rgba(12,56,40,.16)),url(/images/mon-an/${image})` }}><i>{icon}</i><div><h3>{title}</h3><p>{text}</p><span>Khám phá →</span></div></Link>)}</div></section>

    <section className="home-section community-section"><div className="home-heading"><div><small>COOKHUB COMMUNITY</small><h2>Đầu bếp cộng đồng</h2></div><Link to="/foods">Khám phá món ăn →</Link></div><div className="community-feed">{dishes.slice(3, 7).map(dish => <Link to={'/dish/' + dish.id} key={dish.id}><img src={media(dish.image)} alt=""/><div><small>Đầu bếp CookHub · vừa chia sẻ</small><b>{dish.name}</b><span>♥ {favoriteCounts[dish.id] ?? dish.favorite_count ?? 0} yêu thích</span></div><i>↗</i></Link>)}</div></section>

  </div>;

}



function ExploreCatalog({ dishes, categories, params, setParams, favorites, onFavorite }) {

  const [view, setView] = useState('grid'); const [visible, setVisible] = useState(12); const [ingredients, setIngredients] = useState([]); const [timeValue, setTimeValue] = useState(Number(params.get('max_time') || 60)); const [calorieValue, setCalorieValue] = useState(Number(params.get('calories') || 500)); const [difficultyValue, setDifficultyValue] = useState(params.get('difficulty') || ''); const [voiceOpen,setVoiceOpen]=useState(false), [voiceError,setVoiceError]=useState(''); const voiceRef=useRef(null); const activeFilters = [...params.entries()].filter(([key, value]) => filterNames[key] && value);
  function startVoiceSearch(){const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;if(!Recognition){setVoiceError('Trình duyệt chưa hỗ trợ giọng nói. Hãy dùng Chrome hoặc Edge.');setVoiceOpen(true);return}const recognition=new Recognition();voiceRef.current=recognition;recognition.lang='vi-VN';recognition.interimResults=true;recognition.onstart=()=>{setVoiceError('');setVoiceOpen(true)};recognition.onresult=event=>{const text=Array.from(event.results).map(r=>r[0].transcript).join('');const input=document.querySelector('.smart-search input');if(input)input.value=text;if(event.results[0].isFinal){const next=new URLSearchParams(params);next.set('q',text);setParams(next);setVoiceOpen(false)}};recognition.onerror=event=>{setVoiceError(event.error==='not-allowed'?'Hãy cấp quyền microphone cho trang này.':'Không nghe rõ, vui lòng thử lại.');setVoiceOpen(true)};recognition.onend=()=>{voiceRef.current=null};recognition.start()}


  function filterValue(key, value) { if (key === 'category') return categories.find(item => String(item.id) === value)?.name || value; if (key === 'max_time') return `Tối đa ${value} phút`; return value; }

  function removeFilter(key) { const next = new URLSearchParams(params); next.delete(key); setParams(next); }

  return <div className="explore-page search-hub"><section className="explore-hero search-hero"><span>COOKHUB SMART SEARCH</span><h1>Hôm nay bạn muốn nấu gì?</h1><p>Tìm kiếm thông minh theo món ăn, nguyên liệu và thời gian của bạn.</p><form className="smart-search" onSubmit={event => { event.preventDefault(); const query = new FormData(event.currentTarget).get('q'); const next = new URLSearchParams(params); if (query) next.set('q', query); else next.delete('q'); setParams(next); }}><span className="search-glass">⌕</span><input name="q" defaultValue={params.get('q') || ''} placeholder="Thử tìm 'Cơm gà áp chảo'..."/><button type="button" className={'search-tool '+(voiceOpen?'active':'')} aria-label="Tìm bằng giọng nói" onClick={() => { if (voiceOpen) { voiceRef.current?.stop(); setVoiceOpen(false) } else { startVoiceSearch() } }}>🎙️</button><button className="search-submit" aria-label="Tìm kiếm">→</button></form>{voiceOpen&&<div className="voice-popover"><div className="soundwave">{[1,2,3,4,5,6,7].map(i=><i key={i}/>)}</div><b>Đang lắng nghe...</b><p>Hãy nói tên món ăn hoặc nguyên liệu</p>{voiceError&&<small className="voice-error">{voiceError}</small>}<button type="button" onClick={()=>setVoiceOpen(false)}>Hủy</button></div>}</section>

    <section className="ingredient-hub panel"><div><small>TỦ LẠNH NHÀ BẠN</small><h2>Nấu ngay từ nguyên liệu đang có</h2><p>Chọn nguyên liệu để ghép món phù hợp.</p></div><div className="ingredient-chips">{['Thịt gà','Nấm','Cà chua','Rau xanh','Trứng'].map(item => <button type="button" className={ingredients.includes(item) ? 'picked' : ''} key={item} onClick={() => setIngredients(value => value.includes(item) ? value.filter(x => x !== item) : [...value, item])}>{ingredients.includes(item) ? '✓ ' : '+ '}{item}</button>)}</div></section>

    <div className="category-pills" aria-label="Danh mục nhanh">{categories.slice(0, 7).map((category, index) => <button key={category.id} className={String(params.get('category')) === String(category.id) ? 'active' : ''} onClick={() => { const next = new URLSearchParams(params); if (String(params.get('category')) === String(category.id)) next.delete('category'); else next.set('category', category.id); setParams(next); }}><i>{labelForCategory('', index).split(' ')[0]}</i><span>{category.name}</span></button>)}</div>

    <form className="filters premium-filters explore-filters visual-filters" onSubmit={event => { event.preventDefault(); const values = new FormData(event.currentTarget); if (ingredients.length) values.set('ingredient', ingredients.join(',')); else if (params.get('ingredient')) values.set('ingredient', params.get('ingredient')); if (params.get('q')) values.set('q', params.get('q')); if (difficultyValue) values.set('difficulty', difficultyValue); setParams(Object.fromEntries([...values].filter(([, value]) => value !== ''))); }}><label className="range-filter">Thời gian <output key={timeValue}>{timeValue} phút</output><span className="range-track"><input type="range" name="max_time" min="5" max="120" step="5" value={timeValue} onChange={event => { const value = Number(event.target.value); setTimeValue(value); }}/><em>{timeValue} phút</em></span></label><label className="range-filter">Calo <output key={calorieValue}>{calorieValue} kcal</output><span className="range-track"><input type="range" name="calories" min="100" max="1500" step="25" value={calorieValue} onChange={event => { const value = Number(event.target.value); setCalorieValue(value); }}/><em>{calorieValue} kcal</em></span></label><div className="difficulty-filter"><span>Độ khó</span>{['Dễ','Trung bình','Khó'].map(item => <button type="button" className={difficultyValue === item ? 'active' : ''} key={item} onClick={() => setDifficultyValue(value => value === item ? '' : item)}>{item}</button>)}</div><button className="primary filter-submit" type="submit"><span>Tìm món</span><b>⌕</b></button><button className="filter-clear" type="button" onClick={() => { setIngredients([]); setTimeValue(60); setCalorieValue(500); setDifficultyValue(''); setParams({}); }}><span>↻</span> Xóa lọc</button></form>

    {activeFilters.length > 0 && <div className="filter-tags">{activeFilters.map(([key, value]) => <span className="filter-tag" key={key}>{filterNames[key]}: {filterValue(key, value)}<button type="button" onClick={() => removeFilter(key)}>×</button></span>)}</div>}

    {dishes.length === 0 && params.get('ingredient') && <GeneratedRecipeIdea ingredients={params.get('ingredient')}/>}

    <section className="all-recipes"><div className="explore-heading"><div><small>THƯ VIỆN MÓN ĂN</small><h2>Đang hiển thị {Math.min(visible, dishes.length)} món</h2></div><div className="view-switch"><button className={view === 'grid' ? 'active' : ''} onClick={() => setView('grid')} aria-label="Dạng lưới">▦</button><button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')} aria-label="Dạng danh sách">☷</button></div></div><div className={'dish-grid explore-dishes ' + (view === 'list' ? 'list-view' : '')}>{dishes.slice(0, visible).map(dish => <DishCard key={dish.id} dish={dish} favorite={favorites.includes(dish.id)} onFavorite={onFavorite}/>)}</div>{visible < dishes.length && <button className="load-more" onClick={() => setVisible(value => value + 12)}><span>↻</span> Tải thêm món</button>}</section>

  </div>;

}



function DiscoverCatalog({ dishes, categories: dbCategories, favorites, onFavorite }) {
  const [view, setView] = useState('grid');
  const [sortBy, setSortBy] = useState('rating');
  const [order, setOrder] = useState('desc');
  const [randomDish, setRandomDish] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [category, setCategory] = useState('all');
  const categories = [{id:'all',name:'Tất cả món'}, ...(dbCategories || []).map(item => ({id:item.id,name:item.name}))];
  const filtered = dishes.filter(dish => category === 'all' || String(dish.category_id) === String(category));
  const sorted = [...filtered].sort((a, b) => { const key = sortBy === 'favorite' ? 'favorite_count' : 'rating'; const diff = Number(b[key] || 0) - Number(a[key] || 0); return order === 'asc' ? -diff : diff; });
  useEffect(() => {
    if (!previewImage) return undefined;
    const closeOnEscape = event => { if (event.key === 'Escape') setPreviewImage(null); };
    document.addEventListener('keydown', closeOnEscape);
    document.body.classList.add('lightbox-open');
    return () => { document.removeEventListener('keydown', closeOnEscape); document.body.classList.remove('lightbox-open'); };
  }, [previewImage]);
  return <div className="discover-page"><section className="discover-hero"><div><span>✨ COOKHUB RECIPE LIBRARY</span><h1>Thư Viện Ẩm Thực CookHub 🍲</h1><p>Khám phá hơn 1.000+ công thức nấu ăn đa dạng từ khắp các vùng miền.</p></div><button className="random-recipe" onClick={() => { setPreviewImage(null); setRandomDish(sorted[Math.floor(Math.random() * sorted.length)]); }}>🎲 Gợi ý món ngẫu nhiên</button></section>{randomDish && <div className="random-result"><div><span className="random-label">Gợi ý hôm nay</span><small>⏱ {randomDish.time || 0} phút · Độ khó: {randomDish.difficulty || 'Trung bình'}</small><h2>Hôm nay thử <b>{randomDish.name}</b> nhé!</h2><p>💡 Món ngon phù hợp để đổi vị hôm nay, dễ làm và đưa cơm.</p></div><div className="random-thumbs">{(randomDish.images || [randomDish.image]).slice(0,3).map((image,index) => <button type="button" className="random-thumb" key={image || index} onClick={() => setPreviewImage(image)} aria-label={`Phóng to ảnh ${index + 1} của ${randomDish.name}`}><img src={media(image)} alt={`${randomDish.name} - ảnh ${index + 1}`}/></button>)}<button type="button" className="random-dismiss" aria-label="Đóng gợi ý" onClick={() => { setPreviewImage(null); setRandomDish(null); }}>×</button></div></div>}<nav className="discover-categories">{categories.map(item => <button className={category === item.id ? 'active' : ''} key={item.id} onClick={() => setCategory(item.id)}>{item.name}</button>)}</nav><div className="discover-toolbar"><span>Hiển thị <b>{sorted.length}</b> món ăn</span><div className="discover-actions"><button className={sortBy === 'rating' ? 'active' : ''} onClick={() => setSortBy('rating')}>★ Đánh giá</button><button className={sortBy === 'favorite' ? 'active' : ''} onClick={() => setSortBy('favorite')}>♥ Yêu thích</button><button className={order === 'desc' ? 'active' : ''} onClick={() => setOrder('desc')}>↑</button><button className={order === 'asc' ? 'active' : ''} onClick={() => setOrder('asc')}>↓</button><button onClick={() => setView(view === 'grid' ? 'list' : 'grid')}>{view === 'grid' ? '☷' : '▦'}</button></div></div><div className={'dish-grid discover-grid ' + (view === 'list' ? 'list-view' : '')}>{sorted.map(dish => <DishCard key={dish.id} dish={dish} favorite={favorites.includes(dish.id)} onFavorite={onFavorite}/>)}{previewImage && <div className="dish-lightbox" role="dialog" aria-modal="true" aria-label={`Ảnh phóng to của ${randomDish?.name || 'món ăn'}`} onMouseDown={event => { if (event.target === event.currentTarget) setPreviewImage(null); }}><figure><img src={media(previewImage)} alt={randomDish?.name || 'Món ăn'}/><figcaption>{randomDish?.name}</figcaption><button type="button" aria-label="Đóng ảnh phóng to" onClick={() => setPreviewImage(null)}>×</button></figure></div>}</div></div>;
}

function GeneratedRecipeIdea({ingredients}) {
  const resource=useApi('/recipe-generator?ingredient='+encodeURIComponent(ingredients));
  return <State resource={resource}>{idea=><section className="generated-recipe panel"><div><span>✨ AI RECIPE GENERATOR</span><h2>{idea.title}</h2><p>{idea.description}</p><small>Đây là công thức gợi ý mới, hãy điều chỉnh lượng gia vị theo khẩu vị và bảo đảm nguyên liệu được nấu chín.</small></div><ol>{idea.steps.map((step,index)=><li key={step}><b>{index+1}</b>{step}</li>)}</ol></section>}</State>;
}

function CategoryDropdown({categories, value, onChange}) {
  const [open, setOpen] = useState(false);
  const selected = categories.find(item => String(item.id) === String(value));
  return <div className={'catalog-dropdown '+(open?'open':'')}><button type="button" className="catalog-dropdown-trigger" aria-expanded={open} onClick={() => setOpen(v => !v)}>{selected?.name || 'Tất cả danh mục'}<span>⌄</span></button>{open&&<div className="catalog-dropdown-menu" role="listbox"><button type="button" className={!value?'selected':''} onClick={() => {onChange('');setOpen(false)}}>Tất cả danh mục</button>{categories.map(item=><button type="button" className={String(item.id)===String(value)?'selected':''} key={item.id} onClick={() => {onChange(String(item.id));setOpen(false)}}>{item.name}</button>)}</div>}</div>;
}

function FavoritesCatalog({ categories, onFavorite }) {
  const resource = useApi('/favorites/details');
  const collectionResource = useApi('/favorite-collections');
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('all');
  const [collection, setCollection] = useState('all');
  const [message, setMessage] = useState('');
  const [busyId, setBusyId] = useState('');
  const [view, setView] = useState('all');
  const [collectionModal, setCollectionModal] = useState(false);
  const [newCollection, setNewCollection] = useState({name:'', description:''});
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [collectionDishes, setCollectionDishes] = useState(null);
  const [collectionPreview, setCollectionPreview] = useState(null);
  const collections = [
    ['all','Tất cả'], ['easy','Món ngon dễ làm'], ['family','Bữa cơm gia đình'],
    ['healthy','Eat Clean & Healthy'], ['breakfast','Món ăn sáng']
  ];
  const belongsToCollection = (dish, key) => {
    if (key === 'all') return true;
    if (key === 'easy') return dish.difficulty === 'Dễ';
    if (key === 'family') return /cơm|canh|thịt|cá/i.test(dish.category || '');
    if (key === 'healthy') return /salad|rau|chay/i.test(dish.category || '') || (dish.diets || []).some(item => /clean|healthy|giảm cân/i.test(item.name));
    return /cháo|trứng|bánh mì|sinh tố/i.test(`${dish.category || ''} ${dish.name || ''}`);
  };
  async function removeFavorite(id, desired = false) {
    setBusyId(id); setMessage('');
    const changed = await onFavorite(id, desired); if (changed) resource.reload(); setBusyId('');
    return changed;
  }
  async function addToMenu(dish) {
    setBusyId(dish.id); setMessage('');
    try { await api('/menu',{method:'POST',body:{date:today(),meal:'Trưa',dish_id:dish.id,servings:1}}); setMessage(`Đã thêm ${dish.name} vào bữa trưa hôm nay.`); }
    catch(err) { setMessage(err.message); } finally { setBusyId(''); }
  }
  async function createCollection(event) {
    event.preventDefault();
    if (!newCollection.name.trim()) return;
    try {
      await api('/favorite-collections', {method:'POST', body:newCollection});
      setNewCollection({name:'', description:''}); setCollectionModal(false); collectionResource.reload();
      setMessage('Đã tạo bộ sưu tập.');
    } catch (err) { setMessage(err.message); }
  }
  async function addToCollection(collectionId, dishId) {
    try { await api(`/favorite-collections/${collectionId}/dishes`, {method:'POST', body:{dish_id:dishId}}); setMessage('Đã thêm món vào bộ sưu tập.'); collectionResource.reload(); }
    catch (err) { setMessage(err.message); }
  }
  async function openCollection(item, favoriteItems = resource.data || []) {
    setCollectionPreview(item); setCollectionDishes(null);
    try {
      const memberships = await Promise.all(favoriteItems.map(async dish => {
        try {
          const rows = await api('/favorite-collections/for-dish/'+dish.id);
          const membership = rows.find(row => String(row.MaBoSuuTap || row.collection_id) === String(item.MaBoSuuTap));
          const included = membership && (membership.DaChuaMon === undefined || [true, 1, '1', 'true'].includes(membership.DaChuaMon));
          return included ? dish : null;
        }
        catch { return null; }
      }));
      setCollectionDishes(memberships.filter(Boolean));
    } catch { setCollectionDishes([]); }
  }
  return <State resource={resource}>{items => {
    const filtered = items.filter(dish => dish.name.toLocaleLowerCase('vi-VN').includes(searchTerm.trim().toLocaleLowerCase('vi-VN')) && (category === 'all' || String(dish.category_id) === category) && belongsToCollection(dish, collection));
    const easyCount = items.filter(dish => dish.difficulty === 'Dễ').length;
    const cookingTimes = items.map(dish => Number(dish.time || 0)).filter(Boolean);
    const fastest = cookingTimes.length ? Math.min(...cookingTimes) : 0;
    const collectionsData = collectionResource.data || [];
    return <div className="favorites-library"><section className="favorites-hero"><div><span>COOKHUB / THƯ VIỆN CÁ NHÂN</span><h1>Những món bạn yêu thích ❤️</h1><p>Bộ sưu tập công thức yêu thích giúp bạn vào bếp nhanh hơn mỗi ngày.</p></div><div className="favorite-stats"><div><b>{items.length}</b><small>Món đã lưu</small></div><i/><div><b>{easyCount}</b><small>Món dễ làm</small></div><i/><div><b>⚡ {fastest || 0}m</b><small>Nấu nhanh nhất</small></div></div></section>{message && <p className="favorites-notice">{message}</p>}<div className="favorites-view-tabs"><button className={view==='all'?'active':''} onClick={()=>setView('all')}>Tất cả {items.length}</button><button className={view==='collections'?'active':''} onClick={()=>setView('collections')}>Bộ sưu tập {collectionsData.length}</button><button className="create-collection" onClick={()=>setCollectionModal(true)}>⊕ Tạo bộ sưu tập mới</button></div>{view==='all' ? <><div className="favorites-heading"><h2>Danh sách món ăn</h2><span>{filtered.length} món</span></div>{filtered.length ? <div className="favorite-card-grid">{filtered.map(dish => <article className="favorite-food-card" key={dish.id}><div className="favorite-card-image"><Link to={'/dish/'+dish.id}><img src={media(dish.image)} alt={dish.name}/></Link><button type="button" disabled={busyId === dish.id} aria-label={'Bỏ yêu thích '+dish.name} onClick={() => removeFavorite(dish.id)}>♥</button><span>{dish.category}</span></div><div className="favorite-card-body"><div><b>⭐ {dish.rating}</b><small>{dish.difficulty}</small></div><h3><Link to={'/dish/'+dish.id}>{dish.name}</Link></h3><p><span>⏱ {dish.time} phút</span><span>🔥 {dish.calories ? `${dish.calories} kcal` : 'Chưa đủ dữ liệu'}</span></p><button type="button" disabled={busyId === dish.id} onClick={() => addToMenu(dish)}>📅 {busyId === dish.id ? 'Đang thêm...' : 'Thêm vào thực đơn'}</button><button type="button" className="collection-add-inline" onClick={()=>setSelectedCollection(dish)}>＋ Bộ sưu tập</button></div></article>)}</div> : <div className="favorites-empty"><span>🍳</span><h3>Không tìm thấy món ăn phù hợp</h3><p>Thử từ khóa hoặc bộ lọc khác để xem lại bộ sưu tập của bạn.</p></div>}</> : <div className="collection-grid">{collectionsData.map(item=>{const cover=item.DuongDanAnhBia||item.AnhMonAn||item.HinhAnh||item.image;return <button className="collection-card" key={item.MaBoSuuTap} onClick={()=>openCollection(item)}><div className="collection-card-cover">{cover?<img src={media(cover)} alt=""/>:<span>🔖</span>}<span className="collection-lock" aria-label="Bộ sưu tập riêng tư">🔒</span></div><strong>{item.TenBoSuuTap}</strong><small>{item.SoLuongMon || 0} món</small></button>})}{!collectionsData.length&&<div className="favorites-empty"><span>🔖</span><h3>Chưa có bộ sưu tập</h3><p>Tạo bộ sưu tập đầu tiên của bạn.</p></div>}</div>}{collectionPreview&&<CollectionDishCards collection={collectionPreview} dishes={collectionDishes} onClose={()=>setCollectionPreview(null)} onFavorite={removeFavorite}/>}{selectedCollection&&<div className="collection-picker"><div><button onClick={()=>setSelectedCollection(null)}>×</button><h3>Thêm vào bộ sưu tập</h3>{collectionsData.map(item=><button key={item.MaBoSuuTap} onClick={()=>{addToCollection(item.MaBoSuuTap,selectedCollection.id);setSelectedCollection(null)}}>{item.TenBoSuuTap} · {item.SoLuongMon||0} món</button>)}</div></div>}{collectionModal&&<div className="collection-picker"><form onSubmit={createCollection}><button type="button" onClick={()=>setCollectionModal(false)}>×</button><h3>Tạo bộ sưu tập mới</h3><input required value={newCollection.name} onChange={e=>setNewCollection({...newCollection,name:e.target.value})} placeholder="Tên bộ sưu tập"/><textarea value={newCollection.description} onChange={e=>setNewCollection({...newCollection,description:e.target.value})} placeholder="Mô tả (không bắt buộc)"/><button type="submit">Tạo bộ sưu tập</button></form></div>}</div>;
  }}</State>;
}

export default function Catalog({ page = 'home' }) {

  const [params, setParams] = useSearchParams(); const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const [favoriteToast, setFavoriteToast] = useState(false); const [managerOpen, setManagerOpen] = useState(false); const [collectionManager, setCollectionManager] = useState(''); const [managerCollections, setManagerCollections] = useState(null); const [newCollectionOpen, setNewCollectionOpen] = useState(false); const [newCollectionName, setNewCollectionName] = useState(''); const mode = params.get('mode') || 'for_you'; const sortBy = params.get('sort_by') || 'rating'; const direction = params.get('direction') || 'desc';

  const query = new URLSearchParams(params); if (page === 'home') query.set('display', 'home'); if (page === 'foods') query.set('display', 'foods');

  const resource = useApi(page === 'home' ? '/recommendations?mode=for_you' : page === 'suggest' ? '/recommendations?mode=' + mode + '&sort_by=' + (sortBy === 'favorite' ? 'favorites' : sortBy) + '&direction=' + direction : '/dishes?' + query); const favorites = useApi('/favorites'); const categories = useApi('/categories');

  const favoriteIds = favorites.data || [];

  const { favoriteCounts, updateFavoriteCount } = useAuth();

  async function favorite(id, desiredAdding) { if (busy) return false; const adding = desiredAdding === undefined ? !favoriteIds.includes(id) : desiredAdding; setBusy(true); setError(''); updateFavoriteCount(id, adding ? 1 : -1); try { await api('/favorites/' + id, { method: adding ? 'PUT' : 'DELETE' }); favorites.reload(); if (adding) { setFavoriteToast(true); setCollectionManager(id); api('/favorite-collections/for-dish/'+id).then(setManagerCollections).catch(()=>setManagerCollections([])); } return true; } catch (err) { updateFavoriteCount(id, adding ? -1 : 1); setError(err.message); return false; } finally { setBusy(false); } }

  async function addToManagerCollection(collectionId) { try { await api('/favorite-collections/' + collectionId + '/dishes', {method:'POST', body:{dish_id:collectionManager}}); setCollectionManager(''); setFavoriteToast(false); } catch (err) { setError(err.message); } }

  async function hide(id) { try { await api('/hidden/' + id, { method: 'PUT' }); resource.reload(); } catch (err) { setError(err.message); } }

  const title = { search: 'Tìm món ăn của bạn', favorites: 'Những món bạn yêu thích', suggest: 'Một chút cảm hứng cho bữa ăn' }[page];

  const activeTabLabel = { for_you:'Dành cho bạn', taste:'Hợp khẩu vị', healthy:'Theo chế độ ăn', trending:'Thịnh hành' }[mode] || 'Dành cho bạn';

  if (page === 'favorites') return <FavoritesCatalog categories={categories.data || []} onFavorite={favorite}/>;

 return <>{favoriteToast && <div className="favorite-toast-wrap"><div className="favorite-toast" role="status">✓ <b>Đã thêm vào mục Yêu thích</b><button type="button" onClick={()=>setManagerOpen(true)}>Quản lý ›</button></div>{managerOpen&&collectionManager&&<FavoriteManagerPopover dishId={collectionManager} onClose={()=>{setManagerOpen(false);setCollectionManager("");setFavoriteToast(false)}}/>}</div>}{page === 'home' && <OnboardingSurvey onComplete={() => {resource.reload();favorites.reload();}} onFavorites={favorites.reload}/>}<State resource={resource}>{data => { if (page === 'home') return <HomeDashboard dishes={data} favorites={favoriteIds} favoriteCounts={favoriteCounts} onFavorite={favorite} error={error || favorites.error}/>; if (page === 'foods') return <DiscoverCatalog dishes={data} categories={categories.data || []} favorites={favoriteIds} onFavorite={favorite}/>; if (page === 'search') return <ExploreCatalog dishes={data} categories={categories.data || []} params={params} setParams={setParams} favorites={favoriteIds} onFavorite={favorite}/>; const activeFilters = [...params.entries()].filter(([key, value]) => filterNames[key] && value); return <><Banner page={page} title={title} subtitle="Từ những nguyên liệu quen thuộc đến bữa ăn trọn vị."/><Notice error={error || favorites.error || categories.error}/>{page === 'suggest' ? <div className="tabs">{Object.entries({ for_you:'Dành cho bạn', taste:'Hợp khẩu vị', healthy:'Theo chế độ ăn', trending:'Thịnh hành' }).map(([key, label]) => <button key={key} className={mode === key ? 'active' : ''} onClick={() => setParams({ mode:key })}>{label}</button>)}</div> : <form className="filters premium-filters panel" onSubmit={event => { event.preventDefault(); const values = new FormData(event.currentTarget); setParams(Object.fromEntries([...values].filter(([, value]) => value !== ''))); }}><div className="filter-field"><input name="q" placeholder="Tên món ăn…" defaultValue={params.get('q') || ''}/></div><div className="filter-field"><select name="category" defaultValue={params.get('category') || ''}><option value="">Tất cả danh mục</option>{categories.data?.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div><button className="primary filter-submit">Tìm kiếm</button><button className="filter-clear" type="button" onClick={() => setParams({})}>↻ Xóa bộ lọc</button></form>}{activeFilters.length > 0 && <div className="filter-tags">{activeFilters.map(([key,value]) => <span className="filter-tag" key={key}>{filterNames[key]}: {value}</span>)}</div>}{page === 'suggest' && mode === 'trending' ? <TrendingSortControls sortBy={sortBy} direction={direction} count={data.length} onSortBy={value => setParams({ mode, sort_by: value, direction })}/> : <div className="section-heading"><h2>{page === 'favorites' ? 'Danh sách món yêu thích' : 'Danh sách món ăn'}</h2><span>{data.length} món</span></div>}<div className="dish-grid">{(page === 'favorites' ? data.filter(item => favoriteIds.includes(item.id)) : data).map(dish => <DishCard key={dish.id} dish={dish} favorite={favoriteIds.includes(dish.id)} onFavorite={favorite} onHide={page === 'suggest' ? hide : null}/>)}</div></>; }}</State></>;

}





























