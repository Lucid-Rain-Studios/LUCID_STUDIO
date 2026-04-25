// TopBar.jsx
function TopBar({ repo, account, syncOp, onFetch, onPull, onPush, onNotifications, unreadCount, onSignIn }) {
  const T = window.T
  const [hoverSync, setHoverSync] = React.useState(null)

  const s = {
    bar: {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      height: 48, paddingLeft: 16, paddingRight: 12,
      background: T.bg2, borderBottom: `1px solid ${T.border}`,
      flexShrink: 0, gap: 12, zIndex: 20, position: 'relative',
    },
    left: { display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 },
    wordmark: {
      fontFamily: T.mono, fontSize: 14, fontWeight: 700,
      color: T.orange, letterSpacing: '0.08em', flexShrink: 0,
      userSelect: 'none',
    },
    sep: { color: T.border2, fontSize: 14, flexShrink: 0, userSelect: 'none' },
    repoName: {
      fontFamily: T.ui, fontSize: 14, fontWeight: 600,
      color: T.text1, flexShrink: 0,
    },
    branchChip: {
      display: 'flex', alignItems: 'center', gap: 5,
      background: T.blueDim, border: `1px solid rgba(77,157,255,0.25)`,
      borderRadius: 20, paddingLeft: 8, paddingRight: 10, height: 22,
      flexShrink: 0, cursor: 'pointer',
    },
    branchText: {
      fontFamily: T.mono, fontSize: 12, color: T.blue, fontWeight: 500,
    },
    right: { display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 },
  }

  const SmartSyncBtn = ({ repo, syncOp, onFetch, onPull, onPush }) => {
    const [menuOpen, setMenuOpen] = React.useState(false)
    const isIdle = syncOp === 'idle'
    const hasBehind = repo.behind > 0
    const hasAhead  = repo.ahead  > 0

    const primary = !isIdle
      ? { label: syncOp.charAt(0).toUpperCase() + syncOp.slice(1) + 'ing…', color: T.text2, colorDim: T.bg4, action: null, icon: null, count: 0 }
      : hasBehind
        ? { label: 'Pull',  color: T.yellow, colorDim: T.yellowDim, action: onPull,  icon: <ArrowDown size={13} color="currentColor" />, count: repo.behind }
        : hasAhead
          ? { label: 'Push', color: T.green,  colorDim: T.greenDim,  action: onPush,  icon: <ArrowUp   size={13} color="currentColor" />, count: repo.ahead  }
          : { label: 'Fetch', color: T.text2, colorDim: T.bg4, action: onFetch, count: 0,
              icon: <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 1v7M4 5.5l2.5 2.5L9 5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/><path d="M2 10.5h9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg> }

    const menuItems = [
      { label: 'Fetch', action: onFetch, color: T.text2, count: 0,
        icon: <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 1v7M4 5.5l2.5 2.5L9 5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/><path d="M2 10.5h9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg> },
      { label: 'Pull',  action: onPull,  color: T.yellow, count: repo.behind, icon: <ArrowDown size={13} color="currentColor" /> },
      { label: 'Push',  action: onPush,  color: T.green,  count: repo.ahead,  icon: <ArrowUp   size={13} color="currentColor" /> },
    ]

    const borderColor = primary.count > 0 ? primary.color : T.border
    const bgColor     = primary.count > 0 ? primary.colorDim : 'transparent'

    return (
      <div style={{ position: 'relative', display: 'flex' }}>
        {/* Primary */}
        <button
          onClick={() => { if (isIdle && primary.action) primary.action() }}
          disabled={!isIdle}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            height: 30, paddingLeft: 10, paddingRight: 10,
            borderRadius: `${T.r2} 0 0 ${T.r2}`,
            border: `1px solid ${borderColor}`, borderRight: 'none',
            background: bgColor, color: primary.count > 0 ? primary.color : T.text2,
            fontFamily: T.ui, fontSize: 13, fontWeight: 500,
            cursor: isIdle && primary.action ? 'pointer' : 'not-allowed',
            opacity: !isIdle ? 0.65 : 1, transition: 'all 0.15s',
          }}
        >
          {primary.icon}
          <span>{primary.label}</span>
          {primary.count > 0 && (
            <span style={{
              background: `${primary.color}33`, color: primary.color,
              fontFamily: T.mono, fontSize: 11, fontWeight: 700,
              borderRadius: 10, paddingLeft: 6, paddingRight: 6, lineHeight: '18px',
            }}>{primary.count}</span>
          )}
        </button>

        {/* Chevron */}
        <button
          onClick={() => isIdle && setMenuOpen(o => !o)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 24, height: 30, borderRadius: `0 ${T.r2} ${T.r2} 0`,
            border: `1px solid ${borderColor}`,
            borderLeft: `1px solid ${primary.count > 0 ? `${primary.color}50` : T.border}`,
            background: menuOpen ? T.bg4 : bgColor,
            color: primary.count > 0 ? primary.color : T.text2,
            cursor: isIdle ? 'pointer' : 'not-allowed', transition: 'all 0.15s',
          }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d={menuOpen ? "M2.5 6.5 L5 3.5 L7.5 6.5" : "M2.5 3.5 L5 6.5 L7.5 3.5"} stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {/* Dropdown */}
        {menuOpen && (
          <>
            <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 90 }} />
            <div style={{
              position: 'absolute', top: 36, right: 0, zIndex: 100,
              background: T.bg3, border: `1px solid ${T.border2}`,
              borderRadius: T.r2, boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
              minWidth: 160, overflow: 'hidden',
            }}>
              {menuItems.map((item, i) => (
                <button key={item.label}
                  onClick={() => { item.action(); setMenuOpen(false) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    width: '100%', height: 36, paddingLeft: 12, paddingRight: 12,
                    background: 'transparent', border: 'none',
                    borderBottom: i < menuItems.length - 1 ? `1px solid ${T.border}` : 'none',
                    color: item.count > 0 ? item.color : T.text2,
                    fontFamily: T.ui, fontSize: 13, cursor: 'pointer', transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = T.bg4}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  {item.icon}
                  <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
                  {item.count > 0 && (
                    <span style={{
                      background: `${item.color}22`, color: item.color,
                      fontFamily: T.mono, fontSize: 11, fontWeight: 700,
                      borderRadius: 10, paddingLeft: 6, paddingRight: 6,
                    }}>{item.count}</span>
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    )
  }

  const SyncBtn = ({ label, icon, count, color, colorDim, colorMid, onClick, title }) => {
    const [hover, setHover] = React.useState(false)
    const isIdle = syncOp === 'idle'
    const active = syncOp === label.toLowerCase()
    return (
      <button
        onClick={onClick}
        disabled={!isIdle}
        title={title}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          height: 30, paddingLeft: 10, paddingRight: 10,
          borderRadius: T.r2, border: `1px solid ${hover || active ? color : T.border}`,
          background: active ? colorDim : hover ? colorDim : 'transparent',
          color: active || hover ? color : T.text2,
          fontFamily: T.ui, fontSize: 13, fontWeight: 500,
          cursor: isIdle ? 'pointer' : 'not-allowed',
          opacity: !isIdle && !active ? 0.5 : 1,
          transition: 'all 0.15s ease', flexShrink: 0,
        }}
      >
        {icon}
        <span>{active ? `${label}ing…` : label}</span>
        {count > 0 && (
          <span style={{
            background: colorMid, color, fontFamily: T.mono,
            fontSize: 11, fontWeight: 700, borderRadius: 10,
            paddingLeft: 6, paddingRight: 6, lineHeight: '18px',
          }}>{count}</span>
        )}
      </button>
    )
  }

  const IconBtn = ({ children, onClick, badge, title }) => {
    const [hover, setHover] = React.useState(false)
    return (
      <button
        onClick={onClick}
        title={title}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          position: 'relative',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 34, height: 34, borderRadius: T.r2,
          background: hover ? T.bg4 : 'transparent',
          border: `1px solid ${hover ? T.border2 : 'transparent'}`,
          color: hover ? T.text1 : T.text2,
          cursor: 'pointer', transition: 'all 0.15s ease', flexShrink: 0,
        }}
      >
        {children}
        {badge > 0 && (
          <span style={{
            position: 'absolute', top: 4, right: 4,
            width: 8, height: 8, borderRadius: '50%',
            background: T.orange, border: `2px solid ${T.bg2}`,
          }} />
        )}
      </button>
    )
  }

  return (
    <header style={s.bar}>
      <div style={s.left}>
        {/* Wordmark */}
        <span style={s.wordmark}>LUCID GIT</span>

        {repo ? (
          <>
            <ChevronRight size={12} color={T.border2} />
            <span style={s.repoName}>{repo.name}</span>
            <div style={s.branchChip}>
              <BranchIcon size={11} color={T.blue} />
              <span style={s.branchText}>{repo.branch}</span>
            </div>
          </>
        ) : (
          <span style={{ fontFamily: T.ui, fontSize: 13, color: T.text3 }}>No repository open</span>
        )}
      </div>

      <div style={s.right}>
        {repo && (
          <>
            <SmartSyncBtn
              repo={repo} syncOp={syncOp}
              onFetch={onFetch} onPull={onPull} onPush={onPush}
              T={T}
            />
            <div style={{ width: 1, height: 20, background: T.border, flexShrink: 0, margin: '0 2px' }} />
          </>
        )}

        {/* Notification bell */}
        <IconBtn onClick={onNotifications} badge={unreadCount} title="Notifications">
          <BellIcon size={15} color="currentColor" />
        </IconBtn>

        {/* Account avatar */}
        {account ? (
          <button
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              height: 34, paddingLeft: 8, paddingRight: 10,
              borderRadius: T.r2, border: `1px solid transparent`,
              background: 'transparent', cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = T.bg4; e.currentTarget.style.borderColor = T.border }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent' }}
          >
            <span style={{
              width: 26, height: 26, borderRadius: '50%',
              background: 'linear-gradient(135deg, #4d9dff, #a27ef0)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: T.mono, fontSize: 10, fontWeight: 700, color: '#fff',
              flexShrink: 0,
            }}>{account.initials}</span>
            <span style={{ fontFamily: T.ui, fontSize: 13, color: T.text2, fontWeight: 500 }}>
              {account.login}
            </span>
          </button>
        ) : (
          <button
            onClick={onSignIn}
            style={{
              height: 30, paddingLeft: 12, paddingRight: 12,
              borderRadius: T.r2, border: `1px solid ${T.border2}`,
              background: T.bg3, color: T.text2,
              fontFamily: T.ui, fontSize: 13, fontWeight: 500,
              cursor: 'pointer',
            }}
          >Sign in</button>
        )}
      </div>
    </header>
  )
}

Object.assign(window, { TopBar })
