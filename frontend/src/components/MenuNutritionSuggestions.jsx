import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { media } from '../api';
import { exceedsNutritionTarget } from '../nutrition-targets';
import './menu-nutrition-suggestions.css';

const metrics = [
  ['nang_luong', 'Năng lượng', 'kcal'],
  ['chat_dam', 'Protein', 'g'],
  ['chat_bot_duong', 'Carbs', 'g'],
  ['chat_beo', 'Chất béo', 'g'],
  ['chat_xo', 'Chất xơ', 'g'],
];
const format = value => value.toLocaleString('vi-VN', {maximumFractionDigits: 1});
const upperMetrics = [...metrics.filter(([key]) => key !== 'chat_xo'), ['natri', 'Natri', 'mg']];
const allMetrics = [...metrics, ['natri', 'Natri', 'mg']];

export default function MenuNutritionSuggestions({result, goals, options, dishes, items, onAdd, tip}) {
  const [meal, setMeal] = useState('Sáng');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [pendingAddition, setPendingAddition] = useState(null);
  const [showAllSuggestions,setShowAllSuggestions]=useState(false);
  const totals = result?.totals;
  const itemTotals = result?.item_totals || {};
  const hasCompleteTotals = result?.view_complete !== false;
  const hasKnownNutrients = Object.values(totals || {}).some(value => Number.isFinite(value) && value > 0)
    || Object.values(itemTotals).some(profile => Object.values(profile || {}).some(value => Number.isFinite(value) && value > 0));
  // Energy remains useful as a gap until it reaches the target. The 95% band is
  // only used for macros/fibre so a small kcal shortfall can still produce a
  // portion-aware recommendation instead of the misleading "đã đạt" message.
  const gaps = metrics.flatMap(([key, label, unit]) => hasKnownNutrients && goals?.[key] > 0 && Number.isFinite(totals?.[key]) && totals[key] < goals[key] * (key === 'nang_luong' ? 1 : .95)
    ? [{key, label, unit, amount: goals[key] - totals[key]}] : []);
  const planned = new Set(items.map(item => item.dish_id?.trim().toUpperCase()));
  const profiles = new Map((options.data || []).map(item => [item.id.trim().toUpperCase(), item]));
  const excesses = upperMetrics.filter(([key]) => exceedsNutritionTarget(key, totals?.[key], goals?.[key]));
  useEffect(() => {
    if (pendingAddition && result !== pendingAddition.result &&
        items.some(item => item.dish_id?.trim().toUpperCase() === pendingAddition.id)) {
      setPendingAddition(null);
    }
  }, [pendingAddition, result, items]);
  const reductions = items.flatMap(item => {
    // Goals are temporarily unavailable while household revisions synchronize.
    if (!goals || !totals || !excesses.length) return [];
    const id = item.dish_id?.trim().toUpperCase();
    const profile = itemTotals[item.id.trim()];
    const dish = (dishes || []).find(dish => dish.id === id);
    const name = item.dish_name || dish?.name;
    if (!profile || !name) return [];
    const memberId=result?.view_member_id;
    const assigned=Number(result?.member_portions?.[memberId]?.[item.id.trim()]);
    const servings = memberId ? (Number.isFinite(assigned)?assigned:0) : (Number(item.servings) || 1);
    if (!(servings>0)) return [];
    const step=memberId?0.25:1;
    const candidates = Array.from({length: Math.floor(servings/step+1e-8)}, (_, index) => {
      const reduceBy = Number(((index + 1) * step).toFixed(2));
      const fraction = reduceBy / servings;
      const impact = excesses.flatMap(([key, label, unit]) => profile[key] > 0
        ? [{label, unit, amount: profile[key] * fraction,
            incomplete:profile.missing_metrics?.includes(key),
            benefit: Math.min(profile[key] * fraction, totals[key] - goals[key]) / goals[key]}] : []);
      const loss = metrics.reduce((sum, [key]) => {
        if (!(goals[key] > 0) || !(profile[key] > 0)) return sum;
        const remaining = Math.max(0, totals[key] - profile[key] * fraction);
        return sum + (Math.max(0, goals[key] - remaining) - Math.max(0, goals[key] - totals[key])) / goals[key];
      }, 0);
      const worsens=metrics.flatMap(([key,label,unit])=>{
        if(!(goals[key]>0)||!(profile[key]>0))return [];
        const before=Math.max(0,goals[key]-totals[key]);
        const after=Math.max(0,goals[key]-(totals[key]-profile[key]*fraction));
        const amount=after-before;
        return amount>1e-8?[{label,unit,amount,incomplete:profile.missing_metrics?.includes(key)}]:[];
      });
      return {reduceBy, impact, worsens, score: impact.reduce((sum, value) => sum + value.benefit, 0) - loss};
    });
    if(!candidates.length)return [];
    const best = candidates.reduce((best, candidate) => candidate.score > best.score ? candidate : best);
    return best.impact.length ? [{item, name, servings, memberId, ...best}] : [];
  }).sort((a,b) => b.score-a.score).slice(0,3);
  const suggestions = (dishes || []).flatMap(dish => {
    const id = dish.id.trim().toUpperCase();
    const profileEntry = profiles.get(id);
    const profile = profileEntry?.totals || profileEntry;
    if (!hasKnownNutrients || !profile || planned.has(id)) return [];
    const energyGap=gaps.find(gap=>gap.key==='nang_luong');
    // Menu servings are stored as integers. Never recommend a whole serving
    // whose known kcal already exceeds the remaining energy allowance.
    if(energyGap&&Number.isFinite(profile.nang_luong)&&profile.nang_luong>energyGap.amount+1e-9)return [];
    const unknown = new Set([...(profileEntry?.missing_metrics || profile?.missing_metrics || []), ...allMetrics.filter(([key])=>!Number.isFinite(profile[key])).map(([key])=>key)]);
    const contributions = gaps.filter(gap => Number.isFinite(profile[gap.key]) && profile[gap.key] > 0)
      .map(gap => ({...gap, incomplete:unknown.has(gap.key), score: Math.min(profile[gap.key], gap.amount) / goals[gap.key]}))
      .sort((a,b) => b.score - a.score);
    if (!contributions.length) return [];
    const missingMetrics = allMetrics.filter(([key]) => unknown.has(key)).map(([,label])=>label);
    const potentialExcess = upperMetrics.flatMap(([key,label,unit])=>{
      if(!Number.isFinite(profile[key])||!Number.isFinite(totals?.[key])||!(goals?.[key]>0))return [];
      const limit=goals[key]*(key==='natri'?1:1.05);
      const amount=totals[key]+profile[key]-Math.max(totals[key],limit);
      return amount>1e-8?[{key,label,unit,amount,incomplete:unknown.has(key)}]:[];
    });
    const penalty = upperMetrics.reduce((sum, [key]) => {
      if (!(goals[key] > 0)) return sum;
      if (unknown.has(key)) return sum + .005;
      const room = Math.max(0, goals[key] - totals[key]);
      return sum + Math.max(0, profile[key] - room) / goals[key];
    }, 0);
    const score=contributions.reduce((sum, item)=>sum + item.score, 0) - penalty;
    return [{dish, profile, contributions, missingMetrics, potentialExcess, needsCaution:missingMetrics.length>0||potentialExcess.length>0, score}];
  });
  // A dish that is already known to push any upper-limit nutrient higher must
  // never be offered as an addition; otherwise the reduction card immediately
  // asks the user to remove the dish that this card just recommended.
  const eligibleSuggestions=suggestions.filter(option=>option.potentialExcess.length===0);
  const safeSuggestions=eligibleSuggestions.filter(option=>option.score>0&&!option.needsCaution).sort((a,b)=>b.score-a.score);
  const cautionSuggestions=eligibleSuggestions.filter(option=>option.needsCaution).sort((a,b)=>b.score-a.score);
  // Prefer every fully checked option. Estimates with unknown metrics are only
  // a fallback, and their known values are still required to stay in limits.
  const rankedSuggestions=safeSuggestions.length?safeSuggestions:cautionSuggestions;
  const displayedSuggestions=showAllSuggestions?rankedSuggestions:rankedSuggestions.slice(0,3);
  const remainingDishes = (dishes || []).filter(dish=>!planned.has(dish.id.trim().toUpperCase()));
  const noAdditionalDishNeeded = Boolean(goals && totals && hasKnownNutrients && gaps.length === 0);

  async function add(dish) {
    if (busy || pendingAddition) return;
    setBusy(true);
    setPendingAddition({id: dish.id.trim().toUpperCase(), result});
    setFeedback(null);
    try {
      await onAdd(dish.id, meal);
      setFeedback({message: 'Đã thêm ' + dish.name + ' vào bữa ' + meal.toLocaleLowerCase('vi-VN') + '.'});
    } catch (error) {
      setPendingAddition(null);
      setFeedback({message: error.message, error: true});
    } finally {
      setBusy(false);
    }
  }

  return <>
    <div className="menu-balance-row">
      {excesses.length>0&&<aside className="menu-reduction-note" aria-label="Cảnh báo thực đơn" role="status">
        <div className="menu-warning-heading"><strong>⚠ Vượt mục tiêu · {result?.view_label||'thực đơn'}</strong><span>{result?.view_goal||'Ước tính'}</span></div>
        <div className="menu-excess-tags">{excesses.map(([key,label,unit])=><span key={key}>{key==='nang_luong'?'🔥':key==='natri'?'🧂':'↑'} {label} <b>+{format(totals[key]-goals[key])} {unit}</b></span>)}</div>
        {reductions.length>0&&<div className="menu-warning-subheading"><strong>↘ Món nên giảm</strong><small>Chọn 1 phương án</small></div>}
        {reductions.length>0 ? <ul>{reductions.map(({item,name,servings,reduceBy,impact,worsens,memberId})=><li key={item.id}>
          <div className="menu-reduction-meal"><span>{({'Sáng':'☀️','Trưa':'🌤️','Tối':'🌙','Ăn nhẹ':'🍎'})[item.meal]} {item.meal}</span><strong>−{reduceBy} phần</strong></div>
          <b className="menu-reduction-name">{name}</b>
          <small>{memberId ? `${result.view_label}: ${reduceBy>=servings?'bỏ phần của bạn':'còn '+format(servings-reduceBy)+' phần'}` : reduceBy>=servings?'Bỏ món':'Còn '+format(servings-reduceBy)+' phần'}</small>
          {!memberId&&result?.view_members?.length>1&&<small>Nếu chia đều lại: {format((Number(item.servings||1)-reduceBy)/result.view_members.length)} phần/người.</small>}
          <div className="menu-reduction-effects">{impact.sort((a,b)=>b.benefit-a.benefit).slice(0,2).map(({label,amount,unit,incomplete})=><span key={label}>↓ {label} {incomplete?'≥':''}{format(amount)} {unit}</span>)}</div>
          {worsens.length>0&&<small className="menu-reduction-tradeoff">Đổi lại có thể thiếu thêm: {worsens.slice(0,2).map(({label,amount,unit,incomplete})=>label+' '+(incomplete?'≥':'')+format(amount)+' '+unit).join(' · ')}.</small>}
        </li>)}</ul> : <small>{result?.view_complete===false?'Chưa tìm được món có đủ dữ liệu ở chỉ số đang vượt để ước tính lượng giảm.':'Chưa xác định được món nên bớt từ dữ liệu thực đơn hiện có.'}</small>}
      </aside>}
      {tip}
    </div>
    {!noAdditionalDishNeeded&&<section className="menu-nutrition-suggestions" aria-labelledby="menu-suggestions-heading">
    <header>
      <div><h2 id="menu-suggestions-heading">Món nên thêm</h2>
        {result?.view_label&&<small className="menu-suggestion-context">Đang xem: {result.view_label} · {result.view_goal||'mục tiêu hiện tại'}</small>}
        {gaps.length>0&&<p>{hasCompleteTotals?'Còn thiếu so với mục tiêu ngày':'Còn thiếu theo số liệu đã tính'} · {gaps.map(gap=>gap.label+' '+format(gap.amount)+' '+gap.unit).join(' · ')}</p>}
        {goals?.natri>0&&<small className="menu-sodium-rule">Natri chỉ dùng để kiểm tra giới hạn tối đa, không phải chỉ tiêu cần ăn đủ.</small>}
      </div>
      {displayedSuggestions.length>0&&<label>Thêm vào bữa <select value={meal} disabled={busy} onChange={event=>setMeal(event.target.value)}>
        {['Sáng','Trưa','Tối','Ăn nhẹ'].map(value=><option key={value}>{value}</option>)}
      </select></label>}
    </header>
    {displayedSuggestions.length>0&&result?.equal_split_items?.length>0&&<p className="menu-suggestion-assumption" role="note">Khẩu phần của {result.view_label||'thành viên'} đang được chia đều ước tính cho {result.equal_split_items.length} món; hãy chia khẩu phần chính xác để cá nhân hóa cảnh báo.</p>}
    {feedback&&<p role={feedback.error?'alert':'status'}>{feedback.message}</p>}
    {pendingAddition ? <p role="status">Đang cập nhật dinh dưỡng và gợi ý món…</p> : displayedSuggestions.length>0 ? <div className="menu-nutrition-grid">{displayedSuggestions.map(({dish, profile, contributions, missingMetrics, potentialExcess})=>
      <article key={dish.id}>
        <Link to={'/dish/'+dish.id}><img src={media(dish.image)} alt="" loading="lazy"/><strong>{dish.name}</strong></Link>
        <p>{contributions.slice(0,2).map(({key,label,unit,incomplete})=>label+' '+(incomplete?'≥':' +')+format(profile[key])+' '+unit).join(' · ')} / phần</p>
        {potentialExcess.length>0&&<small className="menu-suggestion-risk">⚠ Thêm 1 phần có thể làm vượt thêm: {potentialExcess.map(({label,unit,amount,incomplete})=>label+' '+(incomplete?'≥':' +')+format(amount)+' '+unit).join(' · ')}.</small>}
        {missingMetrics.length>0&&<small className="menu-suggestion-unknown">⚠ Chưa tính đủ: {missingMetrics.join(', ')}{profile.processing_issues?.length?'; '+profile.processing_issues.join('; '):''}. Chưa thể xác nhận món không làm vượt.</small>}
        {result?.view_member_id&&<small>Phần này sẽ được tính cho {result.view_label}.</small>}
        {!result?.view_member_id&&result?.view_members?.length>1&&<small>Chia đều ước tính: {format(1/result.view_members.length)} phần/người ({result.view_members.map(member=>member.name).join(', ')}).</small>}
        {Number.isFinite(totals?.nang_luong)&&Number.isFinite(goals?.nang_luong)&&totals.nang_luong >= goals.nang_luong && <small>Đã đạt mục tiêu kcal theo số liệu hiện có. Cân nhắc thay món để bổ sung chất còn thiếu.</small>}
        <button type="button" disabled={busy} onClick={()=>add(dish)}>＋ Thêm 1 phần{potentialExcess.length>0||missingMetrics.length>0?' · xem lưu ý':''}</button>
      </article>)}</div> : options.error ? <div role="alert">
        <p>Chưa tải được dữ liệu món. {options.error}</p>
        <button type="button" onClick={options.reload}>Thử tải lại</button>
    </div> : <p>{!goals||!totals?'Cần dữ liệu thực đơn và mục tiêu dinh dưỡng để gợi ý món.'
      : !hasKnownNutrients?'Chưa có đủ số liệu dinh dưỡng đã tính để xác định chất còn thiếu.'
      : !gaps.length?'Các chỉ số dinh dưỡng đang nằm trong mức mục tiêu.'
      : options.loading?'Đang tìm món phù hợp…':!remainingDishes.length&&dishes?.length
      ?'Tạm thời chưa nên bổ sung món vì các món phù hợp đều đã có trong thực đơn.'
      :'Tạm thời chưa nên bổ sung món. Chưa có món phù hợp với phần dinh dưỡng còn thiếu mà không làm vượt các giới hạn khác.'}</p>}
    {!pendingAddition&&rankedSuggestions.length>3&&<button type="button" className="menu-suggestions-more" aria-expanded={showAllSuggestions} onClick={()=>setShowAllSuggestions(value=>!value)}>{showAllSuggestions?'Thu gọn ↑':'Xem thêm >> ('+(rankedSuggestions.length-3)+' món)'}</button>}
    </section>}
  </>;
}
