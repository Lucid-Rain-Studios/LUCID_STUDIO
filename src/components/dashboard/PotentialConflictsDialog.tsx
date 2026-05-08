import React, { useEffect, useMemo, useState } from 'react'
import { PotentialMergeConflictReport } from '@/ipc'
import { FilePathText } from '@/components/ui/FilePathText'
import { ActionBtn } from '@/components/ui/ActionBtn'
import { useDialogOverlayDismiss } from '@/lib/useDialogOverlayDismiss'

interface PotentialConflictsDialogProps {
  report: PotentialMergeConflictReport
  onClose: () => void
  onRunDeepCheck: () => void
  deepChecking: boolean
}

function timeAgo(ts: number): string {
  const s = (Date.now() - ts) / 1000
  if (s < 60)     return 'just now'
  if (s < 3600)   return `${Math.floor(s / 60)}m ago`
  if (s < 86400)  return `${Math.floor(s / 3600)}h ago`
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`
  return new Date(ts).toLocaleDateString()
}

export function PotentialConflictsDialog({ report, onClose, onRunDeepCheck, deepChecking }: PotentialConflictsDialogProps) {
  const overlayDismiss = useDialogOverlayDismiss(onClose)
  const [filter, setFilter] = useState('')
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    report.branchesWithConflicts.forEach((b, i) => { initial[b.branch] = i < 3 })
    return initial
  })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const branches = report.branchesWithConflicts
  const totalFileOverlap = useMemo(() => new Set(branches.flatMap(b => b.files)).size, [branches])

  const visibleBranches = useMemo(() => {
    if (!filter.trim()) return branches
    const q = filter.toLowerCase()
    return branches
      .map(b => ({
        ...b,
        files: b.files.filter(f => f.toLowerCase().includes(q)),
      }))
      .filter(b => b.branch.toLowerCase().includes(q) || b.files.length > 0)
  }, [branches, filter])

  const toggle = (branch: string) => setExpanded(prev => ({ ...prev, [branch]: !prev[branch] }))
  const expandAll   = () => setExpanded(Object.fromEntries(branches.map(b => [b.branch, true])))
  const collapseAll = () => setExpanded(Object.fromEntries(branches.map(b => [b.branch, false])))

  const modeLabel = report.mode === 'deep' ? 'In-depth check' : 'Fetch check'

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.62)',
        fontFamily: 'var(--lg-font-ui)',
      }}
      {...overlayDismiss}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 720, maxWidth: '94vw', maxHeight: '82vh',
          display: 'flex', flexDirection: 'column',
          background: '#131720',
          border: '1px solid #1f2738',
          borderRadius: 12,
          boxShadow: '0 20px 50px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.03)',
          overflow: 'hidden',
        }}
      >
        {/* ── Header ──────────────────────────────────────────── */}
        <div style={{
          padding: '14px 18px 12px',
          borderBottom: '1px solid #1a2030',
          background: 'linear-gradient(180deg, rgba(232,69,69,0.06), rgba(232,69,69,0))',
          display: 'flex', alignItems: 'flex-start', gap: 12,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: 'rgba(232,69,69,0.12)', border: '1px solid rgba(232,69,69,0.28)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#e84545', fontSize: 16, fontWeight: 700,
          }}>!</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#d8dfee', letterSpacing: '-0.01em' }}>
              Potential Merge Conflicts
            </div>
            <div style={{ fontFamily: 'var(--lg-font-mono)', fontSize: 10.5, color: '#5a6880', marginTop: 3 }}>
              {modeLabel} · {branches.length} branch{branches.length !== 1 ? 'es' : ''} · {totalFileOverlap} file{totalFileOverlap !== 1 ? 's' : ''} of yours · checked {timeAgo(report.checkedAt)}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: '#5a6880', fontSize: 18, fontFamily: 'var(--lg-font-mono)',
              lineHeight: 1, padding: 4, marginTop: -2,
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#c8d0e8')}
            onMouseLeave={e => (e.currentTarget.style.color = '#5a6880')}
          >×</button>
        </div>

        {/* ── Toolbar ────────────────────────────────────────── */}
        <div style={{
          padding: '10px 18px',
          borderBottom: '1px solid #1a2030',
          background: 'rgba(0,0,0,0.12)',
          display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
        }}>
          <input
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Filter by branch or file…"
            style={{
              flex: 1,
              background: '#0d0f15',
              border: '1px solid #1d2535',
              borderRadius: 6,
              padding: '6px 10px',
              fontSize: 11.5,
              fontFamily: 'var(--lg-font-mono)',
              color: '#c8d0e8',
              outline: 'none',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = '#2d3850')}
            onBlur={e => (e.currentTarget.style.borderColor = '#1d2535')}
          />
          <button
            onClick={expandAll}
            style={toolBtnStyle}
          >Expand all</button>
          <button
            onClick={collapseAll}
            style={toolBtnStyle}
          >Collapse all</button>
        </div>

        {/* ── Body ──────────────────────────────────────────── */}
        <div style={{
          flex: 1, minHeight: 0, overflowY: 'auto',
          padding: '8px 8px 12px',
        }}>
          {branches.length === 0 ? (
            <EmptyState />
          ) : visibleBranches.length === 0 ? (
            <NoMatchesState />
          ) : (
            visibleBranches.map(branch => {
              const isOpen = expanded[branch.branch] ?? false
              return (
                <div
                  key={branch.branch}
                  style={{
                    margin: '6px 10px',
                    background: '#0f131c',
                    border: '1px solid #1a2030',
                    borderRadius: 8,
                    overflow: 'hidden',
                  }}
                >
                  <button
                    onClick={() => toggle(branch.branch)}
                    style={{
                      width: '100%',
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 12px',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      color: '#c8d0e8',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span style={{
                      width: 14, color: '#5a6880', fontSize: 10,
                      fontFamily: 'var(--lg-font-mono)', flexShrink: 0,
                      transform: isOpen ? 'rotate(90deg)' : 'none',
                      transition: 'transform 0.12s ease',
                    }}>▸</span>

                    <span style={{
                      fontFamily: 'var(--lg-font-mono)', fontSize: 12,
                      color: '#e8a565', fontWeight: 600,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      flex: 1, minWidth: 0,
                    }}>{branch.branch}</span>

                    <span style={{
                      fontFamily: 'var(--lg-font-mono)', fontSize: 9, fontWeight: 700,
                      letterSpacing: '0.06em',
                      padding: '2px 6px', borderRadius: 3, flexShrink: 0,
                      background: branch.isRemote ? 'rgba(74,158,255,0.10)' : 'rgba(123,132,153,0.10)',
                      color:      branch.isRemote ? '#4a9eff' : '#7b8499',
                      border:     `1px solid ${branch.isRemote ? 'rgba(74,158,255,0.25)' : 'rgba(123,132,153,0.25)'}`,
                    }}>{branch.isRemote ? 'REMOTE' : 'LOCAL'}</span>

                    <span style={{
                      fontFamily: 'var(--lg-font-mono)', fontSize: 10.5, fontWeight: 600,
                      color: '#e84545',
                      background: 'rgba(232,69,69,0.10)',
                      border: '1px solid rgba(232,69,69,0.25)',
                      borderRadius: 3,
                      padding: '2px 7px',
                      flexShrink: 0,
                    }}>
                      {branch.files.length} file{branch.files.length !== 1 ? 's' : ''}
                    </span>
                  </button>

                  {isOpen && (
                    <div style={{
                      borderTop: '1px solid #18202e',
                      padding: '6px 0',
                      background: 'rgba(0,0,0,0.18)',
                    }}>
                      {branch.files.map(file => (
                        <div
                          key={file}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '5px 14px 5px 36px',
                          }}
                        >
                          <span style={{
                            width: 5, height: 5, borderRadius: '50%',
                            background: '#e84545', flexShrink: 0,
                            boxShadow: '0 0 6px rgba(232,69,69,0.5)',
                          }} />
                          <FilePathText
                            path={file}
                            style={{
                              fontFamily: 'var(--lg-font-mono)', fontSize: 11,
                              color: '#ff8a8a', flex: 1, minWidth: 0,
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* ── Footer ───────────────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 18px', borderTop: '1px solid #1a2030',
          background: 'rgba(0,0,0,0.18)', flexShrink: 0, gap: 10,
        }}>
          <div style={{ fontFamily: 'var(--lg-font-mono)', fontSize: 10, color: '#5a6880' }}>
            {report.mode === 'deep'
              ? 'In-depth check ran a real merge preview against candidate branches.'
              : 'Fetch check compares your changed files to other branches. Run an in-depth check for a precise preview.'}
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <ActionBtn
              onClick={onRunDeepCheck}
              disabled={deepChecking}
              disabledReason={deepChecking ? 'Conflict check already running' : null}
              color={branches.length > 0 ? '#e84545' : undefined}
              size="sm"
            >
              {deepChecking ? 'Checking…' : report.mode === 'deep' ? 'Re-run In-depth Check' : 'Run In-depth Check'}
            </ActionBtn>
            <ActionBtn onClick={onClose} size="sm">Close</ActionBtn>
          </div>
        </div>
      </div>
    </div>
  )
}

const toolBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid #1d2535',
  borderRadius: 5,
  padding: '5px 9px',
  fontSize: 10.5,
  fontFamily: 'var(--lg-font-mono)',
  color: '#7b8499',
  cursor: 'pointer',
  flexShrink: 0,
}

function EmptyState() {
  return (
    <div style={{
      padding: '40px 16px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
    }}>
      <div style={{ color: '#2dbd6e', fontSize: 28, lineHeight: 1 }}>✓</div>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: '#c8d0e8' }}>No overlapping branches</div>
      <div style={{ fontFamily: 'var(--lg-font-mono)', fontSize: 10.5, color: '#5a6880', textAlign: 'center', maxWidth: 360 }}>
        None of the candidate branches touched the files you have changed locally.
      </div>
    </div>
  )
}

function NoMatchesState() {
  return (
    <div style={{
      padding: '32px 16px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
    }}>
      <div style={{ fontFamily: 'var(--lg-font-mono)', fontSize: 11, color: '#5a6880' }}>
        No branches or files match your filter.
      </div>
    </div>
  )
}
