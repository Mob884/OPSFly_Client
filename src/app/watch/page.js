"use client";
import { useState, useEffect, useCallback } from 'react';
import { Watch, Loader2, Trash2 } from 'lucide-react';
import Header from '@/src/components/Header';
import { createWatchPairingCode, getWatchDevices, revokeWatchDevice } from '@/src/services/api';

// M5: pair an Apple Watch. The code is typed on the watch; the watch is bound
// to the location currently selected in the app.
export default function WatchPage() {
  const [pairing, setPairing] = useState(null);
  const [devices, setDevices] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try { setDevices(await getWatchDevices()); } catch { /* list is optional */ }
  }, []);
  useEffect(() => { load(); }, [load]);

  const generate = async () => {
    setBusy(true); setError('');
    try { setPairing(await createWatchPairingCode()); }
    catch (e) { setError(e.response?.data?.error || 'Could not create a code. Try again.'); }
    finally { setBusy(false); }
  };

  const unpair = async (id) => {
    await revokeWatchDevice(id);
    load();
  };

  return (
    <>
      <Header showBack title="Apple Watch" />
      <main className="page">
        <div className="transcript-card">
          <div className="transcript-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Watch size={13} /> Voice notes from your wrist</div>
          <p className="transcript-text" style={{ fontSize: '0.9rem' }}>
            Open OpsFly on your Apple Watch, tap Pair, and type the code below. Notes you dictate on the watch go through
            the same AI analysis, tasks and memory as notes from the app.
          </p>
        </div>

        <button className="confirm-btn" onClick={generate} disabled={busy} style={{ marginTop: 8 }}>
          {busy ? <Loader2 size={20} className="spinner" /> : <Watch size={20} />}
          {pairing ? 'Generate a new code' : 'Get pairing code'}
        </button>
        {error && <p style={{ color: '#EF4444', fontSize: '0.85rem', marginTop: 10 }}>{error}</p>}

        {pairing && (
          <div className="transcript-card" style={{ textAlign: 'center', marginTop: 16 }}>
            <div className="transcript-label">Type this on your watch</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '0.12em', margin: '8px 0' }} data-testid="pairing-code">{pairing.code}</div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Valid for 10 minutes{pairing.locationName ? ` · notes go to ${pairing.locationName}` : ''}
            </p>
          </div>
        )}

        <h3 style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '24px 0 12px' }}>
          Paired watches ({devices.length})
        </h3>
        {devices.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No watch is paired yet.</p>
        ) : (
          devices.map((d) => (
            <div key={d._id} className="transcript-card" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>{d.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Paired {new Date(d.createdAt).toLocaleDateString()}{d.lastUsedAt ? ` · last note ${new Date(d.lastUsedAt).toLocaleString()}` : ''}
                </div>
              </div>
              <button onClick={() => unpair(d._id)} aria-label="Unpair watch" style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', display: 'flex' }}>
                <Trash2 size={18} />
              </button>
            </div>
          ))
        )}
      </main>
    </>
  );
}
