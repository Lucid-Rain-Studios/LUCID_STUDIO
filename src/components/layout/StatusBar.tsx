import React from 'react'
import { useRepoStore } from '@/stores/repoStore'
import { useOperationStore } from '@/stores/operationStore'

export function StatusBar() {
  const { currentBranch, repoPath } = useRepoStore()
  const { isRunning, label, latestStep } = useOperationStore()

  const progress  = latestStep?.progress          // 0-100 from IPC ops
  const detail    = latestStep?.detail ?? ''
  const stepLabel = latestStep?.label ?? label

  return (
    <footer className="relative flex flex-col bg-lg-bg-secondary border-t border-lg-border shrink-0 overflow-hidden">

      {/* ── Animated progress strip (top edge) ── */}
      <div className="h-[2px] w-full bg-lg-border/50 overflow-hidden">
        {isRunning && (
          progress !== undefined
            /* Determinate: fill based on % */
            ? <div
                className="h-full bg-lg-accent transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            /* Indeterminate: sweep back and forth */
            : <div
                className="h-full w-[30%] bg-gradient-to-r from-transparent via-lg-accent to-transparent"
                style={{ animation: 'progress-sweep 1.4s ease-in-out infinite' }}
              />
        )}
      </div>

      {/* ── Main bar ── */}
      <div className="flex items-center justify-between h-5 px-3">

        {/* Left: branch */}
        <div className="flex items-center gap-2 min-w-0">
          {currentBranch ? (
            <span className="text-[10px] font-mono text-[#4a9eff] truncate">
              ⎇ {currentBranch}
            </span>
          ) : (
            <span className="text-[10px] font-mono text-lg-text-secondary">
              {repoPath ? 'No branch' : 'No repository'}
            </span>
          )}
        </div>

        {/* Right: operation status */}
        <div className="flex items-center gap-2 min-w-0 shrink-0 max-w-[55%]">
          {isRunning ? (
            <span
              className="text-[10px] font-mono text-lg-accent truncate"
              style={{ animation: 'progress-pulse 1.6s ease-in-out infinite' }}
            >
              {progress !== undefined
                ? `${stepLabel}  ${progress}%`
                : detail
                  ? `${stepLabel} — ${detail}`
                  : stepLabel}
            </span>
          ) : (
            <span className="text-[10px] font-mono text-lg-text-secondary/60">Ready</span>
          )}
        </div>
      </div>
    </footer>
  )
}
