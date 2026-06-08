"use client";
import React, { useEffect, useState, useCallback } from 'react';
import Header from '@/src/components/Header';
import { useAuth } from '@/src/context/AuthContext';
import {
  Settings, LogOut, Shield, User, Bell, AppWindow,
  HelpCircle, Plus, Users, Edit3, MapPin, Loader2, X, PlusCircle,
  Building2, Briefcase, Calendar, ChevronRight, Lock, Eye, EyeOff, CheckCircle2, AlertTriangle
} from 'lucide-react';
import axios from 'axios';

export default function MorePage() {
  const { user, logout, currentLocationId, refreshLocations, accessibleLocations } = useAuth();
  
  // Section router state: 'root', 'org', 'locations', 'location-detail', 'team', 'user-detail', 'profile', 'app-settings'
  const [activeSection, setActiveSection] = useState('root');
  
  // Loaded states
  const [orgData, setOrgData] = useState(null);
  const [locations, setLocations] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loadingOrg, setLoadingOrg] = useState(false);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Selected sub-items
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);

  // Forms states
  const [orgName, setOrgName] = useState('');
  const [orgIndustry, setOrgIndustry] = useState('Restaurant');
  
  const [newLocName, setNewLocName] = useState('');
  const [newLocAddress, setNewLocAddress] = useState('');
  const [showAddLocModal, setShowAddLocModal] = useState(false);

  const [editLocName, setEditLocName] = useState('');
  const [editLocAddress, setEditLocAddress] = useState('');

  // Invite states
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePassword, setInvitePassword] = useState('');
  const [inviteRole, setInviteRole] = useState('department_manager');
  const [inviteLocationId, setInviteLocationId] = useState('');
  const [inviteDept, setInviteDept] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [tempPasswordDisplay, setTempPasswordDisplay] = useState('');

  // Edit user states
  const [editUserRole, setEditUserRole] = useState('department_manager');
  const [editUserLocationIds, setEditUserLocationIds] = useState([]);
  const [editUserDept, setEditUserDept] = useState('');
  const [resetPwdUserModal, setResetPwdUserModal] = useState(false);
  const [tempResetPwd, setTempResetPwd] = useState('');

  // Profile states
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileCurrentPwd, setProfileCurrentPwd] = useState('');
  const [profileNewPwd, setProfileNewPwd] = useState('');
  const [profileConfirmPwd, setProfileConfirmPwd] = useState('');
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');
  const [profileErrorMsg, setProfileErrorMsg] = useState('');

  // App Settings States
  const [theme, setTheme] = useState('dark');
  const [mockNotify, setMockNotify] = useState(true);

  const [globalError, setGlobalError] = useState('');
  const [globalSuccess, setGlobalSuccess] = useState('');

  useEffect(() => {
    document.title = 'Settings — OpsFly';
    const savedTheme = localStorage.getItem('opsfly_theme') || 'dark';
    setTheme(savedTheme);
  }, []);

  // Fetch functions
  const loadOrgData = useCallback(async () => {
    if (!user?.organizationId) return;
    try {
      setLoadingOrg(true);
      const token = localStorage.getItem('opsfly_token');
      const res = await axios.get(`/api/organizations/${user.organizationId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrgData(res.data);
      setOrgName(res.data?.name || '');
      setOrgIndustry(res.data?.industry || 'Restaurant');
    } catch (err) {
      console.error('Failed to load organization data', err);
    } finally {
      setLoadingOrg(false);
    }
  }, [user]);

  const loadLocations = useCallback(async () => {
    try {
      setLoadingLocations(true);
      const token = localStorage.getItem('opsfly_token');
      const res = await axios.get('/api/locations', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLocations(res.data || []);
    } catch (err) {
      console.error('Failed to load locations', err);
    } finally {
      setLoadingLocations(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      setLoadingUsers(true);
      const token = localStorage.getItem('opsfly_token');
      const res = await axios.get('/api/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAllUsers(res.data || []);
    } catch (err) {
      console.error('Failed to load team users', err);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  // Auto trigger loading based on active section
  useEffect(() => {
    if (activeSection === 'org') {
      loadOrgData();
    } else if (activeSection === 'locations' || activeSection === 'location-detail') {
      loadLocations();
      loadUsers();
    } else if (activeSection === 'team' || activeSection === 'user-detail') {
      loadLocations();
      loadUsers();
    } else if (activeSection === 'profile') {
      setProfileName(user?.name || '');
      setProfileEmail(user?.email || '');
      setProfileCurrentPwd('');
      setProfileNewPwd('');
      setProfileConfirmPwd('');
      setProfileSuccessMsg('');
      setProfileErrorMsg('');
    }
  }, [activeSection, loadOrgData, loadLocations, loadUsers, user]);

  // Handle Updates
  const handleSaveOrg = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('opsfly_token');
      await axios.patch(`/api/organizations/${user.organizationId}`, {
        name: orgName,
        industry: orgIndustry
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGlobalSuccess('Organization updated successfully!');
      setTimeout(() => setGlobalSuccess(''), 3000);
      loadOrgData();
    } catch (err) {
      setGlobalError(err.response?.data?.error || 'Failed to update organization.');
      setTimeout(() => setGlobalError(''), 4000);
    }
  };

  const handleAddLocation = async (e) => {
    e.preventDefault();
    if (!newLocName.trim()) return;
    try {
      const token = localStorage.getItem('opsfly_token');
      await axios.post('/api/locations', {
        name: newLocName.trim(),
        address: newLocAddress.trim()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNewLocName('');
      setNewLocAddress('');
      setShowAddLocModal(false);
      loadLocations();
      if (refreshLocations) refreshLocations();
      setGlobalSuccess('Location created successfully!');
      setTimeout(() => setGlobalSuccess(''), 3000);
    } catch (err) {
      setGlobalError(err.response?.data?.error || 'Failed to create location.');
      setTimeout(() => setGlobalError(''), 4000);
    }
  };

  const handleUpdateLocation = async (e) => {
    e.preventDefault();
    if (!editLocName.trim()) return;
    try {
      const token = localStorage.getItem('opsfly_token');
      await axios.patch(`/api/locations/${selectedLocation._id}`, {
        name: editLocName.trim(),
        address: editLocAddress.trim(),
        isActive: selectedLocation.isActive
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGlobalSuccess('Location details saved!');
      setTimeout(() => setGlobalSuccess(''), 3000);
      loadLocations();
      setActiveSection('locations');
    } catch (err) {
      setGlobalError(err.response?.data?.error || 'Failed to update location.');
      setTimeout(() => setGlobalError(''), 4000);
    }
  };

  const handleToggleLocationActive = async () => {
    try {
      const token = localStorage.getItem('opsfly_token');
      const nextActive = !selectedLocation.isActive;
      await axios.patch(`/api/locations/${selectedLocation._id}`, {
        isActive: nextActive
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedLocation(prev => ({ ...prev, isActive: nextActive }));
      loadLocations();
    } catch (err) {
      setGlobalError('Failed to toggle active status.');
      setTimeout(() => setGlobalError(''), 3000);
    }
  };

  const handleDeleteLocation = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedLocation.name}? All historical data will be preserved but no new activity can be registered.`)) return;
    try {
      const token = localStorage.getItem('opsfly_token');
      await axios.delete(`/api/locations/${selectedLocation._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGlobalSuccess('Location soft-deleted successfully.');
      setTimeout(() => setGlobalSuccess(''), 3000);
      loadLocations();
      setActiveSection('locations');
    } catch (err) {
      setGlobalError('Failed to delete location.');
      setTimeout(() => setGlobalError(''), 3000);
    }
  };

  const handleInviteUser = async (e) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim() || !invitePassword.trim()) return;
    try {
      const token = localStorage.getItem('opsfly_token');
      await axios.post('/api/users/invite', {
        name: inviteName.trim(),
        email: inviteEmail.trim().toLowerCase(),
        password: invitePassword.trim(),
        role: inviteRole,
        locationIds: [inviteLocationId],
        department: inviteRole === 'department_manager' ? inviteDept : undefined
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTempPasswordDisplay(invitePassword);
      setInviteName('');
      setInviteEmail('');
      setInvitePassword('');
      setInviteDept('');
      loadUsers();
    } catch (err) {
      setGlobalError(err.response?.data?.error || 'Failed to invite user.');
      setTimeout(() => setGlobalError(''), 4000);
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('opsfly_token');
      await axios.patch(`/api/users/${selectedUser._id}`, {
        role: editUserRole,
        locationIds: editUserLocationIds,
        department: editUserRole === 'department_manager' ? editUserDept : null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGlobalSuccess('User roles updated successfully!');
      setTimeout(() => setGlobalSuccess(''), 3000);
      loadUsers();
      setActiveSection('team');
    } catch (err) {
      setGlobalError(err.response?.data?.error || 'Failed to update user.');
      setTimeout(() => setGlobalError(''), 4000);
    }
  };

  const handleToggleUserActive = async () => {
    try {
      const token = localStorage.getItem('opsfly_token');
      const nextActive = !selectedUser.isActive;
      await axios.patch(`/api/users/${selectedUser._id}`, {
        isActive: nextActive
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedUser(prev => ({ ...prev, isActive: nextActive }));
      loadUsers();
    } catch (err) {
      setGlobalError('Failed to change user deactivation status.');
      setTimeout(() => setGlobalError(''), 3000);
    }
  };

  const handleResetPassword = async () => {
    const tempPassword = Math.random().toString(36).slice(-8) + '123';
    try {
      const token = localStorage.getItem('opsfly_token');
      await axios.patch(`/api/users/${selectedUser._id}`, {
        newPassword: tempPassword
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTempResetPwd(tempPassword);
      setResetPwdUserModal(true);
    } catch (err) {
      setGlobalError('Failed to reset user password.');
      setTimeout(() => setGlobalError(''), 3000);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileErrorMsg('');
    setProfileSuccessMsg('');

    if (profileNewPwd && profileNewPwd !== profileConfirmPwd) {
      setProfileErrorMsg('New passwords do not match.');
      return;
    }

    try {
      const token = localStorage.getItem('opsfly_token');
      const payload = {
        name: profileName.trim(),
        email: profileEmail.trim().toLowerCase(),
      };
      if (profileNewPwd) {
        payload.currentPassword = profileCurrentPwd;
        payload.newPassword = profileNewPwd;
      }

      await axios.patch(`/api/users/${user.id || user._id}`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setProfileSuccessMsg('Profile updated successfully! Refreshing...');
      setProfileCurrentPwd('');
      setProfileNewPwd('');
      setProfileConfirmPwd('');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      setProfileErrorMsg(err.response?.data?.error || 'Failed to update profile.');
    }
  };

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('opsfly_theme', newTheme);
    // Dynamic theme injection
    if (newTheme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
  };

  // Filters & Counts
  const isOwner = user?.role === 'owner';
  const isManagement = ['owner', 'district_manager', 'gm', 'agm', 'Manager'].includes(user?.role);
  
  // Team Filter states
  const [teamLocFilter, setTeamLocFilter] = useState('All');
  const [teamRoleFilter, setTeamRoleFilter] = useState('All');

  const filteredTeam = allUsers.filter(u => {
    if (teamLocFilter !== 'All' && !u.locationIds?.includes(teamLocFilter)) return false;
    if (teamRoleFilter !== 'All' && u.role !== teamRoleFilter) return false;
    return true;
  });

  return (
    <>
      <Header title={activeSection === 'root' ? 'Settings' : activeSection.replace('-', ' ')} showBack={activeSection !== 'root'} onBack={() => {
        if (activeSection === 'location-detail') setActiveSection('locations');
        else if (activeSection === 'user-detail') setActiveSection('team');
        else setActiveSection('root');
      }} />

      <main className="page" style={{ paddingTop: '16px', paddingBottom: '40px', gap: '20px' }}>
        
        {globalSuccess && (
          <div style={{ background: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: 12, padding: '12px 16px', color: '#22C55E', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle2 size={16} /> <span>{globalSuccess}</span>
          </div>
        )}

        {globalError && (
          <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 12, padding: '12px 16px', color: '#EF4444', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={16} /> <span>{globalError}</span>
          </div>
        )}

        {/* ────────────────── SECTION: ROOT MENU ────────────────── */}
        {activeSection === 'root' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Quick Profile Summary */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px', background: 'linear-gradient(135deg, #0D1520 0%, #121C29 100%)', border: '1px solid var(--border)', borderRadius: 20 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(29, 123, 255, 0.12)', border: '2px solid var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontWeight: 800 }}>
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '1.0rem', fontWeight: 800, color: '#fff', margin: 0 }}>{user?.name}</h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{user?.email}</p>
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  <span style={{ fontSize: '0.62rem', fontWeight: 900, background: 'rgba(255,184,0,0.12)', color: 'var(--cost)', border: '1px solid rgba(255,184,0,0.2)', padding: '2px 8px', borderRadius: 20, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    {user?.role?.replace('_', ' ')}
                  </span>
                  {user?.department && (
                    <span style={{ fontSize: '0.62rem', fontWeight: 900, background: 'rgba(34,197,94,0.12)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.2)', padding: '2px 8px', borderRadius: 20, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      {user.department}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Menu Options */}
            <div className="compact-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              
              {isOwner && (
                <button className="settings-menu-item" onClick={() => setActiveSection('org')}>
                  <Building2 size={18} color="var(--primary)" />
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <span className="settings-menu-title">Organization Settings</span>
                    <span className="settings-menu-desc">Manage company branding and industry type</span>
                  </div>
                  <ChevronRight size={16} color="var(--text-muted)" />
                </button>
              )}

              {isOwner && (
                <button className="settings-menu-item" onClick={() => setActiveSection('locations')}>
                  <MapPin size={18} color="#00D4FF" />
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <span className="settings-menu-title">Locations Management</span>
                    <span className="settings-menu-desc">Create locations, edit details, active status</span>
                  </div>
                  <ChevronRight size={16} color="var(--text-muted)" />
                </button>
              )}

              {isManagement && (
                <button className="settings-menu-item" onClick={() => setActiveSection('team')}>
                  <Users size={18} color="#FF8A00" />
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <span className="settings-menu-title">Team Management</span>
                    <span className="settings-menu-desc">Invite members, assign roles, reset passwords</span>
                  </div>
                  <ChevronRight size={16} color="var(--text-muted)" />
                </button>
              )}

              <button className="settings-menu-item" onClick={() => setActiveSection('profile')}>
                <User size={18} color="#22C55E" />
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <span className="settings-menu-title">My Profile</span>
                  <span className="settings-menu-desc">Update profile info and change account password</span>
                </div>
                <ChevronRight size={16} color="var(--text-muted)" />
              </button>

              <button className="settings-menu-item" onClick={() => setActiveSection('app-settings')}>
                <Settings size={18} color="#A855F7" />
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <span className="settings-menu-title">App Settings</span>
                  <span className="settings-menu-desc">Adjust themes, preferences, offline data info</span>
                </div>
                <ChevronRight size={16} color="var(--text-muted)" />
              </button>

            </div>

            {/* Logout */}
            <button
              onClick={logout}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                padding: '16px 20px', borderRadius: '16px',
                fontFamily: 'inherit', fontWeight: '800', fontSize: '0.92rem',
                background: 'rgba(255, 77, 106, 0.08)', color: 'var(--staffing)',
                border: '1px solid rgba(255, 77, 106, 0.2)', cursor: 'pointer',
                transition: 'all 0.2s', marginTop: '10px'
              }}
            >
              <LogOut size={18} />
              <span>Sign Out of OpsFly</span>
            </button>

          </div>
        )}

        {/* ────────────────── SECTION: ORGANIZATION ────────────────── */}
        {activeSection === 'org' && (
          <form onSubmit={handleSaveOrg} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '20px', padding: '20px' }}>
              <h3 style={{ fontSize: '1.0rem', fontWeight: 800, margin: 0, color: '#fff' }}>Edit Company Details</h3>
              
              {loadingOrg ? (
                <div style={{ display: 'flex', justifyBetween: 'center', padding: '20px', gap: 8 }}><Loader2 className="spinner" /> Loading organization...</div>
              ) : (
                <>
                  <div className="input-group">
                    <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Organization Name</label>
                    <div className="input-row" style={{ marginTop: '6px' }}>
                      <Building2 size={16} color="var(--text-muted)" />
                      <input type="text" value={orgName} onChange={e => setOrgName(e.target.value)} required style={{ background: 'none', border: 'none', color: '#fff', fontSize: '0.9rem', outline: 'none', flex: 1 }} />
                    </div>
                  </div>

                  <div className="input-group">
                    <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Industry Type</label>
                    <div className="input-row" style={{ marginTop: '6px' }}>
                      <Briefcase size={16} color="var(--text-muted)" />
                      <select value={orgIndustry} onChange={e => setOrgIndustry(e.target.value)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '0.9rem', outline: 'none', flex: 1, fontFamily: 'inherit' }}>
                        <option value="Restaurant" style={{ background: '#0D1520' }}>Restaurant</option>
                        <option value="Hotel" style={{ background: '#0D1520' }}>Hotel</option>
                        <option value="Other" style={{ background: '#0D1520' }}>Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="input-group" style={{ opacity: 0.8 }}>
                    <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Created Date</label>
                    <div className="input-row" style={{ marginTop: '6px', border: 'none', paddingLeft: 0 }}>
                      <Calendar size={16} color="var(--text-muted)" />
                      <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginLeft: '12px' }}>
                        {orgData?.createdAt ? new Date(orgData.createdAt).toLocaleDateString([], { dateStyle: 'long' }) : 'Loading...'}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>

            <button type="submit" disabled={loadingOrg} className="confirm-btn">Save Changes</button>
          </form>
        )}

        {/* ────────────────── SECTION: LOCATIONS ────────────────── */}
        {activeSection === 'locations' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Locations ({locations.filter(l => !l.deleted).length})</span>
              <button onClick={() => setShowAddLocModal(true)} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 800, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                <PlusCircle size={14} /> Add Location
              </button>
            </div>

            {loadingLocations ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 16 }}><Loader2 className="spinner" /> Loading locations...</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {locations.filter(l => !l.deleted).map(loc => {
                  const userCount = allUsers.filter(u => u.locationIds?.includes(loc._id) && !u.deleted).length;
                  return (
                    <div key={loc._id} onClick={() => { setSelectedLocation(loc); setEditLocName(loc.name); setEditLocAddress(loc.address || ''); setActiveSection('location-detail'); }} style={{ display: 'flex', alignItems: 'center', justifyBetween: 'center', padding: '14px 18px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', cursor: 'pointer', transition: 'all 0.2s' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 750, color: '#fff', fontSize: '0.92rem' }}>{loc.name}</span>
                          <span style={{
                            fontSize: '0.55rem', fontWeight: 900, padding: '1px 6px', borderRadius: 4,
                            background: loc.isActive ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: loc.isActive ? '#22C55E' : '#EF4444',
                            border: `1px solid ${loc.isActive ? 'rgba(34, 197, 94, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`
                          }}>
                            {loc.isActive ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '280px' }}>
                          {loc.address || 'No address specified'}
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 700 }}>
                          <Users size={12} />
                          <span>{userCount}</span>
                        </div>
                        <ChevronRight size={16} color="var(--text-muted)" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ────────────────── SECTION: LOCATION DETAILS ────────────────── */}
        {activeSection === 'location-detail' && selectedLocation && (
          <form onSubmit={handleUpdateLocation} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '20px', padding: '20px' }}>
              <h3 style={{ fontSize: '1.0rem', fontWeight: 800, margin: 0, color: '#fff' }}>Configure Location</h3>
              
              <div className="input-group">
                <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Location Name</label>
                <div className="input-row" style={{ marginTop: '6px' }}>
                  <Building2 size={16} color="var(--text-muted)" />
                  <input type="text" value={editLocName} onChange={e => setEditLocName(e.target.value)} required style={{ background: 'none', border: 'none', color: '#fff', fontSize: '0.9rem', outline: 'none', flex: 1 }} />
                </div>
              </div>

              <div className="input-group">
                <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Street Address</label>
                <div className="input-row" style={{ marginTop: '6px' }}>
                  <MapPin size={16} color="var(--text-muted)" />
                  <input type="text" value={editLocAddress} onChange={e => setEditLocAddress(e.target.value)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '0.9rem', outline: 'none', flex: 1 }} />
                </div>
              </div>

              {/* Toggle Location Active */}
              <div style={{ display: 'flex', justifyBetween: 'center', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '4px' }}>
                <div>
                  <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fff', display: 'block' }}>Operational Status</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Inactive locations cannot receive notes</span>
                </div>
                <button type="button" onClick={handleToggleLocationActive} style={{
                  padding: '6px 14px', borderRadius: 8, fontSize: '0.75rem', fontWeight: 900, cursor: 'pointer', border: 'none',
                  background: selectedLocation.isActive ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                  color: selectedLocation.isActive ? '#EF4444' : '#22C55E'
                }}>
                  {selectedLocation.isActive ? 'Deactivate' : 'Reactivate'}
                </button>
              </div>

              {/* View Users assigned here */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>Assigned Staff ({allUsers.filter(u => u.locationIds?.includes(selectedLocation._id) && !u.deleted).length})</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {allUsers.filter(u => u.locationIds?.includes(selectedLocation._id) && !u.deleted).map(u => (
                    <div key={u._id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--bg-card-alt)', borderRadius: 10, fontSize: '0.8rem' }}>
                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.72rem' }}>{u.name.charAt(0).toUpperCase()}</div>
                      <span style={{ fontWeight: 600, color: '#fff' }}>{u.name}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>({u.role.replace('_', ' ')})</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button type="button" onClick={handleDeleteLocation} style={{
                flex: 1, padding: '14px', borderRadius: '16px', background: 'rgba(255, 77, 106, 0.08)', color: 'var(--staffing)', border: '1px solid rgba(255, 77, 106, 0.15)', fontWeight: 800, cursor: 'pointer'
              }}>Delete Location</button>
              <button type="submit" style={{ flex: 2 }} className="confirm-btn">Save Config</button>
            </div>
          </form>
        )}

        {/* ────────────────── SECTION: TEAM ────────────────── */}
        {activeSection === 'team' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Organization Team ({filteredTeam.length})</span>
              <button onClick={() => setShowInviteModal(true)} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 800, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                <PlusCircle size={14} /> Invite User
              </button>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <select value={teamLocFilter} onChange={e => setTeamLocFilter(e.target.value)} style={{ flex: 1, minWidth: '120px', background: 'var(--bg-card)', border: '1px solid var(--border)', color: '#fff', fontSize: '0.75rem', fontWeight: 800, padding: '8px 12px', borderRadius: 10, outline: 'none' }}>
                <option value="All">All Locations</option>
                {locations.filter(l => !l.deleted).map(l => (
                  <option key={l._id} value={l._id}>{l.name}</option>
                ))}
              </select>
              <select value={teamRoleFilter} onChange={e => setTeamRoleFilter(e.target.value)} style={{ flex: 1, minWidth: '120px', background: 'var(--bg-card)', border: '1px solid var(--border)', color: '#fff', fontSize: '0.75rem', fontWeight: 800, padding: '8px 12px', borderRadius: 10, outline: 'none' }}>
                <option value="All">All Roles</option>
                <option value="owner">Owner</option>
                <option value="district_manager">District Manager</option>
                <option value="gm">General Manager</option>
                <option value="agm">Assistant GM</option>
                <option value="department_manager">Department Manager</option>
              </select>
            </div>

            {loadingUsers ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 16 }}><Loader2 className="spinner" /> Loading team...</div>
            ) : filteredTeam.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', background: 'var(--bg-card-alt)', borderRadius: '16px' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No team members yet. Invite your team from Settings.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {filteredTeam.map(u => {
                  const targetLocNames = locations.filter(l => u.locationIds?.includes(l._id)).map(l => l.name).join(', ');
                  return (
                    <div key={u._id} onClick={() => {
                      setSelectedUser(u);
                      setEditUserRole(u.role || 'department_manager');
                      setEditUserLocationIds(u.locationIds || []);
                      setEditUserDept(u.department || '');
                      setActiveSection('user-detail');
                    }} style={{ display: 'flex', alignItems: 'center', justifyBetween: 'center', padding: '14px 18px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', cursor: 'pointer', transition: 'all 0.2s', opacity: u.isActive === false || u.deleted ? 0.55 : 1 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.88rem', color: '#fff', marginRight: 12 }}>
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 750, color: '#fff', fontSize: '0.9rem' }}>{u.name}</span>
                          <span style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', padding: '1px 6px', background: 'rgba(29, 123, 255, 0.12)', color: 'var(--primary)', borderRadius: '4px' }}>
                            {u.role?.replace('_', ' ')}
                          </span>
                          {(u.isActive === false || u.deleted) && (
                            <span style={{ fontSize: '0.55rem', fontWeight: 900, background: 'rgba(239, 68, 68, 0.15)', color: '#EF4444', padding: '1px 4px', borderRadius: 4 }}>
                              INACTIVE
                            </span>
                          )}
                        </div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {u.email} {u.department ? `• ${u.department}` : ''}
                        </p>
                        {targetLocNames && (
                          <p style={{ color: 'var(--text-secondary)', fontSize: '0.68rem', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            📍 {targetLocNames}
                          </p>
                        )}
                      </div>
                      <ChevronRight size={16} color="var(--text-muted)" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ────────────────── SECTION: USER DETAIL ────────────────── */}
        {activeSection === 'user-detail' && selectedUser && (
          <form onSubmit={handleUpdateUser} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '20px', padding: '20px' }}>
              <div>
                <h3 style={{ fontSize: '1.0rem', fontWeight: 800, margin: 0, color: '#fff' }}>Configure Team Role</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 4 }}>Settings for <strong>{selectedUser.name}</strong> ({selectedUser.email})</p>
              </div>

              <div className="input-group">
                <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Account Role</label>
                <div className="input-row" style={{ marginTop: '6px' }}>
                  <Shield size={16} color="var(--text-muted)" />
                  <select value={editUserRole} onChange={e => setEditUserRole(e.target.value)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '0.9rem', outline: 'none', flex: 1, fontFamily: 'inherit' }}>
                    <option value="owner" style={{ background: '#0D1520' }}>Owner</option>
                    <option value="district_manager" style={{ background: '#0D1520' }}>District Manager</option>
                    <option value="gm" style={{ background: '#0D1520' }}>General Manager</option>
                    <option value="agm" style={{ background: '#0D1520' }}>Assistant GM</option>
                    <option value="department_manager" style={{ background: '#0D1520' }}>Department Manager</option>
                  </select>
                </div>
              </div>

              {editUserRole === 'department_manager' && (
                <div className="input-group">
                  <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Department (e.g. Front of House, Kitchen)</label>
                  <div className="input-row" style={{ marginTop: '6px' }}>
                    <Briefcase size={16} color="var(--text-muted)" />
                    <input type="text" value={editUserDept} onChange={e => setEditUserDept(e.target.value)} required placeholder="Kitchen, Front of House..." style={{ background: 'none', border: 'none', color: '#fff', fontSize: '0.9rem', outline: 'none', flex: 1 }} />
                  </div>
                </div>
              )}

              {/* Multi-Location Selection */}
              <div className="input-group">
                <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>
                  Assigned Location(s) {editUserRole === 'district_manager' ? '(Select multiple)' : '(Select one)'}
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {locations.filter(l => !l.deleted).map(loc => {
                    const checked = editUserLocationIds.includes(loc._id);
                    return (
                      <label key={loc._id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--bg-card-alt)', borderRadius: 10, cursor: 'pointer', border: `1px solid ${checked ? 'rgba(29, 123, 255, 0.3)' : 'transparent'}` }}>
                        <input
                          type={editUserRole === 'district_manager' || editUserRole === 'owner' ? 'checkbox' : 'radio'}
                          name="userLocationSelection"
                          checked={checked}
                          onChange={(e) => {
                            if (editUserRole === 'district_manager' || editUserRole === 'owner') {
                              if (e.target.checked) {
                                setEditUserLocationIds(prev => [...prev, loc._id]);
                              } else {
                                setEditUserLocationIds(prev => prev.filter(id => id !== loc._id));
                              }
                            } else {
                              setEditUserLocationIds([loc._id]);
                            }
                          }}
                          style={{ accentColor: 'var(--primary)' }}
                        />
                        <span style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 600 }}>{loc.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Toggle User Active Status */}
              <div style={{ display: 'flex', justifyBetween: 'center', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '4px' }}>
                <div>
                  <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fff', display: 'block' }}>Account Access Status</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Deactivated users cannot log in</span>
                </div>
                <button type="button" onClick={handleToggleUserActive} style={{
                  padding: '6px 14px', borderRadius: 8, fontSize: '0.75rem', fontWeight: 900, cursor: 'pointer', border: 'none',
                  background: selectedUser.isActive ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                  color: selectedUser.isActive ? '#EF4444' : '#22C55E'
                }}>
                  {selectedUser.isActive ? 'Deactivate' : 'Reactivate'}
                </button>
              </div>

              {/* Reset Password */}
              <div style={{ display: 'flex', justifyBetween: 'center', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                <div>
                  <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fff', display: 'block' }}>Reset Password</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Generate a temporary password</span>
                </div>
                <button type="button" onClick={handleResetPassword} className="secondary-btn" style={{ padding: '6px 14px', fontSize: '0.75rem', borderRadius: 8 }}>
                  Generate Reset
                </button>
              </div>

            </div>

            <button type="submit" className="confirm-btn">Save Team Member Changes</button>
          </form>
        )}

        {/* ────────────────── SECTION: PROFILE ────────────────── */}
        {activeSection === 'profile' && (
          <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '20px', padding: '20px' }}>
              <h3 style={{ fontSize: '1.0rem', fontWeight: 800, margin: 0, color: '#fff' }}>My Profile Details</h3>
              
              {profileSuccessMsg && <p style={{ color: '#22C55E', fontSize: '0.82rem', margin: 0 }}>{profileSuccessMsg}</p>}
              {profileErrorMsg && <p style={{ color: '#EF4444', fontSize: '0.82rem', margin: 0 }}>{profileErrorMsg}</p>}

              <div className="input-group">
                <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Full Name</label>
                <div className="input-row" style={{ marginTop: '6px' }}>
                  <User size={16} color="var(--text-muted)" />
                  <input type="text" value={profileName} onChange={e => setProfileName(e.target.value)} required style={{ background: 'none', border: 'none', color: '#fff', fontSize: '0.9rem', outline: 'none', flex: 1 }} />
                </div>
              </div>

              <div className="input-group">
                <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email Address</label>
                <div className="input-row" style={{ marginTop: '6px' }}>
                  <MailPinMock size={16} color="var(--text-muted)" />
                  <input type="email" value={profileEmail} onChange={e => setProfileEmail(e.target.value)} required style={{ background: 'none', border: 'none', color: '#fff', fontSize: '0.9rem', outline: 'none', flex: 1 }} />
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '4px' }}>
                <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#fff', display: 'block', marginBottom: 12 }}>Change Password</span>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div className="input-group">
                    <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Password</label>
                    <div className="input-row" style={{ marginTop: '6px' }}>
                      <Lock size={16} color="var(--text-muted)" />
                      <input type="password" value={profileCurrentPwd} onChange={e => setProfileCurrentPwd(e.target.value)} placeholder="••••••••" style={{ background: 'none', border: 'none', color: '#fff', fontSize: '0.9rem', outline: 'none', flex: 1 }} />
                    </div>
                  </div>

                  <div className="input-group">
                    <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>New Password</label>
                    <div className="input-row" style={{ marginTop: '6px' }}>
                      <Lock size={16} color="var(--text-muted)" />
                      <input type="password" value={profileNewPwd} onChange={e => setProfileNewPwd(e.target.value)} placeholder="••••••••" style={{ background: 'none', border: 'none', color: '#fff', fontSize: '0.9rem', outline: 'none', flex: 1 }} />
                    </div>
                  </div>

                  <div className="input-group">
                    <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Confirm New Password</label>
                    <div className="input-row" style={{ marginTop: '6px' }}>
                      <Lock size={16} color="var(--text-muted)" />
                      <input type="password" value={profileConfirmPwd} onChange={e => setProfileConfirmPwd(e.target.value)} placeholder="••••••••" style={{ background: 'none', border: 'none', color: '#fff', fontSize: '0.9rem', outline: 'none', flex: 1 }} />
                    </div>
                  </div>
                </div>
              </div>

            </div>

            <button type="submit" className="confirm-btn">Update Profile</button>
          </form>
        )}

        {/* ────────────────── SECTION: APP SETTINGS ────────────────── */}
        {activeSection === 'app-settings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '20px', padding: '20px' }}>
              <h3 style={{ fontSize: '1.0rem', fontWeight: 800, margin: 0, color: '#fff' }}>Preferences</h3>

              {/* Theme Settings */}
              <div style={{ display: 'flex', justifyBetween: 'center', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fff', display: 'block' }}>Color Theme</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Choose light or default dark mode</span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => handleThemeChange('dark')} style={{
                    padding: '6px 12px', borderRadius: 8, fontSize: '0.72rem', fontWeight: 900, cursor: 'pointer', border: 'none',
                    background: theme === 'dark' ? 'var(--primary)' : 'var(--bg-card-alt)',
                    color: theme === 'dark' ? '#fff' : 'var(--text-muted)'
                  }}>Dark</button>
                  <button onClick={() => handleThemeChange('light')} style={{
                    padding: '6px 12px', borderRadius: 8, fontSize: '0.72rem', fontWeight: 900, cursor: 'pointer', border: 'none',
                    background: theme === 'light' ? 'var(--primary)' : 'var(--bg-card-alt)',
                    color: theme === 'light' ? '#fff' : 'var(--text-muted)'
                  }}>Light</button>
                </div>
              </div>

              {/* Mock Notification Switch */}
              <div style={{ display: 'flex', justifyBetween: 'center', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '16px', marginBottom: 12 }}>
                <div>
                  <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fff', display: 'block' }}>In-App Notifications</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Toggle sound alerts and count updates</span>
                </div>
                <button onClick={() => setMockNotify(p => !p)} style={{
                  padding: '6px 14px', borderRadius: 8, fontSize: '0.75rem', fontWeight: 900, cursor: 'pointer', border: 'none',
                  background: mockNotify ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  color: mockNotify ? '#22C55E' : '#EF4444'
                }}>{mockNotify ? 'ON' : 'OFF'}</button>
              </div>

              {/* Version & About */}
              <div style={{ display: 'flex', justifyBetween: 'center', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                <div>
                  <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fff', display: 'block' }}>About OpsFly</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Hospitality Intelligence Engine</span>
                </div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 800 }}>v1.2.0 (Stable)</span>
              </div>

            </div>
          </div>
        )}

      </main>

      {/* ────────────────── MODALS ────────────────── */}

      {/* Invite User Modal */}
      {showInviteModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => { setShowInviteModal(false); setTempPasswordDisplay(''); }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 420, background: '#0D1520', borderRadius: '24px', padding: '24px', border: '1px solid var(--border)', boxShadow: '0 12px 48px rgba(0,0,0,0.6)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontWeight: 850, fontSize: '1.1rem', color: '#fff' }}>Invite Team Member</h3>
              <button onClick={() => { setShowInviteModal(false); setTempPasswordDisplay(''); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            {tempPasswordDisplay ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, textAlign: 'center', padding: '10px 0' }}>
                <div style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#22C55E', borderRadius: 12, padding: 16, border: '1px solid rgba(34,197,94,0.25)' }}>
                  <p style={{ fontWeight: 800, fontSize: '0.92rem', margin: 0 }}>Invitation Created Successfully!</p>
                  <p style={{ fontSize: '0.78rem', marginTop: 4 }}>Provide this temporary password to the user to log in:</p>
                  <div style={{ fontSize: '1.25rem', fontFamily: 'monospace', fontWeight: 900, background: '#0D1520', padding: '8px', borderRadius: 8, marginTop: 10, color: '#fff', border: '1px solid var(--border)' }}>
                    {tempPasswordDisplay}
                  </div>
                </div>
                <button onClick={() => { setShowInviteModal(false); setTempPasswordDisplay(''); }} className="confirm-btn">Done</button>
              </div>
            ) : (
              <form onSubmit={handleInviteUser} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Full Name</label>
                  <input type="text" value={inviteName} onChange={e => setInviteName(e.target.value)} required placeholder="Fred GM" style={{ width: '100%', background: 'var(--bg-card-alt)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 14px', color: '#fff', fontSize: '0.9rem', outline: 'none' }} />
                </div>

                <div>
                  <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Email Address</label>
                  <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} required placeholder="fred@hospitality.com" style={{ width: '100%', background: 'var(--bg-card-alt)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 14px', color: '#fff', fontSize: '0.9rem', outline: 'none' }} />
                </div>

                <div>
                  <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Temp Password</label>
                  <input type="text" value={invitePassword} onChange={e => setInvitePassword(e.target.value)} required placeholder="Min 6 chars" style={{ width: '100%', background: 'var(--bg-card-alt)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 14px', color: '#fff', fontSize: '0.9rem', outline: 'none' }} />
                </div>

                <div>
                  <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Account Role</label>
                  <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} style={{ width: '100%', background: 'var(--bg-card-alt)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 14px', color: '#fff', fontSize: '0.9rem', outline: 'none' }}>
                    <option value="owner">Owner</option>
                    <option value="district_manager">District Manager</option>
                    <option value="gm">General Manager</option>
                    <option value="agm">Assistant GM</option>
                    <option value="department_manager">Department Manager</option>
                  </select>
                </div>

                {inviteRole === 'department_manager' && (
                  <div>
                    <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Department</label>
                    <input type="text" value={inviteDept} onChange={e => setInviteDept(e.target.value)} placeholder="e.g. Kitchen, Front of House" required style={{ width: '100%', background: 'var(--bg-card-alt)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 14px', color: '#fff', fontSize: '0.9rem', outline: 'none' }} />
                  </div>
                )}

                <div>
                  <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Location Scope</label>
                  <select value={inviteLocationId} onChange={e => setInviteLocationId(e.target.value)} required style={{ width: '100%', background: 'var(--bg-card-alt)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 14px', color: '#fff', fontSize: '0.9rem', outline: 'none' }}>
                    <option value="">Select Location</option>
                    {locations.filter(l => !l.deleted).map(l => (
                      <option key={l._id} value={l._id}>{l.name}</option>
                    ))}
                  </select>
                </div>

                <button type="submit" className="confirm-btn" style={{ marginTop: 6 }}>Create Invitation</button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Reset Temp Password Modal Display */}
      {resetPwdUserModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => { setResetPwdUserModal(false); setTempResetPwd(''); }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 400, background: '#0D1520', borderRadius: '24px', padding: '24px', border: '1px solid var(--border)', boxShadow: '0 12px 48px rgba(0,0,0,0.6)', textAlign: 'center' }}>
            <h3 style={{ fontWeight: 850, fontSize: '1.1rem', color: '#fff', marginBottom: 12 }}>Password Reset Successfully</h3>
            <div style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#22C55E', borderRadius: 12, padding: 16, border: '1px solid rgba(34,197,94,0.25)', marginBottom: 20 }}>
              <p style={{ fontSize: '0.78rem', margin: 0 }}>Share this temporary password with the user so they can log back in:</p>
              <div style={{ fontSize: '1.25rem', fontFamily: 'monospace', fontWeight: 900, background: '#0D1520', padding: '8px', borderRadius: 8, marginTop: 10, color: '#fff', border: '1px solid var(--border)' }}>
                {tempResetPwd}
              </div>
            </div>
            <button onClick={() => { setResetPwdUserModal(false); setTempResetPwd(''); }} className="confirm-btn">Done</button>
          </div>
        </div>
      )}

      {/* Add Location Modal */}
      {showAddLocModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setShowAddLocModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 400, background: '#0D1520', borderRadius: '24px', padding: '24px', border: '1px solid var(--border)', boxShadow: '0 12px 48px rgba(0,0,0,0.6)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontWeight: 850, fontSize: '1.1rem', color: '#fff' }}>Add New Location</h3>
              <button onClick={() => setShowAddLocModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleAddLocation} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Location Name</label>
                <input type="text" value={newLocName} onChange={e => setNewLocName(e.target.value)} required placeholder="e.g. Airport Terminal 1" style={{ width: '100%', background: 'var(--bg-card-alt)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 14px', color: '#fff', fontSize: '0.9rem', outline: 'none' }} />
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Street Address</label>
                <input type="text" value={newLocAddress} onChange={e => setNewLocAddress(e.target.value)} placeholder="e.g. 100 Main St" style={{ width: '100%', background: 'var(--bg-card-alt)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 14px', color: '#fff', fontSize: '0.9rem', outline: 'none' }} />
              </div>

              <button type="submit" className="confirm-btn" style={{ marginTop: 6 }}>Create Location</button>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .settings-menu-item {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 18px 20px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 16px;
          color: #fff;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
        }
        .settings-menu-item:hover {
          border-color: var(--primary);
          box-shadow: 0 4px 16px rgba(29, 123, 255, 0.06);
        }
        .settings-menu-title {
          display: block;
          font-weight: 800;
          font-size: 0.92rem;
          color: #fff;
        }
        .settings-menu-desc {
          display: block;
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-top: 2px;
        }
      `}</style>
    </>
  );
}

// Quick mockup icons inside page
function MailPinMock({ size, color }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-mail">
      <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
    </svg>
  );
}
