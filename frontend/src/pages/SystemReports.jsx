import { useMemo, useState } from 'react';
import { useApi } from '../hooks';
import '../system-reports.css';
import '../system-admin-review.css';

const localDate = value => [
  value.getFullYear(),String(value.getMonth()+1).padStart(2,'0'),String(value.getDate()).padStart(2,'0')
].join('-');
const metricNames = {new_users:'Tài khoản được tạo',new_menus:'Thực đơn được tạo',favorite_saves:'Lượt lưu yêu thích'};
const csvCell = value => {
  const text = String(value ?? '');
  const safe = /^[\s]*[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"','""')}"`;
};
function periodFor(range,custom) {
  const end = new Date(); end.setHours(0,0,0,0);
  const start = new Date(end);
  if (range === '7') start.setDate(end.getDate()-6);
  else if (range === '90') start.setDate(end.getDate()-89);
  else if (range === 'month') start.setDate(1);
  else if (range === 'previous') {start.setMonth(end.getMonth()-1,1);end.setDate(0);}
  else if (range === 'custom') return custom.from && custom.to && custom.from <= custom.to ? {from:custom.from,to:custom.to} : null;
  else start.setDate(end.getDate()-29);
  return {from:localDate(start),to:localDate(end)};
}
function Trend({data,metric}) {
  const values = data?.trends?.[metric] || [];
  if (!values.length || values.every(item => item.value === 0))
    return <p className="reports-empty">Không có {metricNames[metric].toLocaleLowerCase('vi-VN')} trong kỳ này.</p>;
  const max = Math.max(...values.map(item => item.value));
  return <div className="reports-chart-wrap">
    <span className="reports-axis-y">Số lượt / ngày</span>
    <div className="report-bars" role="img" aria-label={`Biểu đồ ${metricNames[metric]} theo ngày`}>
      {values.map(item => <div className="report-bar" key={item.date} title={`${item.date}: ${item.value} ${metricNames[metric].toLocaleLowerCase('vi-VN')}`}>
        <i style={{height:`${item.value ? Math.max(4,item.value/max*100) : 0}%`}}/>
        <small>{item.date.slice(5)}</small>
      </div>)}
    </div>
    <span className="reports-axis-x">Ngày trong kỳ · {metricNames[metric]}</span>
  </div>;
}
function Compare({item}) {
  if (!item) return null;
  return <small className="reports-compare">Kỳ trước: {item.previous} · {item.change == null ? 'Không tính được % khi kỳ trước bằng 0' : `${item.change > 0 ? '+' : ''}${item.change}%`}</small>;
}

export default function SystemReports() {
  const [range,setRange] = useState('30');
  const [custom,setCustom] = useState({from:'',to:''});
  const [feature,setFeature] = useState('new_users');
  const [notice,setNotice] = useState('');
  const period = useMemo(() => periodFor(range,custom),[range,custom]);
  const invalid = range === 'custom' && !period;
  const resource = useApi(period ? `/admin/system-reports?from_date=${period.from}&to_date=${period.to}` : null);
  const health = useApi('/admin/system-health');
  const access = useApi('/admin/system-overview');
  const data = invalid || resource.error ? null : resource.data;

  function exportCsv() {
    if (!data) return;
    try {
      const comparison = data.comparison_by_metric || {};
      const rows = [
        ['Báo cáo CookHub',`${data.period.from} – ${data.period.to}`],
        ['Chỉ số','Kỳ hiện tại','Kỳ trước','Thay đổi (%)'],
        ...Object.entries(metricNames).map(([key,label]) => [
          label,data.kpis[key],comparison[key]?.previous ?? '',
          comparison[key]?.change ?? '',
        ]),
        ['Lượt món lên kế hoạch',data.kpis.planned_items,comparison.planned_items?.previous ?? '',comparison.planned_items?.change ?? ''],
        [],
        ['Ngày',...Object.values(metricNames)],
        ...(data.trends?.new_users || []).map((row,index) => [
          row.date,row.value,data.trends.new_menus[index]?.value ?? '',data.trends.favorite_saves[index]?.value ?? '',
        ]),
      ];
      const blob = new Blob(['\ufeff'+rows.map(row => row.map(csvCell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');link.href=url;link.download=`CookHub_BaoCaoHeThong_${data.period.to}.csv`;link.click();
      window.setTimeout(() => URL.revokeObjectURL(url),1000);
      setNotice('Đã xuất báo cáo CSV cho kỳ đang chọn.');
    } catch {setNotice('Không thể xuất CSV. Vui lòng thử lại.');}
  }
  const refresh = () => {setNotice('');resource.reload();health.reload();access.reload();};
  return <div className="system-reports">
    <section className="reports-hero"><div><small>QUẢN TRỊ HỆ THỐNG / PHÂN TÍCH</small><h1>Báo cáo &amp; Thống kê hệ thống</h1>
      <p>Phân tích dữ liệu được ghi nhận trong database CookHub.</p></div>
      <div className="reports-actions"><button onClick={refresh}>↻ Làm mới</button><button onClick={exportCsv} disabled={!data}>⇩ Xuất CSV</button></div>
    </section>
    <section className="reports-filter"><b>Kỳ báo cáo</b>
      <select value={range} onChange={event => setRange(event.target.value)} aria-label="Chọn kỳ báo cáo">
        <option value="7">7 ngày gần nhất</option><option value="30">30 ngày gần nhất</option><option value="90">90 ngày gần nhất</option>
        <option value="month">Tháng hiện tại</option><option value="previous">Tháng trước</option><option value="custom">Khoảng ngày tùy chỉnh</option>
      </select>
      {range === 'custom' && <><label>Từ <input type="date" value={custom.from} onChange={event => setCustom({...custom,from:event.target.value})}/></label>
        <label>Đến <input type="date" value={custom.to} onChange={event => setCustom({...custom,to:event.target.value})}/></label></>}
      <span>{period ? `${period.from} → ${period.to} (bao gồm cả hai ngày)` : 'Chọn khoảng ngày hợp lệ'}</span>
    </section>
    {invalid && <p className="reports-error" role="alert">Chọn cả hai ngày; ngày bắt đầu không được lớn hơn ngày kết thúc.</p>}
    {resource.error && <p className="reports-error" role="alert">{resource.error} <button onClick={resource.reload}>Thử lại</button></p>}
    {notice && <p className={notice.startsWith('Không thể') ? 'reports-error' : 'reports-success'} role="status">{notice}</p>}
    {resource.loading && !data && !invalid && <p className="empty" role="status">Đang tải báo cáo…</p>}
    {data && <>
      <section className="reports-kpis">
        {Object.entries(metricNames).map(([key,label]) => <article className="is-clickable" role="button" tabIndex={0} key={key}
          onClick={() => setFeature(key)} onKeyDown={event => (event.key === 'Enter' || event.key === ' ') && setFeature(key)}>
          <i className="reports-kpi-icon">{key === 'new_users' ? '♙' : key === 'new_menus' ? '▤' : '♥'}</i>
          <small>{label}</small><strong>{data.kpis[key] ?? '—'}</strong>
          <span>{data.kpi_sources?.[key] || 'Nguồn dữ liệu chưa xác định'}</span>
          <Compare item={data.comparison_by_metric?.[key]}/>
        </article>)}
      </section>
      <section className="reports-card reports-wide"><header><div><h2>{metricNames[feature]} theo ngày</h2>
        <p>Đếm bản ghi có ngày tạo hoặc ngày lưu trong kỳ, gồm cả dữ liệu mẫu đã nạp.</p></div>
        <div className="report-tabs">{Object.entries(metricNames).map(([key,label]) =>
          <button key={key} className={feature === key ? 'active' : ''} onClick={() => setFeature(key)}>{label}</button>)}</div>
      </header><Trend data={data} metric={feature}/></section>
      <section className="reports-card"><header><div><h2>Lượt món lên kế hoạch</h2><p>ChiTietThucDon.NgayDung trong kỳ, không phải số thực đơn được tạo.</p></div></header>
        <strong>{data.kpis.planned_items}</strong><Compare item={data.comparison_by_metric?.planned_items}/></section>
      <div className="reports-grid">
        <section className="reports-card monitoring-card"><header><div><h2>Tình trạng dịch vụ</h2><p>Kiểm tra tại thời điểm yêu cầu.</p></div>
          <button className="health-button" onClick={health.reload}>↻ Kiểm tra lại</button></header>
          {health.error ? <p className="reports-error" role="alert">{health.error}</p> : health.loading && !health.data ? <p>Đang kiểm tra…</p> :
            <><div className="monitor-row"><span>Backend API</span><b>{health.data?.backend || 'Chưa kiểm tra'}</b></div>
              <div className="monitor-row"><span>SQL Server</span><b>{health.data?.database || 'Chưa kiểm tra'}</b></div>
              <div className="monitor-row"><span>Phân phối ảnh Cloudinary</span><b>{health.data?.image_delivery || 'Chưa kiểm tra'}</b></div>
              <div className="health-status"><strong>Kiểm tra hiện tại</strong><small>{health.data?.checked_at ? `Lúc ${health.data.checked_at}` : 'Chưa kiểm tra'}</small></div></>}
        </section>
        <section className="reports-card monitoring-card"><header><div><h2>Kiểm soát truy cập</h2><p>Số tài khoản hiện tại, ngoài kỳ báo cáo.</p></div></header>
          {access.error ? <p className="reports-error" role="alert">{access.error}</p> : access.loading && !access.data ? <p>Đang tải…</p> :
            <><div className="monitor-row"><span>Quản trị hệ thống</span><b>{access.data?.roles?.find(item => item.name === 'Quản trị hệ thống')?.count ?? 0} tài khoản</b></div>
              <div className="monitor-row"><span>Quản trị nội dung</span><b>{access.data?.roles?.find(item => item.name === 'Quản trị nội dung')?.count ?? 0} tài khoản</b></div>
              <div className="monitor-row"><span>Đang hoạt động</span><b>{access.data?.users?.active ?? '—'} tài khoản</b></div>
              <div className="monitor-row"><span>Tạm khóa</span><b>{access.data?.users?.locked ?? '—'} tài khoản</b></div></>}
        </section>
      </div>
      <p className="reports-limitation">Món ăn và công thức chỉ có ngày cập nhật, chưa có ngày tạo; không thống kê “mới” theo kỳ. Ngày tạo của dữ liệu mẫu là thời điểm nạp vào database.</p>
    </>}
  </div>;
}
