import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { api, media } from '../api';
import { useAuth } from '../auth';
import { useApi } from '../hooks';
import { Notice, MatchProgress } from './Common';
import './Personalization.css';

export const questions = [
  {key:'ingredients', title:'Nguyên liệu ưa thích của bạn là gì?', options:[['chicken','🍗','Thịt gà'],['pork','🥩','Thịt heo'],['seafood','🐟','Hải sản & Cá'],['beef','🥩','Thịt bò'],['vegetables','🥦','Món chay / Rau củ'],['eggs_tofu','🥚','Trứng & Đậu hũ']]},
  {key:'occasions', title:'Bạn thường nấu cho ai & theo chế độ nào?', options:[['solo','👤','Bữa ăn 1 người'],['family','👨‍👩‍👧','Gia đình ấm cúng'],['healthy','🥗','Ăn kiêng / Healthy'],['low_carb','🥑','Eat Clean / Low-carb'],['children','👶','Món cho trẻ nhỏ'],['friends','🍻','Tụ tập bạn bè']]},
  {key:'tastes', title:'Khẩu vị nào khiến bạn thích mê?', options:[['savory','🧂','Đậm đà / Mặn mà'],['spicy','🌶️','Cay nồng bùng vị'],['sweet_sour','🍋','Chua ngọt hài hòa'],['light','🌿','Thanh nhẹ / Nguyên bản'],['rich','🥥','Béo ngậy / Cốt dừa']]},
  {key:'time', title:'Bạn có bao nhiêu thời gian cho mỗi bữa?', single:true, options:[['quick','⚡','Nhanh gọn · <15 phút'],['medium','⏱️','Vừa đủ · 15–30 phút'],['relaxed','🍳','Thong thả · >45 phút']]},
  {key:'tools', title:'Trong bếp của bạn có những dụng cụ nào?', options:[['stove','🍳','Bếp gas / Bếp từ'],['air_fryer','🍟','Nồi chiên không dầu'],['pressure_cooker','🍲','Nồi áp suất / Nồi hầm'],['oven','🍞','Lò nướng'],['no_cook','🥗','Không cần nấu']]},
  {key:'regions', title:'Vùng miền / phong cách ẩm thực bạn yêu thích?', options:[['north','🍲','Miền Bắc'],['central','🌶️','Miền Trung'],['south','🥥','Miền Tây / Nam Bộ'],['asia','🥢','Món Á'],['western','🍝','Món Âu']]},
  {key:'avoid', title:'Bạn có dị ứng hoặc kiêng nguyên liệu nào không?', options:[['none','👍','Không kiêng'],['seafood_allergy','🦐','Hải sản / Tôm cua'],['peanut','🥜','Đậu nành / Lạc'],['lactose','🥛','Sữa / Lactose'],['spicy_avoid','🌶️','Đồ cay']]},
  {key:'budget', title:'Ngân sách dự kiến cho một bữa ăn?', single:true, options:[['saving','💰','Tiết kiệm · <50k'],['normal','💵','Bình dân · 50–150k'],['comfortable','💳','Thoải mái · >150k']]},
  {key:'skill', title:'Mức độ thành thạo kỹ năng nấu nướng?', single:true, options:[['beginner','🐣','Mới bắt đầu'],['basic','🍳','Nấu ăn cơ bản'],['chef','🧑‍🍳','Bếp trưởng gia đình']]},
  {key:'meals', title:'Loại bữa ăn bạn quan tâm nhất hiện tại?', options:[['breakfast','🌅','Bữa sáng nhanh'],['lunch','🍱','Cơm trưa văn phòng'],['dinner','🌙','Bữa tối gia đình'],['snack','🍰','Ăn vặt / Tráng miệng']]},
];
export const emptyAnswers = () => ({ingredients:[], occasions:[], tastes:[], time:'', tools:[], regions:[], avoid:[], budget:'', skill:'', meals:[]});
const colors = ['#ffad48, #ff6d73','#e67dce, #9a77ff','#64cfee, #6574f6','#ec9292, #d55dad','#7cdda1, #31bca6','#f2d57b, #ef9f5e'];
function hasAnswer(answers, question) { return question.single ? !!answers[question.key] : answers[question.key].length > 0; }
export function BubbleChoices({question, answers, setAnswers, floating=false, disabled=false}) {
  const reduced = useReducedMotion();
  return <div className={'preference-bubbles ' + (floating ? 'floating' : '')} role="group" aria-label={question.title}>{question.options.map(([value,emoji,label],index) => {
    const selected = question.single ? answers[question.key] === value : answers[question.key].includes(value);
    return <motion.button type="button" key={value} disabled={disabled} aria-pressed={selected} className={'preference-bubble ' + (selected ? 'picked' : '')} style={{'--bubble-colors':colors[index % colors.length], '--float-delay':`${-index * .7}s`}} whileTap={reduced ? undefined : {scale:.94}} whileHover={reduced ? undefined : {scale:1.04}} onClick={() => setAnswers(previous => ({...previous, [question.key]: question.single ? value : selected ? previous[question.key].filter(x => x !== value) : [...previous[question.key],value]}))}><span aria-hidden="true">{emoji}</span><b>{label}</b><i aria-hidden="true">{selected ? '✓' : '+'}</i></motion.button>;
  })}</div>;
}
export function Sparkles() {
  return <div className="preference-confetti" aria-hidden="true">{Array.from({length:30},(_,i) => <i key={i} style={{'--x':`${(i * 37) % 100}vw`, '--drift':`${(i % 7 - 3) * 40}px`, '--delay':`${i % 5 * .07}s`, color:['#eeb950','#57cb99','#a18ce9'][i%3]}}>✦</i>)}</div>;
}
function SurveyDialog({onComplete, onDismiss, onFavorites}) {
  const {setUser} = useAuth(); const reduced = useReducedMotion();
  const [answers,setAnswers] = useState(emptyAnswers), [step,setStep] = useState(0), [matches,setMatches] = useState(null), [busy,setBusy] = useState(false), [error,setError] = useState(''), [savingId,setSavingId] = useState(null);
  const favorites = useApi('/favorites'); const [favoriteIds,setFavoriteIds] = useState([]); const dialog = useRef(null);
  useEffect(() => { if(favorites.data) setFavoriteIds(favorites.data); },[favorites.data]);
  useEffect(() => {
    const previousFocus = document.activeElement; const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; dialog.current?.focus();
    return () => {document.body.style.overflow = previousOverflow; previousFocus?.focus();};
  },[]);
  function trap(event) {
    if(event.key === 'Escape' && !busy && !savingId) onDismiss();
    if(event.key !== 'Tab') return;
    const nodes = [...dialog.current.querySelectorAll('button:not(:disabled), a[href], [tabindex="0"]')]; const first=nodes[0], last=nodes.at(-1);
    if(event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) {event.preventDefault();last?.focus();}
    else if(!event.shiftKey && (document.activeElement === last || document.activeElement === dialog.current)) {event.preventDefault();first?.focus();}
  }
  async function advance() {
    if(step < 9) {setStep(step+1);return;}
    await finish();
  }
  async function favorite(id) {
    if(savingId) return;setSavingId(id);setError('');
    try {await api('/favorites/'+id,{method:favoriteIds.includes(id)?'DELETE':'PUT'});setFavoriteIds(ids => ids.includes(id)?ids.filter(x=>x!==id):[...ids,id]);onFavorites();}
    catch(err) {setError(err.message);} finally {setSavingId(null);}
  }
  async function finish() {
    setBusy(true);setError('');
    try {const user = await api('/v1/user/onboarding-preferences',{method:'POST',body:answers});setUser(user);onComplete();}
    catch(err) {setError(err.message);} finally {setBusy(false);}
  }
  return <motion.div className="survey-backdrop" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}><motion.section ref={dialog} tabIndex={-1} onKeyDown={trap} role="dialog" aria-modal="true" aria-labelledby="survey-title" className="survey-glass" initial={reduced?false:{y:30,scale:.96}} animate={{y:0,scale:1}} exit={{y:15,opacity:0}}><button type="button" className="survey-close" disabled={busy || !!savingId} aria-label="Đóng khảo sát, chỉnh sửa sau trong hồ sơ" onClick={onDismiss}>×</button><div className="survey-eyebrow">✦ GÓC BẾP MANG DẤU ẤN CỦA BẠN</div><div className="survey-progress" role="progressbar" aria-label="Tiến trình khảo sát" aria-valuemin={0} aria-valuemax={10} aria-valuenow={Math.min(step+1,10)}><span style={{width:`${Math.min(step+1,10)*10}%`}}/></div><Notice error={error || favorites.error}/><AnimatePresence mode="wait"><motion.div key={step} className="survey-step" aria-live="polite" initial={reduced?false:{opacity:0,x:24}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-24}} transition={{duration:.2}}>
    {step < 10 ? <><p className="survey-counter">Câu {step+1} / 10 · {questions[step].single?'Chọn một':'Có thể chọn nhiều'}</p><h2 id="survey-title">{questions[step].title}</h2><p>Chạm vào những bong bóng hợp với bạn. CookHub sẽ lo phần cảm hứng.</p><BubbleChoices question={questions[step]} answers={answers} setAnswers={setAnswers} floating disabled={busy}/></> : <><p className="survey-counter">✨ Góc bếp của bạn đã sẵn sàng</p><h2 id="survey-title">Những món ngon dành riêng cho bạn</h2><p>{matches?.length || 0} món được xếp theo sở thích vừa chọn. Vuốt ngang để khám phá.</p><small>Điểm Hợp vị là mức khớp các tiêu chí, không phải xác suất. Dụng cụ được suy luận từ công thức.</small><div className="quick-match-grid">{matches?.map(dish => <article className="quick-match-card" key={dish.id}><img src={media(dish.image)} alt={dish.name}/><span className="match-score" title={dish.match_reasons.join(' · ') || 'Chưa khớp tiêu chí'}>{dish.match_percent}% Hợp vị</span><h3>{dish.name}</h3><small>{dish.time} phút · {dish.difficulty}</small><button disabled={!!savingId || busy} type="button" aria-label={'Yêu thích '+dish.name} aria-pressed={favoriteIds.includes(dish.id)} className={favoriteIds.includes(dish.id)?'heart picked':'heart'} onClick={()=>favorite(dish.id)}>{favoriteIds.includes(dish.id)?'♥':'♡'}{favoriteIds.includes(dish.id)&&<i aria-hidden="true">✦</i>}</button></article>)}</div>{!matches?.length && <p>Chưa có món có công thức để gợi ý. Bạn vẫn có thể lưu sở thích.</p>}</>}
    </motion.div></AnimatePresence><footer className="survey-footer"><button type="button" disabled={busy || !!savingId} onClick={step>0?()=>{setError('');setStep(step-1);}:onDismiss}>{step>0?'← Quay lại':'Để sau'}</button>{step<10?<button type="button" className="survey-cta" disabled={busy || !hasAnswer(answers,questions[step])} onClick={advance}>{busy?'Đang ghép món…':step===9?'Hoàn tất & Khám phá món ăn 🎉':'Tiếp theo →'}</button>:<button type="button" className="survey-cta" disabled={busy || !!savingId} onClick={finish}>{busy?'Đang lưu…':'Bắt đầu khám phá bếp CookHub ✦'}</button>}</footer><p className="survey-note">Bạn có thể thay đổi sở thích bất cứ lúc nào trong Hồ sơ cá nhân.</p></motion.section></motion.div>;
}
export function OnboardingSurvey({onComplete, onFavorites}) {
  const {user} = useAuth(); const [open,setOpen] = useState(false), [confetti,setConfetti] = useState(false), [error,setError] = useState('');
  const mounted = useRef(false);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  useEffect(()=>{
    if(!user?.survey_pending) return;
    api('/v1/user/survey/claim',{method:'POST'}).then(result=>{if(result.show && mounted.current)setOpen(true);}).catch(err=>{if(mounted.current)setError(err.message);});
  },[user?.id,user?.survey_pending]);
  useEffect(()=>{if(!confetti)return;const timer=setTimeout(()=>setConfetti(false),1800);return()=>clearTimeout(timer);},[confetti]);
  return <><Notice error={error}/><AnimatePresence>{open && <SurveyDialog onDismiss={()=>setOpen(false)} onFavorites={onFavorites} onComplete={()=>{setOpen(false);setConfetti(true);onComplete();}}/>}</AnimatePresence>{confetti&&<Sparkles/>}</>;
}
export function PreferencesSettings({onSaved}) {
  const {setUser} = useAuth(); const resource=useApi('/v1/user/preferences'); const [answers,setAnswers] = useState(emptyAnswers), [busy,setBusy]=useState(false), [error,setError]=useState(''), [message,setMessage]=useState('');
  useEffect(()=>{if(resource.data)setAnswers({...emptyAnswers(), ...(resource.data.answers || {})});},[resource.data?.answers]);
  return <section className="panel preference-settings"><div className="survey-eyebrow">✦ COOKHUB · GU ĂN UỐNG CỦA BẠN</div><h2>Sở thích & nhịp sống</h2><p>Tinh chỉnh góc bếp, để mỗi gợi ý đều gần bạn hơn.</p><Notice error={error || resource.error} message={message}/>{resource.loading?<p role="status">Đang tải sở thích…</p>:resource.error?<button onClick={resource.reload}>Thử lại</button>:<form onSubmit={async event=>{event.preventDefault();setBusy(true);setError('');setMessage('');try{setUser(await api('/v1/user/preferences',{method:'POST',body:answers}));setMessage('Đã cập nhật sở thích. Gợi ý món ăn đã sẵn sàng.');onSaved?.();}catch(err){setError(err.message);}finally{setBusy(false);}}}>{questions.map(question=><fieldset key={question.key}><legend>{question.title} <small>({question.single?'Chọn một':'Chọn nhiều'})</small></legend><BubbleChoices question={question} answers={answers} setAnswers={setAnswers} disabled={busy}/></fieldset>)}<button className="survey-cta" disabled={busy || questions.some(q=>!hasAnswer(answers,q))}>{busy?'Đang lưu…':'Cập nhật sở thích'}</button></form>}</section>;
}

export function CompactPreferencesSettings() {
  const { setUser } = useAuth(); const resource = useApi('/v1/user/preferences');
  const [answers, setAnswers] = useState(emptyAnswers()); const [busy, setBusy] = useState(false); const [message, setMessage] = useState(''); const [error, setError] = useState('');
  useEffect(() => { if (resource.data) setAnswers({ ...emptyAnswers(), ...(resource.data.answers || {}) }); }, [resource.data?.answers]);
  const fields = questions.map(question => ({ ...question, multi: !question.single }));
  function change(question, event) { const values = [...event.target.selectedOptions].map(option => option.value); setAnswers(previous => ({ ...previous, [question.key]: question.multi ? values : values[0] || '' })); }
  async function save(event) { event.preventDefault(); setBusy(true); setError(''); setMessage(''); try { setUser(await api('/v1/user/preferences', { method: 'PUT', body: answers })); setMessage('Đã cập nhật sở thích thành công!'); } catch (err) { setError(err.message); } finally { setBusy(false); } }
  return <section className="panel compact-preferences"><header><div><h2>Sở thích ẩm thực của bạn</h2><p>Tùy chỉnh nhanh các thông số để nhận gợi ý món ăn chuẩn vị nhất.</p></div></header><Notice error={error || resource.error} message={message}/>{resource.loading ? <p>Đang tải sở thích…</p> : <form onSubmit={save}><div className="compact-preferences-grid">{fields.map((question, index) => { const selected = question.multi ? answers[question.key] || [] : answers[question.key] ? [answers[question.key]] : []; return <label className="compact-preference-field" key={question.key}><span>{index + 1}. {question.title}</span><select multiple={question.multi} value={selected} onChange={event => change(question, event)} size={question.multi ? 3 : 1}>{!question.multi && <option value="">Chọn một lựa chọn</option>}{question.options.map(([value, emoji, label]) => <option key={value} value={value}>{emoji} {label}</option>)}</select>{question.multi && <small>{selected.length ? selected.map(value => question.options.find(option => option[0] === value)?.[2]).filter(Boolean).join(' · ') : 'Chưa chọn'}</small>}</label>; })}</div><button className="survey-cta compact-save" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu thay đổi sở thích'}</button></form>}</section>;
}

export function CustomCombobox({ question, value, onChange }) {
  const [open, setOpen] = useState(false); const multi = !question.single; const selected = multi ? value || [] : value ? [value] : [];
  function toggle(option) { const next = multi ? (selected.includes(option[0]) ? selected.filter(item => item !== option[0]) : [...selected, option[0]]) : option[0]; onChange(next); if (!multi) setOpen(false); }
  return <div className="custom-combobox"><button type="button" className="custom-combobox-trigger" onClick={() => setOpen(!open)}><span>{selected.length ? selected.map(key => { const item = question.options.find(option => option[0] === key); return <i key={key}>{item?.[1]} {item?.[2]} {multi && <b onClick={event => { event.stopPropagation(); toggle(item); }}>×</b>}</i>; }) : 'Chọn một lựa chọn'}</span><b className={open ? 'rotated' : ''}>⌄</b></button>{open && <div className="custom-combobox-menu"><small>{multi ? 'Chọn một hoặc nhiều lựa chọn' : 'Chọn một lựa chọn'}</small>{question.options.map(option => <button type="button" key={option[0]} className={selected.includes(option[0]) ? 'selected' : ''} onClick={() => toggle(option)}><span>{option[1]} {option[2]}</span>{selected.includes(option[0]) && <b>✓</b>}</button>)}</div>}</div>;
}

