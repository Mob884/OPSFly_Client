"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BarChart3, ClipboardList, CalendarDays, MoreHorizontal } from 'lucide-react';
import { useAuth } from '@/src/context/AuthContext';

const allNavItems = [
  { icon: Home,          label: 'Home',    path: '/' },
  { icon: ClipboardList, label: 'Tasks',   path: '/tasks' },
  { icon: CalendarDays,  label: 'Summary', path: '/summary', managerOnly: true },
  { icon: BarChart3,     label: 'Reports', path: '/reports', managerOnly: true },
  { icon: MoreHorizontal,label: 'More',    path: '/more' },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  // Filter navigation items: if user is not in manager roles, hide managerOnly routes
  const filteredNavItems = allNavItems.filter(item => {
    const MANAGER_ROLES = ['owner', 'district_manager', 'gm', 'agm', 'department_manager', 'Manager'];
    if (item.managerOnly && !MANAGER_ROLES.includes(user?.role)) {
      return false;
    }
    return true;
  });

  return (
    <nav className="bottom-nav">
      {filteredNavItems.map(({ icon: Icon, label, path }) => {
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
