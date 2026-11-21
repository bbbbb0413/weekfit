// 기능: 앱 틀 & 화면 연결. 탭 사이를 전환 효과로 이어 줌

import { LazyMotion, MotionConfig, domMax, m } from 'framer-motion';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { API_MODE } from './api';
import { TabBar } from './components/TabBar';
import { Toast } from './components/Toast';
import { ENTER } from './lib/motion';
import { BuyPage } from './pages/BuyPage';
import { ClosetPage } from './pages/ClosetPage';
import { TodayPage } from './pages/TodayPage';
import { WeekPage } from './pages/WeekPage';

function Screens() {
  const location = useLocation();

  return (
    <div className="app">
      {API_MODE === 'mock' && <p className="demo-strip">데모 데이터로 보는 중이에요. 변경 내용은 이 브라우저에만 저장돼요.</p>}
      <main className="app__main">
        {/* 탭을 옮기면 새 화면이 아래에서 올라오며 나타남 */}
        <m.div key={location.pathname} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={ENTER}>
          <Routes location={location}>
            <Route path="/" element={<TodayPage />} />
            <Route path="/week" element={<WeekPage />} />
            <Route path="/closet" element={<ClosetPage />} />
            <Route path="/buy" element={<BuyPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </m.div>
      </main>
      <TabBar />
      <Toast />
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      {/* 필요한 기능만 불러오고, 기기의 움직임 줄이기 설정을 따름 */}
      <LazyMotion features={domMax} strict>
        <MotionConfig reducedMotion="user">
          <Screens />
        </MotionConfig>
      </LazyMotion>
    </BrowserRouter>
  );
}
