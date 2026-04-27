import React, { useCallback, useRef, useState } from 'react'
import { useRepoStore } from '@/stores/repoStore'
import { useAuthStore } from '@/stores/authStore'

export type TabId =
  | 'dashboard' | 'changes'  | 'history'  | 'branches'
  | 'tools'     | 'presence' | 'map'      | 'heatmap'  | 'forecast'
  | 'lfs'       | 'cleanup'  | 'unreal'   | 'hooks'    | 'overview'
  | 'settings'  | 'stash'    | 'content'

interface SidebarProps {
  active: TabId
  onChange: (tab: TabId) => void
  collapsed: boolean
  onToggle: () => void
  width: number
  onWidthChange: (w: number) => void
  repoPath: string | null
  onOpenTerminal: () => void
  onOpenRepo: () => void
  onOpenExplorer: () => void
}

type NavItem  = { id: TabId; label: string; Icon: React.FC<{ size?: number }> }
type NavGroup = { key: string; label: string; items: NavItem[]; adminOnly?: boolean }

const NAV_GROUPS: NavGroup[] = [
  {
    key: 'workspace', label: 'Workspace',
    items: [
      { id: 'dashboard', label: 'Dashboard', Icon: DashboardIcon },
      { id: 'changes',   label: 'Changes',   Icon: ChangesIcon },
      { id: 'history',   label: 'History',   Icon: HistoryIcon },
      { id: 'branches',  label: 'Branches',  Icon: BranchNavIcon },
    ],
  },
  {
    key: 'tools', label: 'Tools',
    items: [
      { id: 'tools',    label: 'Tools',    Icon: ToolsIcon },
      { id: 'presence', label: 'Team',     Icon: PresenceIcon },
      { id: 'map',      label: 'File Map', Icon: MapIcon },
      { id: 'heatmap',  label: 'Heatmap',  Icon: HeatmapIcon },
      { id: 'forecast', label: 'Forecast', Icon: ForecastIcon },
    ],
  },
  {
    key: 'admin', label: 'Admin', adminOnly: true,
    items: [
      { id: 'lfs',      label: 'LFS',      Icon: LFSIcon },
      { id: 'cleanup',  label: 'Cleanup',  Icon: CleanupIcon },
      { id: 'unreal',   label: 'Unreal',   Icon: UnrealIcon },
      { id: 'hooks',    label: 'Hooks',    Icon: HooksIcon },
      { id: 'overview', label: 'Overview', Icon: OverviewIcon },
    ],
  },
]

const COLLAPSED_KEY = 'lucid-git:sidebar-groups'

function loadCollapsed(): Record<string, boolean> {
  try { return JSON.parse(localStorage.getItem(COLLAPSED_KEY) ?? '{}') } catch { return {} }
}

export function Sidebar({ active, onChange, collapsed, onToggle, width, onWidthChange, repoPath, onOpenTerminal, onOpenRepo, onOpenExplorer }: SidebarProps) {
  const { fileStatus } = useRepoStore()
  const isAdmin = useAuthStore(s => s.isAdmin(repoPath ?? ''))
  const totalChanges = fileStatus.length

  const [groupsCollapsed, setGroupsCollapsed] = useState<Record<string, boolean>>(loadCollapsed)

  const asideRef   = useRef<HTMLElement>(null)
  const dragging   = useRef(false)
  const dragStartX = useRef(0)
  const dragStartW = useRef(0)

  const onDragStart = useCallback((e: React.MouseEvent) => {
    dragging.current   = true
    dragStartX.current = e.clientX
    dragStartW.current = width
    document.body.style.cursor     = 'col-resize'
    document.body.style.userSelect = 'none'
    const clamp = (v: number) => Math.max(160, Math.min(300, v))
    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return
      const w = clamp(dragStartW.current + (ev.clientX - dragStartX.current))
      if (asideRef.current) asideRef.current.style.width = `${w}px`
    }
    const onUp = (ev: MouseEvent) => {
      dragging.current = false
      document.body.style.cursor     = ''
      document.body.style.userSelect = ''
      onWidthChange(clamp(dragStartW.current + (ev.clientX - dragStartX.current)))
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [width, onWidthChange])

  const toggleGroup = (key: string) => {
    const next = { ...groupsCollapsed, [key]: !groupsCollapsed[key] }
    setGroupsCollapsed(next)
    localStorage.setItem(COLLAPSED_KEY, JSON.stringify(next))
  }

  const visibleGroups = NAV_GROUPS.filter(g => !g.adminOnly || (isAdmin && !!repoPath))
  const panelWidth = collapsed ? 48 : width

  return (
    <div style={{ display: 'flex', flexShrink: 0 }}>
      <aside
        ref={asideRef as React.RefObject<HTMLDivElement>}
        style={{
          display: 'flex', flexDirection: 'column',
          background: 'var(--lg-bg-secondary)',
          borderRight: '1px solid var(--lg-border)',
          width: panelWidth,
          transition: collapsed ? 'width 0.2s ease' : 'none',
          overflow: 'hidden', flexShrink: 0,
        }}
      >
        {/* ── Collapse toggle ── */}
        <button
          onClick={onToggle}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            height: 36, background: 'transparent', border: 'none',
            borderBottom: '1px solid var(--lg-border)',
            color: 'var(--lg-text-secondary)', cursor: 'pointer', flexShrink: 0, opacity: 0.5,
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '1' }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '0.5' }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            {collapsed
              ? <path d="M5 3 L9 7 L5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              : <path d="M9 3 L5 7 L9 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            }
          </svg>
        </button>

        {/* ── Nav groups ── */}
        <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingTop: 4, paddingBottom: 4 }}>
          {!repoPath && !collapsed && (
            <div style={{ padding: '16px 14px 8px', fontFamily: 'var(--lg-font-ui)', fontSize: 11, color: 'var(--lg-text-secondary)', opacity: 0.4, textAlign: 'center' }}>
              No repository open
            </div>
          )}

          {visibleGroups.map((group, gi) => {
            const isGroupCollapsed = groupsCollapsed[group.key] ?? false
            return (
              <div key={group.key}>
                {/* Group separator (not before first group) */}
                {gi > 0 && !collapsed && (
                  <div style={{ height: 1, background: 'var(--lg-border)', margin: '4px 10px', opacity: 0.5 }} />
                )}

                {/* Group header — only when expanded sidebar */}
                {!collapsed && (
                  <button
                    onClick={() => toggleGroup(group.key)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      width: '100%', paddingLeft: 13, paddingRight: 10,
                      paddingTop: gi === 0 ? 8 : 6, paddingBottom: 3,
                      background: 'transparent', border: 'none', cursor: 'pointer',
                    }}
                  >
                    <span style={{
                      fontFamily: 'var(--lg-font-ui)', fontSize: 10, fontWeight: 700,
                      color: 'var(--lg-text-secondary)', letterSpacing: '0.12em', textTransform: 'uppercase',
                      opacity: 0.55, userSelect: 'none',
                    }}>
                      {group.label}
                    </span>
                    <svg
                      width="10" height="10" viewBox="0 0 10 10" fill="none"
                      style={{ color: 'var(--lg-text-secondary)', opacity: 0.4, transform: isGroupCollapsed ? 'rotate(-90deg)' : 'none', transition: 'transform 0.15s ease', flexShrink: 0 }}
                    >
                      <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                )}

                {/* Group items */}
                {(!isGroupCollapsed || collapsed) && group.items.map(item => (
                  <NavBtn
                    key={item.id}
                    item={item}
                    isActive={active === item.id}
                    collapsed={collapsed}
                    badge={item.id === 'changes' ? totalChanges : 0}
                    disabled={item.id !== 'settings' && !repoPath}
                    onClick={() => { if (repoPath || item.id === 'settings') onChange(item.id) }}
                  />
                ))}
              </div>
            )
          })}
        </nav>

        {/* ── Bottom action buttons ── */}
        <div style={{ borderTop: '1px solid var(--lg-border)', flexShrink: 0 }}>
          <BottomBtn
            Icon={SettingsIcon}
            label="Settings"
            collapsed={collapsed}
            active={active === 'settings'}
            onClick={() => onChange('settings')}
          />
          <BottomBtn
            Icon={ExplorerIcon}
            label="View in Explorer"
            collapsed={collapsed}
            disabled={!repoPath}
            onClick={onOpenExplorer}
          />
          <BottomBtn
            Icon={TerminalIcon}
            label="Open Terminal"
            collapsed={collapsed}
            disabled={!repoPath}
            onClick={onOpenTerminal}
          />
          <BottomBtn
            Icon={SwitchRepoIcon}
            label="Switch Repository"
            collapsed={collapsed}
            onClick={onOpenRepo}
            accent
          />
        </div>
      </aside>

      {/* Drag handle */}
      {!collapsed && (
        <div
          onMouseDown={onDragStart}
          style={{ width: 3, flexShrink: 0, cursor: 'col-resize', background: 'transparent', transition: 'background 0.15s', zIndex: 5 }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(232,98,47,0.5)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        />
      )}
    </div>
  )
}

// ── Nav button ─────────────────────────────────────────────────────────────────

function NavBtn({ item, isActive, collapsed, badge, disabled, onClick }: {
  item: NavItem; isActive: boolean; collapsed: boolean
  badge: number; disabled: boolean; onClick: () => void
}) {
  const [hover, setHover] = React.useState(false)
  const { Icon } = item
  const dim = disabled && !isActive

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={collapsed ? item.label : undefined}
      style={{
        display: 'flex', alignItems: 'center',
        gap: collapsed ? 0 : 8,
        width: '100%', height: 'var(--lg-row-height)',
        paddingLeft: collapsed ? 0 : 11,
        paddingRight: collapsed ? 0 : 9,
        justifyContent: collapsed ? 'center' : 'flex-start',
        background: isActive
          ? 'linear-gradient(90deg, rgba(var(--lg-accent-rgb), 0.16) 0%, rgba(var(--lg-accent-rgb), 0.05) 100%)'
          : hover && !dim ? 'rgba(255,255,255,0.04)' : 'transparent',
        border: 'none',
        borderLeft: `2.5px solid ${isActive ? 'var(--lg-accent)' : 'transparent'}`,
        color: isActive ? 'var(--lg-text-primary)' : hover && !dim ? 'var(--lg-text-primary)' : 'var(--lg-text-secondary)',
        cursor: dim ? 'default' : 'pointer',
        opacity: dim ? 0.3 : 1,
        transition: 'background 0.12s ease, color 0.12s ease, opacity 0.12s ease',
        position: 'relative', flexShrink: 0,
      }}
    >
      <span style={{
        color: isActive ? 'var(--lg-accent)' : 'currentColor',
        flexShrink: 0, display: 'flex',
        filter: isActive ? 'drop-shadow(0 0 5px rgba(var(--lg-accent-rgb), 0.5))' : 'none',
        transition: 'filter 0.12s ease, color 0.12s ease',
      }}>
        <Icon size={15} />
      </span>

      {!collapsed && (
        <span style={{ fontFamily: 'var(--lg-font-ui)', fontSize: 12.5, fontWeight: isActive ? 600 : 400, flex: 1, textAlign: 'left', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>
          {item.label}
        </span>
      )}

      {!collapsed && badge > 0 && (
        <span style={{
          background: isActive ? 'rgba(var(--lg-accent-rgb), 0.25)' : 'rgba(255,255,255,0.07)',
          color: isActive ? 'var(--lg-accent)' : 'var(--lg-text-secondary)',
          fontFamily: 'var(--lg-font-mono)', fontSize: 10, fontWeight: 700,
          borderRadius: 9, minWidth: 17, height: 17,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          paddingLeft: 4, paddingRight: 4,
          border: isActive ? '1px solid rgba(var(--lg-accent-rgb), 0.3)' : '1px solid rgba(255,255,255,0.07)',
        }}>{badge}</span>
      )}

      {collapsed && badge > 0 && (
        <span style={{
          position: 'absolute', top: 5, right: 5,
          width: 6, height: 6, borderRadius: '50%',
          background: 'var(--lg-accent)', boxShadow: '0 0 6px rgba(var(--lg-accent-rgb), 0.7)',
          border: '1.5px solid var(--lg-bg-secondary)',
        }} />
      )}
    </button>
  )
}

// ── Bottom action button ───────────────────────────────────────────────────────

function BottomBtn({ Icon, label, collapsed, disabled, onClick, active, accent }: {
  Icon: React.FC<{ size?: number }>; label: string; collapsed: boolean
  disabled?: boolean; onClick: () => void; active?: boolean; accent?: boolean
}) {
  const [hover, setHover] = React.useState(false)
  const color = active
    ? 'var(--lg-accent)'
    : accent
      ? hover ? 'var(--lg-accent)' : 'var(--lg-text-secondary)'
      : hover && !disabled ? 'var(--lg-text-primary)' : 'var(--lg-text-secondary)'

  return (
    <button
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={collapsed ? label : undefined}
      style={{
        display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 8,
        width: '100%', height: 'var(--lg-row-height)',
        paddingLeft: collapsed ? 0 : 11, paddingRight: collapsed ? 0 : 9,
        justifyContent: collapsed ? 'center' : 'flex-start',
        background: active
          ? 'linear-gradient(90deg, rgba(var(--lg-accent-rgb), 0.12) 0%, transparent 100%)'
          : hover && !disabled ? 'rgba(255,255,255,0.03)' : 'transparent',
        border: 'none',
        borderLeft: `2.5px solid ${active ? 'var(--lg-accent)' : 'transparent'}`,
        color, cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.3 : 1,
        transition: 'color 0.12s ease, background 0.12s ease',
        flexShrink: 0,
      }}
    >
      <span style={{ color: 'currentColor', flexShrink: 0, display: 'flex' }}>
        <Icon size={15} />
      </span>
      {!collapsed && (
        <span style={{ fontFamily: 'var(--lg-font-ui)', fontSize: 12.5, fontWeight: active ? 600 : 400, flex: 1, textAlign: 'left', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>
          {label}
        </span>
      )}
    </button>
  )
}

// ── SVG icons ──────────────────────────────────────────────────────────────────

function DashboardIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <rect x="1.5" y="1.5" width="5.5" height="7"   rx="1.2" stroke="currentColor" strokeWidth="1.3" />
    <rect x="9"   y="1.5" width="5.5" height="3.5" rx="1.2" stroke="currentColor" strokeWidth="1.3" />
    <rect x="9"   y="7"   width="5.5" height="7"   rx="1.2" stroke="currentColor" strokeWidth="1.3" />
    <rect x="1.5" y="10.5" width="5.5" height="4"  rx="1.2" stroke="currentColor" strokeWidth="1.3" />
  </svg>
}

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

function ToolsIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M9.5 2.5a3 3 0 0 1-4 4L3 9a1.414 1.414 0 1 0 2 2l2.5-2.5a3 3 0 0 1 4-4l-1.5 1.5 1 1L12.5 5.5a3 3 0 0 1-3-3z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" fill="none" />
  </svg>
}

function PresenceIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <circle cx="6" cy="5.5" r="2" stroke="currentColor" strokeWidth="1.3" />
    <circle cx="11" cy="5.5" r="1.5" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.7" />
    <path d="M2 12c0-2.2 1.8-4 4-4s4 1.8 4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    <path d="M11 9c1.5 0 3 1 3 2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.7" />
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

function LFSIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <ellipse cx="8" cy="4.5" rx="5" ry="2" stroke="currentColor" strokeWidth="1.3" />
    <path d="M3 4.5V11.5" stroke="currentColor" strokeWidth="1.3" />
    <path d="M13 4.5V11.5" stroke="currentColor" strokeWidth="1.3" />
    <ellipse cx="8" cy="11.5" rx="5" ry="2" stroke="currentColor" strokeWidth="1.3" />
    <ellipse cx="8" cy="8"    rx="5" ry="2" stroke="currentColor" strokeWidth="1.3" />
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

function OverviewIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
    <rect x="9"   y="1.5" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
    <rect x="1.5" y="9"   width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
    <rect x="9"   y="9"   width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
  </svg>
}

function SettingsIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="2.2" stroke="currentColor" strokeWidth="1.3" />
    <path d="M8 2v1.5M8 12.5V14M2 8h1.5M12.5 8H14M3.5 3.5l1 1M11.5 11.5l1 1M3.5 12.5l1-1M11.5 4.5l1-1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
}

function ExplorerIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <rect x="1.5" y="3.5" width="13" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
    <path d="M1.5 6.5h13" stroke="currentColor" strokeWidth="0.9" strokeOpacity="0.5" />
    <path d="M4 5h.5M6 5h.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M5.5 9.5L7 11l3.5-3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
}

function TerminalIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <rect x="1.5" y="2.5" width="13" height="11" rx="2" stroke="currentColor" strokeWidth="1.3" />
    <path d="M4 6l3 2.5L4 11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9 11h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
}

function SwitchRepoIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M1.5 4.5h4.2l1 1.5h7.8v7.5h-13V4.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    <path d="M9.5 7.5l2 2-2 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M6 9.5h5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
}
