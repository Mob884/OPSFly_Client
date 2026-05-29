"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/src/context/AuthContext';
import { User, Mail, KeyRound, Loader2, ShieldAlert, Sparkles, Shield, Users } from 'lucide-react';
import Header from '@/src/components/Header';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Staff'); // default to Staff
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) return;

    setSubmitting(true);
    setErrorMsg('');

    try {
      await register(name.trim(), email.trim(), password.trim(), role);
      router.push('/');
    } catch (err) {
      setErrorMsg(err.message || 'Registration failed. Please check credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Header />
      <main className="page" style={{ paddingBottom: '40px', gap: '28px' }}>
        
        {/* Welcome */}
        <div style={{ textAlign: 'center', marginTop: '10px' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '900', letterSpacing: '-0.5px' }}>Create Account</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
            Set up your credentials and select your role
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

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Inputs Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            
            {/* Name */}
            <div className="input-group">
              <label style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Full Name
              </label>
              <div className="input-row" style={{ marginTop: '6px' }}>
                <User size={18} />
                <input
                  id="name-input"
                  type="text"
                  placeholder="Fred Smith"
                  className="home-text-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={submitting}
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div className="input-group">
              <label style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Email Address
              </label>
              <div className="input-row" style={{ marginTop: '6px' }}>
                <Mail size={18} />
                <input
                  id="email-input"
                  type="email"
                  placeholder="fred@opsfly.com"
                  className="home-text-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={submitting}
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="input-group">
              <label style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Password
              </label>
              <div className="input-row" style={{ marginTop: '6px' }}>
                <KeyRound size={18} />
                <input
                  id="password-input"
                  type="password"
                  placeholder="Min. 6 characters"
                  className="home-text-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={submitting}
                  required
                />
              </div>
            </div>

          </div>

          {/* Interactive Role Selection */}
          <div className="input-group">
            <label style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Select Account Role
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
              
              {/* Manager Card */}
              <div
                onClick={() => !submitting && setRole('Manager')}
                style={{
                  background: 'var(--bg-card)',
                  border: `1px solid ${role === 'Manager' ? 'var(--primary)' : 'var(--border)'}`,
                  borderRadius: '16px', padding: '16px', display: 'flex', gap: '14px',
                  alignItems: 'center', cursor: submitting ? 'not-allowed' : 'pointer',
                  boxShadow: role === 'Manager' ? '0 0 20px rgba(29, 123, 255, 0.15)' : 'none',
                  transition: 'all 0.2s ease-in-out'
                }}
              >
                <div style={{
                  width: '40px', height: '40px', borderRadius: '12px',
                  background: role === 'Manager' ? 'rgba(29, 123, 255, 0.15)' : 'var(--bg-card-alt)',
                  color: role === 'Manager' ? 'var(--primary)' : 'var(--text-secondary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  <Shield size={20} />
                </div>
                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: '750', color: role === 'Manager' ? 'var(--primary)' : '#fff' }}>
                    Manager
                  </h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.4 }}>
                    Full access. View all voice notes, manage summaries, reports, and oversee all team activity.
                  </p>
                </div>
              </div>

              {/* Staff Card */}
              <div
                onClick={() => !submitting && setRole('Staff')}
                style={{
                  background: 'var(--bg-card)',
                  border: `1px solid ${role === 'Staff' ? 'var(--primary)' : 'var(--border)'}`,
                  borderRadius: '16px', padding: '16px', display: 'flex', gap: '14px',
                  alignItems: 'center', cursor: submitting ? 'not-allowed' : 'pointer',
                  boxShadow: role === 'Staff' ? '0 0 20px rgba(29, 123, 255, 0.15)' : 'none',
                  transition: 'all 0.2s ease-in-out'
                }}
              >
                <div style={{
                  width: '40px', height: '40px', borderRadius: '12px',
                  background: role === 'Staff' ? 'rgba(29, 123, 255, 0.15)' : 'var(--bg-card-alt)',
                  color: role === 'Staff' ? 'var(--primary)' : 'var(--text-secondary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  <Users size={20} />
                </div>
                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: '750', color: role === 'Staff' ? 'var(--primary)' : '#fff' }}>
                    Staff
                  </h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.4 }}>
                    Scoped access. Record your own voice or typed notes, and track your designated tasks.
                  </p>
                </div>
              </div>

            </div>
          </div>

          {/* Submit */}
          <button type="submit" disabled={submitting || !name.trim() || !email.trim() || !password.trim()} className="confirm-btn" style={{ marginTop: '4px' }}>
            {submitting ? (
              <>
                <Loader2 size={18} className="spinner" />
                <span>Registering account...</span>
              </>
            ) : (
              <span>Create Account</span>
            )}
          </button>

          {/* Link back */}
          <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: 'var(--primary)', fontWeight: '700', textDecoration: 'none' }}>
              Sign In
            </Link>
          </p>

        </form>
      </main>
    </>
  );
}
