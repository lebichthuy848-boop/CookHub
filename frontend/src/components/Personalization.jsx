import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { api, media } from '../api';
import { useAuth } from '../auth';
import { useApi } from '../hooks';
import { Notice } from './Common';
import './Personalization.css';

export const questions = [
  {key:'ingredients', title:'Nguyên liệu ưa thích của bạn là gì?', options:[['chicken','🍗','Thịt gà'],['pork','🥩','Thịt heo'],['seafood','🐟','Hải sản & Cá'],['beef','🥩','Thịt bò'],['vegetables','🥦','Món chay / Rau củ'],['eggs_tofu','🥚','Trứng & Đậu hũ']]},
  {key:'occasions', title:'Bạn thường nấu cho ai & theo chế độ nào?', options:[['solo','👤','Bữa ăn 1 người'],['family','👨‍👩‍👧','Gia đình ấm cúng'],['healthy','🥗','Ăn uống cân bằng / Healthy'],['low_carb','🥑','Ít tinh bột / Low Carb'],['children','👶','Món cho trẻ nhỏ'],['friends','🍻','Tụ tập bạn bè']]},
  {key:'tastes', title:'Khẩu vị nào khiến bạn thích mê?', options:[['savory','🧂','Đậm đà / Mặn mà'],['spicy','🌶️','Cay nồng bùng vị'],['sweet_sour','🍋','Chua ngọt hài hòa'],['light','🌿','Thanh nhẹ / Nguyên bản'],['rich','🥥','Béo ngậy / Cốt dừa']]},
  {key:'time', title:'Bạn có bao nhiêu thời gian cho mỗi bữa?', single:true, options:[['quick','⚡','Nhanh gọn · <15 phút'],['medium','⏱️','Vừa đủ · 15–30 phút'],['relaxed','🍳','Thong thả · >45 phút']]},
  {key:'tools', title:'Trong bếp của bạn có những dụng cụ nào?', options:[['stove','🍳','Bếp gas / Bếp từ'],['air_fryer','🍟','Nồi chiên không dầu'],['pressure_cooker','🍲','Nồi áp suất / Nồi hầm'],['oven','🍞','Lò nướng'],['no_cook','🥗','Không cần nấu']]},
  {key:'regions', title:'Vùng miền / phong cách ẩm thực bạn yêu thích?', options:[['north','🍲','Miền Bắc'],['central','🌶️','Miền Trung'],['south','🥥','Miền Tây / Nam Bộ'],['asia','🥢','Món Á'],['western','🍝','Món Âu']]},
  {key:'avoid', title:'Bạn có dị ứng hoặc kiêng nguyên liệu nào không?', options:[['none','👍','Không kiêng'],['seafood_allergy','🦐','Hải sản / Tôm cua'],['peanut','🥜','Đậu nành / Lạc'],['lactose','🥛','Sữa / Lactose'],['spicy_avoid','🌶️','Đồ cay']]},
  {key:'budget', title:'Ngân sách dự kiến cho một bữa ăn?', single:true, options:[['saving','💰','Tiết kiệm · <50k'],['normal','💵','Bình dân · tối đa 150k'],['comfortable','💳','Thoải mái · không giới hạn']]},
  {key:'skill', title:'Mức độ thành thạo kỹ năng nấu nướng?', single:true, options:[['beginner','🐣','Mới bắt đầu'],['basic','🍳','Nấu ăn cơ bản'],['chef','🧑‍🍳','Bếp trưởng gia đình']]},
  {key:'meals', title:'Loại bữa ăn bạn quan tâm nhất hiện tại?', options:[['breakfast','🌅','Bữa sáng nhanh'],['lunch','🍱','Cơm trưa đủ chất'],['dinner','🌙','Bữa tối gia đình'],['snack','🍰','Ăn vặt / Tráng miệng']]},
];
export const emptyAnswers = () => ({ingredients:[], occasions:[], tastes:[], time:'', tools:[], regions:[], avoid:[], budget:'', skill:'', meals:[]});
const avoidLabels = {seafood_allergy:'cá và hải sản', peanut:'đậu nành và lạc', lactose:'sữa', spicy_avoid:'món cay'};
const listed = (values, names) => (values || []).map(value => names[value]).filter(Boolean).join(', ');
export function describeEatingStyle(answers) {
  const has = (key, value) => (answers[key] || []).includes(value);
  const quick = answers.time === 'quick' || answers.time === 'medium';
  const mainMeal = has('meals', 'lunch') || has('meals', 'dinner');
  const meatOrFish = ['chicken', 'pork', 'beef', 'seafood'].some(value => has('ingredients', value));
  const vegetables = has('ingredients', 'vegetables');
  const strongTaste = has('tastes', 'savory') || has('tastes', 'spicy');
  const taste = has('tastes', 'spicy') ? 'cay nồng' : has('tastes', 'savory') ? 'đậm vị' :
    has('tastes', 'light') ? 'thanh nhẹ' : has('tastes', 'sweet_sour') ? 'chua ngọt' : 'béo ngậy';
  const flexibleServings = has('occasions', 'solo') && has('occasions', 'family');
  const avoid = listed((answers.avoid || []).filter(value => value !== 'none'), avoidLabels);
  let title, conclusion;
  if (has('occasions', 'low_carb')) {
    title = 'Ưu tiên bữa ăn ít tinh bột, hợp nhịp sống của bạn';
    conclusion = `Bạn thiên về bữa ${mainMeal ? 'chính' : 'ăn'} ít tinh bột${quick ? ' nhưng vẫn muốn nấu gọn' : ''}. ${vegetables ? 'Món có rau' : 'Món từ nguyên liệu quen thuộc'}${meatOrFish ? ' kết hợp thịt hoặc cá' : ''} sẽ gần với hướng bạn chọn hơn món dựa nhiều vào cơm, mì hoặc bánh.`;
  } else if (has('occasions', 'healthy')) {
    title = 'Thiên về bữa ăn cân bằng, dễ duy trì';
    conclusion = `Bạn có xu hướng chọn ${mainMeal ? 'bữa chính' : 'món ăn'} ${vegetables && meatOrFish ? 'có cả rau và thịt hoặc cá' : vegetables ? 'nhiều rau' : 'đa dạng nguyên liệu'}${quick ? ', chế biến gọn' : ''}. Kiểu món này hợp với mong muốn ăn cân bằng hơn những công thức chỉ tập trung vào một nhóm nguyên liệu.`;
  } else if (meatOrFish && vegetables && mainMeal && quick) {
    title = `Gu ${taste}, bữa chính nấu gọn`;
    conclusion = `Bạn có xu hướng chọn món chính có cả thịt hoặc cá và rau, vị ${taste}, nhưng không muốn nhiều công đoạn. Một món xào hoặc áp chảo có rau sẽ hợp hơn món hầm lâu.`;
  } else if (vegetables && !meatOrFish) {
    title = `Gu ${taste}, thiên về món rau và đậu`;
    conclusion = `Bạn nghiêng về món rau${has('ingredients', 'eggs_tofu') ? ' cùng trứng hoặc đậu hũ' : ''}. Đổi cách chế biến và gia vị sẽ giúp bữa ăn bớt lặp lại mà vẫn giữ đúng kiểu món bạn thích.`;
  } else {
    title = `Gu ${taste}${quick ? ', thích nấu gọn' : ', thích tự tay chuẩn bị bữa ăn'}`;
    conclusion = `Điểm chung trong lựa chọn của bạn là hương vị ${taste}${quick ? ' và thời gian chuẩn bị ngắn' : ''}. Hãy bắt đầu từ những công thức có vị rõ ràng, rồi điều chỉnh nguyên liệu cho bữa ăn bạn quan tâm.`;
  }
  let cooking = has('tools', 'no_cook') ? 'Món salad hoặc món không cần nấu sẽ hợp với nhịp chuẩn bị của bạn.' :
    has('tools', 'air_fryer') && has('tools', 'stove') ? 'Bạn có thể xoay giữa món xào trên bếp và món làm bằng nồi chiên không dầu để đổi cách ăn mà không tăng nhiều thao tác.' :
    has('tools', 'air_fryer') ? 'Món làm bằng nồi chiên không dầu là hướng thử phù hợp.' :
    has('tools', 'oven') ? 'Bạn có thể thử các món nướng ít bước.' :
    has('tools', 'pressure_cooker') ? 'Nồi áp suất phù hợp với các món cần làm mềm nguyên liệu.' :
    'Các món một chảo là hướng thử đơn giản.';
  if (answers.skill === 'beginner') cooking += ' Nên bắt đầu từ công thức ít bước.';
  if (flexibleServings) cooking += ' Vì bạn nấu cả cho một người lẫn gia đình, món dễ tăng giảm lượng nguyên liệu sẽ tiện hơn.';
  if (has('regions', 'asia') && strongTaste) cooking += ' Gia vị kiểu Á cũng hợp gu vị rõ của bạn.';
  const constraints = [];
  if (avoid) constraints.push(`Khi chọn công thức, hãy kiểm tra nguyên liệu cần tránh: ${avoid}${has('avoid', 'seafood_allergy') ? ', kể cả nước mắm' : ''}.`);
  if (answers.budget === 'saving') constraints.push('Ưu tiên món dùng nguyên liệu phổ biến và có chi phí dưới 50.000đ/phần.');
  else if (answers.budget === 'normal') constraints.push('Ưu tiên món có chi phí tối đa 150.000đ/phần.');
  return {
    title,
    details: [conclusion, cooking, ...constraints],
  };
}
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
  const eatingStyle = step === questions.length ? describeEatingStyle(answers) : null;
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
    if(step < questions.length - 1) {setStep(step+1);return;}
    setBusy(true);setError('');
    try {setMatches(await api('/v1/user/preferences/preview',{method:'POST',body:answers}));}
    catch(err) {setMatches([]);setError(`Chưa tải được món gợi ý: ${err.message}`);}
    finally {setBusy(false);setStep(questions.length);}
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
    {step < 10 ? <><p className="survey-counter">Câu {step+1} / 10 · {questions[step].single?'Chọn một':'Có thể chọn nhiều'}</p><h2 id="survey-title">{questions[step].title}</h2><p>Chạm vào những bong bóng hợp với bạn. CookHub sẽ lo phần cảm hứng.</p><BubbleChoices question={questions[step]} answers={answers} setAnswers={setAnswers} floating disabled={busy}/></> : <><p className="survey-counter">✨ Góc bếp của bạn đã sẵn sàng</p><h2 id="survey-title">Phong cách ăn uống của bạn</h2><div className="eating-style-card"><h3>{eatingStyle.title}</h3>{eatingStyle.details.map((detail,index)=><p key={index}>{detail}</p>)}<small>Nhận định được rút ra từ cách bạn kết hợp các lựa chọn; có thể chỉnh lại trong Hồ sơ.</small></div><h3 className="survey-preview-title">Món hợp gu để bạn thử</h3><p>{matches?.length || 0} món được xếp theo các tiêu chí gợi ý hiện có. Vuốt ngang để khám phá.</p><small>Dụng cụ được suy luận từ công thức.</small><div className="quick-match-grid">{matches?.map(dish => <article className="quick-match-card" key={dish.id}><img src={media(dish.image)} alt={dish.name}/><h3>{dish.name}</h3><small>{dish.time} phút · {dish.difficulty}</small><button disabled={!!savingId || busy} type="button" aria-label={'Yêu thích '+dish.name} aria-pressed={favoriteIds.includes(dish.id)} className={favoriteIds.includes(dish.id)?'heart picked':'heart'} onClick={()=>favorite(dish.id)}>{favoriteIds.includes(dish.id)?'♥':'♡'}{favoriteIds.includes(dish.id)&&<i aria-hidden="true">✦</i>}</button></article>)}</div>{!matches?.length && <p>Chưa có món phù hợp để xem trước. Bạn vẫn có thể lưu sở thích.</p>}</>}
    </motion.div></AnimatePresence><footer className="survey-footer"><button type="button" disabled={busy || !!savingId} onClick={step>0?()=>{setError('');setStep(step-1);}:onDismiss}>{step>0?'← Quay lại':'Để sau'}</button>{step<10?<button type="button" className="survey-cta" disabled={busy || !hasAnswer(answers,questions[step])} onClick={advance}>{busy?'Đang ghép món…':step===9?'Xem nhận định & món gợi ý ✦':'Tiếp theo →'}</button>:<button type="button" className="survey-cta" disabled={busy || !!savingId} onClick={finish}>{busy?'Đang lưu…':'Lưu sở thích & bắt đầu khám phá ✦'}</button>}</footer><p className="survey-note">Bạn có thể thay đổi sở thích bất cứ lúc nào trong Hồ sơ cá nhân.</p></motion.section></motion.div>;
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
  const {setUser} = useAuth(); const resource=useApi('/v1/user/preferences'); const [answers,setAnswers] = useState(emptyAnswers), [busy,setBusy]=useState(false), [error,setError]=useState(''), [message,setMessage]=useState(''), [showStyle,setShowStyle]=useState(false);
  useEffect(()=>{if(resource.data)setAnswers({...emptyAnswers(), ...(resource.data.answers || {})});},[resource.data?.answers]);
  const eatingStyle = describeEatingStyle(answers);
  return <section className="panel preference-settings"><div className="survey-eyebrow">✦ COOKHUB · GU ĂN UỐNG CỦA BẠN</div><h2>Sở thích & nhịp sống</h2><p>Tinh chỉnh góc bếp, để mỗi gợi ý đều gần bạn hơn.</p><Notice error={error || resource.error} message={message}/>{(showStyle || (resource.data?.answers && answers.ingredients.length)) && <div className="eating-style-card"><h3>{eatingStyle.title}</h3>{eatingStyle.details.map((detail,index)=><p key={index}>{detail}</p>)}</div>}{resource.loading?<p role="status">Đang tải sở thích…</p>:resource.error?<button onClick={resource.reload}>Thử lại</button>:<form onSubmit={async event=>{event.preventDefault();setBusy(true);setError('');setMessage('');try{setUser(await api('/v1/user/preferences',{method:'POST',body:answers}));setMessage('Đã cập nhật sở thích. Gợi ý món ăn đã sẵn sàng.');setShowStyle(true);onSaved?.();}catch(err){setError(err.message);}finally{setBusy(false);}}}>{questions.map(question=><fieldset key={question.key}><legend>{question.title} <small>({question.single?'Chọn một':'Có thể chọn nhiều'})</small></legend><BubbleChoices question={question} answers={answers} setAnswers={setAnswers} disabled={busy}/></fieldset>)}<button className="survey-cta" disabled={busy || questions.some(q=>!hasAnswer(answers,q))}>{busy?'Đang lưu…':'Cập nhật sở thích'}</button></form>}</section>;
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

