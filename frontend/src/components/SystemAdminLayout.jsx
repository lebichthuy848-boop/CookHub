import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth';
import '../system-admin.css';

export default function SystemAdminLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const title = location.pathname.includes('/users') ? 'Người dùng & Phân quyền' : location.pathname.includes('/reports') ? 'Báo cáo & Thống kê' : location.pathname.includes('/account') ? 'Tài khoản & Bảo mật' : 'Tổng quan hệ thống';
  return <div className="system-shell"><aside className="system-sidebar"><div className="system-brand"><b>✚ CookHub</b><small>QUẢN TRỊ HỆ THỐNG</small></div><nav><span>TỔNG QUAN</span><NavLink end to="/system-admin">⌂ <b>Tổng quan</b></NavLink><span>QUẢN TRỊ</span><NavLink to="/system-admin/users">♙ <b>Người dùng & Phân quyền</b></NavLink><NavLink to="/system-admin/reports">▥ <b>Báo cáo & Thống kê</b></NavLink><span>CÁ NHÂN</span><NavLink to="/system-admin/account">⚿ <b>Tài khoản & Bảo mật</b></NavLink></nav><div className="system-sidebar-bottom"><div className="system-user"><i>{(user?.name || 'Q')[0]}</i><div><b>{user?.name || 'Quản trị hệ thống'}</b><small>Quản trị hệ thống</small></div></div><button onClick={logout}>↪ Đăng xuất</button></div></aside><main className="system-main"><header className="system-header"><div><small>QUẢN TRỊ HỆ THỐNG /</small><h1>{title}</h1></div><div className="system-header-user"><i>{(user?.name || 'Q')[0]}</i><span>{user?.name || 'Quản trị hệ thống'}<small>Quản trị hệ thống</small></span></div></header><section className="system-content"><Outlet/></section></main></div>;
}
