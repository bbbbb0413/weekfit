// 기능: 하단 탭. 화면 위에 떠 있는 반투명 막대이고, 현재 탭 표시 면이 탭 사이를 미끄러지듯 이동

import { m } from 'framer-motion';
import { NavLink } from 'react-router-dom';
import { SNAPPY } from '../lib/motion';
import { CalendarIcon, HangerIcon, TagIcon, TeeIcon } from './icons';

const TABS = [
  { to: '/', label: '오늘', icon: TeeIcon, end: true },
  { to: '/week', label: '이번 주', icon: CalendarIcon, end: false },
  { to: '/closet', label: '옷장', icon: HangerIcon, end: false },
  { to: '/buy', label: '살까 말까', icon: TagIcon, end: false },
];

export function TabBar() {
  return (
    <nav className="tabbar" aria-label="주요 화면">
      {TABS.map(({ to, label, icon: TabIcon, end }) => (
        <NavLink key={to} to={to} end={end} className={({ isActive }) => `tabbar__item${isActive ? ' is-active' : ''}`}>
          {({ isActive }) => (
            <>
              {isActive && <m.span className="tabbar__mark" layoutId="tabbar-mark" transition={SNAPPY} />}
              <m.span className="tabbar__icon" whileTap={{ scale: 0.86 }} animate={{ y: isActive ? -1 : 0 }}>
                <TabIcon />
              </m.span>
              <span>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
