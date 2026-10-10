import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useApi } from '../hooks';
import { State } from '../components/Common';
import '../admin-account.css';

function LineIcon({ name }) {
  const paths = {
    user: 'M20 21a8 8 0 0 0-16 0m12-12a4 4 0 1 1-8 0 4 4 0 0 1 8 0z',
    lock: 'M7 10V7a5 5 0 0 1 10 0v3m-11 0h12a2 2 0 0 1 2 2v8H4v-8a2 2 0 0 1 2-2z',
    eye: 'M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6zm9.5 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    eyeOff: 'm3 3 18 18M10.6 6.2A9.8 9.8 0 0 1 12 6c6 0 9.5 6 9.5 6a16 16 0 0 1-2.1 2.8M6.2 6.2C3.8 8 2.5 12 2.5 12s3.5 6 9.5 6c1.6 0 3-.4 4.2-1M9.9 9.9a3 3 0 0 0 4.2 4.2',
    logout: 'M10 5H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h5m4-3 4-4-4-4m4 4H9',
    shield: 'M12 3 5 6v5c0 4.6 2.8 8 7 10 4.2-2 7-5.4 7-10V6l-7-3zm-3 9 2 2 4-4'
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d={paths[name]}/></svg>;
}

function PasswordInput({ label, name, value, onChange, error, visible, onToggle, autoComplete }) {
  return <label className={'account-password-field ' + (error ? 'invalid' : '')}>
    <span>{label} <b>*</b></span>
    <div><LineIcon name="lock"/><input name={name} type={visible ? 'text' : 'password'} value={value} onChange={onChange} autoComplete={autoComplete} placeholder={name === 'current_password' ? 'Nhập mật khẩu hiện tại' : name === 'password' ? 'Nhập mật khẩu mới' : 'Nhập lại mật khẩu mới'}/><button type="button" onClick={onToggle} aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}><LineIcon name={visible ? 'eyeOff' : 'eye'}/></button></div>
    {error && <small role="alert">{error}</small>}
  </label>;
}

export default function AdminAccount() {
  const profile = useApi('/profile');
  const [form,setForm] = useState({current_password:'',password:'',confirm_password:''});
  const [visible,setVisible] = useState({});
  const [errors,setErrors] = useState({});
  const [busy,setBusy] = useState(false);
  const [toast,setToast] = useState(null);
  useEffect(()=>{if(!toast)return;const timer=window.setTimeout(()=>setToast(null),5000);return()=>window.clearTimeout(timer)},[toast]);
  const change=event=>{const {name,value}=event.target;setForm(previous=>({...previous,[name]:value}));setErrors(previous=>({...previous,[name]:''}));};
  async function submit(event) {
    event.preventDefault();
    const next={};
    if(!form.current_password)next.current_password='Vui lòng nhập mật khẩu hiện tại.';
    if(!form.password)next.password='Vui lòng nhập mật khẩu mới.';
    else if(form.password.length<8)next.password='Mật khẩu mới phải có ít nhất 8 ký tự.';
    if(!form.confirm_password)next.confirm_password='Vui lòng xác nhận mật khẩu mới.';
    else if(form.confirm_password!==form.password)next.confirm_password='Mật khẩu xác nhận không khớp.';
    if(Object.keys(next).length){setErrors(next);return;}
    setBusy(true);setErrors({});setToast(null);
    try{
      await api('/auth/password',{method:'PUT',body:{current_password:form.current_password,password:form.password}});
      setForm({current_password:'',password:'',confirm_password:''});
      setToast({type:'success',text:'Đổi mật khẩu thành công.'});
    }catch(error){
      if(error.status===400)setErrors({current_password:'Mật khẩu hiện tại không chính xác.'});
      else setToast({type:'error',text:error.message});
    }finally{setBusy(false);}
  }
  const requestLogout=()=>window.dispatchEvent(new Event('request-logout'));
  return <div className="admin-account-page">
    <header className="admin-account-heading"><small>QUẢN TRỊ NỘI DUNG</small><h1>Tài khoản &amp; bảo mật</h1><p>Quản lý thông tin tài khoản và bảo mật đăng nhập của bạn.</p></header>
    {toast&&<div className={'account-toast '+toast.type} role={toast.type==='error'?'alert':'status'}><span>{toast.type==='success'?'✓':'!'}</span>{toast.text}<button type="button" aria-label="Đóng thông báo" onClick={()=>setToast(null)}>×</button></div>}
    <State resource={profile}>{user=><>
      <section className="account-card account-profile-card"><header><span className="account-section-icon"><LineIcon name="user"/></span><div><h2>Thông tin tài khoản</h2><p>Thông tin tài khoản quản trị đang đăng nhập.</p></div></header><div className="account-identity"><span className="account-avatar">{(user.name||'N').trim().slice(0,1).toUpperCase()}</span><div><h3>{user.name}</h3><p>{user.email}</p><div><span className="account-role">{user.role}</span><span className="account-status"><i/> {user.status}</span></div></div></div><dl className="account-details"><div><dt>Mã tài khoản</dt><dd>{user.id}</dd></div><div><dt>Họ và tên</dt><dd>{user.name}</dd></div><div><dt>Email</dt><dd>{user.email}</dd></div><div><dt>Vai trò</dt><dd>{user.role}</dd></div><div><dt>Trạng thái</dt><dd className="active"><i/> {user.status}</dd></div></dl></section>
      <section className="account-card account-password-card"><header><span className="account-section-icon"><LineIcon name="lock"/></span><div><h2>Đổi mật khẩu</h2><p>Để bảo vệ tài khoản, hãy xác nhận mật khẩu hiện tại trước khi đặt mật khẩu mới.</p></div></header><form onSubmit={submit} noValidate><PasswordInput label="Mật khẩu hiện tại" name="current_password" value={form.current_password} onChange={change} error={errors.current_password} visible={visible.current_password} onToggle={()=>setVisible(value=>({...value,current_password:!value.current_password}))} autoComplete="current-password"/><div className="account-password-grid"><PasswordInput label="Mật khẩu mới" name="password" value={form.password} onChange={change} error={errors.password} visible={visible.password} onToggle={()=>setVisible(value=>({...value,password:!value.password}))} autoComplete="new-password"/><PasswordInput label="Xác nhận mật khẩu mới" name="confirm_password" value={form.confirm_password} onChange={change} error={errors.confirm_password} visible={visible.confirm_password} onToggle={()=>setVisible(value=>({...value,confirm_password:!value.confirm_password}))} autoComplete="new-password"/></div><div className="account-form-footer"><p>Không nhớ mật khẩu hiện tại? Sử dụng chức năng <Link to="/forgot">Quên mật khẩu</Link> tại màn hình đăng nhập.</p><button className="account-password-submit" disabled={busy||!form.current_password||!form.password||!form.confirm_password}>{busy?<><i className="account-spinner"/>Đang cập nhật...</>:<><LineIcon name="shield"/>Cập nhật mật khẩu</>}</button></div></form></section>
      <section className="account-card account-session-card"><div className="account-session-copy"><span className="account-section-icon"><LineIcon name="logout"/></span><div><h2>Phiên đăng nhập</h2><p>Bạn có thể kết thúc phiên làm việc hiện tại trên thiết bị này.</p><b>Phiên đăng nhập hiện tại</b><small>Đăng xuất khỏi tài khoản Quản trị nội dung.</small></div></div><button type="button" onClick={requestLogout}><LineIcon name="logout"/>Đăng xuất</button></section>
    </>}</State>
  </div>;
}
