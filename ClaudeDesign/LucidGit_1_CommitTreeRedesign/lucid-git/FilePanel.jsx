// FilePanel.jsx — FileTree + CommitBox
function FilePanel({ stagedFiles, unstagedFiles, selectedPath, onSelect, onStageAll, onUnstageAll, onStageFile, onUnstageFile, commitMsg, onCommitMsg, onCommit, isCommitting }) {
  const T = window.T

  const fileName = path => path.split('/').pop()
  const dirPath  = path => { const p = path.split('/'); p.pop(); return p.join('/') }

  const StatusPill = ({ status }) => (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 18, height: 18, borderRadius: 4, flexShrink: 0,
      background: T.statusBg(status),
      color: T.statusColor(status),
      fontFamily: T.mono, fontSize: 11, fontWeight: 700,
    }}>{status}</span>
  )

  const LockBadge = ({ lock }) => {
    if (!lock) return null
    const mine = lock.mine
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 3,
        paddingLeft: 5, paddingRight: 6, height: 16, borderRadius: 10,
        background: mine ? T.greenDim : T.orangeDim,
        border: `1px solid ${mine ? 'rgba(46,197,115,0.35)' : 'rgba(232,98,47,0.35)'}`,
        color: mine ? T.green : T.orange,
        fontFamily: T.mono, fontSize: 10, fontWeight: 600, flexShrink: 0,
      }}>
        <span style={{ fontSize: 10 }}>🔒</span>
        {mine ? 'You' : lock.owner}
      </span>
    )
  }

  const Checkbox = ({ checked, onChange, color, disabled }) => {
    const [hover, setHover] = React.useState(false)
    const c = color || T.green
    return (
      <button
        onClick={e => { e.stopPropagation(); if (!disabled) onChange(!checked) }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        disabled={disabled}
        style={{
          width: 16, height: 16, borderRadius: 3, flexShrink: 0,
          border: `1.5px solid ${checked ? c : hover ? T.border2 : T.border}`,
          background: checked ? `${c}22` : hover ? T.bg4 : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'all 0.12s', padding: 0,
          opacity: disabled ? 0.4 : 1,
        }}
      >
        {checked && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <polyline points="1.5,5 4,7.5 8.5,2.5"
              stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
    )
  }

  const FileRow = ({ file, isStaged }) => {
    const [hover, setHover] = React.useState(false)
    const isSelected = selectedPath === file.path
    const lockedByOther = file.lock && !file.lock.mine

    const handleCheckbox = (checked) => {
      if (isStaged) onUnstageFile(file)
      else onStageFile(file)
    }

    return (
      <div
        onClick={() => onSelect(file)}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          height: T.rowH, paddingLeft: 10, paddingRight: 10,
          background: isSelected ? T.bg4 : hover ? T.bgHover : 'transparent',
          borderLeft: `2px solid ${isSelected ? T.orange : 'transparent'}`,
          cursor: 'pointer', transition: 'background 0.1s',
          borderBottom: `1px solid ${T.border}`,
          opacity: lockedByOther ? 0.75 : 1,
        }}
      >
        <Checkbox
          checked={isStaged}
          onChange={handleCheckbox}
          color={isStaged ? T.green : T.yellow}
          disabled={lockedByOther}
        />
        <StatusPill status={file.status} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              fontFamily: T.mono, fontSize: 12, fontWeight: 500, color: T.text1,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{fileName(file.path)}</span>
            <LockBadge lock={file.lock} />
          </div>
          <CopyChip text={file.path} display={dirPath(file.path)} mono muted
            style={{ fontSize: 10, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }} />
        </div>

        <span style={{
          fontFamily: T.mono, fontSize: 10, color: T.text3, flexShrink: 0,
        }}>{file.size}</span>
      </div>
    )
  }

  const SectionCheckbox = ({ allChecked, onToggle, color }) => {
    const [hover, setHover] = React.useState(false)
    return (
      <button
        onClick={onToggle}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          width: 16, height: 16, borderRadius: 3, flexShrink: 0,
          border: `1.5px solid ${allChecked ? color : hover ? T.border2 : T.border}`,
          background: allChecked ? `${color}22` : hover ? T.bg4 : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', transition: 'all 0.12s', padding: 0,
        }}
      >
        {allChecked && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <polyline points="1.5,5 4,7.5 8.5,2.5"
              stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {!allChecked && hover && (
          <svg width="8" height="2" viewBox="0 0 8 2" fill="none">
            <line x1="0" y1="1" x2="8" y2="1" stroke={T.text3} strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        )}
      </button>
    )
  }

  const SectionHeader = ({ label, count, allChecked, onToggleAll, color }) => (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      height: T.sectionH, paddingLeft: 10, paddingRight: 10,
      background: T.bg1, borderBottom: `1px solid ${T.border}`,
      position: 'sticky', top: 0, zIndex: 5,
    }}>
      <SectionCheckbox allChecked={allChecked} onToggle={onToggleAll} color={color} />
      <span style={{
        fontFamily: T.ui, fontSize: 11, fontWeight: 600,
        color: T.text2, letterSpacing: '0.05em', textTransform: 'uppercase', flex: 1,
      }}>
        {label}
        <span style={{
          marginLeft: 6, fontFamily: T.mono,
          background: T.bg4, color: T.text3,
          borderRadius: 8, paddingLeft: 5, paddingRight: 5,
          fontSize: 10,
        }}>{count}</span>
      </span>
    </div>
  )

  const canCommit = commitMsg.trim().length > 0 && stagedFiles.length > 0 && !isCommitting

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        height: 38, paddingLeft: 10, paddingRight: 10,
        borderBottom: `1px solid ${T.border}`, background: T.bg1, flexShrink: 0,
      }}>
        <ActionBtn label="Stage All" onClick={onStageAll}
          disabled={unstagedFiles.length === 0} />
        <ActionBtn label="Discard All" danger
          onClick={() => {}} disabled={unstagedFiles.length === 0} />
        <ActionBtn label="Stash…" onClick={() => {}} />
      </div>

      {/* File list */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {/* Staged */}
        {stagedFiles.length > 0 && (
          <section>
            <SectionHeader
              label="Staged" count={stagedFiles.length}
              allChecked={true} onToggleAll={onUnstageAll}
              color={T.green}
            />
            {stagedFiles.map(f => <FileRow key={f.path} file={f} isStaged />)}
          </section>
        )}

        {/* Unstaged / Changes */}
        {unstagedFiles.length > 0 && (
          <section>
            <SectionHeader
              label="Changes" count={unstagedFiles.length}
              allChecked={false} onToggleAll={onStageAll}
              color={T.yellow}
            />
            {unstagedFiles.map(f => <FileRow key={f.path} file={f} isStaged={false} />)}
          </section>
        )}

        {stagedFiles.length === 0 && unstagedFiles.length === 0 && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', height: 180, gap: 6,
          }}>
            <span style={{ fontSize: 20 }}>✓</span>
            <span style={{ fontFamily: T.ui, fontSize: 13, color: T.green }}>Working directory clean</span>
            <span style={{ fontFamily: T.ui, fontSize: 12, color: T.text3 }}>No changes detected</span>
          </div>
        )}
      </div>

      {/* Commit box */}
      <div style={{
        borderTop: `1px solid ${T.border}`,
        padding: 10, display: 'flex', flexDirection: 'column', gap: 8,
        background: T.bg2, flexShrink: 0,
      }}>
        <textarea
          value={commitMsg}
          onChange={e => onCommitMsg(e.target.value)}
          placeholder={stagedFiles.length > 0
            ? 'Commit message  (Ctrl+Enter)'
            : 'Stage files to commit…'}
          disabled={stagedFiles.length === 0}
          rows={3}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: T.bg1, border: `1px solid ${stagedFiles.length > 0 ? T.border2 : T.border}`,
            borderRadius: T.r2, padding: '8px 10px',
            fontFamily: T.ui, fontSize: 13, color: T.text1,
            resize: 'none', outline: 'none',
            lineHeight: 1.5,
            transition: 'border-color 0.15s',
            opacity: stagedFiles.length === 0 ? 0.5 : 1,
          }}
          onFocus={e => e.target.style.borderColor = T.orange}
          onBlur={e => e.target.style.borderColor = stagedFiles.length > 0 ? T.border2 : T.border}
        />
        <button
          onClick={onCommit}
          disabled={!canCommit}
          style={{
            width: '100%', height: 36, borderRadius: T.r2,
            background: canCommit ? T.orange : T.bg3,
            border: `1px solid ${canCommit ? T.orange : T.border}`,
            color: canCommit ? '#fff' : T.text3,
            fontFamily: T.ui, fontSize: 13, fontWeight: 600,
            cursor: canCommit ? 'pointer' : 'not-allowed',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => { if (canCommit) e.currentTarget.style.background = '#d5561e' }}
          onMouseLeave={e => { if (canCommit) e.currentTarget.style.background = T.orange }}
        >
          {isCommitting
            ? 'Committing…'
            : stagedFiles.length > 0
              ? `Commit ${stagedFiles.length} file${stagedFiles.length !== 1 ? 's' : ''}`
              : 'Commit'}
        </button>
      </div>
    </div>
  )
}

function ActionBtn({ label, onClick, disabled, danger }) {
  const T = window.T
  const [hover, setHover] = React.useState(false)
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        height: 24, paddingLeft: 8, paddingRight: 8, borderRadius: T.r1,
        border: `1px solid ${danger ? (hover ? T.red : 'rgba(232,69,69,0.4)') : (hover ? T.border2 : T.border)}`,
        background: danger && hover ? T.redDim : hover ? T.bg4 : 'transparent',
        color: danger ? (hover ? T.red : 'rgba(232,69,69,0.7)') : hover ? T.text1 : T.text2,
        fontFamily: T.ui, fontSize: 12,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: 'all 0.12s ease',
      }}
    >{label}</button>
  )
}

Object.assign(window, { FilePanel, ActionBtn })
