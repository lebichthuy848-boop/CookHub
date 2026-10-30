import { Link, useNavigate } from 'react-router-dom';
import { useApi } from '../hooks';
import { State } from '../components/Common';
import '../system-overview.css';
import '../system-admin-review.css';

const usersUrl = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return `/system-admin/users${query ? `?${query}` : ''}`;
};

function StatCard({ label, value, hint, icon, onClick }) {
  const props = onClick ? {
    role: 'link', tabIndex: 0, onClick,
    onKeyDown: event => (event.key === 'Enter' || event.key === ' ') && onClick(),
  } : {};
  return <article className={onClick ? 'is-clickable' : ''} {...props}>
    <i>{icon}</i><span>{label}</span><strong>{value}</strong><small>{hint}</small>
  </article>;
}

export default function SystemOverview() {
  const resource = useApi('/admin/system-overview');
  const navigate = useNavigate();
  const goUsers = params => navigate(usersUrl(params));
  return <State resource={resource}>{data => {
    const { total, active, locked } = data.users;
    const activity = data.recent_activity;
    const period = data.recent_period;
    return <div className="system-overview">
      <header className="system-overview-hero">
        <div><small>QUẢN TRỊ HỆ THỐNG / TỔNG QUAN</small><h1>Tổng quan hệ thống</h1>
          <p>Theo dõi tài khoản, phân quyền và tình hình sử dụng CookHub.</p>
          <small>Dữ liệu cập nhật: {data.updated_at ? new Date(data.updated_at).toLocaleString('vi-VN') : 'Chưa xác định'} (giờ thiết bị)</small>
        </div>
        <button onClick={resource.reload} disabled={resource.loading}>↻ Làm mới dữ liệu</button>
      </header>
      <div className="system-kpis">
        <StatCard label="Tổng người dùng" value={total} hint="Tất cả tài khoản" icon="♙" onClick={() => goUsers()}/>
        <StatCard label="Đang hoạt động" value={active} hint="Tài khoản được phép đăng nhập" icon="✓" onClick={() => goUsers({status:'Đang hoạt động'})}/>
        <StatCard label="Tạm khóa" value={locked} hint="Tài khoản bị hạn chế truy cập" icon="!" onClick={() => goUsers({status:'Tạm khóa'})}/>
        <StatCard label="Vai trò hệ thống" value={data.roles.length} hint="Vai trò đang có tài khoản" icon="◈" onClick={() => goUsers({tab:'permissions'})}/>
        <StatCard label="Tổng món ăn" value={data.content.dishes} hint="Bản ghi món ăn hiện tại" icon="♨"/>
        <StatCard label="Tổng thực đơn" value={data.meal_plans} hint="Bản ghi thực đơn hiện tại" icon="▤"/>
      </div>
      <div className="system-overview-grid">
        <section className="system-overview-card">
          <header><div><h2>Phân bố tài khoản theo vai trò</h2><p>Từ tài khoản hiện có trong database</p></div><b>{total} tài khoản</b></header>
          {total === 0 ? <p className="system-empty">Chưa có tài khoản để thống kê.</p> :
            <div className="role-bars">{data.roles.map((role,index) => {
              const percentage = role.count / total * 100;
              return <div className="role-row is-clickable" key={role.name} role="link" tabIndex={0}
                onClick={() => goUsers({role:role.name})}
                onKeyDown={event => (event.key === 'Enter' || event.key === ' ') && goUsers({role:role.name})}>
                <span><i className={`role-dot role-${index}`}/>{role.name}</span>
                <b>{role.count} · {percentage.toLocaleString('vi-VN',{maximumFractionDigits:1})}%</b>
                <div><em style={{width:`${percentage}%`}}/></div>
              </div>;
            })}</div>}
        </section>
        <section className="system-overview-card">
          <header><div><h2>Tình trạng tài khoản</h2><p>Trạng thái truy cập hiện tại, không phải người đang trực tuyến</p></div><Link to={usersUrl()}>Quản lý tài khoản →</Link></header>
          {total === 0 ? <p className="system-empty">Chưa có tài khoản để thống kê.</p> :
            <div className="status-chart"><div className="donut" style={{'--active':`${active / total * 360}deg`}}><strong>{total}<small>Tổng tài khoản</small></strong></div>
              <div className="status-legend"><button onClick={() => goUsers({status:'Đang hoạt động'})}>🟢 Đang hoạt động <b>{active}</b></button>
                <button onClick={() => goUsers({status:'Tạm khóa'})}>🟠 Tạm khóa <b>{locked}</b></button>
                {locked === 0 && <p>✓ Hiện không có tài khoản tạm khóa.</p>}
              </div></div>}
        </section>
      </div>
      <div className="system-overview-grid lower">
        <section className="system-overview-card">
          <header><div><h2>Hoạt động được ghi nhận</h2><p>{period.from} – {period.to}, gồm cả dữ liệu mẫu được nạp trong kỳ</p></div></header>
          <div className="usage-grid">
            <div><b>{activity.new_users ?? '—'}</b><span>Bản ghi tài khoản được tạo</span></div>
            <div><b>{activity.new_menus ?? '—'}</b><span>Bản ghi thực đơn được tạo</span></div>
            <div><b>{activity.new_recipes ?? '—'}</b><span>Công thức mới · chưa có ngày tạo</span></div>
          </div>
        </section>
        <section className="system-overview-card">
          <header><div><h2>Cảnh báo &amp; Hoạt động quản trị gần đây</h2><p>Trạng thái tài khoản hiện tại</p></div>
            <Link to={usersUrl({status:'Tạm khóa'})}>Xem tài khoản tạm khóa →</Link></header>
          {data.locked_users.length ? data.locked_users.map(row =>
            <Link className="locked-user" to={usersUrl({search:row.email})} key={row.id}>
              <i>{(row.name || 'N')[0]}</i><span><b>{row.name}</b><small>{row.email} · {row.role}</small></span><em>Tạm khóa</em>
            </Link>) : <p className="system-empty">Hiện không có tài khoản tạm khóa.</p>}
          <p className="system-empty">Lịch sử khóa/mở khóa và đổi vai trò chưa được ghi nhận trong database.</p>
        </section>
      </div>
      <section className="system-overview-card quick-links"><header><div><h2>Truy cập nhanh</h2><p>Các khu vực quản trị hệ thống</p></div></header>
        <div><Link to={usersUrl()}><b>♙ Quản lý người dùng</b><small>Xem danh sách và trạng thái tài khoản.</small></Link>
          <Link to="/system-admin/account"><b>⚙ Cài đặt tài khoản</b><small>Quản lý thông tin và bảo mật tài khoản.</small></Link>
          <Link to="/system-admin/reports"><b>▥ Báo cáo &amp; Thống kê</b><small>Xem báo cáo sử dụng CookHub.</small></Link></div>
      </section>
    </div>;
  }}</State>;
}
