import MealDishPicker from '../components/MealDishPicker';
import MenuPlannedDish from '../components/MenuPlannedDish';
import MenuNutritionSuggestions from '../components/MenuNutritionSuggestions';
import HouseholdNutrition, { PortionEditor } from '../components/HouseholdNutrition';
import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, today, media } from '../api';
import { defaultAvatar } from '../default-avatar';
import { useApi } from '../hooks';
import { useAuth } from '../auth';
import { State, Banner, Field, Notice } from '../components/Common';
const PreferencesSettingsContent = lazy(() => import('../components/Personalization').then(module => ({default: module.PreferencesSettings})));
function PreferencesSettings(props) {
  return <Suspense fallback={null}><PreferencesSettingsContent {...props}/></Suspense>;
}
import { nutritionAlerts, weeklyNutritionAlerts } from '../nutrition-alerts';
import '../profile.css';
import '../profile-overrides.css';
import '../pantry-custom.css';
import '../settings.css';
import '../settings-dark.css';

export function getWeekDates(value) {
  const current = new Date(value + 'T12:00:00');
  const daysSinceMonday = (current.getDay() + 6) % 7;
  const monday = new Date(current);
  monday.setDate(current.getDate() - daysSinceMonday);
  return Array.from({length: 7}, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return date;
  });
}

export function Pantry() {
  const resource = useApi('/pantry'), units = useApi('/units');
  const [error,setError] = useState(''), [busy,setBusy] = useState(false), [activeCategory,setActiveCategory] = useState('spices'), [searchQuery,setSearchQuery] = useState('');
  const navigate = useNavigate();
  useEffect(()=>{const reload=()=>resource.reload();window.addEventListener('pantry-updated',reload);return()=>window.removeEventListener('pantry-updated',reload);},[]);
  const categories = [
    {id:'spices',label:'🧂 Gia vị & Mắm muối',items:[['Nước mắm','ml','🍾'],['Muối tinh','g','🧂'],['Hạt tiêu','g','🧂'],['Hạt nêm','g','✨'],['Đường','g','🍬'],['Dầu ăn','ml','🛢️'],['Xì dầu','ml','🥢'],['Tương ớt','ml','🌶️']]},
    {id:'meat',label:'🥩 Các loại thịt',items:[['Thịt ba chỉ','g','🥓'],['Thịt bò','g','🥩'],['Thịt gà','g','🍗'],['Sườn heo','g','🍖'],['Thịt xay','g','🥩'],['Vịt','kg','🦆']]},
    {id:'vegetables',label:'🥬 Rau củ tươi',items:[['Cà chua','quả','🍅'],['Hành tây','củ','🧅'],['Tỏi','củ','🧄'],['Rau cải','bó','🥬'],['Bắp cải','g','🥗'],['Khoai tây','củ','🥔'],['Cà rốt','củ','🥕'],['Ớt tươi','quả','🌶️']]},
    {id:'seafood',label:'🐟 Hải sản tươi sống',items:[['Tôm tươi','g','🦐'],['Cá hồi','g','🐟'],['Mực ống','g','🦑'],['Cua biển','g','🦀'],['Ngao','g','🦪']]},
    {id:'dairy',label:'🥚 Trứng & Bơ sữa',items:[['Trứng gà','quả','🥚'],['Trứng vịt','quả','🥚'],['Sữa tươi','ml','🥛'],['Bơ lạt','g','🧈'],['Phô mai','miếng','🧀']]}
  ];
  const allPresets=categories.flatMap(category => category.items.map(([name,symbol,icon]) => ({name,symbol,icon,category:category.label.replace(/^\S+\s/, '')})));
  const currentCategory=categories.find(category => category.id===activeCategory) || categories[0];
  const pantryItems=resource.data || [];
  const presetFor=name => allPresets.find(item => item.name.toLocaleLowerCase('vi-VN')===name.toLocaleLowerCase('vi-VN'));
  const stepFor=symbol => ['g','ml'].includes(symbol) ? 100 : 1;
  async function quickAdd(name,symbol) {
    const unit=units.data?.find(item => item.symbol.toLocaleLowerCase('vi-VN')===symbol.toLocaleLowerCase('vi-VN'));
    if(!unit){setError(`Chưa có đơn vị ${symbol} trong cơ sở dữ liệu.`);return;}
    const existing=pantryItems.find(item => item.name.toLocaleLowerCase('vi-VN')===name.toLocaleLowerCase('vi-VN'));
    const step=stepFor(symbol); setBusy(true); setError('');
    try { if(existing) await api('/pantry/'+existing.id,{method:'PUT',body:{quantity:Number(existing.quantity)+step}}); else await api('/pantry',{method:'POST',body:{name,quantity:step,unit_id:unit.id}}); resource.reload(); }
    catch(err){setError(err.message);} finally{setBusy(false);}
  }
  async function updateAmount(item,direction){const step=stepFor(item.unit);const quantity=Math.max(0,Number(item.quantity)+(direction*step));try{await api('/pantry/'+item.id,{method:'PUT',body:{quantity}});resource.reload();}catch(err){setError(err.message);}}
  async function remove(id){try{await api('/pantry/'+id,{method:'DELETE'});resource.reload();}catch(err){setError(err.message);}}
  async function clearAll(){setBusy(true);setError('');try{for(const item of pantryItems)await api('/pantry/'+item.id,{method:'DELETE'});resource.reload();}catch(err){setError(err.message);}finally{setBusy(false);}}
  function cookFromPantry() {
    const seasoningNames = new Set([
      ...categories.find(category => category.id === 'spices').items.map(([name]) => name.toLocaleLowerCase('vi-VN')),
      'mắm', 'muối', 'tiêu', 'nước tương', 'bột ngọt', 'mì chính', 'dầu hào',
      'rau mùi', 'ngò rí', 'ngò', 'hành lá', 'tỏi', 'ớt tươi',
    ]);
    const ingredient = pantryItems
      .map(item => item.name.trim())
      .filter(name => name && !seasoningNames.has(name.toLocaleLowerCase('vi-VN').normalize('NFC')))
      .join(',');
    if (!ingredient) {
      setError('Hãy thêm ít nhất một nguyên liệu chính như thịt, cá, trứng hoặc rau củ để tìm món.');
      return;
    }
    setError('');
    const query = new URLSearchParams({ ingredient, ingredient_match: 'any' });
    navigate('/search?' + query);
  }
  const visiblePresets=currentCategory.items.filter(([name])=>name.toLocaleLowerCase('vi-VN').includes(searchQuery.trim().toLocaleLowerCase('vi-VN')));
  return <div className="enhanced-pantry"><section className="pantry-hero"><div><span>✨ CĂN BẾP TỰ ĐỘNG COOKHUB</span><h1>Tủ Nguyên Liệu Của Bạn</h1><p>Chạm nhẹ để chọn nhanh nguyên liệu, CookHub sẽ gợi ý món ăn phù hợp cho bạn.</p></div><button type="button" onClick={cookFromPantry}>🍳 Nấu ngay từ tủ bếp ({pantryItems.length} món)</button></section><Notice error={error || units.error}/><section className="pantry-library"><header><div><h2>⚡ Thêm nhanh nguyên liệu</h2><p>Bấm một lần để thêm, bấm nhiều lần để cộng dồn số lượng.</p></div><input value={searchQuery} onChange={event=>setSearchQuery(event.target.value)} placeholder="🔍 Tìm nhanh nguyên liệu..."/></header><nav>{categories.map(category=><button type="button" key={category.id} className={activeCategory===category.id?'active':''} onClick={()=>{setActiveCategory(category.id);setSearchQuery('');}}>{category.label}</button>)}</nav><div className="pantry-preset-grid" key={activeCategory}>{visiblePresets.map(([name,symbol,icon])=>{const existing=pantryItems.find(item=>item.name.toLocaleLowerCase('vi-VN')===name.toLocaleLowerCase('vi-VN'));return <button type="button" disabled={busy} className={existing?'selected':''} key={name} onClick={()=>quickAdd(name,symbol)}><span>{icon}</span>{existing&&<b>x{existing.quantity} {existing.unit}</b>}<strong>{name}</strong><small>＋ Thêm nhanh</small></button>;})}</div></section><section className="pantry-current"><header><h2>🧊 Các nguyên liệu hiện có trong tủ ({pantryItems.length})</h2>{pantryItems.length>0&&<button type="button" disabled={busy} onClick={clearAll}>Xóa tất cả</button>}</header><State resource={resource}>{items=>items.length?<div className="pantry-item-grid">{items.map(item=>{const preset=presetFor(item.name);return <article key={item.id}><span>{preset?.icon||'🥣'}</span><div><h3>{item.name}</h3><small>{preset?.category||'Nguyên liệu'} · Cập nhật {item.date}</small></div><div className="pantry-stepper"><button type="button" onClick={()=>updateAmount(item,-1)}>−</button><b>{item.quantity} {item.unit}</b><button type="button" onClick={()=>updateAmount(item,1)}>＋</button></div><button type="button" className="pantry-remove" aria-label={'Xóa '+item.name} onClick={()=>remove(item.id)}>×</button></article>;})}</div>:<div className="pantry-empty"><span>🧺</span><b>Tủ bếp hiện đang trống.</b><p>Hãy chọn các thẻ nguyên liệu phía trên để lấp đầy tủ bếp.</p></div>}</State></section></div>;
}

export function CustomPantryIngredient() {
  const ingredients=useApi('/ingredients'), units=useApi('/units');
  const [name,setName]=useState(''), [unitId,setUnitId]=useState(''), [group,setGroup]=useState(''), [canonical,setCanonical]=useState(''), [showGroups,setShowGroups]=useState(false), [showUnitMenu,setShowUnitMenu]=useState(false), [busy,setBusy]=useState(false), [message,setMessage]=useState(''), [error,setError]=useState('');
  const normalize=value=>(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLocaleLowerCase('vi-VN').trim();
  const aliases={'thit lon':'thit heo','canh ga':'thit ga','xi dau':'nuoc tuong','tuong dau':'nuoc tuong','ca chua bi':'ca chua','rau xanh':'rau cai'};
  const query=aliases[normalize(name)] || normalize(name);
  const suggestions=(ingredients.data||[]).map(item=>({...item,key:normalize(item.name)})).filter(item=>query&&((item.key.includes(query)||query.includes(item.key))||item.key.split(' ').some(word=>word.length>2&&query.includes(word)))).slice(0,5);
  const groups=[['spices','🧂','Gia vị'],['meat','🥩','Thịt & món chính'],['vegetables','🥬','Rau củ'],['seafood','🐟','Hải sản'],['dairy','🥚','Trứng & bơ sữa'],['other','🥣','Khác']];
  async function add(event){event.preventDefault();setError('');setMessage('');const clean=name.trim();if(!clean)return;const match=canonical||suggestions[0]?.name;if(!match&&!group){setShowGroups(true);return;}const unit=unitId||units.data?.[0]?.id;if(!unit){setError('Chưa có đơn vị tính để thêm nguyên liệu.');return;}setBusy(true);try{const selectedUnit=units.data.find(item=>item.id===unit);const quantity=['g','ml'].includes((selectedUnit?.symbol||'').toLocaleLowerCase())?100:1;await api('/pantry',{method:'POST',body:{name:match||clean,quantity,unit_id:unit,group:group||null}});setMessage(match&&normalize(match)!==normalize(clean)?`Đã chuẩn hóa “${clean}” thành “${match}” và thêm vào tủ.`:`Đã thêm “${match||clean}” vào tủ.`);setName('');setCanonical('');setGroup('');setShowGroups(false);window.dispatchEvent(new Event('pantry-updated'));}catch(err){setError(err.message);}finally{setBusy(false);}}
  const selectedUnit=units.data?.find(item=>item.id===unitId);
  return <section className="custom-pantry panel"><header><div><small>✨ NGUYÊN LIỆU TÙY CHỈNH</small><h2>Thêm nguyên liệu ngoài danh mục</h2><p>CookHub tự chuẩn hóa tên để tìm đúng công thức trong cơ sở dữ liệu.</p></div></header><Notice error={error||ingredients.error||units.error} message={message}/><form onSubmit={add}><div className="custom-ingredient-input"><input value={name} onChange={event=>{setName(event.target.value);setCanonical('');setGroup('');setShowGroups(false);}} placeholder="Ví dụ: Thịt lợn, Cà chua bi, Lá é..." autoComplete="off"/>{name&&<div className="ingredient-autocomplete">{suggestions.length?suggestions.map(item=><button type="button" key={item.id} onClick={()=>{setName(item.name);setCanonical(item.name);setShowGroups(false);}}>↳ <span>{item.name}</span><small>Nguyên liệu chuẩn trong DB</small></button>):<button type="button" onClick={()=>setShowGroups(true)}>＋ <span>Thêm “{name.trim()}” là nguyên liệu mới</span><small>Chọn nhóm bên dưới</small></button>}</div>}</div><div className={'unit-dropdown '+(showUnitMenu?'open':'')}><button type="button" className="unit-dropdown-trigger" aria-haspopup="listbox" aria-expanded={showUnitMenu} onClick={()=>setShowUnitMenu(value=>!value)}>{selectedUnit ? `${selectedUnit.name} (${selectedUnit.symbol})` : 'Chọn đơn vị'}<span>⌄</span></button>{showUnitMenu&&<div className="unit-dropdown-menu" role="listbox">{!units.data?.length&&<span className="unit-dropdown-empty">Chưa có đơn vị</span>}{units.data?.map(item=><button type="button" role="option" aria-selected={item.id===unitId} className={item.id===unitId?'selected':''} key={item.id} onClick={()=>{setUnitId(item.id);setShowUnitMenu(false)}}>{item.name}<small>{item.symbol}</small></button>)}</div>}</div><button className="primary" disabled={busy}>{busy?'Đang thêm...':'＋ Thêm vào tủ'}</button></form>{showGroups&&<div className="ingredient-group-popover"><b>Nguyên liệu mới thuộc nhóm nào?</b><p>Chọn nhóm để CookHub hiểu nguyên liệu tốt hơn.</p><div>{groups.map(([key,icon,label])=><button type="button" key={key} className={group===key?'active':''} onClick={()=>setGroup(key)}>{icon} {label}</button>)}</div>{group&&<button type="button" className="confirm-custom" disabled={busy} onClick={add}>Xác nhận và thêm nguyên liệu →</button>}</div>}</section>;
}

export function Settings() {
  const defaults={awake:false,measurement:'metric',sound:'beep',vibrate:true,voice:false,diets:['eat_clean'],allergies:[],allergyMode:'badge',substitutions:true,breakfast:'07:00',lunch:'12:00',dinner:'18:30',prep:'30',clearBought:true,theme:'system',font:'medium',video:'wifi',language:'vi',offline:false};
  const [settings,setSettings]=useState(()=>{try{return {...defaults,...JSON.parse(localStorage.getItem('cookhub-settings')||'{}')}}catch{return defaults}});
  const [message,setMessage]=useState(''); const [allergy,setAllergy]=useState('');
  function update(key,value){setSettings(previous=>{const next={...previous,[key]:value};localStorage.setItem('cookhub-settings',JSON.stringify(next));return next;});}
  function toggleList(key,value){update(key,settings[key].includes(value)?settings[key].filter(item=>item!==value):[...settings[key],value]);}
  function clearCache(){Object.keys(localStorage).filter(key=>key.startsWith('cookhub-cache')).forEach(key=>localStorage.removeItem(key));setMessage('Đã xóa bộ nhớ tạm trên thiết bị.');}
  useEffect(()=>{if(!settings.awake||!('wakeLock' in navigator))return;let lock;const request=async()=>{try{lock=await navigator.wakeLock.request('screen')}catch{}};request();return()=>lock?.release?.()},[settings.awake]);
  useEffect(()=>{document.documentElement.dataset.theme=settings.theme;return()=>{if(settings.theme!=='system')document.documentElement.dataset.theme='system'}},[settings.theme]);
  const diets=[['vegan','🌱','Ăn chay thuần'],['vegetarian','🥚','Ovo-lacto'],['keto','🥑','Keto'],['eat_clean','🥗','Eat Clean'],['low_carb','🥦','Low-Carb'],['muscle','💪','Giảm cân / Tăng cơ']];
  const allergyOptions=['Đậu phụng','Hải sản','Sữa','Trứng','Gluten','Cồn'];
  const Toggle=({checked,onChange,label})=><button type="button" role="switch" aria-checked={checked} className={'settings-toggle '+(checked?'on':'')} onClick={()=>onChange(!checked)}><i/><span>{label|| (checked?'Bật':'Tắt')}</span></button>;
  const Segmented=({value,onChange,options})=><div className="settings-segmented">{options.map(([key,label])=><button type="button" key={key} className={value===key?'active':''} onClick={()=>onChange(key)}>{label}</button>)}</div>;
  return <div className="settings-page"><section className="settings-hero"><div><small>COOKHUB / CÁ NHÂN HÓA</small><h1>Cài đặt trải nghiệm bếp</h1><p>Tùy chỉnh CookHub để việc nấu ăn an toàn, tiện lợi và đúng gu hơn.</p></div><span>⚙️</span></section>{message&&<p className="settings-message">✓ {message}</p>}<div className="settings-grid"><section className="settings-card"><header><span>🍳</span><div><h2>Trợ lý trải nghiệm bếp</h2><p>Các tiện ích khi bạn đang trực tiếp nấu ăn.</p></div></header><div className="settings-row"><div><b>Giữ màn hình luôn sáng</b><small>Không khóa màn hình khi xem từng bước nấu.</small></div><Toggle checked={settings.awake} onChange={value=>update('awake',value)}/></div><div className="settings-field"><label>Đơn vị đo lường</label><Segmented value={settings.measurement} onChange={value=>update('measurement',value)} options={[['metric','Hệ mét · g, ml'],['imperial','Anh/Mỹ · oz, cup']]}/></div><div className="settings-field"><label>Âm báo hoàn thành</label><select value={settings.sound} onChange={event=>update('sound',event.target.value)}><option value="beep">🔔 Tiếng bíp</option><option value="kitchen">🍳 Chuông bếp</option><option value="soft">🎵 Nhạc nhẹ</option></select></div><div className="settings-row"><div><b>Rung thiết bị</b><small>Rung khi hẹn giờ hoàn tất.</small></div><Toggle checked={settings.vibrate} onChange={value=>update('vibrate',value)}/></div><div className="settings-row"><div><b>Chế độ rảnh tay</b><small>Dùng “Tiếp theo” và “Quay lại” bằng giọng nói.</small></div><Toggle checked={settings.voice} onChange={value=>update('voice',value)}/></div></section><section className="settings-card"><header><span>🥑</span><div><h2>Khẩu vị & cảnh báo dị ứng</h2><p>Lọc món ăn an toàn theo sức khỏe của bạn.</p></div></header><div className="settings-field"><label>Chế độ ăn</label><div className="settings-chips">{diets.map(([key,icon,label])=><button type="button" key={key} className={settings.diets.includes(key)?'active':''} onClick={()=>toggleList('diets',key)}>{icon} {label}</button>)}</div></div><div className="settings-field"><label>Cảnh báo dị ứng</label><div className="allergy-input"><input value={allergy} onChange={event=>setAllergy(event.target.value)} onKeyDown={event=>{if(event.key==='Enter'&&allergy.trim()){event.preventDefault();if(!settings.allergies.includes(allergy.trim()))update('allergies',[...settings.allergies,allergy.trim()]);setAllergy('')}}} placeholder="Nhập dị ứng rồi nhấn Enter..."/></div><div className="settings-chips allergy-chips">{[...new Set([...allergyOptions,...settings.allergies])].map(item=><button type="button" key={item} className={settings.allergies.includes(item)?'active danger':''} onClick={()=>toggleList('allergies',item)}>⚠️ {item}</button>)}</div></div><div className="settings-field"><label>Phản ứng khi phát hiện dị ứng</label><Segmented value={settings.allergyMode} onChange={value=>update('allergyMode',value)} options={[['badge','Hiện badge đỏ'],['hide','Ẩn công thức']]}/></div><div className="settings-row"><div><b>Gợi ý nguyên liệu thay thế</b><small>Đề xuất sữa hạt thay sữa tươi và lựa chọn tương đương.</small></div><Toggle checked={settings.substitutions} onChange={value=>update('substitutions',value)}/></div></section><section className="settings-card"><header><span>🔔</span><div><h2>Lịch nhắc & mua sắm</h2><p>Nhận nhắc nhở vừa đủ cho từng bữa ăn.</p></div></header><div className="settings-time-grid">{[['breakfast','🌅 Bữa sáng'],['lunch','🍱 Bữa trưa'],['dinner','🌙 Bữa tối']].map(([key,label])=><label key={key}>{label}<input type="time" value={settings[key]} onChange={event=>update(key,event.target.value)}/></label>)}</div><div className="settings-field"><label>Nhắc chuẩn bị trước</label><select value={settings.prep} onChange={event=>update('prep',event.target.value)}><option value="30">30 phút</option><option value="60">1 giờ</option><option value="120">2 giờ</option></select></div><div className="settings-row"><div><b>Tự xóa nguyên liệu đã mua sau 24 giờ</b><small>Giữ danh sách mua sắm luôn gọn.</small></div><Toggle checked={settings.clearBought} onChange={value=>update('clearBought',value)}/></div></section><section className="settings-card"><header><span>🎨</span><div><h2>Giao diện & hiển thị</h2><p>Điều chỉnh cách CookHub hiển thị công thức.</p></div></header><div className="settings-field"><label>Chế độ giao diện</label><Segmented value={settings.theme} onChange={value=>update('theme',value)} options={[['system','Theo hệ thống'],['light','Sáng'],['dark','Tối']]}/></div><div className="settings-field"><label>Cỡ chữ công thức</label><div className="font-slider"><input type="range" min="1" max="4" value={{small:1,medium:2,large:3,xlarge:4}[settings.font]} onChange={event=>update('font',['small','medium','large','xlarge'][Number(event.target.value)-1])}/><span>{settings.font==='small'?'Nhỏ':settings.font==='medium'?'Vừa':settings.font==='large'?'Lớn':'Rất lớn'}</span></div></div><div className="settings-field"><label>Tự động phát video</label><Segmented value={settings.video} onChange={value=>update('video',value)} options={[['always','Luôn phát'],['wifi','Chỉ Wi-Fi'],['never','Không phát']]}/></div><div className="settings-field"><label>Ngôn ngữ</label><select value={settings.language} onChange={event=>update('language',event.target.value)}><option value="vi">🇻🇳 Tiếng Việt</option><option value="en">🇬🇧 English</option></select></div></section><section className="settings-card settings-data"><header><span>📦</span><div><h2>Dữ liệu & trợ giúp</h2><p>Quản lý bộ nhớ và công thức ngoại tuyến.</p></div></header><div className="cache-box"><div><b>128 MB</b><small>Bộ nhớ tạm hình ảnh & công thức</small></div><button type="button" onClick={clearCache}>Xóa bộ nhớ tạm</button></div><div className="settings-row"><div><b>Tải công thức thực đơn tuần để xem offline</b><small>Tự lưu công thức khi có kết nối Wi-Fi.</small></div><Toggle checked={settings.offline} onChange={value=>update('offline',value)}/></div><div className="settings-help"><button type="button" onClick={()=>setMessage('Đã ghi nhận phản hồi của bạn. Cảm ơn bạn!')}>🐞 Báo lỗi / Góp ý công thức</button><span>CookHub v1.0.0</span></div></section></div></div>;
}
function NutritionAlerts({ alerts, period }) {
  if (!alerts?.length) return null;
  const priority = ['nang_luong', 'natri', 'chat_dam', 'chat_xo', 'chat_beo', 'chat_bot_duong'];
  const friendlyLabel = item => ({ nang_luong: 'Calo', natri: 'Muối (natri)' })[item.key] || item.label;
  const shown = [...alerts].sort((a, b) => priority.indexOf(a.key) - priority.indexOf(b.key)).slice(0, 2);
  const message = shown.map((item, index) => {
    const label = index ? friendlyLabel(item).toLocaleLowerCase('vi-VN') : friendlyLabel(item);
    const level = item.severe ? 'rất' : 'hơi';
    return `${label} ${level} ${item.direction === 'low' ? 'thấp' : 'cao'}`;
  }).join(' · ');
  return <div className={'nutrition-alerts' + (shown.some(item => item.severe) ? ' severe' : '')} role="status" aria-label={'Cảnh báo dinh dưỡng ' + period}>
    ⚠️ {message}
  </div>;
}

export function DailyNutritionCard({ day, nutrition, diners = '', onDinersChange, mainMeals = 0 }) {
  const [showDetails, setShowDetails] = useState(false);
  const result = nutrition.data?.date === day ? nutrition.data : null;
  const totals = result?.totals;
  const goals = result?.goals;
  const alerts = nutritionAlerts(totals, goals, Number(diners), mainMeals >= 3);
  const average = key => Number((totals[key] / diners).toFixed(2));
  const percent = key => goals?.[key] ? Math.round(average(key) / goals[key] * 100) : 0;
  const format = value => Number(value).toLocaleString('vi-VN', { maximumFractionDigits: 2 });
  const metrics = [['nang_luong','Năng lượng','kcal'],['chat_dam','Protein','g'],['chat_bot_duong','Carbs','g'],['chat_beo','Chất béo','g'],['chat_xo','Chất xơ','g'],['natri','Natri','mg']];
  return <section id="nutrition-detail" className="nutrition-card">
    <h3>Dinh dưỡng thực đơn ngày {new Intl.DateTimeFormat('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(day+'T12:00:00'))}</h3>
    {totals ? <>
      <p className="nutrition-household-total"><b>Tổng tất cả phần ăn: {format(totals.nang_luong)} kcal</b></p>
      <label className="nutrition-diners">Số người cùng ăn <select value={diners} onChange={event => onDinersChange?.(Number(event.target.value) || '')}><option value="">Chọn số người</option>{Array.from({length:20},(_,index)=>index+1).map(count=><option key={count} value={count}>{count} người</option>)}</select></label>
      {diners && <p className="nutrition-assumption">Ước tính chia đều toàn bộ thực đơn cho {diners} người.</p>}
      <NutritionAlerts alerts={alerts} period="Ngày đã chọn"/>
      <h4>{diners ? 'Trung bình mỗi người so với mục tiêu của tài khoản' : 'Mục tiêu dinh dưỡng cá nhân'}</h4>
      <div className="nutrition-score"><div style={{'--nutrition-percent': `${diners ? Math.min(100, Math.max(0, percent('nang_luong'))) : 0}%`}}><b>{diners ? `${percent('nang_luong')}%` : Number(totals.nang_luong) === 0 ? '0%' : '—'}</b></div>{diners ? <p><strong>{format(average('nang_luong'))} / {format(goals.nang_luong)} kcal</strong><span>Protein <i><b style={{width: `${Math.min(100,percent('chat_dam'))}%`}}/></i> {format(average('chat_dam'))} / {format(goals.chat_dam)}g</span><span>Carbs <i><b style={{width: `${Math.min(100,percent('chat_bot_duong'))}%`}}/></i> {format(average('chat_bot_duong'))} / {format(goals.chat_bot_duong)}g</span><span>Chất béo <i><b style={{width: `${Math.min(100,percent('chat_beo'))}%`}}/></i> {format(average('chat_beo'))} / {format(goals.chat_beo)}g</span></p> : <p className="nutrition-pending"><strong>Chọn số người cùng ăn</strong></p>}</div>
      <button type="button" className="nutrition-detail-toggle" aria-expanded={showDetails} aria-controls="nutrition-breakdown" onClick={() => setShowDetails(value => !value)}>{showDetails ? 'Thu gọn chi tiết ↑' : 'Xem chi tiết dinh dưỡng →'}</button>
      {showDetails && <div id="nutrition-breakdown" className="nutrition-breakdown"><h4>Chi tiết dinh dưỡng trong ngày</h4><div className="nutrition-breakdown-list">{metrics.map(([key,label,unit]) => <div key={key}><span>{label}</span><strong>{format(diners ? average(key) : totals[key])} / {format(goals?.[key] || 0)} {unit}</strong><small>{diners ? `${percent(key)}% mục tiêu mỗi người` : 'Tổng của thực đơn'}</small></div>)}</div></div>}
    </> : <p className="empty">Chưa đủ dữ liệu dinh dưỡng cho ngày này.</p>}
  </section>;
}

function WeeklyNutritionCard({ resource, diners, start }) {
  const days = resource.data?.start === start ? resource.data.days : null;
  const alerts = weeklyNutritionAlerts(days, Number(diners));
  if (!diners) return null;
  return <section className="weekly-nutrition-card" aria-label="Đánh giá dinh dưỡng tuần">
    <h3>Dinh dưỡng tuần</h3>
    {alerts === null ? <p>Chưa đủ ba bữa chính mỗi ngày và dữ liệu dinh dưỡng cho cả tuần để đánh giá.</p>
      : alerts.length ? <NutritionAlerts alerts={alerts} period="Trung bình tuần"/>
      : <p>Trung bình tuần nằm trong khoảng tham khảo so với mục tiêu của tài khoản.</p>}
  </section>;
}

export function Menu() {
  const [day,setDay] = useState(today()), [error,setError] = useState(''), [message,setMessage] = useState(''), [busy,setBusy] = useState(false), [tab,setTab] = useState('schedule');
  const [diners,setDiners] = useState(''), [householdView,setHouseholdView] = useState('group');
  const [editingMenu,setEditingMenu] = useState(false), [updatingMenu,setUpdatingMenu] = useState(false);
  const [reuseDialog,setReuseDialog] = useState(null), [reuseSourceDate,setReuseSourceDate] = useState(''), [reuseTargetDate,setReuseTargetDate] = useState(today()), [reuseError,setReuseError] = useState('');
  async function updateMenuItem(id, payload) {
    setUpdatingMenu(true); setError(''); setMessage('');
    try {
      await api('/menu/'+encodeURIComponent(id), {method:'PUT',body:payload});
      resource.reload(); nutrition.reload(); household.reload(); weekNutrition.reload(); history.reload();
      setMessage('Đã cập nhật khẩu phần và bữa ăn.');
    } catch(err) {
      const failure = err.status === 405
        ? new Error('Máy chủ chưa hỗ trợ lưu thực đơn. Hãy khởi động lại backend CookHub bằng phiên bản mới.')
        : err;
      setError(failure.message);
      throw failure;
    }
    finally { setUpdatingMenu(false); }
  }
  const [portionItem,setPortionItem] = useState(null), [householdBusy,setHouseholdBusy] = useState(false);
  const current = new Date(day + 'T12:00:00');
  const week = getWeekDates(day);
  const formatDay = value => value.toISOString().slice(0,10);
  const resource=useApi('/menu?start='+day+'&end='+day), nutrition=useApi('/menu/nutrition?on='+day), weekNutrition=useApi(null), dishes=useApi('/menu/dish-options'), history=useApi('/menu/history');
  const household = useApi('/menu/household?on='+day);
  async function saveHousehold(payload) {
    setHouseholdBusy(true);
    try { await api('/menu/household?on='+day,{method:'PUT',body:payload}); household.reload(); nutrition.reload(); }
    finally { setHouseholdBusy(false); }
  }
  const householdModel = household.data?.date === day ? household.data : null;
  const suggestionResult = nutrition.data?.date === day ? nutrition.data : null;
  const activeDiners = householdModel?.active_ids.length;
  const selectedNutritionMember = householdModel?.members.find(member => member.id === householdView && householdModel.active_ids.includes(member.id));
  const householdNutritionReady = suggestionResult?.household?.revision === householdModel?.revision;
  const suggestionContext = selectedNutritionMember
    ? suggestionResult?.household?.members?.find(member => member.id === selectedNutritionMember.id)
    : activeDiners
      ? suggestionResult?.household
      : null;
  const suggestionGoals = selectedNutritionMember
    ? (householdNutritionReady ? selectedNutritionMember.goals : null)
    : activeDiners
      ? (householdNutritionReady ? suggestionResult?.household?.group_goals : null)
      : activeDiners === 0 && Number(diners) >= 1
        ? Object.fromEntries(Object.entries(suggestionResult?.goals || {}).map(([key,value])=>[key,value*Number(diners)]))
        : null;
  const suggestionTotals = selectedNutritionMember
    ? (householdNutritionReady ? suggestionContext?.totals : null)
    : activeDiners
      ? (householdNutritionReady ? suggestionResult?.totals : null)
      : suggestionResult?.totals;
  const suggestionViewResult = suggestionResult && {
    ...suggestionResult,
    totals: suggestionTotals,
    item_totals: selectedNutritionMember ? suggestionResult.household?.member_item_totals?.[selectedNutritionMember.id] : suggestionResult.item_totals,
    view_label: selectedNutritionMember ? selectedNutritionMember.name : activeDiners ? `Cả nhóm · ${activeDiners} người` : Number(diners)>1 ? `Cả nhóm · ${diners} người` : 'Cá nhân',
    view_goal: selectedNutritionMember ? ({maintain:'Duy trì',lose:'Giảm cân',gain:'Tăng cân'}[selectedNutritionMember.goal]) : activeDiners ? 'Mục tiêu tổng nhóm' : Number(diners)>1 ? 'Mục tiêu nhóm ước tính' : 'Mục tiêu tài khoản',
    view_member_id: selectedNutritionMember?.id,
    view_complete: selectedNutritionMember ? suggestionContext?.complete : suggestionResult.complete,
    view_members: householdModel?.members.filter(member=>householdModel.active_ids.includes(member.id)).map(({id,name})=>({id,name})) || Array.from({length:Number(diners)||1},(_,index)=>({id:String(index),name:`Thành viên ${index+1}`})),
    member_portions: suggestionResult.household?.member_portions,
    equal_split_items: suggestionResult.household?.equal_split_items,
  };
  const nutritionOptions = useApi(suggestionGoals ? '/menu/nutrition-options?on='+day : null);
  const dayItems = (resource.data || []).filter(item=>item.date===day);
  async function addSuggestedDish(dish_id, meal) {
    const existing=dayItems.find(item=>String(item.dish_id).trim().toUpperCase()===dish_id.trim().toUpperCase()&&mealLabel(item.meal)===meal);
    const added=await api('/menu',{method:'POST',body:{date:day,meal,dish_id,servings:1}});
    if(selectedNutritionMember&&householdModel&&added?.id){
      const previous=householdModel.portions?.[added.id];
      const previousServings=Number(existing?.servings||0);
      const shares=previous?{...previous}:Object.fromEntries(householdModel.active_ids.map(memberId=>[memberId,previousServings/householdModel.active_ids.length]));
      shares[selectedNutritionMember.id]=(Number(shares[selectedNutritionMember.id])||0)+1;
      const members=householdModel.members.map(({id,name,sex,age,height,weight,activity,goal})=>({id,name,sex,age,height,weight,activity,goal}));
      try {
        await saveHousehold({revision:householdModel.revision,members,active_ids:householdModel.active_ids,
          portions:{...(householdModel.portions||{}),[added.id]:shares}});
      } catch(error) {
        resource.reload(); nutrition.reload(); household.reload(); history.reload(); weekNutrition.reload();
        throw new Error('Món đã được thêm, nhưng chưa lưu được khẩu phần cho '+selectedNutritionMember.name+'. Hãy mở “Chia khẩu phần” để gán phần ăn. '+error.message);
      }
    }
    resource.reload(); nutrition.reload(); household.reload(); history.reload(); weekNutrition.reload();
  }
  const byId=Object.fromEntries((dishes.data || []).map(x => [String(x.id||'').trim().toUpperCase(),x]));
  const mealMeta = { 'Sáng':['☀','06:30 - 08:00'], 'Trưa':['🌤','11:00 - 13:00'], 'Tối':['◕','17:30 - 19:30'], 'Ăn nhẹ':['🔥','20:00 - 21:00'] };
  const mealLabel = value => ({'Bữa sáng':'Sáng','Bữa trưa':'Trưa','Bữa tối':'Tối','Bữa phụ':'Ăn nhẹ'})[(value || '').trim()] || (value || '').trim();
  async function remove(id) { try { await api('/menu/'+id,{method:'DELETE'}); resource.reload(); nutrition.reload(); household.reload(); weekNutrition.reload(); } catch(err) { setError(err.message); } }
  const weekNumber = value => { const target=new Date(value+'T12:00:00'); const first=new Date(target.getFullYear(),0,1); return Math.ceil((((target-first)/86400000)+first.getDay()+1)/7); };
  async function addWeekItems(items) {
    setBusy(true); setError(''); setMessage('');
    try { for (const item of items) await api('/menu',{method:'POST',body:item}); setDay(today()); resource.reload(); nutrition.reload(); household.reload(); weekNutrition.reload(); history.reload(); setTab('schedule'); setMessage('Đã áp dụng thực đơn cho tuần hiện tại.'); return true; }
    catch(err) { setError(err.message); return false; } finally { setBusy(false); }
  }
  function openHistoryReuse(plan) {
    setError('');
    setReuseError('');
    setReuseDialog(plan);
    setReuseSourceDate(plan.start);
    setReuseTargetDate(today());
  }
  function historyDates(plan) {
    const start=new Date(plan.start+'T12:00:00'), end=new Date((plan.end||plan.start)+'T12:00:00'), dates=[];
    for(const cursor=new Date(start);cursor<=end;cursor.setDate(cursor.getDate()+1)) dates.push(formatDay(cursor));
    return dates;
  }
  async function reuseHistoryDay(event) {
    event.preventDefault();
    if(!reuseDialog||!reuseSourceDate||!reuseTargetDate)return;
    if(reuseSourceDate<reuseDialog.start||reuseSourceDate>(reuseDialog.end||reuseDialog.start)){
      setReuseError('Ngày lấy thực đơn phải nằm trong tuần đã chọn.');return;
    }
    setBusy(true);setReuseError('');setError('');setMessage('');
    let added=0;let sourceItems=[];
    try {
      sourceItems=await api(`/menu?start=${reuseSourceDate}&end=${reuseSourceDate}`);
      if(!sourceItems.length){setReuseError('Ngày này chưa có món trong thực đơn cũ. Hãy chọn ngày khác.');return;}
      for(const item of sourceItems){
        await api('/menu',{method:'POST',body:{date:reuseTargetDate,meal:mealLabel(item.meal),dish_id:item.dish_id,servings:item.servings||1}});
        added++;
      }
      setDay(reuseTargetDate);setTab('schedule');setReuseDialog(null);
      setMessage(`Đã thêm ${added} món từ ${new Intl.DateTimeFormat('vi-VN',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(reuseSourceDate+'T12:00:00'))} vào ${new Intl.DateTimeFormat('vi-VN',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(reuseTargetDate+'T12:00:00'))}.`);
    } catch(err) {
      if(added){setDay(reuseTargetDate);setTab('schedule');setReuseDialog(null);setError(`Đã thêm ${added}/${sourceItems.length} món. Lỗi khi thêm phần còn lại: ${err.message}`);}
      else setReuseError(err.message);
    } finally {
      resource.reload();nutrition.reload();household.reload();weekNutrition.reload();history.reload();setBusy(false);
    }
  }
  return <><Banner page="menu" title="Thực đơn của bạn" subtitle="Lên kế hoạch bữa ăn ngon miệng, đủ chất mỗi ngày."/><div className="menu-page"><Notice error={error || dishes.error} message={message}/>
    <section className="menu-command meal-planner-tabs"><nav>{[['schedule','📅','Lịch trình tuần này','Lên kế hoạch & theo dõi dinh dưỡng'],['history','🔄','Lịch sử thực đơn','Xem lại & áp dụng các tuần trước']].map(([key,icon,label,description]) => <button key={key} className={tab === key ? 'active' : ''} onClick={() => { setTab(key); setMessage(''); }}><span>{icon}</span><b>{label}</b><small>{description}</small></button>)}</nav></section>
    {tab === 'history' && <section className="menu-history-view">
      <div className="history-intro"><div><small>LỊCH SỬ KẾ HOẠCH</small><h2>Các tuần đã lên thực đơn</h2></div><p>Chọn một tuần để xem lại hoặc sao chép các món sang ngày khác.</p></div>
      <State resource={history}>{plans => plans.length ? <div className="history-timeline">{plans.map((plan,index) => <article className="history-card" key={plan.id}><i/><div><span className="history-week">Tuần {plan.start ? weekNumber(plan.start) : index+1}</span><small>{new Intl.DateTimeFormat('vi-VN').format(new Date(plan.start+'T12:00:00'))} - {new Intl.DateTimeFormat('vi-VN').format(new Date(plan.end+'T12:00:00'))}</small><h3>{plan.name || 'Thực đơn tuần'}</h3><p><b>{plan.total_meals || 0} bữa</b> · Hoàn thành {plan.completion || 0}% · Trung bình {Number(plan.avg_kcal || 0).toLocaleString('vi-VN')} kcal/ngày</p></div><div className="history-actions"><button type="button" onClick={() => { setDay(plan.start); setTab('schedule'); }}>Xem lại chi tiết</button><button type="button" className="primary" disabled={busy} onClick={() => openHistoryReuse(plan)}>🔄 Dùng lại thực đơn này</button></div></article>)}</div> : <p className="empty">Chưa có lịch sử thực đơn.</p>}</State>
      {reuseDialog && <div className="history-reuse-overlay" onMouseDown={event=>{if(event.target===event.currentTarget&&!busy)setReuseDialog(null);}}>
        <section className="history-reuse-dialog" role="dialog" aria-modal="true" aria-labelledby="history-reuse-title">
          <header><div><small>SAO CHÉP THỰC ĐƠN</small><h2 id="history-reuse-title">Chọn ngày muốn dùng lại</h2></div><button type="button" aria-label="Đóng" disabled={busy} onClick={()=>setReuseDialog(null)}>×</button></header>
          <p className="history-reuse-week">Tuần nguồn: {new Intl.DateTimeFormat('vi-VN').format(new Date(reuseDialog.start+'T12:00:00'))} – {new Intl.DateTimeFormat('vi-VN').format(new Date(reuseDialog.end+'T12:00:00'))}</p>
          {reuseError && <p className="history-reuse-error" role="alert">{reuseError}</p>}
          <form onSubmit={reuseHistoryDay}>
            <label><span>Ngày lấy thực đơn</span><select value={reuseSourceDate} onChange={event=>setReuseSourceDate(event.target.value)} required>{historyDates(reuseDialog).map(value=><option key={value} value={value}>{new Intl.DateTimeFormat('vi-VN',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(value+'T12:00:00'))}</option>)}</select></label>
            <label><span>Ngày áp dụng</span><input type="date" value={reuseTargetDate} onChange={event=>setReuseTargetDate(event.target.value)} required/></label>
            <p className="history-reuse-note">Món sẽ được thêm vào ngày đích. Món trùng cùng bữa sẽ được cộng khẩu phần; món hiện có không bị xóa.</p>
            {reuseSourceDate===reuseTargetDate && <p className="history-reuse-same-day">⚠️ Bạn chọn cùng ngày nguồn và ngày đích; khẩu phần món trùng sẽ tăng.</p>}
            <footer><button type="button" disabled={busy} onClick={()=>setReuseDialog(null)}>Hủy</button><button type="submit" className="primary" disabled={busy||!reuseSourceDate||!reuseTargetDate}>{busy?'Đang áp dụng…':'Áp dụng ngày này'}</button></footer>
          </form>
        </section>
      </div>}
    </section>}
    {tab === 'schedule' && <div className="menu-columns"><main><section className="week-panel"><div className="week-heading"><div><span>▣</span><h2>Thực đơn tuần này</h2></div><div className="week-actions"><button aria-label="Tuần trước" onClick={() => { const date = new Date(day); date.setDate(date.getDate() - 7); setDay(formatDay(date)); }}>‹</button><Field label="Chọn ngày" type="date" value={day} required onChange={event => event.target.value && setDay(event.target.value)}/><button aria-label="Tuần sau" onClick={() => { const date = new Date(day); date.setDate(date.getDate() + 7); setDay(formatDay(date)); }}>›</button><button onClick={() => setDay(today())}>Hôm nay</button></div></div><div className="week-calendar">{week.map(date => { const value = formatDay(date); return <button key={value} className={value === day ? 'active' : ''} onClick={() => setDay(value)}><small>{['Thứ 2','Thứ 3','Thứ 4','Thứ 5','Thứ 6','Thứ 7','Chủ nhật'][date.getDay() === 0 ? 6 : date.getDay() - 1]}</small><b>{date.getDate()}/{date.getMonth()+1}</b><i/></button>; })}</div></section>
      <section className="daily-menu"><div className="daily-menu-head"><h2>▣ Thực đơn {new Intl.DateTimeFormat('vi-VN',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'}).format(current)}</h2><button type="button" aria-pressed={editingMenu} disabled={updatingMenu} onClick={()=>setEditingMenu(value=>!value)}>{editingMenu ? '✓ Hoàn tất tùy chỉnh' : '✎ Tùy chỉnh thực đơn'}</button></div><State resource={resource}>{items => <div className="meal-timeline">{Object.keys(mealMeta).map((meal,index) => <article className={'meal-row meal-'+index} key={meal} data-menu-meal={meal}><div className="meal-time"><b>{mealMeta[meal][0]} {meal}</b><small>{mealMeta[meal][1]}</small></div><div className="meal-dishes">{items.filter(item => mealLabel(item.meal) === meal).map(item => { const dish = byId[String(item.dish_id||'').trim().toUpperCase()]; return <MenuPlannedDish key={item.id} item={{...item,meal:mealLabel(item.meal)}} dish={dish} onMove={target=>updateMenuItem(item.id,{meal:target,servings:Number(item.servings||1)}).catch(()=>{})} disabled={householdBusy||updatingMenu} onUpdate={editingMenu?payload=>updateMenuItem(item.id,payload):undefined} onRemove={()=>remove(item.id)} onPortions={householdModel?.active_ids.length?()=>setPortionItem(item):undefined}/>; })}</div><MealDishPicker meal={meal} resource={dishes} onAdd={async(dish_id,servings)=>{await api('/menu',{method:'POST',body:{date:day,meal,dish_id,servings}});resource.reload();nutrition.reload();household.reload();history.reload();}}/></article>)}</div>}</State></section></main>
      <aside className="menu-aside"><HouseholdNutrition mainMeals={new Set((resource.data||[]).filter(item=>item.date===day).map(item=>mealLabel(item.meal)).filter(meal=>['Sáng','Trưa','Tối'].includes(meal))).size} day={day} nutrition={nutrition} household={household} onSave={saveHousehold} diners={diners} onDinersChange={setDiners} selectedView={householdView} onSelectedViewChange={setHouseholdView} busy={householdBusy}/></aside><MenuNutritionSuggestions key={day} result={suggestionViewResult} goals={suggestionGoals} options={nutritionOptions} dishes={dishes.data} items={dayItems} onAdd={addSuggestedDish} tip={<section className="meal-tip"><b>💡 Mẹo nhỏ</b><p>Hãy đa dạng thực phẩm trong thực đơn để đảm bảo dinh dưỡng cân bằng nhé!</p></section>}/></div>}</div>{portionItem&&householdModel&&<PortionEditor item={portionItem} name={portionItem.dish_name||byId[portionItem.dish_id]?.name||portionItem.dish_id} model={householdModel} onSave={saveHousehold} onClose={()=>setPortionItem(null)}/>}</>;
}

export function Profile() {
  const { setUser }=useAuth();
  const resource=useApi('/profile'), hidden=useApi('/hidden'), dishes=useApi('/dishes'), preferences=useApi('/v1/user/preferences'), favorites=useApi('/favorites'), history=useApi('/menu/history');
  const [error,setError]=useState(''), [message,setMessage]=useState(''), [busy,setBusy]=useState(false), [tab,setTab]=useState('preferences'), [avatar,setAvatar]=useState('');
  useEffect(()=>{if(resource.data?.avatar){setAvatar(resource.data.avatar);window.localStorage.setItem('cookhub-avatar',resource.data.avatar)}},[resource.data?.avatar]);
  useEffect(()=>{if(avatar){window.localStorage.setItem('cookhub-avatar',avatar);window.dispatchEvent(new CustomEvent('cookhub-avatar-updated',{detail:{avatar}}))}},[avatar]);
  function chooseAvatar(event) { const file=event.target.files?.[0]; if(!file) return; if(!file.type.startsWith('image/')) { setError('Vui lòng chọn tệp hình ảnh.'); return; } const reader=new FileReader(); reader.onload=async()=>{try{const value=String(reader.result);await api('/profile',{method:'PUT',body:{name:resource.data?.name || '',email:resource.data?.email || '',avatar:value}});setAvatar(value);resource.reload();setUser(await api('/auth/me'));setMessage('Đã cập nhật ảnh đại diện.');}catch(err){setError(err.message);}}; reader.readAsDataURL(file); }
  async function submit(event,path) {
    event.preventDefault();setError('');setMessage('');setBusy(true);
    const body=Object.fromEntries(new FormData(event.currentTarget));
    try {const result=await api(path,{method:'PUT',body});if(path==='/profile'){setUser(result);resource.reload();setMessage('Đã lưu hồ sơ.');}else setUser(null);}
    catch(err){setError(err.message);}finally{setBusy(false);}
  }
  const answers=preferences.data?.answers || {};
  return <State resource={resource}>{data => {
    return <div className="profile-game"><section className="chef-hero"><div className="chef-identity"><div className="chef-avatar"><img src={avatar || defaultAvatar} alt={'Ảnh đại diện của '+data.name}/><label className="avatar-picker" title="Chọn ảnh đại diện">📷<input type="file" accept="image/png,image/jpeg,image/webp" onChange={chooseAvatar}/></label></div><div><small>HỒ SƠ ĐẦU BẾP COOKHUB</small><h1>{data.name}</h1><p>Đầu Bếp Tập Sự · Hành trình nấu ngon mỗi ngày</p></div></div></section><Notice error={error || preferences.error || favorites.error || history.error} message={message}/><nav className="profile-tabs" aria-label="Các mục hồ sơ">{[['preferences','🎯','Sở thích ẩm thực'],['account','⚙️','Thông tin & Bảo mật'],['hidden','👁️','Món đã ẩn']].map(([key,icon,label])=><button type="button" key={key} className={tab===key?'active':''} onClick={()=>{setTab(key);setMessage('');}}><span>{icon}</span>{label}{key==='hidden'&&<b>{hidden.data?.length || 0}</b>}</button>)}</nav>{tab==='preferences'&&<div className="profile-preferences"><PreferencesSettings/></div>}{tab==='account'&&<div className="profile-account"><section className="panel"><span className="profile-section-icon">👤</span><h2>Thông tin cá nhân</h2><p>Cập nhật thông tin nhận diện tài khoản CookHub.</p><form onSubmit={event=>submit(event,'/profile')}><Field label="Họ và tên" name="name" required maxLength={150} defaultValue={data.name}/><Field label="Email" name="email" type="email" required maxLength={255} defaultValue={data.email}/><button className="primary" disabled={busy}>Lưu hồ sơ</button></form></section><section className="panel"><span className="profile-section-icon">🔐</span><h2>Đổi mật khẩu</h2><p>Bạn sẽ đăng nhập lại sau khi đổi mật khẩu thành công.</p><form onSubmit={event=>submit(event,'/auth/password')}><Field label="Mật khẩu hiện tại" name="current_password" type="password" autoComplete="current-password" required/><Field label="Mật khẩu mới (tối thiểu 8 ký tự)" name="password" type="password" minLength={8} autoComplete="new-password" required/><button className="primary" disabled={busy}>Đổi mật khẩu</button></form></section></div>}{tab==='hidden'&&<section className="profile-hidden panel"><header><div><small>DANH SÁCH KIỂM SOÁT GỢI Ý</small><h2>Món đã ẩn khỏi gợi ý</h2><p>Các món này sẽ không xuất hiện trong kết quả đề xuất cá nhân hóa.</p></div><span>{hidden.data?.length || 0} món</span></header><Notice error={dishes.error || hidden.error}/><State resource={hidden}>{ids=>ids.length?<div className="hidden-dish-grid">{ids.map(id=>{const dish=dishes.data?.find(item=>item.id===id);return <article key={id}>{dish?<img src={media(dish.image)} alt={dish.name}/>:<span>🍽️</span>}<div><b>{dish?.name || id}</b><small>{dish?.category || 'Món ăn'}</small></div><button type="button" onClick={async()=>{try{await api('/hidden/'+id,{method:'DELETE'});hidden.reload();setMessage('Đã đưa món ăn trở lại danh sách gợi ý.');}catch(err){setError(err.message);}}}>↻ Hiển thị lại</button></article>;})}</div>:<div className="profile-empty"><span>👁️</span><h3>Chưa có món bị ẩn</h3><p>Tất cả món ăn vẫn có thể xuất hiện trong gợi ý của bạn.</p></div>}</State></section>}</div>;

  }}</State>;
}











