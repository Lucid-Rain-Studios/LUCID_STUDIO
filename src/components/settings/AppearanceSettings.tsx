import React, { useEffect, useState } from 'react'
import { ipc, AppSettings } from '@/ipc'

const DEFAULTS: Partial<AppSettings> = {
  fontFamily: 'IBM Plex Sans',
  fontSize: 13,
  uiDensity: 'normal',
  theme: 'dark',
}

const THEMES: { id: AppSettings['theme']; label: string; bg: string; accent: string }[] = [
  { id: 'dark',     label: 'Dark',     bg: '#0b0d13', accent: '#e8622f' },
  { id: 'darker',   label: 'Darker',   bg: '#060709', accent: '#e8622f' },
  { id: 'midnight', label: 'Midnight', bg: '#080c18', accent: '#4d9dff' },
]

const FONT_FAMILIES = [
  'IBM Plex Sans',
  'Inter',
  'system-ui',
  'Segoe UI',
  'Roboto',
]

const DENSITIES: { id: AppSettings['uiDensity']; label: string; desc: string }[] = [
  { id: 'compact',  label: 'Compact',  desc: '28px rows' },
  { id: 'normal',   label: 'Normal',   desc: '34–36px rows' },
  { id: 'relaxed',  label: 'Relaxed',  desc: '44px rows' },
]

export function AppearanceSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [saved,    setSaved]    = useState(false)
  const [saving,   setSaving]   = useState(false)

  useEffect(() => {
    ipc.settingsGet().then(s => {
      setSettings({ ...DEFAULTS as AppSettings, ...s })
    }).catch(() => {})
  }, [])

  if (!settings) return (
    <div style={{ padding: 24, fontFamily: "'IBM Plex Sans', system-ui", fontSize: 12, color: '#4e5870' }}>Loading…</div>
  )

  const update = (patch: Partial<AppSettings>) => {
    setSettings(s => s ? { ...s, ...patch } : s)
    setSaved(false)
  }

  const handleSave = async () => {
    if (!settings) return
    setSaving(true)
    try { await ipc.settingsSave(settings); setSaved(true) } catch { /* ignore */ }
    finally { setSaving(false) }
  }

  return (
    <div style={{ maxWidth: 560, padding: '20px 24px' }}>

      {/* Theme */}
      <Section title="Theme">
        <div style={{ display: 'flex', gap: 10 }}>
          {THEMES.map(t => (
            <button
              key={t.id}
              onClick={() => update({ theme: t.id })}
              style={{
                flex: 1, padding: '12px 10px 10px', borderRadius: 8, cursor: 'pointer',
                background: t.bg, border: `2px solid ${settings.theme === t.id ? t.accent : '#252d42'}`,
                transition: 'border-color 0.15s', textAlign: 'center',
              }}
            >
              {/* Mini preview */}
              <div style={{ display: 'flex', gap: 4, marginBottom: 8, justifyContent: 'center' }}>
                <div style={{ width: 8, height: 32, borderRadius: 3, background: '#161a27' }} />
                <div style={{ flex: 1, maxWidth: 32, borderRadius: 3, background: '#10131c' }}>
                  <div style={{ height: 6, margin: '5px 4px 3px', borderRadius: 2, background: t.accent, opacity: 0.8 }} />
                  <div style={{ height: 3, margin: '0 4px 2px', borderRadius: 2, background: '#252d42' }} />
                  <div style={{ height: 3, margin: '0 4px', borderRadius: 2, background: '#252d42' }} />
                </div>
              </div>
              <div style={{ fontFamily: "'IBM Plex Sans', system-ui", fontSize: 11, fontWeight: settings.theme === t.id ? 600 : 400, color: settings.theme === t.id ? t.accent : '#8b94b0' }}>
                {t.label}
              </div>
            </button>
          ))}
        </div>
      </Section>

      {/* Font family */}
      <Section title="Font">
        <Row label="UI font family">
          <select
            value={settings.fontFamily}
            onChange={e => update({ fontFamily: e.target.value })}
            style={selectStyle}
          >
            {FONT_FAMILIES.map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </Row>
        <Row label="Font size" hint="Applies to UI text. Code font size scales proportionally.">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              type="range" min={11} max={18} step={1}
              value={settings.fontSize}
              onChange={e => update({ fontSize: Number(e.target.value) })}
              style={{ width: 100, accentColor: '#e8622f' }}
            />
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#8b94b0', width: 32, textAlign: 'right' }}>
              {settings.fontSize}px
            </span>
          </div>
        </Row>

        {/* Preview */}
        <div style={{
          marginTop: 10, padding: '12px 14px',
          background: '#10131c', border: '1px solid #252d42', borderRadius: 6,
        }}>
          <div style={{ fontFamily: settings.fontFamily + ', system-ui', fontSize: settings.fontSize, color: '#dde1f0', marginBottom: 4 }}>
            The quick brown fox jumps over the lazy dog
          </div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: settings.fontSize - 1, color: '#4d9dff' }}>
            git commit -m "fix: resolve merge conflict"
          </div>
        </div>
      </Section>

      {/* Density */}
      <Section title="Density">
        <div style={{ display: 'flex', gap: 8 }}>
          {DENSITIES.map(d => (
            <button
              key={d.id}
              onClick={() => update({ uiDensity: d.id })}
              style={{
                flex: 1, padding: '10px 8px', borderRadius: 6, cursor: 'pointer',
                background: settings.uiDensity === d.id ? 'rgba(232,98,47,0.12)' : 'transparent',
                border: `1px solid ${settings.uiDensity === d.id ? '#e8622f' : '#252d42'}`,
                transition: 'all 0.12s', textAlign: 'center',
              }}
            >
              <div style={{ fontFamily: "'IBM Plex Sans', system-ui", fontSize: 12, fontWeight: settings.uiDensity === d.id ? 600 : 400, color: settings.uiDensity === d.id ? '#e8622f' : '#8b94b0' }}>
                {d.label}
              </div>
              <div style={{ fontFamily: "'IBM Plex Sans', system-ui", fontSize: 10, color: '#4e5870', marginTop: 2 }}>
                {d.desc}
              </div>
            </button>
          ))}
        </div>
      </Section>

      {/* Save */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
        <SaveBtn label={saving ? 'Saving…' : 'Save'} disabled={saving} onClick={handleSave} />
        {saved && <span style={{ fontFamily: "'IBM Plex Sans', system-ui", fontSize: 12, color: '#2ec573' }}>✓ Saved</span>}
      </div>
    </div>
  )
}

// ── Reusable pieces ────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{
        fontFamily: "'IBM Plex Sans', system-ui", fontSize: 10, fontWeight: 600,
        color: '#4e5870', letterSpacing: '0.12em', textTransform: 'uppercase',
        marginBottom: 10,
      }}>{title}</div>
      {children}
    </div>
  )
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 12 }}>
      <div>
        <div style={{ fontFamily: "'IBM Plex Sans', system-ui", fontSize: 13, color: '#dde1f0' }}>{label}</div>
        {hint && <div style={{ fontFamily: "'IBM Plex Sans', system-ui", fontSize: 11, color: '#4e5870', marginTop: 2 }}>{hint}</div>}
      </div>
      {children}
    </div>
  )
}

function SaveBtn({ label, disabled, onClick }: { label: string; disabled: boolean; onClick: () => void }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        height: 32, paddingLeft: 20, paddingRight: 20, borderRadius: 6,
        background: hover ? 'rgba(232,98,47,0.2)' : 'rgba(232,98,47,0.12)',
        border: '1px solid rgba(232,98,47,0.5)',
        color: '#e8622f', fontFamily: "'IBM Plex Sans', system-ui", fontSize: 13, fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1, transition: 'all 0.12s',
      }}
    >{label}</button>
  )
}

const selectStyle: React.CSSProperties = {
  background: '#10131c', border: '1px solid #252d42', borderRadius: 5,
  padding: '5px 10px', fontFamily: "'IBM Plex Sans', system-ui", fontSize: 12,
  color: '#dde1f0', outline: 'none', cursor: 'pointer',
}
