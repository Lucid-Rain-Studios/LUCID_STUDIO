// DiffPanel.jsx
function DiffPanel({ file, lines }) {
  const T = window.T

  if (!file) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', flex: 1, gap: 8, color: T.text3,
      }}>
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
          <rect x="7" y="5" width="22" height="26" rx="3" stroke={T.border2} strokeWidth="1.5" />
          <path d="M12 12h12M12 17h8M12 22h10" stroke={T.border2} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <span style={{ fontFamily: T.ui, fontSize: 13 }}>Select a file to view diff</span>
      </div>
    )
  }

  const fileName = file.path.split('/').pop()
  const dirPath  = file.path.split('/').slice(0, -1).join('/')

  const ext = fileName.split('.').pop()
  const langLabel = { cpp: 'C++', h: 'C++', cs: 'C#', py: 'Python', ts: 'TypeScript',
    tsx: 'TSX', js: 'JavaScript', ini: 'INI', uasset: 'UAsset', umap: 'UMap',
    wav: 'Audio' }[ext] || ext?.toUpperCase() || 'TEXT'

  const lineStyle = (type) => {
    const base = {
      display: 'flex', alignItems: 'stretch', minHeight: 22,
      fontFamily: T.mono, fontSize: 12, lineHeight: '22px',
    }
    if (type === 'add')  return { ...base, background: 'rgba(46,197,115,0.08)', borderLeft: `3px solid ${T.green}` }
    if (type === 'del')  return { ...base, background: 'rgba(232,69,69,0.08)',   borderLeft: `3px solid ${T.red}` }
    if (type === 'hunk') return { ...base, background: T.bg3,                    borderLeft: `3px solid ${T.border2}` }
    return                      { ...base, background: 'transparent',             borderLeft: '3px solid transparent' }
  }

  const lineNumStyle = (type) => ({
    display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end',
    width: 40, paddingRight: 10, paddingLeft: 6, flexShrink: 0,
    color: type === 'add' ? 'rgba(46,197,115,0.5)' : type === 'del' ? 'rgba(232,69,69,0.4)' : T.text3,
    borderRight: `1px solid ${T.border}`, userSelect: 'none',
    fontSize: 11,
  })

  const sigil = { add: '+', del: '−', hunk: '@@', ctx: ' ' }

  const addCount = lines.filter(l => l.type === 'add').length
  const delCount = lines.filter(l => l.type === 'del').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', background: T.bg0 }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        height: 44, paddingLeft: 16, paddingRight: 16,
        borderBottom: `1px solid ${T.border}`,
        background: T.bg2, flexShrink: 0,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: T.mono, fontSize: 13, fontWeight: 600, color: T.text1 }}>
              {fileName}
            </span>
            <span style={{
              background: T.bg4, color: T.text3, borderRadius: 4,
              paddingLeft: 6, paddingRight: 6, fontFamily: T.mono,
              fontSize: 10, fontWeight: 600, letterSpacing: '0.05em',
            }}>{langLabel}</span>
            <span style={{ fontFamily: T.mono, fontSize: 11, color: T.green }}>+{addCount}</span>
            <span style={{ fontFamily: T.mono, fontSize: 11, color: T.red }}>−{delCount}</span>
          </div>
          <div style={{ fontFamily: T.mono, fontSize: 10, color: T.text3, marginTop: 1 }}>
            {dirPath}
          </div>
        </div>
        <StatusPillLarge status={file.status} />
      </div>

      {/* Diff content */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: 44 }} /> {/* old line */}
            <col style={{ width: 44 }} /> {/* new line */}
            <col style={{ width: 20 }} /> {/* sigil */}
            <col />                        {/* content */}
          </colgroup>
          <tbody>
            {lines.map((line, i) => (
              <tr key={i} style={lineStyle(line.type)}>
                {/* Old line num */}
                <td style={lineNumStyle(line.type)}>
                  {line.type === 'hunk' ? '' : line.old ?? ''}
                </td>
                {/* New line num */}
                <td style={lineNumStyle(line.type)}>
                  {line.type === 'hunk' ? '' : line.nw ?? ''}
                </td>
                {/* Sigil */}
                <td style={{
                  paddingLeft: 8, paddingRight: 4, flexShrink: 0, width: 20,
                  color: line.type === 'add' ? T.green : line.type === 'del' ? T.red : T.text3,
                  fontFamily: T.mono, fontSize: 12, userSelect: 'none',
                }}>
                  {sigil[line.type] ?? ''}
                </td>
                {/* Code */}
                <td style={{
                  paddingLeft: 4, paddingRight: 16,
                  color: line.type === 'hunk' ? T.text3
                       : line.type === 'add'  ? 'rgba(46,197,115,0.9)'
                       : line.type === 'del'  ? 'rgba(232,69,69,0.85)'
                       : T.text2,
                  fontFamily: T.mono, fontSize: 12,
                  whiteSpace: 'pre', overflow: 'hidden',
                }}>
                  {line.content}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StatusPillLarge({ status }) {
  const T = window.T
  const label = { M: 'Modified', A: 'Added', D: 'Deleted', R: 'Renamed', '?': 'Untracked' }[status] || status
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      paddingLeft: 8, paddingRight: 10, height: 22, borderRadius: 11,
      background: T.statusBg(status),
      border: `1px solid ${T.statusColor(status)}40`,
      color: T.statusColor(status),
      fontFamily: T.ui, fontSize: 11, fontWeight: 600,
    }}>
      <span style={{ fontFamily: T.mono, fontWeight: 700 }}>{status}</span>
      {label}
    </span>
  )
}

Object.assign(window, { DiffPanel, StatusPillLarge })
