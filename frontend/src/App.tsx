// 기능: 앱 틀 & 화면 연결

import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { API_MODE } from './api';
import { TabBar } from './components/TabBar';
import { Toast } from './components/Toast';
import { BuyPage } from './pages/BuyPage';
import { TodayPage } from './pages/TodayPage';
import { WeekPage } from './pages/WeekPage';

export function App() {
  return (
    <BrowserRouter>
      <div className="app">
        {API_MODE === 'mock' && <p className="demo-strip">데모 데이터로 보는 중이에요. 변경 내용은 이 브라우저에만 저장돼요.</p>}
        <main className="app__main">
          <Routes>
            <Route path="/" element={<TodayPage />} />
            <Route path="/week" element={<WeekPage />} />
            <Route path="/buy" element={<BuyPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <TabBar />
        <Toast />
      </div>
    </BrowserRouter>
  );
}
