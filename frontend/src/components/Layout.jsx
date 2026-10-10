import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import React from 'react';
import { useEffect, useState } from 'react';
import { useAuth, landing } from '../auth';
import { api } from '../api';

const userNav = [['home', 'home', 'Trang chủ'], ['suggest', 'sparkle', 'Đề xuất'], ['search', 'search', 'Tìm kiếm'], ['menu', 'calendar', 'Thực đơn'], ['foods', 'utensils', 'Khám phá món ăn'], ['pantry', 'leaf', 'Nguyên liệu'], ['favorites', 'heart', 'Yêu thích'], ['profile', 'user', 'Hồ sơ'], ['settings', 'settings', 'Cài đặt']];
const adminNav = [['system', 'grid', 'Tổng quan'], ['categories', 'grid', 'Danh mục'], ['recipes', 'book', 'Món ăn & Công thức'], ['videos', 'chart', 'Video hướng dẫn'], ['reviews', 'check', 'Đánh giá & Kiểm duyệt']];
const systemNav = [['system', 'grid', 'Tổng quan hệ thống'], ['users', 'users', 'Người dùng & Phân quyền'], ['reports', 'chart', 'Báo cáo & Thống kê']];
const searchSuggestions = ['Phở bò...', 'Bánh mì...', 'Lẩu hải sản...'];

export function Icon({ name }) {
  const paths = { home: 'M3 10.5 12 3l9 7.5v9a1.5 1.5 0 0 1-1.5 1.5h-5v-6h-5v6h-5A1.5 1.5 0 0 1 3 19.5z', sparkle: 'm12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z', search: 'm20 20-4.4-4.4M10.7 17a6.3 6.3 0 1 1 0-12.6 6.3 6.3 0 0 1 0 12.6z', calendar: 'M6 3v3m12-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z', utensils: 'M7 3v8m0-8H4v5a3 3 0 0 0 6 0V3H7zm8 0v18m0-18c3 2 4 5 4 8h-4', leaf: 'M20 4C11 4 5 8.5 5 15c0 2.2 1.8 4 4 4 6.5 0 11-6 11-15zM4 20c3-5 7-8 12-10', heart: 'M20.8 5.8a5.2 5.2 0 0 0-7.4 0L12 7.2l-1.4-1.4a5.2 5.2 0 0 0-7.4 7.4L12 22l8.8-8.8a5.2 5.2 0 0 0 0-7.4z', user: 'M20 21a8 8 0 0 0-16 0m12-12a4 4 0 1 1-8 0 4 4 0 0 1 8 0zm2 2a3 3 0 0 1 0 6m3 6v-2a4 4 0 0 0-2-3.5', settings: 'M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5zm0-12v2m0 13v2m8.5-9h-2m-13 0h-2m14.5-6-1.4 1.4m-9.2 9.2L5.6 19.1m12.8 0-1.4-1.4M7.9 6.9 6.5 5.5', grid: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z', book: 'M5 4.5A2.5 2.5 0 0 1 7.5 2H20v18H7.5A2.5 2.5 0 0 0 5 22zm0 0v15.5A2.5 2.5 0 0 1 7.5 17H20', users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m12-14a4 4 0 1 1-8 0 4 4 0 0 1 8 0zm2 2a3 3 0 0 1 0 6m3 6v-2a4 4 0 0 0-2-3.5', chart: 'M4 20V10m6 10V4m6 16v-7m6 7V7', check: 'm5 12 4 4L19 6' };
  return <svg className="side-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name] || paths.home}/></svg>;
}

function useTypingPlaceholder(words) {
  const [text, setText] = useState('');
  useEffect(() => {
    let word = 0; let index = 0; let removing = false; let pause = 4;
    const timer = window.setInterval(() => {
      if (pause > 0) { pause -= 1; return; }
      const value = words[word];
      if (!removing) {
        index += 1; setText(value.slice(0, index));
        if (index === value.length) { removing = true; pause = 13; }
      } else {
        index -= 1; setText(value.slice(0, index));
        if (index === 0) { removing = false; word = (word + 1) % words.length; pause = 3; }
      }
    }, 78);
    return () => window.clearInterval(timer);
  }, [words]);
  return text;
}

export default function Layout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false); const [error, setError] = useState(''); const [searching, setSearching] = useState(false); const [pendingReviews,setPendingReviews]=useState(0); const [logoutOpen,setLogoutOpen]=useState(false); const [logoutBusy,setLogoutBusy]=useState(false);
  const navigate = useNavigate(); const systemAdmin = user.role === 'Quản trị viên'; const admin = systemAdmin || user.role === 'Quản trị nội dung'; const nav = systemAdmin ? systemNav : admin ? adminNav : userNav;
  useEffect(()=>{if(user.role!=='Quản trị nội dung')return;let active=true;const load=()=>api('/admin/reviews').then(items=>{if(active)setPendingReviews(items.filter(x=>x.status==='Chờ duyệt').length)}).catch(()=>{});load();window.addEventListener('reviews-updated',load);return()=>{active=false;window.removeEventListener('reviews-updated',load)}},[user.role]);
  useEffect(()=>{const request=()=>setLogoutOpen(true);window.addEventListener('request-logout',request);return()=>window.removeEventListener('request-logout',request)},[]);
  const searchHint = useTypingPlaceholder(searchSuggestions);
  function submitSearch(event) {
    event.preventDefault(); setSearching(true);
    navigate('/search?q=' + encodeURIComponent(new FormData(event.currentTarget).get('q')));
    window.setTimeout(() => setSearching(false), 650);
  }
  return <div className="shell"><aside className={'sidebar premium-sidebar ' + (admin ? 'admin-sidebar ' : '') + (open ? 'open' : '')}>
    <Link to={landing(user.role)} className="sidebar-brand"><span className="brand-flower">✿</span><span>Cook<span>Hub</span><small>Nấu ngon mỗi ngày</small></span></Link>
    {admin && <p className="admin-badge">✦ Admin Dashboard</p>}
    <nav className={'side-nav '+(admin?'admin-side-nav':'')}>{nav.map(([path, icon, label],index) => <React.Fragment key={path}>{admin && index===0 && <small className="admin-nav-group">{systemAdmin?'HỆ THỐNG':'TỔNG QUAN'}</small>}{admin && index===1 && <small className="admin-nav-group">{systemAdmin?'QUẢN TRỊ':'NỘI DUNG'}</small>}<NavLink title={label} to={'/' + path} onClick={() => setOpen(false)}><Icon name={icon}/><span>{label}</span>{admin&&path==='reviews'&&pendingReviews>0&&<b className="admin-nav-count">{pendingReviews}</b>}</NavLink></React.Fragment>)}</nav>
    <div className="sidebar-bottom">{admin ? <><div className="admin-profile"><div className="admin-avatar">{(user.name || 'A').slice(0, 1)}</div><div><strong>{user.name}</strong><small>{user.role}</small></div></div><NavLink className="admin-account-link" to="/settings" onClick={()=>setOpen(false)}><Icon name="settings"/><span>Tài khoản & bảo mật</span></NavLink></> : <div className="sidebar-note"><p>Nấu ăn mỗi ngày</p><strong>Thêm niềm vui mới!</strong><div className="veggie-row" aria-label="Rau củ tươi ngon"><span>🥬</span><span>🍅</span><span>🥕</span></div></div>}<button className="logout" onClick={() => setLogoutOpen(true)}><Icon name="check"/><span>Đăng xuất</span></button></div>
  </aside><div className="main-wrap"><header className="topbar"><button className="mobile-menu" aria-label="Mở menu" onClick={() => setOpen(!open)}>☰</button><form className="top-search" onSubmit={submitSearch}><input name="q" aria-label="Tìm món ăn" placeholder={searchHint || 'Tìm món ăn...'}/><button className={searching ? 'searching' : ''} aria-label="Tìm kiếm"><Icon name="search"/></button></form><Link className="account" to={admin ? '/system' : '/profile'}><img src="/images/avatar.jpg" alt=""/><span>{user.name}<small>{admin ? user.role : 'Người dùng'}</small></span></Link></header><main>{error && <p className="error" role="alert">{error}</p>}<Outlet/></main><footer>CookHub · Cảm hứng cho bữa ăn mỗi ngày</footer></div>{logoutOpen&&<div className="logout-confirm-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget&&!logoutBusy)setLogoutOpen(false)}}><section className="logout-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="logout-title"><span>↪</span><h2 id="logout-title">Xác nhận đăng xuất</h2><p>Bạn có chắc chắn muốn đăng xuất khỏi CookHub không?</p>{error&&<p className="logout-confirm-error" role="alert">{error}</p>}<div className="logout-confirm-actions"><button type="button" disabled={logoutBusy} onClick={()=>setLogoutOpen(false)}>Hủy</button><button type="button" className="confirm" disabled={logoutBusy} onClick={async()=>{setLogoutBusy(true);setError('');try{await logout();navigate('/login',{replace:true})}catch(err){setError(err.message);setLogoutBusy(false)}}}>{logoutBusy?'Đang đăng xuất...':'Đăng xuất'}</button></div></section></div>}</div>;
}








