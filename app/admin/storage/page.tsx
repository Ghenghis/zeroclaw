'use client';

import { useEffect, useState, useCallback } from 'react';

interface StorageStats {
  totalUsedMB: number;
  totalCapacityMB: number;
  archiveCount: number;
  oldestArchive: string | null;
  newestArchive: string | null;
  timeWarpActiveSessions: number;
}

interface SiteArchive {
  id: string;
  date: string;
  sizeMB: number;
  theme: string;
  backgroundScene: string;
  buildDurationMs: number;
  qualityScore: number;
  status: 'complete' | 'partial' | 'failed';
}

interface TimeWarpSession {
  sessionId: string;
  targetDate: string;
  visitorIp: string;
  startedAt: string;
  expiresAt: string;
}

const BASE = process.env.NEXT_PUBLIC_API_BASE ?? '';

export default function StoragePage() {
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [archives, setArchives] = useState<SiteArchive[]>([]);
  const [timewarp, setTimewarp] = useState<TimeWarpSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [cleanupStatus, setCleanupStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [cleanupMsg, setCleanupMsg] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [keepCount, setKeepCount] = useState(30);

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, archivesRes, twRes] = await Promise.all([
        fetch(`${BASE}/api/admin/storage/stats`),
        fetch(`${BASE}/api/admin/storage/archives?limit=50`),
        fetch(`${BASE}/api/admin/storage/timewarp`),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (archivesRes.ok) setArchives(await archivesRes.json());
      if (twRes.ok) setTimewarp(await twRes.json());
    } catch (e) {
      console.error('Storage fetch error', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function triggerCleanup(mode: 'prune' | 'emergency') {
    setCleanupStatus('running');
    setCleanupMsg('');
    try {
      const res = await fetch(`${BASE}/api/admin/storage/cleanup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, keepCount: mode === 'prune' ? keepCount : 5 }),
      });
      const data = await res.json();
      if (res.ok) {
        setCleanupStatus('done');
        setCleanupMsg(`Freed ${data.freedMB?.toFixed(1) ?? '?'} MB — removed ${data.removedCount ?? '?'} archives`);
        await fetchData();
      } else {
        setCleanupStatus('error');
        setCleanupMsg(data.error ?? 'Cleanup failed');
      }
    } catch (e: any) {
      setCleanupStatus('error');
      setCleanupMsg(e.message);
    }
  }

  async function deleteArchive(id: string) {
    try {
      const res = await fetch(`${BASE}/api/admin/storage/archives/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setArchives(prev => prev.filter(a => a.id !== id));
        setDeleteTarget(null);
        await fetchData();
      }
    } catch (e) {
      console.error('Delete archive error', e);
    }
  }

  async function expireTimeWarpSession(sessionId: string) {
    try {
      await fetch(`${BASE}/api/admin/storage/timewarp/${sessionId}`, { method: 'DELETE' });
      setTimewarp(prev => prev.filter(s => s.sessionId !== sessionId));
    } catch (e) {
      console.error('Expire session error', e);
    }
  }

  const usedPct = stats ? Math.min(100, (stats.totalUsedMB / stats.totalCapacityMB) * 100) : 0;
  const barColor = usedPct > 85 ? '#ef4444' : usedPct > 60 ? '#f59e0b' : '#22c55e';

  const cardStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: '20px 24px',
    marginBottom: 24,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: 4,
  };

  const valueStyle: React.CSSProperties = {
    fontSize: 28,
    fontWeight: 700,
    color: '#f1f5f9',
  };

  return (
    <main style={{ minHeight: '100vh', background: '#0a0a0f', color: '#f1f5f9', fontFamily: 'system-ui, sans-serif', padding: '40px 32px' }}>
      <a href="/admin" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: 13 }}>← Admin</a>
      <h1 style={{ fontSize: 28, fontWeight: 700, margin: '16px 0 32px', background: 'linear-gradient(135deg,#60a5fa,#818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        Storage Manager
      </h1>

      {loading && <p style={{ color: '#64748b' }}>Loading storage data…</p>}

      {/* Disk Usage */}
      {stats && (
        <div style={cardStyle}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: '#cbd5e1' }}>Disk Usage</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 20, marginBottom: 20 }}>
            <div>
              <div style={labelStyle}>Used</div>
              <div style={{ ...valueStyle, color: barColor }}>{stats.totalUsedMB.toFixed(0)} MB</div>
            </div>
            <div>
              <div style={labelStyle}>Capacity</div>
              <div style={valueStyle}>{stats.totalCapacityMB.toFixed(0)} MB</div>
            </div>
            <div>
              <div style={labelStyle}>Archives</div>
              <div style={valueStyle}>{stats.archiveCount}</div>
            </div>
            <div>
              <div style={labelStyle}>TimeWarp Sessions</div>
              <div style={valueStyle}>{stats.timeWarpActiveSessions}</div>
            </div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 8, height: 12, overflow: 'hidden' }}>
            <div style={{ width: `${usedPct}%`, height: '100%', background: barColor, borderRadius: 8, transition: 'width 0.5s ease' }} />
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>{usedPct.toFixed(1)}% used</div>
        </div>
      )}

      {/* Cleanup Controls */}
      <div style={cardStyle}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: '#cbd5e1' }}>Cleanup Controls</h2>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
          <label style={{ fontSize: 13, color: '#94a3b8' }}>
            Keep newest
            <input
              type="number"
              min={5}
              max={365}
              value={keepCount}
              onChange={e => setKeepCount(Number(e.target.value))}
              style={{ marginLeft: 8, width: 64, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, color: '#f1f5f9', padding: '4px 8px', fontSize: 13 }}
            />
            archives
          </label>
          <button
            onClick={() => triggerCleanup('prune')}
            disabled={cleanupStatus === 'running'}
            style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#3b82f6', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: cleanupStatus === 'running' ? 0.6 : 1 }}
          >
            {cleanupStatus === 'running' ? 'Pruning…' : 'Prune Old Archives'}
          </button>
          <button
            onClick={() => { if (confirm('Emergency cleanup will keep only 5 archives. Continue?')) triggerCleanup('emergency'); }}
            disabled={cleanupStatus === 'running'}
            style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: cleanupStatus === 'running' ? 0.6 : 1 }}
          >
            Emergency Cleanup
          </button>
        </div>
        {cleanupMsg && (
          <p style={{ fontSize: 13, color: cleanupStatus === 'error' ? '#f87171' : '#4ade80', margin: 0 }}>
            {cleanupStatus === 'done' ? '✓ ' : '✗ '}{cleanupMsg}
          </p>
        )}
      </div>

      {/* Archive Browser */}
      <div style={cardStyle}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: '#cbd5e1' }}>Site Archive Browser</h2>
        {archives.length === 0 && !loading && <p style={{ color: '#64748b', fontSize: 13 }}>No archives found.</p>}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                {['Date', 'Theme', 'Background', 'Size', 'Quality', 'Build Time', 'Status', ''].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#64748b', fontWeight: 500, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {archives.map(a => (
                <tr key={a.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '8px 12px', color: '#94a3b8', whiteSpace: 'nowrap' }}>{a.date}</td>
                  <td style={{ padding: '8px 12px', color: '#e2e8f0' }}>{a.theme}</td>
                  <td style={{ padding: '8px 12px', color: '#94a3b8' }}>{a.backgroundScene}</td>
                  <td style={{ padding: '8px 12px', color: '#94a3b8', whiteSpace: 'nowrap' }}>{a.sizeMB.toFixed(1)} MB</td>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{ color: a.qualityScore >= 80 ? '#4ade80' : a.qualityScore >= 60 ? '#fbbf24' : '#f87171', fontWeight: 600 }}>
                      {a.qualityScore}
                    </span>
                  </td>
                  <td style={{ padding: '8px 12px', color: '#64748b', whiteSpace: 'nowrap' }}>{(a.buildDurationMs / 1000).toFixed(1)}s</td>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                      background: a.status === 'complete' ? 'rgba(34,197,94,0.15)' : a.status === 'failed' ? 'rgba(239,68,68,0.15)' : 'rgba(251,191,36,0.15)',
                      color: a.status === 'complete' ? '#4ade80' : a.status === 'failed' ? '#f87171' : '#fbbf24',
                    }}>
                      {a.status}
                    </span>
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <button
                      onClick={() => setDeleteTarget(a.id)}
                      style={{ padding: '3px 10px', borderRadius: 6, border: '1px solid rgba(239,68,68,0.4)', background: 'transparent', color: '#f87171', cursor: 'pointer', fontSize: 12 }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* TimeWarp Sessions */}
      {timewarp.length > 0 && (
        <div style={cardStyle}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: '#cbd5e1' }}>Active TimeWarp Sessions</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  {['Session ID', 'Target Date', 'Visitor IP', 'Started', 'Expires', ''].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#64748b', fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {timewarp.map(s => (
                  <tr key={s.sessionId} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '8px 12px', color: '#818cf8', fontFamily: 'monospace' }}>{s.sessionId.slice(0, 12)}…</td>
                    <td style={{ padding: '8px 12px', color: '#e2e8f0' }}>{s.targetDate}</td>
                    <td style={{ padding: '8px 12px', color: '#64748b', fontFamily: 'monospace' }}>{s.visitorIp}</td>
                    <td style={{ padding: '8px 12px', color: '#94a3b8' }}>{new Date(s.startedAt).toLocaleString()}</td>
                    <td style={{ padding: '8px 12px', color: '#94a3b8' }}>{new Date(s.expiresAt).toLocaleString()}</td>
                    <td style={{ padding: '8px 12px' }}>
                      <button
                        onClick={() => expireTimeWarpSession(s.sessionId)}
                        style={{ padding: '3px 10px', borderRadius: 6, border: '1px solid rgba(239,68,68,0.4)', background: 'transparent', color: '#f87171', cursor: 'pointer', fontSize: 12 }}
                      >
                        Expire
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1e1e2e', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 16, padding: 32, maxWidth: 400, width: '90%' }}>
            <h3 style={{ margin: '0 0 12px', color: '#f1f5f9' }}>Delete Archive?</h3>
            <p style={{ color: '#94a3b8', fontSize: 14, margin: '0 0 24px' }}>
              This will permanently remove archive <code style={{ color: '#818cf8' }}>{deleteTarget}</code> and all its files. This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => deleteArchive(deleteTarget)}
                style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', fontWeight: 600 }}
              >
                Delete
              </button>
              <button
                onClick={() => setDeleteTarget(null)}
                style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: '#94a3b8', cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
