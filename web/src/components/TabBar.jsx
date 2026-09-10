import { NavLink } from 'react-router-dom';
import { LineChart, Newspaper } from 'lucide-react';

export function TabBar() {
  return (
    <nav className="tabbar">
      <NavLink to="/growth" className={({ isActive }) => (isActive ? 'active' : '')}>
        <LineChart size={22} strokeWidth={2} />
        Growth
      </NavLink>
      <NavLink to="/news" className={({ isActive }) => (isActive ? 'active' : '')}>
        <Newspaper size={22} strokeWidth={2} />
        News
      </NavLink>
    </nav>
  );
}
