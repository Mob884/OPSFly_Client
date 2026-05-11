"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BarChart3, ClipboardList, CalendarDays, MoreHorizontal } from 'lucide-react';

const navItems = [
  { icon: Home,          label: 'Home',    path: '/' },
  { icon: ClipboardList, label: 'Tasks',   path: '/tasks' },
  { icon: CalendarDays,  label: 'Summary', path: '/summary' },
  { icon: BarChart3,     label: 'Reports', path: '/reports' },
  { icon: MoreHorizontal,label: 'More',    path: '/more' },
];

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="bottom-nav">
      {navItems.map(({ icon: Icon, label, path }) => {
        const isActive = pathname === path || (path !== '/' && pathname.startsWith(path));
        return (
          <Link key={path} href={path} className={`nav-item${isActive ? ' active' : ''}`}>
            <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
            <span className="nav-label">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
