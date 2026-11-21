// 기능: 하단 탭. 화면 위에 떠 있는 막대이고, 지금 있는 탭만 이름이 펼쳐지며 코코아 면이 탭 사이를 옮겨 감

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
        <NavLink key={to} to={to} end={end} aria-label={label} className={({ isActive }) => `tabbar__item${isActive ? ' is-active' : ''}`}>
          {({ isActive }) => (
            <m.span className="tabbar__inner" layout transition={SNAPPY} whileTap={{ scale: 0.94 }}>
              {isActive && <m.span className="tabbar__mark" layoutId="tabbar-mark" transition={SNAPPY} />}
              <m.span className="tabbar__icon" layout="position">
                <TabIcon width={22} height={22} />
              </m.span>
              {isActive && (
                <m.span className="tabbar__label" layout="position" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.08, duration: 0.2 }}>
                  {label}
                </m.span>
              )}
            </m.span>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
