// Sidebar.jsx
function Sidebar({ active, onChange, collapsed, onToggle, stagedCount, unstagedCount, width }) {
  const T = window.T
  const panelWidth = collapsed ? 48 : (width || 200)

  const navGroups = [
    {
      label: 'Workspace',
      items: [
        { id: 'changes', label: 'Changes', badge: stagedCount + unstagedCount, icon: ChangesIcon },
        { id: 'history', label: 'History', badge: 0, icon: HistoryIcon },
      ]
    },
    {
      label: 'Manage',
      items: [
        { id: 'branches', label: 'Branches', badge: 0, icon: BranchNavIcon },
        { id: 'lfs',      label: 'LFS',      badge: 0, icon: LFSIcon },
        { id: 'cleanup',  label: 'Cleanup',  badge: 0, icon: CleanupIcon },
      ]
    },
    {
      label: 'Configure',
      items: [
        { id: 'unreal',   label: 'Unreal',   badge: 0, icon: UnrealIcon },
        { id: 'hooks',    label: 'Hooks',    badge: 0, icon: HooksIcon },
        { id: 'settings', label: 'Settings', badge: 0, icon: SettingsIcon },
      ]
    },
  ]

  const s = {
    aside: {
      display: 'flex', flexDirection: 'column',
      background: T.bg1,
      width: panelWidth,
      transition: collapsed ? 'width 0.2s ease' : 'none',
      flexShrink: 0, overflow: 'hidden',
    },
    toggleBtn: {
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: 36, borderBottom: `1px solid ${T.border}`,
      background: 'transparent', border: 'none', borderBottom: `1px solid ${T.border}`,
      color: T.text3, cursor: 'pointer', flexShrink: 0,
      transition: 'color 0.15s',
    },
    nav: { flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingTop: 8, paddingBottom: 8 },
    groupLabel: {
      display: collapsed ? 'none' : 'block',
      paddingLeft: 12, paddingTop: 12, paddingBottom: 4,
      fontFamily: T.ui, fontSize: 10, fontWeight: 600,
      color: T.text3, letterSpacing: '0.1em', textTransform: 'uppercase',
      userSelect: 'none',
    },
  }

  const NavItem = ({ item }) => {
    const isActive = active === item.id
    const Icon = item.icon
    const [hover, setHover] = React.useState(false)

    return (
      <button
        onClick={() => onChange(item.id)}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        title={collapsed ? item.label : undefined}
        style={{
          display: 'flex', alignItems: 'center',
          gap: collapsed ? 0 : 9,
          width: '100%',
          height: 34,
          paddingLeft: collapsed ? 0 : 12,
          paddingRight: collapsed ? 0 : 10,
          justifyContent: collapsed ? 'center' : 'flex-start',
          background: isActive ? T.orangeDim : hover ? T.bgHover : 'transparent',
          borderLeft: `2px solid ${isActive ? T.orange : 'transparent'}`,
          border: 'none', borderLeft: `2px solid ${isActive ? T.orange : 'transparent'}`,
          color: isActive ? T.text1 : hover ? T.text1 : T.text2,
          cursor: 'pointer', transition: 'all 0.12s ease',
          position: 'relative', flexShrink: 0,
        }}
      >
        <span style={{ color: isActive ? T.orange : 'currentColor', flexShrink: 0, display: 'flex' }}>
          <Icon size={16} />
        </span>

        {!collapsed && (
          <span style={{
            fontFamily: T.ui, fontSize: 13, fontWeight: isActive ? 600 : 400,
            flex: 1, textAlign: 'left', whiteSpace: 'nowrap',
          }}>{item.label}</span>
        )}

        {!collapsed && item.badge > 0 && (
          <span style={{
            background: isActive ? T.orangeMid : T.bg4,
            color: isActive ? T.orange : T.text3,
            fontFamily: T.mono, fontSize: 11, fontWeight: 600,
            borderRadius: 10, minWidth: 18, height: 18,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            paddingLeft: 5, paddingRight: 5,
          }}>{item.badge}</span>
        )}

        {collapsed && item.badge > 0 && (
          <span style={{
            position: 'absolute', top: 6, right: 6,
            width: 7, height: 7, borderRadius: '50%',
            background: T.orange, border: `2px solid ${T.bg1}`,
          }} />
        )}
      </button>
    )
  }

  return (
    <aside style={s.aside}>
      <button
        style={s.toggleBtn}
        onClick={onToggle}
        onMouseEnter={e => e.currentTarget.style.color = T.text2}
        onMouseLeave={e => e.currentTarget.style.color = T.text3}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          {collapsed
            ? <path d="M5 3 L9 7 L5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            : <path d="M9 3 L5 7 L9 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          }
        </svg>
      </button>

      <nav style={s.nav}>
        {navGroups.map(group => (
          <div key={group.label}>
            <div style={s.groupLabel}>{group.label}</div>
            {group.items.map(item => <NavItem key={item.id} item={item} />)}
          </div>
        ))}
      </nav>
    </aside>
  )
}

// Nav icons — simple SVG outlines
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

Object.assign(window, { Sidebar })
