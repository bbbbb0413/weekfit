// 기능: 하단 탭

import { NavLink } from 'react-router-dom';
import { CalendarIcon, HangerIcon, LayersIcon, TagIcon } from './icons';

const TABS = [
  { to: '/', label: '옷방', icon: HangerIcon, end: true },
  { to: '/week', label: '주간 계획', icon: CalendarIcon, end: false },
  { to: '/shop', label: '가성비 찾기', icon: TagIcon, end: false },
  { to: '/similar', label: '보유 검사', icon: LayersIcon, end: false },
];

export function TabBar() {
  return (
    <nav className="tabbar" aria-label="주요 화면">
      {TABS.map(({ to, label, icon: TabIcon, end }) => (
        <NavLink key={to} to={to} end={end} className={({ isActive }) => `tabbar__item${isActive ? ' is-active' : ''}`}>
          <TabIcon />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
