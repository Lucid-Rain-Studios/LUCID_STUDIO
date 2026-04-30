// HistoryPanel.jsx
function HistoryPanel({ commits, selectedHash, onSelect, selectedFiles }) {
  const T = window.T

  const LANE_W = 18
  const ROW_H  = 48
  const laneColors = [T.blue, T.purple, T.green, T.yellow, T.orange]
  const laneColor = lane => laneColors[lane % laneColors.length]

  // ── Drag resize ──────────────────────────────────────────────────────
  const [listWidth, setListWidth] = React.useState(480)
  const dragging   = React.useRef(false)
  const dragStartX = React.useRef(0)
  const dragStartW = React.useRef(0)

  const onDragStart = React.useCallback((e) => {
    dragging.current   = true
    dragStartX.current = e.clientX
    dragStartW.current = listWidth
    document.body.style.cursor    = 'col-resize'
    document.body.style.userSelect = 'none'
    const onMove = (ev) => {
      if (!dragging.current) return
      setListWidth(Math.max(260, Math.min(700, dragStartW.current + (ev.clientX - dragStartX.current))))
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
  }, [listWidth])

  const DragHandle = () => {
    const [hover, setHover] = React.useState(false)
    return (
      <div onMouseDown={onDragStart}
        onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
        style={{ width: 4, flexShrink: 0, cursor: 'col-resize',
          background: hover ? T.orange : T.border, transition: 'background 0.15s', zIndex: 5 }}
      />
    )
  }

  // ── Graph cell ───────────────────────────────────────────────────────
  const GraphCell = ({ commit }) => {
    const cx = commit.lane * LANE_W + LANE_W / 2
    const cy = ROW_H / 2
    const col = laneColor(commit.lane)
    const w = 2 * LANE_W + 4

    return (
      <svg width={w} height={ROW_H} style={{ flexShrink: 0, overflow: 'visible' }}>
        {[0, 1].map(lane => {
          if (lane === commit.lane) return null
          const x = lane * LANE_W + LANE_W / 2
          return <line key={lane} x1={x} y1={0} x2={x} y2={ROW_H}
            stroke={laneColor(lane)} strokeWidth={1.5} strokeOpacity={0.35} />
        })}
        <line x1={cx} y1={0}      x2={cx} y2={cy - 6} stroke={col} strokeWidth={1.75} strokeOpacity={0.6} />
        <line x1={cx} y1={cy + 6} x2={cx} y2={ROW_H}  stroke={col} strokeWidth={1.75} strokeOpacity={0.6} />
        {commit.isMerge && (
          <path d={`M ${1*LANE_W+LANE_W/2} 0 C ${1*LANE_W+LANE_W/2} ${cy} ${cx} ${cy} ${cx} ${cy}`}
            stroke={laneColor(1)} strokeWidth={1.5} fill="none" strokeOpacity={0.5} />
        )}
        <circle cx={cx} cy={cy} r={commit.isMerge ? 5 : 4.5}
          fill={T.bg1} stroke={col} strokeWidth={2} />
        {commit.isMerge && <circle cx={cx} cy={cy} r={2} fill={col} />}
      </svg>
    )
  }

  // ── Commit row ───────────────────────────────────────────────────────
  const CommitRow = ({ commit }) => {
    const isSelected = selectedHash === commit.hash
    const [hover, setHover] = React.useState(false)
    return (
      <div onClick={() => onSelect(commit)}
        onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
        style={{
          display: 'flex', alignItems: 'center', height: ROW_H,
          background: isSelected ? T.bg4 : hover ? T.bgHover : 'transparent',
          borderLeft: `2px solid ${isSelected ? T.orange : 'transparent'}`,
          borderBottom: `1px solid ${T.border}`,
          cursor: 'pointer', transition: 'background 0.1s',
        }}
      >
        <div style={{ paddingLeft: 8, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
          <GraphCell commit={commit} />
        </div>
        <div style={{ flex: 1, minWidth: 0, paddingLeft: 6, paddingRight: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <span style={{
              fontFamily: T.ui, fontSize: 13, fontWeight: isSelected ? 600 : 400,
              color: T.text1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
            }}>{commit.message}</span>
            {commit.isMerge && (
              <span style={{
                background: T.purpleDim, color: T.purple, border: `1px solid rgba(162,126,240,0.3)`,
                borderRadius: 4, paddingLeft: 5, paddingRight: 5,
                fontFamily: T.mono, fontSize: 10, fontWeight: 600, flexShrink: 0,
              }}>MERGE</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
              background: `linear-gradient(135deg, ${commit.color}88, ${commit.color}44)`,
              border: `1px solid ${commit.color}55`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: T.mono, fontSize: 9, fontWeight: 700, color: commit.color,
            }}>{commit.initials}</span>
            <span style={{ fontFamily: T.ui, fontSize: 12, color: T.text2 }}>{commit.author}</span>
            <span style={{ fontFamily: T.mono, fontSize: 11, color: T.text3 }}>{commit.timeAgo}</span>
            <span style={{ fontFamily: T.mono, fontSize: 11, color: T.text3 }}>
              {commit.filesChanged} file{commit.filesChanged !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        {/* Hash — copyable */}
        <CopyChip text={commit.hash} mono muted
          style={{ paddingRight: 12, fontSize: 11, flexShrink: 0 }} />
      </div>
    )
  }

  const selectedCommit = commits.find(c => c.hash === selectedHash)
  const fileStatusColor = { M: T.yellow, A: T.green, D: T.red, R: T.blue }

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

      {/* Left: commit list */}
      <div style={{ width: listWidth, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: 38, paddingLeft: 14, paddingRight: 12,
          borderBottom: `1px solid ${T.border}`, background: T.bg2, flexShrink: 0,
        }}>
          <span style={{ fontFamily: T.ui, fontSize: 12, fontWeight: 600, color: T.text2, letterSpacing: '0.04em' }}>
            {commits.length} COMMITS
          </span>
          <button style={{ fontFamily: T.ui, fontSize: 12, color: T.text3,
            background: 'none', border: 'none', cursor: 'pointer' }}>↺ Refresh</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {commits.map(c => <CommitRow key={c.hash} commit={c} />)}
          <div style={{ display: 'flex', justifyContent: 'center', padding: 12 }}>
            <button style={{
              fontFamily: T.ui, fontSize: 12, color: T.text3,
              background: 'none', border: `1px solid ${T.border}`,
              borderRadius: T.r2, padding: '6px 16px', cursor: 'pointer',
            }}>Load more…</button>
          </div>
        </div>
      </div>

      <DragHandle />

      {/* Right: commit detail */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {selectedCommit ? (
          <>
            <div style={{ padding: '14px 18px', borderBottom: `1px solid ${T.border}`, background: T.bg2, flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <CopyChip text={selectedCommit.hash} mono
                  style={{ background: T.bg4, borderRadius: 4, padding: '2px 8px', letterSpacing: '0.05em', fontSize: 11, color: T.text3 }} />
                {selectedCommit.isMerge && (
                  <span style={{ background: T.purpleDim, color: T.purple, borderRadius: 4, padding: '2px 7px',
                    fontFamily: T.mono, fontSize: 10, fontWeight: 600 }}>MERGE COMMIT</span>
                )}
              </div>
              <p style={{ fontFamily: T.ui, fontSize: 15, fontWeight: 600, color: T.text1, margin: '0 0 8px', lineHeight: 1.4 }}>
                {selectedCommit.message}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: `linear-gradient(135deg, ${selectedCommit.color}88, ${selectedCommit.color}44)`,
                  border: `1px solid ${selectedCommit.color}55`,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: T.mono, fontSize: 10, fontWeight: 700, color: selectedCommit.color,
                }}>{selectedCommit.initials}</span>
                <span style={{ fontFamily: T.ui, fontSize: 13, color: T.text2, fontWeight: 500 }}>{selectedCommit.author}</span>
                <span style={{ fontFamily: T.mono, fontSize: 12, color: T.text3 }}>{selectedCommit.timeAgo}</span>
              </div>
            </div>

            <div style={{
              display: 'flex', alignItems: 'center', height: 34,
              paddingLeft: 16, paddingRight: 16,
              borderBottom: `1px solid ${T.border}`, background: T.bg1, flexShrink: 0,
            }}>
              <span style={{ fontFamily: T.ui, fontSize: 11, fontWeight: 600, color: T.text3, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Files Changed
                <span style={{ marginLeft: 8, fontFamily: T.mono, fontSize: 11,
                  background: T.bg4, color: T.text3, borderRadius: 8, padding: '1px 6px' }}>{selectedFiles.length}</span>
              </span>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {selectedFiles.map((f, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  height: 36, paddingLeft: 16, paddingRight: 16,
                  borderBottom: `1px solid ${T.border}`, transition: 'background 0.1s',
                }}
                  onMouseEnter={e => e.currentTarget.style.background = T.bgHover}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <span style={{
                    width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                    background: `${fileStatusColor[f.status] || T.text2}22`,
                    color: fileStatusColor[f.status] || T.text2,
                    fontFamily: T.mono, fontSize: 11, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{f.status}</span>
                  <CopyChip text={f.path} mono style={{ fontSize: 12, flex: 1, color: T.text1 }} />
                </div>
              ))}
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: T.text3, flexDirection: 'column', gap: 8 }}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="11" stroke={T.border2} strokeWidth="1.5" />
              <path d="M16 10v6l4 3" stroke={T.border2} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span style={{ fontFamily: T.ui, fontSize: 13 }}>Select a commit to view details</span>
          </div>
        )}
      </div>
    </div>
  )
}

Object.assign(window, { HistoryPanel })
