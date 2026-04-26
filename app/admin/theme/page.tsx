'use client';

import { useEffect, useState, useCallback } from 'react';

type BackgroundScene =
  | 'deep_space' | 'nebula_bloom' | 'galaxy_core' | 'binary_star' | 'supernova'
  | 'starfield_only' | 'commit_comets' | 'cherry_blossoms' | 'fireflies'
  | 'ocean_reef' | 'fireworks' | 'matrix_rain' | 'neon_city' | 'cyberpunk'
  | 'northern_lights' | 'snowfall' | 'gradient_flow' | 'static_gradient';

interface ThemeOverrideState {
  pinnedTheme: string | null;
  pinnedBackground: BackgroundScene | null;
  adminLocked: boolean;
  pinnedUntil: string | null;
  availableThemes: string[];
  currentTheme: string;
  currentBackground: BackgroundScene;
}

const SCENE_LABELS: Record<BackgroundScene, string> = {
  deep_space: '🌌 Deep Space',
  nebula_bloom: '🌸 Nebula Bloom',
  galaxy_core: '✨ Galaxy Core',
  binary_star: '⭐ Binary Star',
  supernova: '💥 Supernova',
  starfield_only: '⬛ Starfield Only',
  commit_comets: '☄️ Commit Comets',
  cherry_blossoms: '🌸 Cherry Blossoms',
  fireflies: '✨ Fireflies',
  ocean_reef: '🐠 Ocean Reef',
  fireworks: '🎆 Fireworks',
  matrix_rain: '💻 Matrix Rain',
  neon_city: '🏙️ Neon City',
  cyberpunk: '🤖 Cyberpunk',
  northern_lights: '🌈 Northern Lights',
  snowfall: '❄️ Snowfall',
  gradient_flow: '🎨 Gradient Flow',
  static_gradient: '🖼️ Static Gradient',
};

const BASE = process.env.NEXT_PUBLIC_API_BASE ?? '';

export default function ThemeOverridePage() {
  const [state, setState] = useState<ThemeOverrideState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [saveMsg, setSaveMsg] = useState('');

  // Local draft state
  const [draftTheme, setDraftTheme] = useState<string>('');
  const [draftBackground, setDraftBackground] = useState<BackgroundScene | ''>('');
  const [draftLocked, setDraftLocked] = useState(false);
  const [draftPinDays, setDraftPinDays] = useState(1);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/api/admin/theme`);
      if (res.ok) {
        const data: ThemeOverrideState = await res.json();
        setState(data);
        setDraftTheme(data.pinnedTheme ?? '');
        setDraftBackground(data.pinnedBackground ?? '');
        setDraftLocked(data.adminLocked);
      }
    } catch (e) {
      console.error('Theme fetch error', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  async function saveOverrides() {
    setSaving(true);
    setSaveStatus('idle');
    try {
      const res = await fetch(`${BASE}/api/admin/theme`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pinnedTheme: draftTheme || null,
          pinnedBackground: draftBackground || null,
          adminLocked: draftLocked,
          pinDays: draftPinDays,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSaveStatus('saved');
        setSaveMsg('Overrides saved — will apply at next build cycle');
        await fetchState();
      } else {
        setSaveStatus('error');
        setSaveMsg(data.error ?? 'Save failed');
      }
    } catch (e: any) {
      setSaveStatus('error');
      setSaveMsg(e.message);
    } finally {
      setSaving(false);
      setTimeout(() => setSaveStatus('idle'), 4000);
    }
  }

  async function clearAll() {
    if (!confirm('Clear all theme overrides and release admin lock?')) return;
    setSaving(true);
    try {
      const res = await fetch(`${BASE}/api/admin/theme`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setSaveStatus('saved');
        setSaveMsg('All overrides cleared — AI will choose freely again');
        setDraftTheme('');
        setDraftBackground('');
        setDraftLocked(false);
        await fetchState();
      }
    } catch (e) {
      console.error('Clear error', e);
    } finally {
      setSaving(false);
      setTimeout(() => setSaveStatus('idle'), 4000);
    }
  }

  const cardStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: '20px 24px',
    marginBottom: 24,
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 8,
    color: '#f1f5f9',
    padding: '10px 14px',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
  };

  return (
    <main style={{ minHeight: '100vh', background: '#0a0a0f', color: '#f1f5f9', fontFamily: 'system-ui, sans-serif', padding: '40px 32px' }}>
      <a href="/admin" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: 13 }}>← Admin</a>
      <h1 style={{ fontSize: 28, fontWeight: 700, margin: '16px 0 8px', background: 'linear-gradient(135deg,#a78bfa,#ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        Theme Override Panel
      </h1>
      <p style={{ color: '#64748b', fontSize: 14, marginBottom: 32 }}>
        Pin a specific theme or background scene for upcoming build cycles. Admin lock prevents AI from overriding your selection.
      </p>

      {loading && <p style={{ color: '#64748b' }}>Loading theme state…</p>}

      {/* Current State Banner */}
      {state && (
        <div style={{ ...cardStyle, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)' }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#a5b4fc' }}>Current Live State</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>ACTIVE THEME</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#e2e8f0' }}>{state.currentTheme || '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>ACTIVE BACKGROUND</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#e2e8f0' }}>{SCENE_LABELS[state.currentBackground] ?? state.currentBackground}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>PINNED THEME</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: state.pinnedTheme ? '#818cf8' : '#334155' }}>
                {state.pinnedTheme ?? 'None (AI choice)'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>ADMIN LOCK</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: state.adminLocked ? '#f87171' : '#4ade80' }}>
                {state.adminLocked ? '🔒 Locked' : '🔓 Unlocked'}
              </div>
            </div>
            {state.pinnedUntil && (
              <div>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>PIN EXPIRES</div>
                <div style={{ fontSize: 14, color: '#94a3b8' }}>{new Date(state.pinnedUntil).toLocaleDateString()}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Theme Pin */}
      <div style={cardStyle}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20, color: '#cbd5e1' }}>Pin Theme</h2>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Theme Name</label>
          <select
            value={draftTheme}
            onChange={e => setDraftTheme(e.target.value)}
            style={inputStyle}
          >
            <option value="">— AI chooses automatically —</option>
            {state?.availableThemes.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
            {/* Common fallback themes if API not ready */}
            {(!state || state.availableThemes.length === 0) && [
              'midnight-terminal', 'aurora-borealis', 'solar-flare', 'deep-ocean',
              'cherry-blossom', 'neon-tokyo', 'desert-storm', 'arctic-void',
              'ancient-forest', 'lava-flow', 'nebula-drift', 'coral-reef',
            ].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <div style={{ fontSize: 12, color: '#475569', marginTop: 6 }}>
            Leave blank to let the AI select each build cycle
          </div>
        </div>
      </div>

      {/* Background Pin */}
      <div style={cardStyle}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20, color: '#cbd5e1' }}>Force Background Scene</h2>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Background Scene</label>
          <select
            value={draftBackground}
            onChange={e => setDraftBackground(e.target.value as BackgroundScene)}
            style={inputStyle}
          >
            <option value="">— AI chooses automatically —</option>
            {(Object.entries(SCENE_LABELS) as [BackgroundScene, string][]).map(([scene, label]) => (
              <option key={scene} value={scene}>{label}</option>
            ))}
          </select>
          <div style={{ fontSize: 12, color: '#475569', marginTop: 6 }}>
            Overrides the AI&apos;s background selection for upcoming build cycles
          </div>
        </div>
      </div>

      {/* Admin Lock + Pin Duration */}
      <div style={cardStyle}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20, color: '#cbd5e1' }}>Lock Settings</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div>
            <label style={labelStyle}>Pin Duration (days)</label>
            <input
              type="number"
              min={1}
              max={90}
              value={draftPinDays}
              onChange={e => setDraftPinDays(Number(e.target.value))}
              style={{ ...inputStyle, width: 'auto', minWidth: 80 }}
            />
            <div style={{ fontSize: 12, color: '#475569', marginTop: 6 }}>How long the pin stays active</div>
          </div>
          <div>
            <label style={labelStyle}>Admin Lock</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginTop: 4 }}>
              <div
                onClick={() => setDraftLocked(!draftLocked)}
                style={{
                  width: 44, height: 24, borderRadius: 12,
                  background: draftLocked ? '#818cf8' : 'rgba(255,255,255,0.1)',
                  position: 'relative', cursor: 'pointer', transition: 'background 0.2s',
                  border: '1px solid rgba(255,255,255,0.15)',
                }}
              >
                <div style={{
                  position: 'absolute', top: 2, left: draftLocked ? 20 : 2,
                  width: 18, height: 18, borderRadius: '50%',
                  background: '#fff', transition: 'left 0.2s',
                }} />
              </div>
              <span style={{ fontSize: 14, color: draftLocked ? '#a5b4fc' : '#64748b' }}>
                {draftLocked ? '🔒 Locked — AI cannot override' : '🔓 Unlocked — AI can choose freely'}
              </span>
            </label>
            <div style={{ fontSize: 12, color: '#475569', marginTop: 8 }}>
              When locked, the AI pipeline skips theme and background selection
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={saveOverrides}
          disabled={saving}
          style={{
            padding: '12px 28px', borderRadius: 10, border: 'none',
            background: 'linear-gradient(135deg,#7c3aed,#db2777)',
            color: '#fff', cursor: saving ? 'not-allowed' : 'pointer',
            fontSize: 15, fontWeight: 700, opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? 'Saving…' : 'Save Overrides'}
        </button>
        <button
          onClick={clearAll}
          disabled={saving}
          style={{
            padding: '12px 24px', borderRadius: 10,
            border: '1px solid rgba(239,68,68,0.4)',
            background: 'transparent', color: '#f87171',
            cursor: saving ? 'not-allowed' : 'pointer',
            fontSize: 14, fontWeight: 600, opacity: saving ? 0.7 : 1,
          }}
        >
          Clear All Overrides
        </button>
        {saveStatus !== 'idle' && (
          <span style={{ fontSize: 13, color: saveStatus === 'saved' ? '#4ade80' : '#f87171' }}>
            {saveStatus === 'saved' ? '✓ ' : '✗ '}{saveMsg}
          </span>
        )}
      </div>
    </main>
  );
}
