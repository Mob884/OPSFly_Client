"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/src/context/AuthContext';
import { KeyRound, Mail, Loader2, ShieldAlert, Sparkles } from 'lucide-react';
import Header from '@/src/components/Header';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setSubmitting(true);
    setErrorMsg('');

    try {
      await login(email.trim(), password.trim());
      router.push('/');
    } catch (err) {
      setErrorMsg(err.message || 'Incorrect email or password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Header />
      <main className="page" style={{ justifyContent: 'center', minHeight: 'calc(100vh - var(--header-height))', gap: '32px' }}>
        
        {/* Brand Glow Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <div style={{
            position: 'relative', width: '80px', height: '80px', borderRadius: '20px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.3)', marginBottom: '16px'
          }}>
            <img 
              src="/logo-icon.svg" 
              alt="OpsFly Icon" 
              style={{ width: '56px', height: '56px', objectFit: 'contain' }}
              onError={(e) => { e.target.src = '/logo-icon.png'; }}
            />
            <div style={{
              position: 'absolute', inset: '-6px', borderRadius: '26px',
              border: '1px dashed rgba(29, 123, 255, 0.25)', animation: 'rotate 20s linear infinite'
            }} />
          </div>
          <img 
            src="/logo-full.svg" 
            alt="OpsFly" 
            style={{ height: '36px', objectFit: 'contain', marginBottom: '4px' }}
            onError={(e) => { e.target.src = '/logo-full.png'; }}
          />
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
            AI-powered operations intelligence for teams
          </p>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            background: 'rgba(255, 77, 106, 0.12)', border: '1px solid rgba(255, 77, 106, 0.25)',
            color: 'var(--staffing)', borderRadius: '12px', padding: '14px 16px', fontSize: '0.85rem'
          }}>
            <ShieldAlert size={18} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Glassmorphic Form Card */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            
            {/* Email Field */}
            <div className="input-group">
              <label style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Email Address
              </label>
              <div className="input-row" style={{ marginTop: '6px' }}>
                <Mail size={18} />
                <input
                  id="email-input"
                  type="email"
                  placeholder="name@opsfly.com"
                  className="home-text-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={submitting}
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="input-group">
              <label style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Password
              </label>
              <div className="input-row" style={{ marginTop: '6px' }}>
                <KeyRound size={18} />
                <input
                  id="password-input"
                  type="password"
                  placeholder="••••••••"
                  className="home-text-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={submitting}
                  required
                />
              </div>
            </div>

          </div>

          {/* Submit Action */}
          <button type="submit" disabled={submitting || !email.trim() || !password.trim()} className="confirm-btn" style={{ marginTop: '8px' }}>
            {submitting ? (
              <>
                <Loader2 size={18} className="spinner" />
                <span>Signing in...</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>

          {/* Signup link */}
          <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
            Don't have an account?{' '}
            <Link href="/register" style={{ color: 'var(--primary)', fontWeight: '700', textDecoration: 'none' }}>
              Create Account
            </Link>
          </p>
        </form>

      </main>
    </>
  );
}
