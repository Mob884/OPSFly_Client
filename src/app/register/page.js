"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/src/context/AuthContext';
import {
  User, Mail, KeyRound, Loader2, ShieldAlert, Building2, MapPin,
  ArrowRight, ArrowLeft, Briefcase, Plus, Trash2, CheckCircle2, UserPlus
} from 'lucide-react';
import Header from '@/src/components/Header';

export default function RegisterPage() {
  const router = useRouter();
  const { onboard } = useAuth();
  
  // 5-step wizard + post-submit step for temp passwords display
  // Steps: 1 (Welcome), 2 (Create Org), 3 (Add Locations), 4 (Owner Profile), 5 (Invite Team), 6 (Passwords Summary)
  const [step, setStep] = useState(1);
  
  // Organization Details
  const [orgName, setOrgName] = useState('');
  const [orgIndustry, setOrgIndustry] = useState('Restaurant');
  
  // Locations List (max 5)
  const [locationsList, setLocationsList] = useState([]);
  const [curLocName, setCurLocName] = useState('');
  const [curLocAddress, setCurLocAddress] = useState('');

  // Owner Account
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Team Invites
  const [invitesList, setInvitesList] = useState([]);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('department_manager');
  const [inviteDept, setInviteDept] = useState('');
  const [inviteLocIdx, setInviteLocIdx] = useState(0);

  // Result password displays
  const [invitedMembersPasswords, setInvitedMembersPasswords] = useState([]);

  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Navigation handlers
  const handleStart = () => setStep(2);
  
  const handleNextToLocations = (e) => {
    e.preventDefault();
    if (!orgName.trim()) return;
    setStep(3);
  };

  const handleAddLocation = () => {
    if (!curLocName.trim()) return;
    if (locationsList.length >= 5) {
      setErrorMsg('You can add up to 5 locations during onboarding.');
      setTimeout(() => setErrorMsg(''), 3000);
      return;
    }
    setLocationsList([...locationsList, { name: curLocName.trim(), address: curLocAddress.trim() }]);
    setCurLocName('');
    setCurLocAddress('');
  };

  const handleRemoveLocation = (index) => {
    setLocationsList(locationsList.filter((_, i) => i !== index));
  };

  const handleNextToProfile = (e) => {
    e.preventDefault();
    // Auto-add current input if typed and list is empty
    let list = [...locationsList];
    if (curLocName.trim()) {
      list.push({ name: curLocName.trim(), address: curLocAddress.trim() });
      setLocationsList(list);
      setCurLocName('');
      setCurLocAddress('');
    }
    if (list.length === 0) {
      setErrorMsg('Please specify at least one location.');
      setTimeout(() => setErrorMsg(''), 3000);
      return;
    }
    setStep(4);
  };

  const handleNextToInvites = (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) return;
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }
    setErrorMsg('');
    setStep(5);
  };

  const handleAddInvite = () => {
    if (!inviteName.trim() || !inviteEmail.trim()) return;
    setInvitesList([...invitesList, {
      name: inviteName.trim(),
      email: inviteEmail.trim().toLowerCase(),
      role: inviteRole,
      department: inviteRole === 'department_manager' ? inviteDept.trim() : '',
      locationIndex: Number(inviteLocIdx)
    }]);
    setInviteName('');
    setInviteEmail('');
    setInviteDept('');
  };

  const handleRemoveInvite = (index) => {
    setInvitesList(invitesList.filter((_, i) => i !== index));
  };

  const handleFinishOnboarding = async (shouldSkipInvites = false) => {
    setSubmitting(true);
    setErrorMsg('');

    try {
      const invites = shouldSkipInvites ? [] : invitesList;
      
      const res = await onboard(
        orgName.trim(),
        orgIndustry,
        locationsList,
        name.trim(),
        email.trim(),
        password.trim(),
        invites
      );

      if (res.invitedMembers && res.invitedMembers.length > 0) {
        setInvitedMembersPasswords(res.invitedMembers);
        setStep(6); // display passwords
      } else {
        router.push('/');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Onboarding failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    setErrorMsg('');
    setStep(step - 1);
  };

  return (
    <>
      <Header />
      <main className="page" style={{ paddingBottom: '45px', gap: '20px' }}>
        
        {/* Step Indicator */}
        {step >= 2 && step <= 5 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '10px' }}>
            {[2, 3, 4, 5].map((s) => (
              <div
                key={s}
                style={{
                  width: '36px',
                  height: '6px',
                  borderRadius: '3px',
                  background: s === step ? 'var(--primary)' : s < step ? 'rgba(29, 123, 255, 0.4)' : 'var(--border)',
                  transition: 'all 0.3s ease'
                }}
              />
            ))}
          </div>
        )}

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

        {/* ── STEP 1: WELCOME SCREEN ── */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, textAlign: 'center', marginTop: 30 }}>
            <div style={{
              position: 'relative', width: '80px', height: '80px', borderRadius: '20px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 12px 32px rgba(0, 0, 0, 0.3)'
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

            <div>
              <img 
                src="/logo-full.svg" 
                alt="OpsFly" 
                style={{ height: '36px', objectFit: 'contain', marginBottom: '8px' }}
                onError={(e) => { e.target.src = '/logo-full.png'; }}
              />
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: '8px', maxWidth: 300, lineHeight: 1.5 }}>
                Let's set up your organization and team parameters to activate AI operations analytics.
              </p>
            </div>

            <button onClick={handleStart} className="confirm-btn" style={{ maxWidth: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 12 }}>
              <span>Get Started</span>
              <ArrowRight size={18} />
            </button>
          </div>
        )}

        {/* ── STEP 2: CREATE ORGANIZATION ── */}
        {step === 2 && (
          <form onSubmit={handleNextToLocations} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: '900' }}>Your Organization</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '4px' }}>Name your hospitality company or store group</p>
            </div>

            <div className="input-group">
              <label style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Organization Name</label>
              <div className="input-row" style={{ marginTop: '6px' }}>
                <Building2 size={18} />
                <input
                  id="org-name-input" type="text" placeholder="e.g. Smiths Hospitality Group"
                  className="home-text-input" value={orgName} onChange={e => setOrgName(e.target.value)} required
                />
              </div>
            </div>

            <div className="input-group">
              <label style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Industry Type</label>
              <div className="input-row" style={{ marginTop: '6px' }}>
                <Briefcase size={18} />
                <select
                  value={orgIndustry} onChange={e => setOrgIndustry(e.target.value)}
                  className="home-text-input" style={{ flex: 1, outline: 'none', background: 'none', border: 'none', color: '#fff', fontSize: '0.9rem', fontFamily: 'inherit' }}
                >
                  <option value="Restaurant" style={{ background: '#050B14' }}>Restaurant</option>
                  <option value="Hotel" style={{ background: '#050B14' }}>Hotel</option>
                  <option value="Other" style={{ background: '#050B14' }}>Other</option>
                </select>
              </div>
            </div>

            <button type="submit" disabled={!orgName.trim()} className="confirm-btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <span>Continue to Locations</span>
              <ArrowRight size={16} />
            </button>
          </form>
        )}

        {/* ── STEP 3: ADD LOCATIONS ── */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: '900' }}>Add Locations</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '4px' }}>Configure up to 5 operational stores or venues</p>
            </div>

            {/* Added Locations list */}
            {locationsList.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Added Locations ({locationsList.length})</span>
                {locationsList.map((loc, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyBetween: 'center', padding: '10px 14px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12 }}>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontWeight: 750, color: '#fff', fontSize: '0.85rem' }}>{loc.name}</span>
                      {loc.address && <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: 2 }}>{loc.address}</p>}
                    </div>
                    <button type="button" onClick={() => handleRemoveLocation(i)} style={{ background: 'none', border: 'none', color: 'var(--staffing)', cursor: 'pointer' }}><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>
            )}

            {/* Addition Form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 18, padding: 16 }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Specify Location details</span>
              <div className="input-group">
                <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>Location Name</label>
                <div className="input-row" style={{ marginTop: '4px' }}>
                  <Building2 size={16} color="var(--text-muted)" />
                  <input type="text" placeholder="e.g. Uptown Location" className="home-text-input" value={curLocName} onChange={e => setCurLocName(e.target.value)} />
                </div>
              </div>
              <div className="input-group">
                <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>Street Address (Optional)</label>
                <div className="input-row" style={{ marginTop: '4px' }}>
                  <MapPin size={16} color="var(--text-muted)" />
                  <input type="text" placeholder="e.g. 500 High St, Uptown" className="home-text-input" value={curLocAddress} onChange={e => setCurLocAddress(e.target.value)} />
                </div>
              </div>
              <button type="button" onClick={handleAddLocation} disabled={!curLocName.trim()} className="secondary-btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: '0.85rem', padding: '10px 0' }}>
                <Plus size={16} /> Add Location to List
              </button>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="button" onClick={handleBack} className="secondary-btn" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px', borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--border)', cursor: 'pointer', fontWeight: 800 }}>
                <ArrowLeft size={16} />
                <span>Back</span>
              </button>
              <button type="button" onClick={handleNextToProfile} className="confirm-btn" style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <span>Continue to Profile</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 4: OWNER ACCOUNT ── */}
        {step === 4 && (
          <form onSubmit={handleNextToInvites} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: '900' }}>Admin Setup</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '4px' }}>Create owner account profile</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="input-group">
                <label style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Full Name</label>
                <div className="input-row" style={{ marginTop: '6px' }}>
                  <User size={18} />
                  <input type="text" placeholder="Fred Smith" className="home-text-input" value={name} onChange={e => setName(e.target.value)} required />
                </div>
              </div>

              <div className="input-group">
                <label style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email Address</label>
                <div className="input-row" style={{ marginTop: '6px' }}>
                  <Mail size={18} />
                  <input type="email" placeholder="fred@opsfly.com" className="home-text-input" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
              </div>

              <div className="input-group">
                <label style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Password</label>
                <div className="input-row" style={{ marginTop: '6px' }}>
                  <Lock size={18} color="var(--text-muted)" style={{ opacity: 0.5 }} />
                  <input type="password" placeholder="Min. 6 characters" className="home-text-input" value={password} onChange={e => setPassword(e.target.value)} required />
                </div>
              </div>

              <div className="input-group">
                <label style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Confirm Password</label>
                <div className="input-row" style={{ marginTop: '6px' }}>
                  <Lock size={18} color="var(--text-muted)" style={{ opacity: 0.5 }} />
                  <input type="password" placeholder="Re-type password" className="home-text-input" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="button" onClick={handleBack} className="secondary-btn" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px', borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--border)', cursor: 'pointer', fontWeight: 800 }}>
                <ArrowLeft size={16} />
                <span>Back</span>
              </button>
              <button type="submit" disabled={!name.trim() || !email.trim() || password.length < 6 || password !== confirmPassword} className="confirm-btn" style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <span>Continue to Team</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </form>
        )}

        {/* ── STEP 5: INVITE TEAM (OPTIONAL) ── */}
        {step === 5 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: '900' }}>Invite Your Team</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '4px' }}>Add managers and staff profiles (Optional)</p>
            </div>

            {/* Added Invites list */}
            {invitesList.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Invited Members ({invitesList.length})</span>
                {invitesList.map((inv, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyBetween: 'center', padding: '10px 14px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12 }}>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontWeight: 750, color: '#fff', fontSize: '0.85rem' }}>{inv.name}</span>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: 2 }}>{inv.email} • {inv.role.replace('_', ' ')} • {locationsList[inv.locationIndex]?.name}</p>
                    </div>
                    <button type="button" onClick={() => handleRemoveInvite(i)} style={{ background: 'none', border: 'none', color: 'var(--staffing)', cursor: 'pointer' }}><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>
            )}

            {/* Quick Invite Form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 18, padding: 16 }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 4 }}><UserPlus size={14} /> Invite a Manager</span>
              
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="text" placeholder="Full Name" className="home-text-input" value={inviteName} onChange={e => setInviteName(e.target.value)} style={{ flex: 1, fontSize: '0.82rem', padding: '8px 12px' }} />
                <input type="email" placeholder="Email" className="home-text-input" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} style={{ flex: 1, fontSize: '0.82rem', padding: '8px 12px' }} />
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} style={{ flex: 1, background: 'var(--bg-card-alt)', border: '1px solid var(--border)', color: '#fff', fontSize: '0.78rem', padding: '8px', borderRadius: 8, outline: 'none' }}>
                  <option value="gm">General Manager</option>
                  <option value="agm">Assistant GM</option>
                  <option value="department_manager">Department Manager</option>
                </select>
                
                <select value={inviteLocIdx} onChange={e => setInviteLocIdx(Number(e.target.value))} style={{ flex: 1, background: 'var(--bg-card-alt)', border: '1px solid var(--border)', color: '#fff', fontSize: '0.78rem', padding: '8px', borderRadius: 8, outline: 'none' }}>
                  {locationsList.map((loc, idx) => (
                    <option key={idx} value={idx}>{loc.name}</option>
                  ))}
                </select>
              </div>

              {inviteRole === 'department_manager' && (
                <input type="text" placeholder="Department (e.g. Kitchen, FOH)" className="home-text-input" value={inviteDept} onChange={e => setInviteDept(e.target.value)} style={{ fontSize: '0.82rem', padding: '8px 12px' }} />
              )}

              <button type="button" onClick={handleAddInvite} disabled={!inviteName.trim() || !inviteEmail.trim()} className="secondary-btn" style={{ padding: '8px 0', fontSize: '0.78rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <Plus size={14} /> Add Team Member
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" onClick={handleBack} disabled={submitting} className="secondary-btn" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px', borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--border)', cursor: 'pointer', fontWeight: 800 }}>
                  <ArrowLeft size={16} />
                  <span>Back</span>
                </button>
                <button type="button" onClick={() => handleFinishOnboarding(false)} disabled={submitting} className="confirm-btn" style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  {submitting ? <Loader2 size={16} className="spinner" /> : <CheckCircle2 size={16} />}
                  <span>{submitting ? 'Finishing...' : 'Submit & Finish'}</span>
                </button>
              </div>

              <button type="button" onClick={() => handleFinishOnboarding(true)} disabled={submitting} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.8rem', padding: '10px 0', cursor: 'pointer', textDecoration: 'underline' }}>
                Skip inviting team for now
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 6: PASSWORDS SUMMARY DISPLAY ── */}
        {step === 6 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'center', marginTop: 15 }}>
            <div style={{ display: 'flex', justifyContent: 'center', color: '#22C55E' }}><CheckCircle2 size={56} /></div>
            
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 900 }}>Setup Complete!</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '6px', maxWidth: 300, marginInline: 'auto' }}>
                Your organization is configured. Copy the temporary passwords for your invited team members:
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left' }}>
              {invitedMembersPasswords.map((member, i) => (
                <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '14px 18px' }}>
                  <div style={{ display: 'flex', justifyBetween: 'center', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 800, color: '#fff', fontSize: '0.9rem' }}>{member.name}</span>
                    <span style={{ fontSize: '0.62rem', fontWeight: 900, background: 'rgba(29, 123, 255, 0.12)', color: 'var(--primary)', padding: '2px 8px', borderRadius: 20 }}>{member.role.replace('_', ' ')}</span>
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem', margin: 0 }}>{member.email}</p>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#050B14', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', marginTop: 10 }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 800 }}>TEMP PASSWORD:</span>
                    <span style={{ fontSize: '0.95rem', fontFamily: 'monospace', fontWeight: 900, color: '#fff' }}>{member.tempPassword}</span>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={() => router.push('/')} className="confirm-btn" style={{ marginTop: 10 }}>
              Enter Dashboard
            </button>
          </div>
        )}

      </main>
    </>
  );
}
