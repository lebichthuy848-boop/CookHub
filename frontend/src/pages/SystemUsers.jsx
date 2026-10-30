import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useApi } from '../hooks';
import '../system-users.css';
import '../system-users-enhanced.css';
import '../system-users-ui-fix.css';
import '../system-users-layout-fix.css';
import '../system-admin-review.css';

const roles = ['Người dùng', 'Quản trị nội dung', 'Quản trị hệ thống'];
const roleInfo = [
  {name:roles[0],icon:'♙',text:'Sử dụng các chức năng dành cho người dùng CookHub.'},
  {name:roles[1],icon:'▤',text:'Quản lý món ăn, công thức và nội dung liên quan.'},
  {name:roles[2],icon:'⌾',text:'Quản lý tài khoản, phân quyền và giám sát hệ thống.'},
];
const PAGE_SIZE = 10;
const dateLabel = value => value ? new Date(value).toLocaleString('vi-VN') : 'Chưa có dữ liệu';

function UserTable({rows,setDetail,setEditing,permission=false}) {
  return <div className="system-users-table"><table>
    <thead><tr><th>Tài khoản</th><th>Email</th><th>{permission ? 'Vai trò hiện tại' : 'Vai trò'}</th><th>Trạng thái</th><th>Ngày tạo</th><th>Thao tác</th></tr></thead>
    <tbody>{rows.map(row => <tr key={row.id}>
      <td><b>{row.name}</b><small>{row.id}</small></td><td>{row.email}</td><td><span className="user-role">{row.role}</span></td>
      <td><span className={'user-status '+(row.status === 'Tạm khóa' ? 'locked' : '')}>{row.status}</span></td>
      <td>{dateLabel(row.created_at)}</td>
      <td><button onClick={() => setDetail(row)}>Xem chi tiết</button><button onClick={() => setEditing(row)}>{permission ? 'Thay đổi vai trò' : 'Chỉnh sửa'}</button></td>
    </tr>)}</tbody>
  </table>{!rows.length && <p className="system-users-empty">Không tìm thấy tài khoản phù hợp.</p>}</div>;
}

function Permissions({items,filtered,query,setQuery,role,setRole,setDetail,setEditing}) {
  const matrix = [
    {name:'Sử dụng chức năng người dùng',allow:[true,true,true]},
    {name:'Quản lý danh mục',allow:[false,true,true]},
    {name:'Quản lý món ăn & công thức',allow:[false,true,true]},
    {name:'Video hướng dẫn',allow:[false,true,false]},
    {name:'Đánh giá & kiểm duyệt',allow:[false,true,false]},
    {name:'Quản lý tài khoản người dùng',allow:[false,false,true]},
    {name:'Phân quyền tài khoản',allow:[false,false,true]},
    {name:'Báo cáo & thống kê hệ thống',allow:[false,false,true]},
  ];
  return <div className="permissions-view">
    <section className="permissions-intro"><h2>Quản lý phân quyền tài khoản</h2><p>Kiểm soát vai trò và phạm vi truy cập của từng tài khoản CookHub.</p>
      <div className="role-cards">{roleInfo.map(x => <article key={x.name}><i>{x.icon}</i><h3>{x.name}</h3><p>{x.text}</p></article>)}</div>
    </section>
    <section className="system-users-card"><header className="permissions-header"><div><h2>Danh sách phân quyền tài khoản</h2><p>{filtered.length} / {items.length} tài khoản phù hợp</p></div></header>
      <div className="system-users-toolbar"><input value={query} onChange={event => setQuery(event.target.value)} placeholder="⌕ Tìm tài khoản..." aria-label="Tìm tài khoản"/>
        <select value={role} onChange={event => setRole(event.target.value)} aria-label="Lọc vai trò"><option value="all">Tất cả vai trò</option>{roles.map(x => <option key={x}>{x}</option>)}</select></div>
      <UserTable rows={filtered} setDetail={setDetail} setEditing={setEditing} permission/>
    </section>
    <section className="permissions-matrix"><h2>So sánh quyền truy cập</h2><p>Theo các endpoint và quyền hiện có ở backend.</p><table><thead><tr><th>Chức năng</th>{roles.map(x => <th key={x}>{x}</th>)}</tr></thead>
      <tbody>{matrix.map(row => <tr key={row.name}><td>{row.name}</td>{row.allow.map((allowed,index) => <td key={roles[index]}><span className={allowed ? 'permission-yes' : 'permission-no'}>{allowed ? '✓' : '—'}</span></td>)}</tr>)}</tbody></table>
    </section>
  </div>;
}

export default function SystemUsers() {
  const resource = useApi('/admin/users');
  const [params,setParams] = useSearchParams();
  const [query,setQuery] = useState(params.get('search') || '');
  const [role,setRole] = useState(params.get('role') || 'all');
  const [status,setStatus] = useState(params.get('status') || 'all');
  const [sort,setSort] = useState('name');
  const [direction,setDirection] = useState('asc');
  const [page,setPage] = useState(1);
  const [editing,setEditing] = useState(null);
  const [detail,setDetail] = useState(null);
  const [pending,setPending] = useState(null);
  const [saving,setSaving] = useState(false);
  const [error,setError] = useState('');
  const [message,setMessage] = useState('');
  const tab = params.get('tab') || 'users';
  const items = resource.data || [];
  const filtered = useMemo(() => items.filter(x =>
    (role === 'all' || x.role === role) &&
    (status === 'all' || x.status === status) &&
    `${x.id} ${x.name} ${x.email}`.toLocaleLowerCase('vi-VN').includes(query.trim().toLocaleLowerCase('vi-VN'))
  ).sort((a,b) => {
    const left = String(a[sort] ?? '');
    const right = String(b[sort] ?? '');
    const primary = left.localeCompare(right,'vi-VN',{numeric:true});
    return (direction === 'asc' ? primary : -primary) || a.id.localeCompare(b.id,'vi-VN',{numeric:true});
  }),[items,query,role,status,sort,direction]);
  const pageCount = Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));
  const currentPage = Math.min(page,pageCount);
  const visible = filtered.slice((currentPage-1)*PAGE_SIZE,currentPage*PAGE_SIZE);
  const changeTab = next => setParams(next === 'permissions' ? {tab:'permissions'} : {});
  const reset = () => {setQuery('');setRole('all');setStatus('all');setSort('name');setDirection('asc');setPage(1);setParams({});};
  const changeFilter = (setter,value) => {setter(value);setPage(1);};

  async function commit(values) {
    setSaving(true);setError('');setPending(null);
    try {
      await api(`/admin/users/${editing.id}`,{method:'PUT',body:{name:editing.name,email:editing.email,role:values.role,status:values.status}});
      setEditing(null);setMessage('Đã cập nhật tài khoản '+editing.name+'.');resource.reload();
    } catch (err) {setError(err.message || 'Không thể cập nhật tài khoản.');}
    finally {setSaving(false);}
  }
  function save(event) {
    event.preventDefault();setError('');setMessage('');
    const values = Object.fromEntries(new FormData(event.currentTarget));
    if (values.status !== editing.status) {setPending(values);return;}
    commit(values);
  }

  if (resource.loading && !resource.data) return <p className="empty" role="status">Đang tải danh sách tài khoản…</p>;
  if (resource.error) return <div className="system-users-error" role="alert">{resource.error} <button onClick={resource.reload}>Thử lại</button></div>;
  return <div className="system-users">
    <header className="system-users-hero"><div><small>QUẢN TRỊ HỆ THỐNG / NGƯỜI DÙNG</small><h1>Người dùng &amp; Phân quyền</h1>
      <p>Quản lý tài khoản, kiểm soát quyền truy cập và trạng thái người dùng.</p></div>
      <button onClick={() => {setMessage('');resource.reload();}}>↻ Làm mới</button></header>
    {message && <p className="system-users-message" role="status">✓ {message}</p>}
    {error && <p className="system-users-error" role="alert">{error}</p>}
    <div className="system-user-stats">
      <button onClick={() => {changeTab('users');setRole('all');setStatus('all');setPage(1);}}><b>{items.length}</b><small>Tổng tài khoản</small></button>
      <button onClick={() => {changeTab('users');setStatus('Đang hoạt động');setPage(1);}}><b>{items.filter(x => x.status === 'Đang hoạt động').length}</b><small>Đang hoạt động</small></button>
      <button onClick={() => {changeTab('users');setStatus('Tạm khóa');setPage(1);}}><b>{items.filter(x => x.status === 'Tạm khóa').length}</b><small>Tạm khóa</small></button>
      <button onClick={() => changeTab('permissions')}><b>{new Set(items.map(x => x.role)).size}</b><small>Vai trò đang dùng</small></button>
    </div>
    {tab === 'permissions' ?
      <Permissions items={items} filtered={filtered} query={query} setQuery={value => changeFilter(setQuery,value)}
        role={role} setRole={value => changeFilter(setRole,value)} setDetail={setDetail} setEditing={setEditing}/> :
      <section className="system-users-card">
        <div className="system-users-toolbar">
          <input value={query} onChange={event => changeFilter(setQuery,event.target.value)} placeholder="⌕ Tìm theo tên, email hoặc mã..." aria-label="Tìm tài khoản"/>
          <select value={role} onChange={event => changeFilter(setRole,event.target.value)} aria-label="Lọc vai trò"><option value="all">Tất cả vai trò</option>{roles.map(x => <option key={x}>{x}</option>)}</select>
          <select value={status} onChange={event => changeFilter(setStatus,event.target.value)} aria-label="Lọc trạng thái"><option value="all">Tất cả trạng thái</option><option>Đang hoạt động</option><option>Tạm khóa</option></select>
          <select value={sort} onChange={event => changeFilter(setSort,event.target.value)} aria-label="Sắp xếp tài khoản"><option value="name">Họ tên</option><option value="created_at">Ngày tạo</option><option value="role">Vai trò</option><option value="status">Trạng thái</option></select>
          <button type="button" className="system-users-direction" onClick={() => setDirection(value => value === 'asc' ? 'desc' : 'asc')}
            aria-label={`Đang sắp xếp ${direction === 'asc' ? 'tăng dần' : 'giảm dần'}. Bấm để đảo chiều`}
            title={direction === 'asc' ? 'Tăng dần · bấm để giảm dần' : 'Giảm dần · bấm để tăng dần'}>{direction === 'asc' ? '↑' : '↓'}</button>
          <button type="button" onClick={reset}>Đặt lại</button>
        </div>
        <p className="system-users-result-count">{filtered.length} / {items.length} tài khoản phù hợp · giờ tạo theo máy chủ</p>
        <UserTable rows={visible} setDetail={setDetail} setEditing={setEditing}/>
        {filtered.length > PAGE_SIZE && <nav className="system-users-pagination" aria-label="Phân trang tài khoản">
          <button disabled={currentPage === 1} onClick={() => setPage(currentPage-1)}>← Trước</button>
          <span>Trang {currentPage} / {pageCount}</span>
          <button disabled={currentPage === pageCount} onClick={() => setPage(currentPage+1)}>Sau →</button>
        </nav>}
      </section>}
    {detail && <div className="system-users-modal" onMouseDown={event => event.target === event.currentTarget && setDetail(null)}>
      <section className="system-users-dialog"><h2>Chi tiết tài khoản</h2><dl>
        <dt>Mã tài khoản</dt><dd>{detail.id}</dd><dt>Họ tên</dt><dd>{detail.name}</dd>
        <dt>Email</dt><dd>{detail.email}</dd><dt>Vai trò</dt><dd>{detail.role}</dd>
        <dt>Trạng thái</dt><dd>{detail.status}</dd><dt>Ngày tạo</dt><dd>{dateLabel(detail.created_at)}</dd>
      </dl><p>Hệ thống chưa ghi lịch sử thay đổi vai trò hoặc trạng thái.</p>
        <footer><button onClick={() => setDetail(null)}>Đóng</button><button className="primary" onClick={() => {setEditing(detail);setDetail(null);}}>Chỉnh sửa</button></footer>
      </section>
    </div>}
    {editing && <div className="system-users-modal" onMouseDown={event => event.target === event.currentTarget && !saving && setEditing(null)}>
      <form onSubmit={save}><h2>Chỉnh sửa tài khoản</h2><p>{editing.name} · {editing.email}</p>
        <label>Vai trò<select name="role" defaultValue={editing.role}>{roles.map(x => <option key={x}>{x}</option>)}</select></label>
        <label>Trạng thái<select name="status" defaultValue={editing.status}><option>Đang hoạt động</option><option>Tạm khóa</option></select></label>
        <footer><button type="button" onClick={() => setEditing(null)}>Hủy</button><button className="primary" disabled={saving} type="submit">{saving ? 'Đang lưu…' : 'Lưu thay đổi'}</button></footer>
      </form>
    </div>}
    {pending && <div className="system-users-modal" role="dialog" aria-modal="true">
      <section className="system-users-dialog"><h2>Xác nhận {pending.status === 'Tạm khóa' ? 'khóa' : 'mở khóa'} tài khoản</h2>
        <p>{editing.name} · {editing.email} ({editing.id})</p>
        <p>Trạng thái mới: <b>{pending.status}</b>. Hệ thống hiện chưa lưu được lý do thao tác.</p>
        <footer><button type="button" onClick={() => setPending(null)}>Hủy</button>
          <button className="primary" type="button" disabled={saving} onClick={() => commit(pending)}>Xác nhận</button></footer>
      </section>
    </div>}
  </div>;
}
