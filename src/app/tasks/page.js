"use client";
import { useState, useEffect, useCallback } from 'react';
import {
  Users, DollarSign, Wrench, AlertTriangle,
  CheckCircle2, RotateCcw, Trash2, Plus,
  Loader2, ClipboardList, X, ChevronDown, UserCheck
} from 'lucide-react';
import Header from '@/src/components/Header';
import { getTasks, createTask, completeTask, reopenTask, deleteTask, assignTask } from '@/src/services/api';
import { useAuth } from '@/src/context/AuthContext';
import axios from 'axios';

// ── Helpers ──────────────────────────────────────────────────────────────────
const PRIORITY_CONFIG = {
  High:   { color: '#EF4444', bg: 'rgba(239,68,68,0.12)',  dot: '#EF4444' },
  Medium: { color: '#FF8A00', bg: 'rgba(255,138,0,0.12)',  dot: '#FF8A00' },
  Low:    { color: '#22C55E', bg: 'rgba(34,197,94,0.12)',  dot: '#22C55E' },
};

const ISSUE_ICONS = {
  Staffing:    <Users size={15} />,
  'Cost Risk': <DollarSign size={15} />,
  Maintenance: <Wrench size={15} />,
};

function formatDue(date) {
  if (!date) return '';
  const d = new Date(date);
  const isToday = d.toDateString() === new Date().toDateString();
  return isToday
    ? `Due Today, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : `Due ${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
}

// ── TaskCard ──────────────────────────────────────────────────────────────────
function TaskCard({ task, userRole, onComplete, onReopen, onDelete, onOpenAssign, actionPending }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const cfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.Medium;
  const done = task.status === 'completed';
  const loading = actionPending === task._id;

  // Only owner, district_manager, gm, agm can assign tasks
  const canAssign = ['owner', 'district_manager', 'gm', 'agm', 'Manager'].includes(userRole);

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: `1px solid ${done ? 'var(--border)' : cfg.color + '30'}`,
      borderRadius: '16px', padding: '14px 16px',
      display: 'flex', alignItems: 'flex-start', gap: '12px',
      position: 'relative',
      opacity: loading ? 0.6 : 1,
      transition: 'opacity 0.2s',
    }}>
      {/* Priority dot */}
      <div style={{
        width: 10, height: 10, borderRadius: '50%',
        background: done ? 'var(--text-muted)' : cfg.dot,
        marginTop: 5, flexShrink: 0,
        boxShadow: done ? 'none' : `0 0 6px ${cfg.dot}80`,
      }} />

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontWeight: 600, fontSize: '0.9rem',
          textDecoration: done ? 'line-through' : 'none',
          color: done ? 'var(--text-muted)' : '#fff',
          marginBottom: 6,
        }}>{task.title}</div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
          <span style={{
            fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase',
            padding: '2px 8px', borderRadius: 4,
            background: cfg.bg, color: cfg.color,
          }}>{task.priority}</span>

          {task.sourceIssueType && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
              {ISSUE_ICONS[task.sourceIssueType] || <AlertTriangle size={13} />}
              {task.sourceIssueType}
            </span>
          )}

          {!done ? (
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {formatDue(task.dueDate)}
            </span>
          ) : (
            <span style={{ fontSize: '0.72rem', color: '#22C55E' }}>
              ✓ {task.completedAt ? new Date(task.completedAt).toLocaleDateString() : 'Completed'}
            </span>
          )}
        </div>

        {/* Assignment details */}
        {(task.assignedTo || task.assignedBy) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
            {task.assignedTo && (
              <span style={{
                fontSize: '0.7rem',
                fontWeight: '800',
                background: 'rgba(29, 123, 255, 0.1)',
                color: 'var(--primary)',
                padding: '2px 8px',
                borderRadius: '6px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <Users size={11} />
                Assigned to: {task.assignedTo.name}
              </span>
            )}
            {task.assignedBy && (
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                assigned by {task.assignedBy.name}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Action menu */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <button
          onClick={() => setMenuOpen(p => !p)}
          disabled={loading}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: loading ? 'not-allowed' : 'pointer', padding: '2px 4px' }}
        >
          {loading ? <Loader2 size={16} className="spinner" /> : <ChevronDown size={16} />}
        </button>

        {menuOpen && !loading && (
          <>
            {/* Backdrop */}
            <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 49 }} />
            <div style={{
              position: 'absolute', right: 0, top: '100%', zIndex: 50,
              background: '#1A2535', border: '1px solid var(--border)',
              borderRadius: 12, padding: '6px 0', minWidth: 170,
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}>
              {done ? (
                <button className="menu-item" onClick={() => { onReopen(task._id); setMenuOpen(false); }}>
                  <RotateCcw size={14} /> Reopen Task
                </button>
              ) : (
                <button className="menu-item green" onClick={() => { onComplete(task._id); setMenuOpen(false); }}>
                  <CheckCircle2 size={14} /> Mark Complete
                </button>
              )}
              {canAssign && (
                <button className="menu-item" onClick={() => { onOpenAssign(task); setMenuOpen(false); }}>
                  <UserCheck size={14} /> Assign Task
                </button>
              )}
              <button className="menu-item red" onClick={() => { onDelete(task._id); setMenuOpen(false); }}>
                <Trash2 size={14} /> Delete Task
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Add Task Modal ─────────────────────────────────────────────────────────────
function AddTaskModal({ onClose, onSave, users, userRole }) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [assignedTo, setAssignedTo] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const canAssign = ['owner', 'district_manager', 'gm', 'agm', 'Manager'].includes(userRole);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError('');
    try {
      await onSave({ title: title.trim(), priority, assignedTo: assignedTo || undefined });
      onClose();
    } catch (err) {
      setError('Failed to create task. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={onClose}
    >
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 430, background: '#0D1520',
        borderRadius: '24px 24px 0 0', padding: '24px 24px 40px',
        border: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontWeight: 800, fontSize: '1.1rem' }}>Add Task</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>
              Task Title
            </label>
            <input
              autoFocus value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Review staffing schedule"
              style={{
                width: '100%', background: 'var(--bg-card-alt)',
                border: '1px solid var(--border)', borderRadius: 12,
                padding: '12px 16px', color: '#fff', fontSize: '0.95rem',
                outline: 'none', fontFamily: 'inherit',
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>
              Priority
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['High', 'Medium', 'Low'].map(p => {
                const cfg = PRIORITY_CONFIG[p];
                const active = priority === p;
                return (
                  <button key={p} type="button" onClick={() => setPriority(p)} style={{
                    flex: 1, padding: '10px 0', borderRadius: 10, fontWeight: 700,
                    fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.15s',
                    background: active ? cfg.bg : 'var(--bg-card-alt)',
                    color: active ? cfg.color : 'var(--text-muted)',
                    border: active ? `1px solid ${cfg.color}60` : '1px solid var(--border)',
                  }}>{p}</button>
                );
              })}
            </div>
          </div>

          {canAssign && (
            <div>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>
                Assign To (Optional)
              </label>
              <select
                value={assignedTo}
                onChange={e => setAssignedTo(e.target.value)}
                style={{
                  width: '100%', background: 'var(--bg-card-alt)',
                  border: '1px solid var(--border)', borderRadius: 12,
                  padding: '12px 16px', color: '#fff', fontSize: '0.95rem',
                  outline: 'none', fontFamily: 'inherit',
                }}
              >
                <option value="">Unassigned</option>
                {users.map(u => (
                  <option key={u._id} value={u._id}>{u.name} ({u.role.replace('_', ' ')})</option>
                ))}
              </select>
            </div>
          )}

          {error && <p style={{ color: '#EF4444', fontSize: '0.85rem' }}>{error}</p>}

          <button type="submit" disabled={!title.trim() || saving} className="confirm-btn" style={{ marginTop: 4 }}>
            {saving ? <Loader2 size={18} className="spinner" /> : <Plus size={18} />}
            {saving ? 'Adding...' : 'Add Task'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Assign Task Picker Modal ────────────────────────────────────────────────────
function AssignTaskModal({ task, users, onClose, onAssign }) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={onClose}
    >
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 400, background: '#0D1520',
        borderRadius: '24px', padding: '24px',
        border: '1px solid var(--border)',
        boxShadow: '0 12px 48px rgba(0,0,0,0.6)',
        display: 'flex',
        flexDirection: 'column',
        gap: 16
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontWeight: 850, fontSize: '1.1rem', color: '#fff' }}>Assign Task</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: -6 }}>
          Select a location team member to assign this task:
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '250px', overflowY: 'auto', paddingRight: '4px' }}>
          {users.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', textAlign: 'center', padding: '16px' }}>
              No location members available.
            </p>
          ) : (
            users.map(u => {
              const active = task.assignedTo?._id === u._id;
              return (
                <button
                  key={u._id}
                  onClick={() => {
                    onAssign(task._id, u._id);
                    onClose();
                  }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    border: `1px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
                    background: active ? 'rgba(29, 123, 255, 0.08)' : 'var(--bg-card)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    textAlign: 'left'
                  }}
                >
                  <span style={{ fontWeight: 750, color: '#fff', fontSize: '0.9rem' }}>{u.name}</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px', textTransform: 'capitalize' }}>
                    {u.role.replace('_', ' ')} {u.department ? `• ${u.department}` : ''}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {task.assignedTo && (
          <button
            onClick={() => {
              onAssign(task._id, null);
              onClose();
            }}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '12px',
              border: '1px solid rgba(255, 77, 106, 0.3)',
              background: 'rgba(255, 77, 106, 0.08)',
              color: 'var(--staffing)',
              fontWeight: 800,
              fontSize: '0.88rem',
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
          >
            Clear Assignment
          </button>
        )}
      </div>
    </div>
  );
}

// ── Tasks Page ─────────────────────────────────────────────────────────────────
export default function TasksPage() {
  const { user, currentLocationId } = useAuth();
  const [tasks, setTasks]       = useState([]);
  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState('open');
  const [showModal, setShowModal] = useState(false);
  const [assignTargetTask, setAssignTargetTask] = useState(null);
  const [actionPending, setActionPending] = useState(null); // task id being mutated
  const [error, setError]       = useState('');

  const loadTasks = useCallback(async () => {
    if (!currentLocationId) return;
    try {
      setLoading(true);
      const data = await getTasks(true); // force re-fetch from backend scoped by location
      setTasks(data);
    } catch (err) {
      console.error('Failed to load tasks', err);
      setError('Failed to load tasks.');
    } finally {
      setLoading(false);
    }
  }, [currentLocationId]);

  const loadUsers = useCallback(async () => {
    if (!currentLocationId) return;
    try {
      const storedToken = localStorage.getItem('opsfly_token');
      const res = await axios.get('/api/users', {
        headers: { Authorization: `Bearer ${storedToken}` }
      });
      // Filter users list to show only those belonging to the active location (if not filtered by backend)
      const list = res.data || [];
      const localUsers = list.filter(u => 
        u.locationIds?.includes(currentLocationId)
      );
      setUsers(localUsers.length > 0 ? localUsers : list);
    } catch (err) {
      console.warn('Failed to load users for assignment', err);
    }
  }, [currentLocationId]);

  useEffect(() => {
    loadTasks();
    loadUsers();
  }, [loadTasks, loadUsers]);

  // ── Complete — with rollback on failure ──────────────────────────────────
  const handleComplete = async (id) => {
    const prev = tasks;
    setActionPending(id);
    setTasks(t => t.map(x => x._id === id ? { ...x, status: 'completed', completedAt: new Date() } : x));
    try {
      const updated = await completeTask(id);
      setTasks(t => t.map(x => x._id === id ? updated : x));
    } catch (err) {
      setTasks(prev);
      setError('Failed to complete task. Please try again.');
      setTimeout(() => setError(''), 3000);
    } finally {
      setActionPending(null);
    }
  };

  // ── Reopen — with rollback ───────────────────────────────────────────────
  const handleReopen = async (id) => {
    const prev = tasks;
    setActionPending(id);
    setTasks(t => t.map(x => x._id === id ? { ...x, status: 'open', completedAt: null } : x));
    try {
      const updated = await reopenTask(id);
      setTasks(t => t.map(x => x._id === id ? updated : x));
    } catch (err) {
      setTasks(prev);
      setError('Failed to reopen task. Please try again.');
      setTimeout(() => setError(''), 3000);
    } finally {
      setActionPending(null);
    }
  };

  // ── Delete — with rollback ───────────────────────────────────────────────
  const handleDelete = async (id) => {
    const prev = tasks;
    setActionPending(id);
    setTasks(t => t.filter(x => x._id !== id));
    try {
      await deleteTask(id);
    } catch (err) {
      setTasks(prev);
      setError('Failed to delete task. Please try again.');
      setTimeout(() => setError(''), 3000);
    } finally {
      setActionPending(null);
    }
  };

  // ── Assign — with rollback ───────────────────────────────────────────────
  const handleAssign = async (taskId, assignedToUserId) => {
    const prev = tasks;
    setActionPending(taskId);
    try {
      const updated = await assignTask(taskId, assignedToUserId);
      setTasks(t => t.map(x => x._id === taskId ? updated : x));
    } catch (err) {
      setTasks(prev);
      setError('Failed to assign task. Please try again.');
      setTimeout(() => setError(''), 3000);
    } finally {
      setActionPending(null);
    }
  };

  // ── Add task ─────────────────────────────────────────────────────────────
  const handleAddTask = async (data) => {
    const newTask = await createTask(data);
    setTasks(prev => {
      const updated = [newTask, ...prev];
      const order = { High: 0, Medium: 1, Low: 2 };
      return updated.sort((a, b) => (order[a.priority] ?? 3) - (order[b.priority] ?? 3) || new Date(b.createdAt) - new Date(a.createdAt));
    });
  };

  // ── Derived state ─────────────────────────────────────────────────────────
  const openTasks      = tasks.filter(t => t.status === 'open');
  const completedTasks = tasks.filter(t => t.status === 'completed');
  const grouped = { High: [], Medium: [], Low: [] };
  openTasks.forEach(t => { if (grouped[t.priority]) grouped[t.priority].push(t); });

  return (
    <>
      <Header title="Tasks" />
      <main className="page" style={{ gap: 0, paddingTop: 16 }}>

        {/* Error banner */}
        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 10, padding: '10px 14px', marginBottom: 12,
            fontSize: '0.875rem', color: '#EF4444',
          }}>{error}</div>
        )}

        {/* Tab switcher */}
        <div style={{
          display: 'flex', background: 'var(--bg-card)',
          borderRadius: 12, padding: 4, marginBottom: 20,
          border: '1px solid var(--border)',
        }}>
          {[
            { key: 'open',      label: 'Open',      count: openTasks.length },
            { key: 'completed', label: 'Completed',  count: completedTasks.length },
          ].map(({ key, label, count }) => (
            <button key={key} onClick={() => setTab(key)} style={{
              flex: 1, padding: '10px 0', borderRadius: 9,
              fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer',
              border: 'none', transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              background: tab === key ? 'var(--primary)' : 'transparent',
              color: tab === key ? '#fff' : 'var(--text-muted)',
            }}>
              {label}
              <span style={{
                background: tab === key ? 'rgba(255,255,255,0.2)' : 'var(--bg-card-alt)',
                borderRadius: 6, padding: '1px 7px', fontSize: '0.75rem',
              }}>{count}</span>
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '60px 0' }}>
            <Loader2 size={32} className="spinner" color="var(--primary)" />
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading tasks...</p>
          </div>
        )}

        {/* Open tasks */}
        {!loading && tab === 'open' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {openTasks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 24px', background: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--border)' }}>
                <ClipboardList size={40} color="var(--text-muted)" style={{ marginBottom: 12 }} />
                <p style={{ fontWeight: 700, marginBottom: 6 }}>All clear!</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No open tasks. Looking good!</p>
              </div>
            ) : (
              ['High', 'Medium', 'Low'].map(priority => {
                const group = grouped[priority];
                if (!group.length) return null;
                const cfg = PRIORITY_CONFIG[priority];
                return (
                  <div key={priority}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.dot, boxShadow: `0 0 6px ${cfg.dot}` }} />
                      <span style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: cfg.color }}>
                        {priority} Priority
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({group.length})</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {group.map(task => (
                        <TaskCard
                          key={task._id}
                          task={task}
                          userRole={user?.role}
                          onComplete={handleComplete}
                          onReopen={handleReopen}
                          onDelete={handleDelete}
                          onOpenAssign={setAssignTargetTask}
                          actionPending={actionPending}
                        />
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Completed tasks */}
        {!loading && tab === 'completed' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {completedTasks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 24px', background: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--border)' }}>
                <CheckCircle2 size={40} color="var(--text-muted)" style={{ marginBottom: 12 }} />
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No completed tasks yet.</p>
              </div>
            ) : (
              completedTasks.map(task => (
                <TaskCard
                  key={task._id}
                  task={task}
                  userRole={user?.role}
                  onComplete={handleComplete}
                  onReopen={handleReopen}
                  onDelete={handleDelete}
                  onOpenAssign={setAssignTargetTask}
                  actionPending={actionPending}
                />
              ))
            )}
          </div>
        )}
      </main>

      {/* Add Task FAB */}
      <button
        onClick={() => setShowModal(true)}
        style={{
          position: 'fixed', bottom: 'calc(var(--nav-height) + 20px)',
          left: '50%', transform: 'translateX(-50%)',
          maxWidth: 390, width: 'calc(100% - 48px)',
          background: 'var(--primary)', color: '#fff',
          border: 'none', borderRadius: 14, padding: '14px 20px',
          fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          boxShadow: '0 8px 24px rgba(29,123,255,0.4)', zIndex: 100, fontFamily: 'inherit',
        }}
      >
        <Plus size={20} /> Add Task
      </button>

      {showModal && (
        <AddTaskModal
          onClose={() => setShowModal(false)}
          onSave={handleAddTask}
          users={users}
          userRole={user?.role}
        />
      )}

      {assignTargetTask && (
        <AssignTaskModal
          task={assignTargetTask}
          users={users}
          onClose={() => setAssignTargetTask(null)}
          onAssign={handleAssign}
        />
      )}

      <style>{`
        .menu-item {
          display: flex; align-items: center; gap: 10px;
          width: 100%; padding: 10px 16px; background: none; border: none;
          color: #fff; font-size: 0.875rem; font-weight: 600;
          cursor: pointer; font-family: inherit; text-align: left;
        }
        .menu-item:hover { background: rgba(255,255,255,0.05); }
        .menu-item.green { color: #22C55E; }
        .menu-item.red { color: #EF4444; }
      `}</style>
    </>
  );
}
