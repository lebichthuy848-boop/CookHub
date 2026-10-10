import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './auth';
import { SettingsProvider } from './settings-context';
import App from './App';
import './styles.css';
import './settings-page.css';
import './theme.css';
import './list-view.css?v=20261009-list-card';

class AppErrorBoundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (!this.state.error) return this.props.children;
    return <main style={{padding:'32px',fontFamily:'system-ui',color:'#173f32'}}><h1>CookHub không thể hiển thị trang</h1><p>{this.state.error.message}</p><button onClick={() => window.location.reload()}>Tải lại trang</button></main>;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><AppErrorBoundary><BrowserRouter><AuthProvider><SettingsProvider><App/></SettingsProvider></AuthProvider></BrowserRouter></AppErrorBoundary></React.StrictMode>
);

