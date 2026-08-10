"use client";
import React from 'react';

// Shared building blocks for the Business DNA screens. Keeps each screen small
// and on-theme (dark: bg #050B14, card #0D1520, blue #1D7BFF) using the same
// CSS variables the rest of the app uses.

export function ProgressBar({ percent }) {
  return (
    <div style={{ width: '100%', height: 6, background: 'var(--bg-card-alt)', borderRadius: 999, overflow: 'hidden' }}>
      <div style={{ width: `${percent}%`, height: '100%', background: 'var(--primary)', borderRadius: 999, transition: 'width 0.3s ease' }} />
    </div>
  );
}

export function StepHeading({ title, step, totalSteps = 4, subtitle }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
        <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#fff', margin: 0 }}>{title}</h2>
        {step != null && (
          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
            Step {step} of {totalSteps}
          </span>
        )}
      </div>
      {step != null && <ProgressBar percent={Math.round((step / totalSteps) * 100)} />}
      {subtitle && <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>{subtitle}</p>}
    </div>
  );
}

export function Field({ label, children, hint }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.02em' }}>{label}</span>}
      {children}
      {hint && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{hint}</span>}
    </label>
  );
}

const baseInput = {
  width: '100%',
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  color: '#fff',
  fontSize: '0.9rem',
  padding: '11px 13px',
  outline: 'none',
  fontFamily: 'inherit',
};

export function Input(props) {
  return <input {...props} style={{ ...baseInput, ...(props.style || {}) }} />;
}

export function Textarea(props) {
  return <textarea {...props} style={{ ...baseInput, minHeight: 110, resize: 'vertical', ...(props.style || {}) }} />;
}

export function Select({ children, ...props }) {
  return (
    <select {...props} style={{ ...baseInput, cursor: 'pointer', appearance: 'none', ...(props.style || {}) }}>
      {children}
    </select>
  );
}

export function Pills({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {options.map((opt) => {
        const active = value === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(active ? null : opt)}
            style={{
              padding: '7px 13px',
              borderRadius: 999,
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit',
              background: active ? 'var(--primary)' : 'rgba(29,123,255,0.08)',
              color: active ? '#fff' : 'var(--text-secondary)',
              border: `1px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
              transition: 'all 0.15s',
            }}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

export function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, background: 'none',
        border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit',
      }}
    >
      <span style={{
        width: 42, height: 24, borderRadius: 999, position: 'relative', flexShrink: 0,
        background: checked ? 'var(--primary)' : 'var(--bg-card-alt)',
        border: '1px solid var(--border)', transition: 'background 0.2s',
      }}>
        <span style={{
          position: 'absolute', top: 2, left: checked ? 20 : 2, width: 18, height: 18,
          borderRadius: '50%', background: '#fff', transition: 'left 0.2s',
        }} />
      </span>
      {label && <span style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 600 }}>{label}</span>}
    </button>
  );
}

export function Card({ children, style }) {
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)', padding: 18, ...style,
    }}>
      {children}
    </div>
  );
}

export function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', margin: '4px 0' }}>
      {children}
    </div>
  );
}

export function PrimaryButton({ children, loading, ...props }) {
  return (
    <button className="btn btn-primary" {...props} disabled={loading || props.disabled} style={{ opacity: loading || props.disabled ? 0.7 : 1, ...(props.style || {}) }}>
      {loading ? 'Saving…' : children}
    </button>
  );
}

export function GhostButton({ children, ...props }) {
  return <button className="btn btn-ghost" {...props}>{children}</button>;
}
