"use client";
import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/src/context/AuthContext';
import BottomNav from '@/src/components/BottomNav';
import { Loader2 } from 'lucide-react';

const PUBLIC_ROUTES = ['/login', '/register'];
const MANAGER_ONLY_ROUTES = ['/summary', '/reports'];

export default function AppLayoutContent({ children }) {
  const { user, loading, isAuthenticated } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const isPublic = PUBLIC_ROUTES.includes(pathname);
    const isManagerOnly = MANAGER_ONLY_ROUTES.some(route => pathname === route || pathname.startsWith(route));

    if (!isAuthenticated) {
      // If not logged in, only allow public routes
      if (!isPublic) {
        router.push('/login');
      }
    } else {
      // If logged in, prevent visiting login/register
      if (isPublic) {
        router.push('/');
      } else if (isManagerOnly && user?.role !== 'Manager') {
        // Enforce RBAC: Non-managers cannot visit manager-only pages
        router.push('/');
      }
    }
  }, [isAuthenticated, loading, pathname, router, user]);

  // Premium loading screen while verifying JWT session
  if (loading) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: '100dvh', backgroundColor: '#050B14', gap: '16px', color: '#fff'
      }}>
        <Loader2 size={36} className="spinner" color="var(--primary)" />
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: '500' }}>
          Verifying session...
        </p>
      </div>
    );
  }

  const isPublicPage = PUBLIC_ROUTES.includes(pathname);

  // If not authenticated and on a private page, prevent brief flashes before redirect completes
  if (!isAuthenticated && !isPublicPage) {
    return (
      <div style={{
        display: 'flex', minHeight: '100dvh', backgroundColor: '#050B14'
      }} />
    );
  }

  // If authenticated but visiting restricted page, prevent brief flashes
  const isManagerPage = MANAGER_ONLY_ROUTES.some(route => pathname === route || pathname.startsWith(route));
  if (isAuthenticated && isManagerPage && user?.role !== 'Manager') {
    return (
      <div style={{
        display: 'flex', minHeight: '100dvh', backgroundColor: '#050B14'
      }} />
    );
  }

  return (
    <div className="page-wrapper">
      {children}
      {/* Conditionally hide navigation bar on register and login pages */}
      {!isPublicPage && isAuthenticated && <BottomNav />}
    </div>
  );
}
