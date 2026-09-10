import { NavLink } from 'react-router-dom';
import { LineChart, Newspaper, CalendarDays } from 'lucide-react';

const tabs = [
  { to: '/growth', label: 'Growth', Icon: LineChart },
  { to: '/news', label: 'News', Icon: Newspaper },
  { to: '/weekly', label: 'Weekly', Icon: CalendarDays },
];

export function TabBar() {
  return (
    <nav className="tabbar">
      {tabs.map(({ to, label, Icon }) => (
        <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'active' : '')}>
          <Icon size={22} strokeWidth={2} />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
