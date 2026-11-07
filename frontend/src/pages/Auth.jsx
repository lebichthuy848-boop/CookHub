import { useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth, landing } from '../auth';
import { Field, Notice } from '../components/Common';
import '../auth-banner.css';

const modes = [['login', 'Đăng nhập', '/login'], ['register', 'Đăng ký', '/register'], ['forgot', 'Quên mật khẩu', '/forgot']];
function ChefIcon(){return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M7 15a4 4 0 0 1-2-7 4 4 0 0 1 7-3 4 4 0 0 1 7 3 4 4 0 0 1-2 7v5H7z"/><path d="M7 17h10M10 12v3m4-3v3"/></svg>}
function InputIcon({ type }) { return <span className="auth-input-icon" aria-hidden="true">{type === 'email' ? '✉' : type === 'name' ? '♙' : '⌑'}</span>; }
function PasswordControl({ name, visible, onToggle, autoComplete, minLength }) {
  return <div className="auth-input-wrap"><InputIcon type="password"/><input aria-label={name === "confirmPassword" ? "Nhập lại mật khẩu" : "Mật khẩu"} name={name} type={visible ? 'text' : 'password'} required minLength={minLength} autoComplete={autoComplete} placeholder="••••••••"/><button className="password-toggle" type="button" onClick={onToggle} aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>{visible ? '◉' : '◌'}</button></div>;
}
export default function Auth({ mode = 'login' }) {
  const { user, setUser } = useAuth();
  const [params] = useSearchParams();
  const [error, setError] = useState(''); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false); const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  if (user) return <Navigate replace to={landing(user.role)}/>;
  const titles = { login: 'Chào mừng trở lại!', register: 'Tạo góc bếp của bạn', forgot: 'Quên mật khẩu?', reset: 'Đặt mật khẩu mới' };
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    const form = Object.fromEntries(new FormData(event.currentTarget));
    const confirmPassword = form.confirmPassword; delete form.confirmPassword;
    if (mode === 'register' && form.password !== confirmPassword) { setError('Mật khẩu nhập lại chưa trùng khớp.'); setBusy(false); return; }
    if (mode === 'reset') form.token = params.get('token') || '';
    try { const result = await api('/auth/' + mode, { method: 'POST', body: form }); if (mode === 'login' || mode === 'register') setUser(result); else setMessage(mode === 'reset' ? 'Đã đổi mật khẩu. Bạn có thể đăng nhập.' : result.message); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  return <main className="auth-page auth-code-banner"><aside className="kitchen-banner"><div className="kitchen-brand"><span>✿</span><b>Cook<span>Hub</span></b></div><div className="kitchen-board"><div className="kitchen-board-top"><span>GÓC BẾP CỦA BẠN</span><i>● Bữa ngon, thêm gắn kết</i></div><div className="kitchen-features">{[['recipes','♧','Công thức đa dạng','Tìm cảm hứng cho bữa ăn'],['plan','▦','Thực đơn mỗi ngày','Sắp xếp bữa ăn theo cách của bạn'],['video','▷','Vào bếp từng bước','Dễ theo dõi, dễ thực hiện']].map(([id,icon,title,detail])=><article className="kitchen-feature" key={id}><div><span aria-hidden="true">{id === 'recipes' ? <ChefIcon/> : icon}</span><b>{title}</b></div><p>{detail}</p></article>)}</div></div><div className="kitchen-footer"><span>CHỌN MÓN</span><i>·</i><span>VÀO BẾP</span><i>·</i><span>CÙNG THƯỞNG THỨC</span></div></aside>
    <div className="auth-floating-foods" aria-hidden="true">{['🥑','🍅','🥕','🥦','🍋','🍓','🥐','🍳','🍜','🥬','🍊','🍒'].map((food,index)=><span key={index} style={{'--food-index':index}}>{food}</span>)}</div>
    <section className="auth-side"><div className="auth-card">
      <p className="auth-eyebrow">NẤU NGON MỖI NGÀY</p><nav className="auth-tabs" aria-label="Xác thực">{modes.map(([key,label,path]) => <Link key={key} to={path} className={mode === key ? 'active' : ''}>{label}</Link>)}</nav>
      <h1>{titles[mode]}</h1><p className="auth-intro">{mode === 'forgot' ? 'Nhập email để nhận liên kết khôi phục mật khẩu.' : mode === 'reset' ? 'Tạo một mật khẩu mới để tiếp tục vào CookHub.' : 'Cùng tạo nên những bữa ăn bạn yêu thích.'}</p><Notice error={error} message={message}/>
      <form onSubmit={submit} className="auth-fields">
        {mode === 'register' && <Field label="Họ và tên"><div className="auth-input-wrap"><InputIcon type="name"/><input aria-label="Họ và tên" name="name" required maxLength={150} autoComplete="name" placeholder="Nhập họ và tên"/></div></Field>}
        {mode !== 'reset' && <Field label="Email"><div className="auth-input-wrap"><InputIcon type="email"/><input aria-label="Email" name="email" type="email" required maxLength={255} autoComplete="email" placeholder="name@example.com"/></div></Field>}
        {mode !== 'forgot' && <Field label="Mật khẩu"><PasswordControl name="password" visible={showPassword} onToggle={() => setShowPassword(!showPassword)} minLength={mode === 'login' ? 1 : mode === 'register' ? 6 : 8} autoComplete={mode === 'login' ? 'current-password' : 'new-password'}/></Field>}
        {mode === 'register' && <Field label="Nhập lại mật khẩu"><PasswordControl name="confirmPassword" visible={showConfirmPassword} onToggle={() => setShowConfirmPassword(!showConfirmPassword)} minLength={6} autoComplete="new-password"/></Field>}
        <button className="primary auth-cta" disabled={busy}>{busy ? 'Đang xử lý…' : {login:'Đăng nhập',register:'Tạo tài khoản',forgot:'Gửi liên kết khôi phục',reset:'Lưu mật khẩu'}[mode]}<span aria-hidden="true">→</span></button>
      </form>
    </div></section></main>;
}
