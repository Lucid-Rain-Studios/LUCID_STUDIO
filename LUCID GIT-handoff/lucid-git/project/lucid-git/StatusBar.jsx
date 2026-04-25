// StatusBar.jsx
function StatusBar({ branch, isRunning, progress, opLabel }) {
  const T = window.T
  const s = {
    footer: {
      position: 'relative', display: 'flex', flexDirection: 'column',
      background: T.bg2, borderTop: `1px solid ${T.border}`,
      flexShrink: 0, overflow: 'hidden', zIndex: 10,
    },
    track: { height: 2, width: '100%', background: T.border, overflow: 'hidden' },
    bar: {
      height: '100%', background: T.orange,
      transition: 'width 0.3s ease',
    },
    sweep: {
      height: '100%', width: '30%',
      background: `linear-gradient(90deg, transparent, ${T.orange}, transparent)`,
      animation: 'sweep 1.4s ease-in-out infinite',
    },
    content: {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      height: 28, paddingLeft: 16, paddingRight: 16,
    },
    left: { display: 'flex', alignItems: 'center', gap: 12 },
    branchPill: {
      display: 'flex', alignItems: 'center', gap: 6,
      fontSize: 11, fontFamily: T.mono,
      color: T.blue, letterSpacing: '0.01em',
    },
    right: { display: 'flex', alignItems: 'center', gap: 8 },
    ready: { fontSize: 11, fontFamily: T.mono, color: T.text3 },
    running: { fontSize: 11, fontFamily: T.mono, color: T.orange },
  }

  return (
    <footer style={s.footer}>
      {/* Progress strip */}
      <div style={s.track}>
        {isRunning && (
          progress !== undefined
            ? <div style={{ ...s.bar, width: `${progress}%` }} />
            : <div style={s.sweep} />
        )}
      </div>

      <div style={s.content}>
        <div style={s.left}>
          {branch ? (
            <span style={s.branchPill}>
              <BranchIcon size={11} color={T.blue} />
              {branch}
            </span>
          ) : (
            <span style={{ ...s.ready }}>No repository</span>
          )}
        </div>

        <div style={s.right}>
          {isRunning ? (
            <span style={s.running}>{opLabel || 'Working…'}</span>
          ) : (
            <span style={s.ready}>Ready</span>
          )}
        </div>
      </div>
    </footer>
  )
}

// Tiny inline SVG icons used across components
function BranchIcon({ size = 14, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="5" cy="4"  r="1.75" stroke={color} strokeWidth="1.5" />
      <circle cx="5" cy="12" r="1.75" stroke={color} strokeWidth="1.5" />
      <circle cx="11" cy="4" r="1.75" stroke={color} strokeWidth="1.5" />
      <path d="M5 5.75V10.25" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M5 5.75C5 7.5 11 7.5 11 5.75" stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none" />
    </svg>
  )
}

function BellIcon({ size = 15, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <path d="M8 2a4 4 0 0 0-4 4v3l-1 1.5h10L12 9V6a4 4 0 0 0-4-4Z" stroke={color} strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M6.5 13.5a1.5 1.5 0 0 0 3 0" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

function ChevronRight({ size = 12, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
      <path d="M4 2.5 L7.5 6 L4 9.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ArrowUp({ size = 12, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none">
      <path d="M6 9.5V2.5M3 5 L6 2 L9 5" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ArrowDown({ size = 12, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none">
      <path d="M6 2.5V9.5M3 7 L6 10 L9 7" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Export to window
Object.assign(window, { StatusBar, BranchIcon, BellIcon, ChevronRight, ArrowUp, ArrowDown })

// CopyChip — inline text that copies on click, shows brief ✓ Copied feedback
function CopyChip({ text, display, mono, muted, style: extraStyle }) {
  const T = window.T
  const [copied, setCopied] = React.useState(false)
  const [hover,  setHover]  = React.useState(false)

  const copy = (e) => {
    e.stopPropagation()
    window.copyText(text, () => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1400)
    })
  }

  return (
    <span
      onClick={copy}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={copied ? 'Copied!' : `Click to copy`}
      style={{
        cursor: 'pointer',
        fontFamily: mono ? T.mono : T.ui,
        fontSize: 'inherit',
        color: copied ? T.green : hover ? T.text1 : (muted ? T.text3 : T.text2),
        background: hover && !copied ? (T.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)') : 'transparent',
        borderRadius: 3,
        padding: hover || copied ? '0 4px' : '0',
        transition: 'color 0.15s, background 0.15s, padding 0.1s',
        display: 'inline-flex', alignItems: 'center', gap: 4,
        userSelect: 'none',
        ...extraStyle,
      }}
    >
      {copied
        ? <><span style={{ fontSize: '0.9em' }}>✓</span> Copied</>
        : (display ?? text)
      }
    </span>
  )
}

Object.assign(window, { CopyChip })
