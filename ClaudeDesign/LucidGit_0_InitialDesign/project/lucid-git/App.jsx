// App.jsx
function App() {
  // ── Settings / theme state ─────────────────────────────────────────────
  const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
    "isDark": true,
    "density": "comfortable",
    "fontFamily": "IBM Plex Sans",
    "fontSize": 13
  }/*EDITMODE-END*/

  const [isDark,     setIsDark]     = React.useState(TWEAK_DEFAULTS.isDark)
  const [density,    setDensity]    = React.useState(TWEAK_DEFAULTS.density)
  const [fontFamily, setFontFamily] = React.useState(TWEAK_DEFAULTS.fontFamily)
  const [fontSize,   setFontSize]   = React.useState(TWEAK_DEFAULTS.fontSize)

  // Rebuild window.T before every render so all children see current theme
  window.buildTheme({ isDark, density, fontFamily, fontSize })
  const T = window.T

  // ── App state ──────────────────────────────────────────────────────────
  const D = window.MockData
  const [hasRepo,          setHasRepo]          = React.useState(true)
  const [activeTab,        setActiveTab]         = React.useState('changes')
  const [sidebarCollapsed, setSidebarCollapsed]  = React.useState(false)
  const [syncOp,           setSyncOp]            = React.useState('idle')
  const [showNotifPanel,   setShowNotifPanel]    = React.useState(false)
  const [isRunning,        setIsRunning]         = React.useState(false)
  const [progress,         setProgress]          = React.useState(undefined)
  const [opLabel,          setOpLabel]           = React.useState('')
  const [staged,           setStaged]            = React.useState(D.stagedFiles)
  const [unstaged,         setUnstaged]          = React.useState(D.unstagedFiles)
  const [selectedFile,     setSelected]          = React.useState(null)
  const [commitMsg,        setCommitMsg]         = React.useState('')
  const [isCommitting,     setIsCommitting]      = React.useState(false)
  const [selectedHash,     setSelectedHash]      = React.useState(null)
  const [tweaksOpen,       setTweaksOpen]        = React.useState(false)

  // ── Drag-resize state ─────────────────────────────────────────────────
  const [filePanelWidth, setFilePanelWidth] = React.useState(280)
  const [sidebarWidth,   setSidebarWidth]   = React.useState(200)
  const dragging   = React.useRef(false)
  const dragStartX = React.useRef(0)
  const dragStartW = React.useRef(0)

  const makeDragHandler = React.useCallback((setter, min, max) => (e) => {
    dragging.current   = true
    dragStartX.current = e.clientX
    dragStartW.current = setter === setFilePanelWidth ? filePanelWidth : sidebarWidth
    document.body.style.cursor    = 'col-resize'
    document.body.style.userSelect = 'none'
    const onMove = (ev) => {
      if (!dragging.current) return
      setter(Math.max(min, Math.min(max, dragStartW.current + (ev.clientX - dragStartX.current))))
    }
    const onUp = () => {
      dragging.current = false
      document.body.style.cursor    = ''
      document.body.style.userSelect = ''
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [filePanelWidth, sidebarWidth])

  // ── Operations ────────────────────────────────────────────────────────
  const runOp = (label, ms = 1800) => {
    setIsRunning(true); setOpLabel(label); setProgress(0)
    const start = Date.now()
    const tick = () => {
      const p = Math.min(100, ((Date.now() - start) / ms) * 100)
      setProgress(Math.round(p))
      if (p < 100) setTimeout(tick, 80)
      else setTimeout(() => { setIsRunning(false); setProgress(undefined); setOpLabel('') }, 400)
    }
    setTimeout(tick, 80)
  }

  const handleFetch = () => { setSyncOp('fetch'); runOp('Fetching…', 1600); setTimeout(() => setSyncOp('idle'), 1700) }
  const handlePull  = () => { setSyncOp('pull');  runOp('Pulling…',  2200); setTimeout(() => setSyncOp('idle'), 2300) }
  const handlePush  = () => { setSyncOp('push');  runOp('Pushing…',  2000); setTimeout(() => setSyncOp('idle'), 2100) }

  const handleCommit = () => {
    if (!commitMsg.trim() || staged.length === 0) return
    setIsCommitting(true); runOp('Committing…', 1200)
    setTimeout(() => { setIsCommitting(false); setCommitMsg(''); setStaged([]) }, 1400)
  }

  const handleStageAll    = () => { setStaged(s => [...s, ...unstaged]); setUnstaged([]) }
  const handleUnstageAll  = () => { setUnstaged(s => [...s, ...staged]);  setStaged([]) }
  const handleStageFile   = (f) => { setStaged(s => [...s, f]);  setUnstaged(s => s.filter(x => x.path !== f.path)) }
  const handleUnstageFile = (f) => { setUnstaged(s => [...s, f]); setStaged(s => s.filter(x => x.path !== f.path)) }

  const notifs      = D.notifications
  const unreadCount = notifs.filter(n => n.unread).length

  // ── Tweaks wiring ─────────────────────────────────────────────────────
  React.useEffect(() => {
    const handler = e => {
      if (e.data?.type === '__activate_edit_mode')   setTweaksOpen(true)
      if (e.data?.type === '__deactivate_edit_mode') setTweaksOpen(false)
    }
    window.addEventListener('message', handler)
    window.parent.postMessage({ type: '__edit_mode_available' }, '*')
    return () => window.removeEventListener('message', handler)
  }, [])

  const applyTweak = (key, val) => {
    if (key === 'isDark')     setIsDark(val)
    if (key === 'density')    setDensity(val)
    if (key === 'fontFamily') setFontFamily(val)
    if (key === 'fontSize')   setFontSize(val)
    window.parent.postMessage({ type: '__edit_mode_set_keys', edits: { [key]: val } }, '*')
  }

  // ── Drag handle ───────────────────────────────────────────────────────
  const DragHandle = ({ onMouseDown }) => {
    const [hover, setHover] = React.useState(false)
    return (
      <div
        onMouseDown={onMouseDown}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          width: 4, flexShrink: 0, cursor: 'col-resize',
          background: hover ? T.orange : T.border,
          transition: 'background 0.15s', zIndex: 5,
        }}
      />
    )
  }

  // ── Panels ────────────────────────────────────────────────────────────
  const ChangesPanel = () => (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      <div style={{ width: filePanelWidth, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <FilePanel
          stagedFiles={staged} unstagedFiles={unstaged}
          selectedPath={selectedFile?.path} onSelect={setSelected}
          onStageAll={handleStageAll} onUnstageAll={handleUnstageAll}
          onStageFile={handleStageFile} onUnstageFile={handleUnstageFile}
          commitMsg={commitMsg} onCommitMsg={setCommitMsg}
          onCommit={handleCommit} isCommitting={isCommitting}
        />
      </div>
      <DragHandle onMouseDown={makeDragHandler(setFilePanelWidth, 180, 520)} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{
          display: 'flex', alignItems: 'center', height: 40, paddingLeft: 16, paddingRight: 14,
          background: T.bg2, borderBottom: `1px solid ${T.border}`, flexShrink: 0,
        }}>
          <span style={{ fontFamily: T.ui, fontSize: 13, fontWeight: 600, color: T.text1 }}>Diff</span>
        </div>
        <DiffPanel file={selectedFile} lines={selectedFile ? D.diffLines : []} />
      </div>
    </div>
  )

  const HistoryView = () => (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      <HistoryPanel
        commits={D.commits} selectedHash={selectedHash}
        onSelect={c => setSelectedHash(c.hash)}
        selectedFiles={selectedHash ? D.selectedCommitFiles : []}
      />
    </div>
  )

  // ── Settings panel ────────────────────────────────────────────────────
  const SettingsPanel = () => {
    const Section = ({ title, children }) => (
      <div style={{ marginBottom: 32 }}>
        <div style={{
          fontFamily: T.ui, fontSize: 11, fontWeight: 700, color: T.text3,
          textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14,
          paddingBottom: 8, borderBottom: `1px solid ${T.border}`,
        }}>{title}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {children}
        </div>
      </div>
    )

    const Row = ({ label, sublabel, children }) => (
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: T.ui, fontSize: 13, fontWeight: 500, color: T.text1, marginBottom: 2 }}>{label}</div>
          {sublabel && <div style={{ fontFamily: T.ui, fontSize: 12, color: T.text3 }}>{sublabel}</div>}
        </div>
        <div style={{ flexShrink: 0 }}>{children}</div>
      </div>
    )

    const ToggleSwitch = ({ checked, onChange }) => {
      const bg = checked ? T.orange : T.bg4
      return (
        <button onClick={() => onChange(!checked)} style={{
          width: 40, height: 22, borderRadius: 11,
          background: bg, border: `1px solid ${checked ? T.orange : T.border}`,
          position: 'relative', cursor: 'pointer', transition: 'all 0.2s', padding: 0,
        }}>
          <span style={{
            position: 'absolute', top: 2,
            left: checked ? 19 : 2,
            width: 16, height: 16, borderRadius: '50%',
            background: '#fff', transition: 'left 0.2s',
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
          }} />
        </button>
      )
    }

    const ChipGroup = ({ options, value, onChange }) => (
      <div style={{ display: 'flex', gap: 4 }}>
        {options.map(opt => (
          <button key={opt.value} onClick={() => onChange(opt.value)} style={{
            height: 28, paddingLeft: 12, paddingRight: 12, borderRadius: T.r1,
            background: value === opt.value ? T.orangeDim : T.bg3,
            border: `1px solid ${value === opt.value ? T.orange : T.border}`,
            color: value === opt.value ? T.orange : T.text2,
            fontFamily: T.ui, fontSize: 12, fontWeight: 500, cursor: 'pointer',
            transition: 'all 0.12s',
          }}>{opt.label}</button>
        ))}
      </div>
    )

    const Select = ({ options, value, onChange }) => (
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          height: 32, paddingLeft: 10, paddingRight: 28, borderRadius: T.r1,
          background: T.bg3, border: `1px solid ${T.border}`,
          color: T.text1, fontFamily: T.ui, fontSize: 13,
          cursor: 'pointer', appearance: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%238b94b0' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 8px center',
        }}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    )

    const SliderRow = ({ label, sublabel, min, max, step, value, onChange, unit }) => (
      <Row label={label} sublabel={sublabel}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input type="range" min={min} max={max} step={step} value={value}
            onChange={e => onChange(Number(e.target.value))}
            style={{ width: 120, accentColor: T.orange }}
          />
          <span style={{ fontFamily: T.mono, fontSize: 12, color: T.text2, minWidth: 36 }}>
            {value}{unit}
          </span>
        </div>
      </Row>
    )

    return (
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px', background: T.bg0 }}>
        <div style={{ maxWidth: 580 }}>

          <Section title="Appearance">
            <Row label="Color Mode" sublabel="Switch between dark and light themes">
              <ChipGroup
                options={[{ label: '☽ Dark', value: true }, { label: '☀ Light', value: false }]}
                value={isDark}
                onChange={v => applyTweak('isDark', v)}
              />
            </Row>
          </Section>

          <Section title="Typography">
            <Row label="Font Family" sublabel="UI text font used throughout the application">
              <Select
                value={fontFamily}
                onChange={v => applyTweak('fontFamily', v)}
                options={[
                  { value: 'IBM Plex Sans', label: 'IBM Plex Sans' },
                  { value: 'Inter',         label: 'Inter' },
                  { value: 'system-ui',     label: 'System UI' },
                  { value: 'Helvetica Neue',label: 'Helvetica Neue' },
                ]}
              />
            </Row>
            <SliderRow
              label="Font Size" sublabel="Base size for UI text (code always uses JetBrains Mono)"
              min={11} max={16} step={1} value={fontSize} unit="px"
              onChange={v => applyTweak('fontSize', v)}
            />
          </Section>

          <Section title="Layout">
            <Row label="Density" sublabel="Controls row height and spacing throughout the UI">
              <ChipGroup
                options={[
                  { label: 'Compact',      value: 'compact'     },
                  { label: 'Comfortable',  value: 'comfortable' },
                  { label: 'Spacious',     value: 'spacious'    },
                ]}
                value={density}
                onChange={v => applyTweak('density', v)}
              />
            </Row>
          </Section>

          {/* Preview card */}
          <div style={{
            background: T.bg2, border: `1px solid ${T.border}`,
            borderRadius: T.r3, padding: 16, marginTop: 8,
          }}>
            <div style={{ fontFamily: T.ui, fontSize: 11, color: T.text3, marginBottom: 10,
              textTransform: 'uppercase', letterSpacing: '0.08em' }}>Preview</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'SK_Hero.uasset', status: 'M', size: '14.2 MB' },
                { label: 'DefaultGame.ini', status: 'A', size: '4.1 KB' },
              ].map(f => (
                <div key={f.label} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  height: T.rowH, paddingLeft: 10, paddingRight: 10,
                  background: T.bg1, borderRadius: T.r1, border: `1px solid ${T.border}`,
                }}>
                  <span style={{
                    width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                    background: T.statusBg(f.status), color: T.statusColor(f.status),
                    fontFamily: T.mono, fontSize: 11, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{f.status}</span>
                  <span style={{ fontFamily: T.mono, fontSize: T.fontSize, color: T.text1, flex: 1 }}>{f.label}</span>
                  <span style={{ fontFamily: T.mono, fontSize: 11, color: T.text3 }}>{f.size}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    )
  }

  const PlaceholderPanel = ({ title, subtitle }) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', flex: 1, gap: 8, color: T.text3, background: T.bg0 }}>
      <span style={{ fontFamily: T.ui, fontSize: 15, color: T.text2 }}>{title}</span>
      <span style={{ fontFamily: T.ui, fontSize: 13 }}>{subtitle}</span>
    </div>
  )

  const WelcomeScreen = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', flex: 1, gap: 24, background: T.bg0 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: T.mono, fontSize: 36, fontWeight: 700, color: T.orange, letterSpacing: '0.1em' }}>LUCID GIT</div>
        <div style={{ fontFamily: T.ui, fontSize: 14, color: T.text3, marginTop: 6 }}>Git client for game development teams</div>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={() => setHasRepo(true)} style={{ height: 36, paddingLeft: 20, paddingRight: 20, borderRadius: T.r2, background: T.bg3, border: `1px solid ${T.border2}`, color: T.text1, fontFamily: T.ui, fontSize: 14, cursor: 'pointer' }}>Open Repository</button>
        <button onClick={() => setHasRepo(true)} style={{ height: 36, paddingLeft: 20, paddingRight: 20, borderRadius: T.r2, background: T.orange, border: `1px solid ${T.orange}`, color: '#fff', fontFamily: T.ui, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Clone Repository</button>
      </div>
    </div>
  )

  // ── Notification panel ────────────────────────────────────────────────
  const NotifPanel = () => (
    <div style={{ background: T.bg3, border: `1px solid ${T.border2}`, borderRadius: T.r3,
      boxShadow: T.shadow, overflow: 'hidden', width: 340 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px', borderBottom: `1px solid ${T.border}` }}>
        <span style={{ fontFamily: T.ui, fontSize: 13, fontWeight: 600, color: T.text1 }}>Notifications</span>
        <span style={{ background: T.orangeDim, color: T.orange, fontFamily: T.mono, fontSize: 11,
          fontWeight: 700, borderRadius: 10, paddingLeft: 7, paddingRight: 7 }}>{unreadCount} new</span>
      </div>
      {notifs.map(n => (
        <div key={n.id} style={{ display: 'flex', gap: 10, padding: '10px 14px',
          borderBottom: `1px solid ${T.border}`,
          background: n.unread ? `${T.orange}08` : 'transparent', cursor: 'pointer' }}
          onMouseEnter={e => e.currentTarget.style.background = T.bgHover}
          onMouseLeave={e => e.currentTarget.style.background = n.unread ? `${T.orange}08` : 'transparent'}
        >
          <div style={{ width: 6, flexShrink: 0, paddingTop: 6 }}>
            {n.unread && <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.orange, display: 'block' }} />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: T.ui, fontSize: 13, color: T.text1, marginBottom: 2 }}>{n.text}</div>
            <div style={{ fontFamily: T.ui, fontSize: 11, color: T.text3 }}>{n.detail}</div>
          </div>
          <span style={{ fontFamily: T.mono, fontSize: 11, color: T.text3, flexShrink: 0 }}>{n.time}</span>
        </div>
      ))}
    </div>
  )

  // ── Tweaks panel ──────────────────────────────────────────────────────
  const TweaksPanel = () => (
    <div style={{ position: 'fixed', bottom: 40, right: 16, width: 220, zIndex: 200,
      background: T.bg3, border: `1px solid ${T.border2}`, borderRadius: T.r3,
      boxShadow: T.shadow, padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <span style={{ fontFamily: T.ui, fontSize: 13, fontWeight: 700, color: T.text1 }}>Tweaks</span>
      {[
        { label: 'Mode',    key: 'isDark',  opts: [{ l: 'Dark', v: true }, { l: 'Light', v: false }], val: isDark },
        { label: 'Density', key: 'density', opts: [{ l: 'Compact', v: 'compact' }, { l: 'Normal', v: 'comfortable' }, { l: 'Spacious', v: 'spacious' }], val: density },
      ].map(row => (
        <div key={row.key}>
          <div style={{ fontFamily: T.ui, fontSize: 10, color: T.text3, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{row.label}</div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {row.opts.map(o => (
              <button key={String(o.v)} onClick={() => applyTweak(row.key, o.v)} style={{
                height: 24, paddingLeft: 8, paddingRight: 8, borderRadius: T.r1,
                background: row.val === o.v ? T.orangeDim : T.bg4,
                border: `1px solid ${row.val === o.v ? T.orange : T.border}`,
                color: row.val === o.v ? T.orange : T.text2,
                fontFamily: T.ui, fontSize: 11, cursor: 'pointer',
              }}>{o.l}</button>
            ))}
          </div>
        </div>
      ))}
      <div>
        <div style={{ fontFamily: T.ui, fontSize: 10, color: T.text3, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Font size ({fontSize}px)</div>
        <input type="range" min={11} max={16} step={1} value={fontSize}
          onChange={e => applyTweak('fontSize', Number(e.target.value))}
          style={{ width: '100%', accentColor: T.orange }} />
      </div>
    </div>
  )

  // ── Root ──────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh',
      background: T.bg0, color: T.text1, fontFamily: T.ui, fontSize: T.fontSize,
      overflow: 'hidden', position: 'relative' }}>

      <TopBar
        repo={hasRepo ? D.repo : null} account={D.account}
        syncOp={syncOp} onFetch={handleFetch} onPull={handlePull} onPush={handlePush}
        onNotifications={() => setShowNotifPanel(p => !p)}
        unreadCount={unreadCount}
      />

      {showNotifPanel && (
        <>
          <div onClick={() => setShowNotifPanel(false)} style={{ position: 'fixed', inset: 0, zIndex: 99 }} />
          <div style={{ position: 'absolute', top: 48, right: 12, zIndex: 100 }}>
            <NotifPanel />
          </div>
        </>
      )}

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {hasRepo && (
          <>
            <Sidebar
              active={activeTab}
              onChange={tab => { setActiveTab(tab); setShowNotifPanel(false) }}
              collapsed={sidebarCollapsed}
              onToggle={() => setSidebarCollapsed(c => !c)}
              stagedCount={staged.length} unstagedCount={unstaged.length}
              width={sidebarWidth}
            />
            {!sidebarCollapsed && (
              <DragHandle onMouseDown={makeDragHandler(setSidebarWidth, 140, 320)} />
            )}
          </>
        )}

        <main style={{ display: 'flex', flex: 1, overflow: 'hidden', flexDirection: 'column' }}>
          {!hasRepo                ? <WelcomeScreen /> : (
            <>
              {activeTab === 'changes'  && <ChangesPanel />}
              {activeTab === 'history'  && <HistoryView />}
              {activeTab === 'settings' && <SettingsPanel />}
              {activeTab === 'branches' && <PlaceholderPanel title="Branch Manager" subtitle="Create, checkout, and merge branches" />}
              {activeTab === 'lfs'      && <PlaceholderPanel title="LFS Manager" subtitle="Track and migrate large files" />}
              {activeTab === 'cleanup'  && <PlaceholderPanel title="Repository Cleanup" subtitle="GC, prune, and size dashboard" />}
              {activeTab === 'unreal'   && <PlaceholderPanel title="Unreal Engine" subtitle="UE5 project detection and .gitattributes editor" />}
              {activeTab === 'hooks'    && <PlaceholderPanel title="Git Hooks" subtitle="Enable, disable, and configure hooks" />}
            </>
          )}
        </main>
      </div>

      <StatusBar branch={hasRepo ? D.repo.branch : null} isRunning={isRunning} progress={progress} opLabel={opLabel} />

      {tweaksOpen && <TweaksPanel />}
    </div>
  )
}

const root = ReactDOM.createRoot(document.getElementById('root'))
root.render(<App />)
