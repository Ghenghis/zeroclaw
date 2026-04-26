'use client';

import { useState, useEffect, useCallback } from 'react';

interface SchedulerConfig {
  cronExpression: string;
  timezone: string;
  enabled: boolean;
  lastRun: string | null;
  nextRun: string | null;
  status: 'idle' | 'running' | 'error';
  recentRuns: Array<{
    id: string;
    startedAt: string;
    completedAt: string | null;
    status: 'success' | 'failed' | 'running';
    stage: string;
    error?: string;
  }>;
}

const LABEL: React.CSSProperties = { fontSize: 12, color: '#8899bb', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, display: 'block' };
const INPUT: React.CSSProperties = { width: '100%', padding: '10px 12px', background: '#0d1628', border: '1px solid #2a3a5a', borderRadius: 8, color: '#e0e8ff', fontFamily: 'monospace', fontSize: 14, outline: 'none' };
const BTN = (color: string): React.CSSProperties => ({
  padding: '10px 20px', background: 'transparent',
  border: `1px solid ${color}`, borderRadius: 8,
  color, fontWeight: 600, fontSize: 13, cursor: 'pointer',
  transition: 'background 0.2s',
});
const CARD: React.CSSProperties = { background: '#0d1628', border: '1px solid #1e2d4a', borderRadius: 12, padding: 24, marginBottom: 20 };

const STATUS_COLORS: Record<string, string> = {
  success: '#00ff88', failed: '#ff4444', running: '#ffaa00', idle: '#8899bb',
};

export default function SchedulerPage() {
  const [config, setConfig]   = useState<SchedulerConfig | null>(null);
  const [cron, setCron]       = useState('');
  const [tz, setTz]           = useState('');
  const [saving, setSaving]   = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [msg, setMsg]         = useState<{ text: string; ok: boolean } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/scheduler');
      if (res.ok) {
        const data: SchedulerConfig = await res.json();
        setConfig(data);
        setCron(data.cronExpression);
        setTz(data.timezone);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 10000); return () => clearInterval(t); }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/scheduler', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cronExpression: cron, timezone: tz }),
      });
      const data = await res.json();
      if (res.ok) { setMsg({ text: '✓ Schedule updated', ok: true }); load(); }
      else         { setMsg({ text: data.error ?? 'Update failed', ok: false }); }
    } catch { setMsg({ text: 'Network error', ok: false }); }
    setSaving(false);
    setTimeout(() => setMsg(null), 4000);
  };

  const trigger = async () => {
    setTriggering(true);
    try {
      const res = await fetch('/api/admin/scheduler/trigger', { method: 'POST' });
      const data = await res.json();
      if (res.ok) { setMsg({ text: '✓ Rebuild triggered', ok: true }); load(); }
      else         { setMsg({ text: data.error ?? 'Trigger failed', ok: false }); }
    } catch { setMsg({ text: 'Network error', ok: false }); }
    setTriggering(false);
    setTimeout(() => setMsg(null), 4000);
  };

  return (
    <main style={{ minHeight: '100vh', background: '#080c18', color: '#e0e8ff', fontFamily: 'system-ui, sans-serif', padding: '40px 24px' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 4px', color: '#00d4ff' }}>⏰ Scheduler</h1>
        <p style={{ color: '#8899bb', marginBottom: 32 }}>Configure daily site recreation schedule.</p>

        {/* Status banner */}
        {config && (
          <div style={{ ...CARD, borderColor: STATUS_COLORS[config.status] + '55', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {[
              { label: 'Status',   value: config.status.toUpperCase(), color: STATUS_COLORS[config.status] },
              { label: 'Last Run', value: config.lastRun ? new Date(config.lastRun).toLocaleString() : '—' },
              { label: 'Next Run', value: config.nextRun ? new Date(config.nextRun).toLocaleString() : '—' },
              { label: 'Schedule', value: config.cronExpression, mono: true },
            ].map(item => (
              <div key={item.label}>
                <span style={LABEL}>{item.label}</span>
                <div style={{ fontSize: 14, color: item.color ?? '#e0e8ff', fontFamily: item.mono ? 'monospace' : undefined }}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Config form */}
        <div style={CARD}>
          <h2 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 20px', color: '#c8d8ff' }}>Configuration</h2>
          <div style={{ marginBottom: 16 }}>
            <label style={LABEL}>Cron Expression</label>
            <input
              style={INPUT}
              value={cron}
              onChange={e => setCron(e.target.value)}
              placeholder="0 3 * * *"
              spellCheck={false}
            />
            <div style={{ fontSize: 11, color: '#8899bb', marginTop: 4 }}>
              Default: <code style={{ color: '#00d4ff' }}>0 3 * * *</code> — 3:00 AM daily
            </div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={LABEL}>Timezone</label>
            <input
              style={INPUT}
              value={tz}
              onChange={e => setTz(e.target.value)}
              placeholder="America/New_York"
              spellCheck={false}
            />
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <button style={BTN('#00d4ff')} onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save Schedule'}
            </button>
            <button style={BTN('#ff6600')} onClick={trigger} disabled={triggering || config?.status === 'running'}>
              {triggering ? 'Triggering…' : '▶ Rebuild Now'}
            </button>
            {msg && (
              <span style={{ fontSize: 13, color: msg.ok ? '#00ff88' : '#ff4444' }}>{msg.text}</span>
            )}
          </div>
        </div>

        {/* Recent runs */}
        {config?.recentRuns && config.recentRuns.length > 0 && (
          <div style={CARD}>
            <h2 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 16px', color: '#c8d8ff' }}>Recent Runs</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {config.recentRuns.map(run => (
                <div key={run.id} style={{
                  display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap',
                  padding: '10px 12px', background: '#080c18', borderRadius: 8,
                  border: `1px solid ${STATUS_COLORS[run.status]}33`,
                }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS[run.status], flexShrink: 0, display: 'inline-block' }} />
                  <span style={{ fontSize: 12, color: '#8899bb', fontFamily: 'monospace' }}>
                    {new Date(run.startedAt).toLocaleString()}
                  </span>
                  <span style={{ fontSize: 12, color: STATUS_COLORS[run.status], fontWeight: 600 }}>
                    {run.status.toUpperCase()}
                  </span>
                  <span style={{ fontSize: 12, color: '#c8d8ff' }}>{run.stage}</span>
                  {run.error && <span style={{ fontSize: 11, color: '#ff6666' }}>{run.error}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
