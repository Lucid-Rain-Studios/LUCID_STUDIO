import React, { useCallback, useRef } from 'react'
import { useRepoStore } from '@/stores/repoStore'

type TabId = 'changes' | 'history' | 'branches' | 'lfs' | 'cleanup' | 'unreal' | 'hooks' | 'settings' | 'stash' | 'tools' | 'presence' | 'overview' | 'map' | 'content' | 'heatmap' | 'forecast'

interface SidebarProps {
  active: TabId
  onChange: (tab: TabId) => void
  collapsed: boolean
  onToggle: () => void
  width: number
  onWidthChange: (w: number) => void
  repoPath: string | null
  onOpenTerminal: () => void
}

const NAV_GROUPS: { label: string; items: { id: TabId; label: string; Icon: React.FC<{ size?: number }> }[] }[] = [
  {
    label: 'Workspace',
    items: [
      { id: 'overview', label: 'Overview',  Icon: OverviewIcon },
      { id: 'changes',  label: 'Changes',   Icon: ChangesIcon },
      { id: 'content',  label: 'Browser',   Icon: ContentIcon },
      { id: 'map',      label: 'File Map',  Icon: MapIcon },
      { id: 'history',  label: 'History',   Icon: HistoryIcon },
      { id: 'tools',    label: 'Tools',     Icon: ToolsIcon },
      { id: 'presence', label: 'Team',      Icon: PresenceIcon },
      { id: 'heatmap',  label: 'Heatmap',  Icon: HeatmapIcon },
      { id: 'forecast', label: 'Forecast', Icon: ForecastIcon },
    ],
  },
  {
    label: 'Manage',
    items: [
      { id: 'branches', label: 'Branches', Icon: BranchNavIcon },
      { id: 'lfs',      label: 'LFS',      Icon: LFSIcon },
      { id: 'cleanup',  label: 'Cleanup',  Icon: CleanupIcon },
    ],
  },
  {
    label: 'Configure',
    items: [
      { id: 'unreal',   label: 'Unreal',   Icon: UnrealIcon },
      { id: 'hooks',    label: 'Hooks',    Icon: HooksIcon },
      { id: 'settings', label: 'Settings', Icon: SettingsIcon },
    ],
  },
]

export function Sidebar({ active, onChange, collapsed, onToggle, width, onWidthChange, repoPath, onOpenTerminal }: SidebarProps) {
  const { fileStatus } = useRepoStore()
  const stagedCount   = fileStatus.filter(f => f.staged).length
  const unstagedCount = fileStatus.filter(f => !f.staged).length
  const totalChanges  = stagedCount + unstagedCount

  const dragging   = useRef(false)
  const dragStartX = useRef(0)
  const dragStartW = useRef(0)

  const onDragStart = useCallback((e: React.MouseEvent) => {
    dragging.current   = true
    dragStartX.current = e.clientX
    dragStartW.current = width
    document.body.style.cursor     = 'col-resize'
    document.body.style.userSelect = 'none'

    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return
      onWidthChange(Math.max(140, Math.min(320, dragStartW.current + (ev.clientX - dragStartX.current))))
    }
    const onUp = () => {
      dragging.current = false
      document.body.style.cursor     = ''
      document.body.style.userSelect = ''
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [width, onWidthChange])

  const panelWidth = collapsed ? 48 : width

  return (
    <div style={{ display: 'flex', flexShrink: 0 }}>
      <aside
        style={{
          display: 'flex', flexDirection: 'column',
          background: '#10131c',
          width: panelWidth,
          transition: collapsed ? 'width 0.2s ease' : 'none',
          overflow: 'hidden', flexShrink: 0,
        }}
      >
        {/* Collapse toggle */}
        <button
          onClick={onToggle}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            height: 36,
            background: 'transparent', border: 'none',
            borderBottom: '1px solid #252d42',
            color: '#4e5870', cursor: 'pointer', flexShrink: 0,
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#8b94b0')}
          onMouseLeave={e => (e.currentTarget.style.color = '#4e5870')}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            {collapsed
              ? <path d="M5 3 L9 7 L5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              : <path d="M9 3 L5 7 L9 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            }
          </svg>
        </button>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingTop: 8, paddingBottom: 8 }}>
          {NAV_GROUPS.map(group => (
            <div key={group.label}>
              {/* Group label */}
              {!collapsed && (
                <div style={{
                  paddingLeft: 12, paddingTop: 10, paddingBottom: 4,
                  fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
                  fontSize: 10, fontWeight: 600,
                  color: '#4e5870', letterSpacing: '0.1em', textTransform: 'uppercase',
                  userSelect: 'none',
                }}>
                  {group.label}
                </div>
              )}
              {group.items.map(item => (
                <NavItem
                  key={item.id}
                  item={item}
                  isActive={active === item.id}
                  collapsed={collapsed}
                  badge={item.id === 'changes' ? totalChanges : 0}
                  onClick={() => onChange(item.id)}
                />
              ))}
            </div>
          ))}
        </nav>

        {/* Terminal button */}
        <TerminalBtn collapsed={collapsed} repoPath={repoPath} onClick={onOpenTerminal} />
      </aside>

      {/* Drag handle — only when expanded */}
      {!collapsed && (
        <div
          onMouseDown={onDragStart}
          style={{
            width: 4, flexShrink: 0, cursor: 'col-resize',
            background: '#252d42', transition: 'background 0.15s', zIndex: 5,
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#e8622f')}
          onMouseLeave={e => (e.currentTarget.style.background = '#252d42')}
        />
      )}
    </div>
  )
}

function NavItem({
  item, isActive, collapsed, badge, onClick,
}: {
  item: { id: string; label: string; Icon: React.FC<{ size?: number }> }
  isActive: boolean
  collapsed: boolean
  badge: number
  onClick: () => void
}) {
  const [hover, setHover] = React.useState(false)
  const { Icon } = item

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={collapsed ? item.label : undefined}
      style={{
        display: 'flex', alignItems: 'center',
        gap: collapsed ? 0 : 9,
        width: '100%', height: 34,
        paddingLeft: collapsed ? 0 : 12,
        paddingRight: collapsed ? 0 : 10,
        justifyContent: collapsed ? 'center' : 'flex-start',
        background: isActive ? 'rgba(232,98,47,0.15)' : hover ? '#1e2436' : 'transparent',
        border: 'none',
        borderLeft: `2px solid ${isActive ? '#e8622f' : 'transparent'}`,
        color: isActive ? '#dde1f0' : hover ? '#dde1f0' : '#8b94b0',
        cursor: 'pointer', transition: 'all 0.12s ease',
        position: 'relative', flexShrink: 0,
      }}
    >
      <span style={{ color: isActive ? '#e8622f' : 'currentColor', flexShrink: 0, display: 'flex' }}>
        <Icon size={16} />
      </span>

      {!collapsed && (
        <span style={{
          fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
          fontSize: 13, fontWeight: isActive ? 600 : 400,
          flex: 1, textAlign: 'left', whiteSpace: 'nowrap',
        }}>
          {item.label}
        </span>
      )}

      {!collapsed && badge > 0 && (
        <span style={{
          background: isActive ? 'rgba(232,98,47,0.30)' : '#242a3d',
          color: isActive ? '#e8622f' : '#4e5870',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11, fontWeight: 600,
          borderRadius: 10, minWidth: 18, height: 18,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          paddingLeft: 5, paddingRight: 5,
        }}>
          {badge}
        </span>
      )}

      {collapsed && badge > 0 && (
        <span style={{
          position: 'absolute', top: 6, right: 6,
          width: 7, height: 7, borderRadius: '50%',
          background: '#e8622f', border: '2px solid #10131c',
        }} />
      )}
    </button>
  )
}

// ── Terminal button ─────────────────────────────────────────────────────────────

function TerminalBtn({ collapsed, repoPath, onClick }: { collapsed: boolean; repoPath: string | null; onClick: () => void }) {
  const [hover, setHover] = React.useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={collapsed ? 'Open Terminal' : undefined}
      style={{
        display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 9,
        width: '100%', height: 34,
        paddingLeft: collapsed ? 0 : 12, paddingRight: collapsed ? 0 : 10,
        justifyContent: collapsed ? 'center' : 'flex-start',
        background: hover ? '#1e2436' : 'transparent',
        border: 'none', borderTop: '1px solid #252d42',
        color: hover ? '#dde1f0' : '#4e5870',
        cursor: repoPath ? 'pointer' : 'default',
        opacity: repoPath ? 1 : 0.4,
        transition: 'all 0.12s ease', flexShrink: 0,
      }}
    >
      <span style={{ color: 'currentColor', flexShrink: 0, display: 'flex' }}>
        <TerminalIcon size={16} />
      </span>
      {!collapsed && (
        <span style={{
          fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
          fontSize: 13, flex: 1, textAlign: 'left', whiteSpace: 'nowrap',
        }}>Terminal</span>
      )}
    </button>
  )
}

// ── Nav icons ───────────────────────────────────────────────────────────────────

function ChangesIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.3" />
    <path d="M5 6h6M5 8.5h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    <circle cx="11" cy="9" r="2.5" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.1" />
    <path d="M10.3 9l.7.7 1.2-1.2" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
}

function HistoryIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.3" />
    <path d="M8 5.5V8l2 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
}

function BranchNavIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <circle cx="5" cy="4"  r="1.6" stroke="currentColor" strokeWidth="1.3" />
    <circle cx="5" cy="12" r="1.6" stroke="currentColor" strokeWidth="1.3" />
    <circle cx="11" cy="5" r="1.6" stroke="currentColor" strokeWidth="1.3" />
    <path d="M5 5.6V10.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    <path d="M5 5.6C5 7.2 11 7.2 11 5.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" fill="none" />
  </svg>
}

function LFSIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <ellipse cx="8" cy="4.5" rx="5" ry="2" stroke="currentColor" strokeWidth="1.3" />
    <path d="M3 4.5V11.5" stroke="currentColor" strokeWidth="1.3" />
    <path d="M13 4.5V11.5" stroke="currentColor" strokeWidth="1.3" />
    <ellipse cx="8" cy="11.5" rx="5" ry="2" stroke="currentColor" strokeWidth="1.3" />
    <ellipse cx="8" cy="8" rx="5" ry="2" stroke="currentColor" strokeWidth="1.3" />
  </svg>
}

function CleanupIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M3 4h10l-1 9H4L3 4Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    <path d="M1.5 4h13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    <path d="M6 4V2.5h4V4" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    <path d="M6.5 7v4M9.5 7v4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
}

function UnrealIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <polygon points="8,1.5 14,4.5 14,11.5 8,14.5 2,11.5 2,4.5" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinejoin="round" />
    <text x="8" y="10.5" textAnchor="middle" fill="currentColor" fontSize="6" fontFamily="sans-serif" fontWeight="700">UE</text>
  </svg>
}

function HooksIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M5 3v6a3 3 0 0 0 6 0V7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    <circle cx="11" cy="5.5" r="2" stroke="currentColor" strokeWidth="1.3" />
  </svg>
}

function SettingsIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="2.2" stroke="currentColor" strokeWidth="1.3" />
    <path d="M8 2v1.5M8 12.5V14M2 8h1.5M12.5 8H14M3.5 3.5l1 1M11.5 11.5l1 1M3.5 12.5l1-1M11.5 4.5l1-1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
}

function ToolsIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M9.5 2.5a3 3 0 0 1-4 4L3 9a1.414 1.414 0 1 0 2 2l2.5-2.5a3 3 0 0 1 4-4l-1.5 1.5 1 1L12.5 5.5a3 3 0 0 1-3-3z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" fill="none" />
  </svg>
}

function MapIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <rect x="1.5" y="1.5" width="6" height="8" rx="1.2" stroke="currentColor" strokeWidth="1.3" />
    <rect x="9"   y="1.5" width="5.5" height="4" rx="1.2" stroke="currentColor" strokeWidth="1.3" />
    <rect x="9"   y="7"   width="5.5" height="7" rx="1.2" stroke="currentColor" strokeWidth="1.3" />
    <rect x="1.5" y="11"  width="6"   height="3.5" rx="1.2" stroke="currentColor" strokeWidth="1.3" />
  </svg>
}

function OverviewIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
    <rect x="9"   y="1.5" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
    <rect x="1.5" y="9"   width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
    <rect x="9"   y="9"   width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
  </svg>
}

function PresenceIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <circle cx="6" cy="5.5" r="2" stroke="currentColor" strokeWidth="1.3" />
    <circle cx="11" cy="5.5" r="1.5" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.7" />
    <path d="M2 12c0-2.2 1.8-4 4-4s4 1.8 4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    <path d="M11 9c1.5 0 3 1 3 2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.7" />
    <circle cx="13" cy="12" r="1.2" fill="currentColor" fillOpacity="0" stroke="currentColor" strokeWidth="1" strokeOpacity="0.5" />
  </svg>
}

function TerminalIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <rect x="1.5" y="2.5" width="13" height="11" rx="2" stroke="currentColor" strokeWidth="1.3" />
    <path d="M4 6l3 2.5L4 11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9 11h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
}

function ContentIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M1.5 3h4.2l1 1.6h7.8v9.4H1.5V3z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    <path d="M1.5 5.5h13" stroke="currentColor" strokeWidth="0.9" strokeOpacity="0.5" />
    <path d="M5 8.5h6M5 11h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
}

function HeatmapIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.3" fill="currentColor" fillOpacity="0.35" />
    <rect x="9"   y="1.5" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.3" fill="currentColor" fillOpacity="0.15" />
    <rect x="1.5" y="9"   width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.3" fill="currentColor" fillOpacity="0.55" />
    <rect x="9"   y="9"   width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.3" fill="currentColor" fillOpacity="0.75" />
  </svg>
}

function ForecastIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M2 13 L5 8 L8 10 L11 5 L14 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="14" cy="7" r="1.5" fill="currentColor" />
    <path d="M2 13h12" stroke="currentColor" strokeWidth="0.9" strokeOpacity="0.4" />
  </svg>
}
