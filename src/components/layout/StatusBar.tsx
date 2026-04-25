import React, { useEffect } from 'react'
import { useRepoStore } from '@/stores/repoStore'
import { useOperationStore } from '@/stores/operationStore'
import { useAuthStore } from '@/stores/authStore'

export function StatusBar() {
  const { currentBranch, repoPath } = useRepoStore()
  const { isRunning, label, latestStep } = useOperationStore()
  const { repoPermissions, permissionFetching, fetchRepoPermission } = useAuthStore()

  useEffect(() => {
    if (repoPath) fetchRepoPermission(repoPath)
  }, [repoPath])

  const permission = repoPath ? repoPermissions[repoPath] : undefined
  const fetching   = repoPath ? permissionFetching[repoPath] : false

  const progress   = latestStep?.progress
  const stepLabel  = latestStep?.label ?? label
  const stepDetail = latestStep?.detail

  // Show detail text; append "X%" only when the detail doesn't already contain one
  const displayText = stepDetail
    ? progress !== undefined && !stepDetail.includes('%')
      ? `${stepDetail}  ${progress}%`
      : stepDetail
    : progress !== undefined
      ? `${stepLabel}  ${progress}%`
      : stepLabel

  return (
    <footer style={{
      position: 'relative', display: 'flex', flexDirection: 'column',
      background: '#161a27', borderTop: '1px solid #252d42',
      flexShrink: 0, overflow: 'hidden', zIndex: 10,
    }}>
      {/* Progress strip */}
      <div style={{ height: 2, width: '100%', background: '#252d42', overflow: 'hidden' }}>
        {isRunning && (
          progress !== undefined
            ? <div style={{ height: '100%', background: '#e8622f', width: `${progress}%`, transition: 'width 0.3s ease' }} />
            : <div style={{
                height: '100%', width: '30%',
                background: 'linear-gradient(90deg, transparent, #e8622f, transparent)',
                animation: 'sweep 1.4s ease-in-out infinite',
              }} />
        )}
      </div>

      {/* Content row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 28, paddingLeft: 16, paddingRight: 16 }}>
        {/* Left: branch */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {currentBranch ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#4d9dff' }}>
              <BranchIcon />
              {currentBranch}
            </span>
          ) : (
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#4e5870' }}>
              {repoPath ? 'No branch' : 'No repository'}
            </span>
          )}
        </div>

        {/* Right: permission badge + status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {repoPath && (
            fetching
              ? <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#4e5870' }}>checking…</span>
              : permission === 'admin'
                ? <PermBadge label="Admin" color="#2ec573" bg="rgba(46,197,115,0.15)" title="You have admin access to this repository" />
                : permission === 'write'
                  ? <PermBadge label="Collaborator" color="#8b94b0" bg="rgba(139,148,176,0.1)" title="You have write access (collaborator)" />
                  : null
          )}
          {isRunning ? (
            <span style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#e8622f',
              animation: 'pulse 1.6s ease-in-out infinite',
              maxWidth: 480, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {displayText}
            </span>
          ) : (
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#4e5870' }}>
              Ready
            </span>
          )}
        </div>
      </div>
    </footer>
  )
}

function PermBadge({ label, color, bg, title }: { label: string; color: string; bg: string; title: string }) {
  return (
    <span
      title={title}
      style={{
        display: 'inline-flex', alignItems: 'center',
        paddingLeft: 6, paddingRight: 6, height: 16, borderRadius: 10,
        background: bg, border: `1px solid ${color}44`,
        color, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 600,
        cursor: 'default', userSelect: 'none', flexShrink: 0,
      }}
    >{label}</span>
  )
}

function BranchIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="5" cy="4"  r="1.75" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="5" cy="12" r="1.75" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="11" cy="4" r="1.75" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 5.75V10.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M5 5.75C5 7.5 11 7.5 11 5.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
