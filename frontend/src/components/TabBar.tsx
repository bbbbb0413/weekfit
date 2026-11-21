// 기능: 하단 탭

import { NavLink } from 'react-router-dom';
import { CalendarIcon, HangerIcon, TagIcon, TeeIcon } from './icons';

const TABS = [
  { to: '/', label: '오늘', icon: TeeIcon, end: true },
  { to: '/week', label: '주간', icon: CalendarIcon, end: false },
  { to: '/closet', label: '옷장', icon: HangerIcon, end: false },
  { to: '/buy', label: '사기 전에', icon: TagIcon, end: false },
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
