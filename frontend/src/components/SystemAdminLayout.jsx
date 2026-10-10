import { NavLink, Outlet, useLocation, Link } from 'react-router-dom';
import { useAuth, landing } from '../auth';
import { Icon } from './Layout';
import '../system-admin.css';
import '../admin.css';

export default function SystemAdminLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const title = location.pathname.includes('/users') ? 'Người dùng & Phân quyền' : location.pathname.includes('/reports') ? 'Báo cáo & Thống kê' : location.pathname.includes('/account') ? 'Tài khoản & Bảo mật' : 'Tổng quan hệ thống';
  return <div className="system-shell"><aside className="sidebar premium-sidebar admin-sidebar system-sidebar"><Link to={landing('Quản trị hệ thống')} className="sidebar-brand"><span className="brand-flower">✿</span><span>Cook<span>Hub</span><small>Nấu ngon mỗi ngày</small></span></Link><p className="admin-badge">✦ Admin Dashboard</p><nav className="side-nav admin-side-nav"><small className="admin-nav-group">HỆ THỐNG</small><NavLink end to="/system-admin"><Icon name="grid"/><span>Tổng quan</span></NavLink><small className="admin-nav-group">QUẢN TRỊ</small><NavLink to="/system-admin/users"><Icon name="users"/><span>Người dùng &amp; Phân quyền</span></NavLink><NavLink to="/system-admin/reports"><Icon name="chart"/><span>Báo cáo &amp; Thống kê</span></NavLink><small className="admin-nav-group">CÁ NHÂN</small><NavLink to="/system-admin/account"><Icon name="settings"/><span>Tài khoản &amp; Bảo mật</span></NavLink></nav><div className="sidebar-bottom"><div className="admin-profile" title={user?.name || 'Quản trị hệ thống'}><div className="admin-avatar">{(user?.name || 'Q')[0]}</div><div><strong>{user?.name || 'Quản trị hệ thống'}</strong><small>Quản trị hệ thống</small></div></div><button className="logout" onClick={logout}><Icon name="check"/><span>Đăng xuất</span></button></div></aside><main className="system-main"><header className="system-header"><div><small>QUẢN TRỊ HỆ THỐNG /</small><h1>{title}</h1></div><div className="system-header-user"><i>{(user?.name || 'Q')[0]}</i><span>{user?.name || 'Quản trị hệ thống'}<small>Quản trị hệ thống</small></span></div></header><section className="system-content"><Outlet/></section></main></div>;
}
