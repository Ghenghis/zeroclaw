'use client';

import Link from 'next/link';

const CARDS = [
  {
    href: '/admin/scheduler',
    title: '⏰ Scheduler',
    description: 'Configure daily recreation cron expression, timezone, and manually trigger a rebuild.',
    color: '#00d4ff',
  },
  {
    href: '/admin/storage',
    title: '💾 Storage',
    description: 'Monitor disk usage, browse site archives, manage TimeWarp ports, and run cleanup.',
    color: '#00ff88',
  },
  {
    href: '/admin/theme',
    title: '🎨 Theme Override',
    description: 'Pin a specific theme, unlock holiday themes early, or force a background scene.',
    color: '#ff0080',
  },
];

export default function AdminPage() {
  return (
    <main style={{
      minHeight: '100vh',
      background: '#080c18',
      color: '#e0e8ff',
      fontFamily: 'system-ui, sans-serif',
      padding: '40px 24px',
    }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <h1 style={{
            fontSize: 28, fontWeight: 700, margin: '0 0 8px',
            background: 'linear-gradient(90deg, #00d4ff, #ff0080)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            ZeroClaw Admin
          </h1>
          <p style={{ color: '#8899bb', margin: 0 }}>
            Control panel for daily recreation, storage, and theming.
          </p>
        </div>

        {/* Nav cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
          {CARDS.map(card => (
            <Link
              key={card.href}
              href={card.href}
              style={{ textDecoration: 'none' }}
            >
              <div style={{
                background: '#0d1628',
                border: `1px solid ${card.color}33`,
                borderRadius: 12,
                padding: '24px 20px',
                cursor: 'pointer',
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = card.color;
                  (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 20px ${card.color}33`;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = `${card.color}33`;
                  (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                }}
              >
                <div style={{ fontSize: 24, marginBottom: 10 }}>{card.title.split(' ')[0]}</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: card.color, marginBottom: 8 }}>
                  {card.title.slice(3)}
                </div>
                <div style={{ fontSize: 13, color: '#8899bb', lineHeight: 1.5 }}>
                  {card.description}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Quick links */}
        <div style={{ marginTop: 40, padding: 20, background: '#0d1628', borderRadius: 12, border: '1px solid #1e2d4a' }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: '#8899bb', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: 1 }}>Quick Actions</h2>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {[
              { label: 'Trigger Rebuild Now', href: '/admin/scheduler' },
              { label: 'View Logs', href: '/admin/scheduler' },
              { label: 'Disk Status', href: '/admin/storage' },
              { label: 'Force Theme', href: '/admin/theme' },
            ].map(a => (
              <Link
                key={a.label}
                href={a.href}
                style={{
                  padding: '8px 16px',
                  background: '#1a2640',
                  border: '1px solid #2a3a5a',
                  borderRadius: 8,
                  color: '#c8d8ff',
                  fontSize: 13,
                  textDecoration: 'none',
                  transition: 'background 0.2s',
                }}
              >
                {a.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
