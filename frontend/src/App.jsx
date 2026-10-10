import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useAuth, landing } from './auth';
import Layout from './components/Layout';
import Auth from './pages/Auth';
import Catalog from './pages/Catalog';
import Dish from './pages/Dish';
import { Pantry, CustomPantryIngredient, Menu, Profile, Settings } from './pages/Personal';
import { SettingsPage } from './pages/SettingsPage';
import Admin, { Dashboard } from './pages/Admin';
import AdminAccount from './pages/AdminAccount';
import SystemAdminLayout from './components/SystemAdminLayout';
import SystemOverview from './pages/SystemOverview';
import SystemUsers from './pages/SystemUsers';
import SystemReports from './pages/SystemReports';

function AccountSettings() {
  const {user}=useAuth();
  return ['Quản trị hệ thống','Quản trị nội dung'].includes(user.role) ? <AdminAccount/> : <SettingsPage/>;
}

function Guard({roles}) {
  const {user,loading}=useAuth();
  if(loading)return <p className="empty" role="status">Đang khôi phục phiên đăng nhập…</p>;
  if(!user)return <Navigate replace to="/login"/>;
  if(roles && !roles.includes(user.role))return <Navigate replace to={landing(user.role)}/>;
  return <Outlet/>;
}
function Landing() {
  const {user,loading}=useAuth();
  if(loading)return <p className="empty">Đang tải…</p>;
  return <Navigate replace to={user?landing(user.role):'/login'}/>;
}
export default function App() {
  return <Routes>
    {['login','register','forgot','reset'].map(mode=><Route key={mode} path={'/'+mode} element={<Auth mode={mode} key={mode}/>}/>)}
    <Route element={<Guard/>}><Route element={<Layout/>}>
      {['home','foods','search','suggest','favorites'].map(page=><Route key={page} path={'/'+page} element={<Catalog page={page} key={page}/>}/>)}
      <Route path="/dish/:id" element={<Dish/>}/><Route path="/pantry" element={<div className="pantry-page-layout"><Pantry/><CustomPantryIngredient/></div>}/><Route path="/menu" element={<Menu/>}/>
      <Route path="/profile" element={<Profile/>}/><Route path="/settings" element={<AccountSettings/>}/><Route path="/system-settings" element={<Settings/>}/>
      <Route element={<Guard roles={['Quản trị nội dung']}/>}> 
        <Route path="/content" element={<Dashboard/>}/>
        {['categories','dishes','recipes','videos','reviews'].map(kind=><Route key={kind} path={'/'+kind} element={<Admin kind={kind} key={kind}/>}/>)}
      </Route>
    </Route></Route>
    <Route element={<Guard roles={['Quản trị hệ thống']}/>}>
      <Route element={<SystemAdminLayout/>}>
        <Route path="/system-admin" element={<SystemOverview/>}/>
    <Route path="/system-admin/reports" element={<SystemReports/>}/>
        <Route path="/system-admin/users" element={<SystemUsers/>}/>
        <Route path="/system-admin/account" element={<AdminAccount/>}/>
      </Route>
    </Route>
    <Route path="*" element={<Landing/>}/>
  </Routes>;
}

