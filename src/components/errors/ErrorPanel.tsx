import React, { useState } from 'react'
import { ipc } from '@/ipc'
import { useErrorStore } from '@/stores/errorStore'
import { useRepoStore } from '@/stores/repoStore'
import { LucidGitError, FixStep, FixAction } from '@/lib/gitErrors'
import { cn } from '@/lib/utils'

interface ErrorPanelProps {
  onReauth: () => void
  onNavigateTab: (tab: string) => void
}

export function ErrorPanel({ onReauth, onNavigateTab }: ErrorPanelProps) {
  const { current, history, dismiss, clearHistory } = useErrorStore()
  const { repoPath, currentBranch } = useRepoStore()

  const [showHistory, setShowHistory] = useState(false)
  const [autoFixBusy, setAutoFixBusy] = useState(false)
  const [autoFixResult, setAutoFixResult] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  // Reset local state when the displayed error changes
  const handleDismiss = () => {
    setAutoFixResult(null)
    setExpanded(false)
    dismiss()
  }

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 1500)
  }

  const dispatch = async (action: FixAction) => {
    if (!repoPath) return
    setAutoFixBusy(true)
    setAutoFixResult(null)
    try {
      switch (action.type) {
        case 'reauth':
          handleDismiss()
          onReauth()
          break

        case 'open-conflict-resolver':
          handleDismiss()
          onNavigateTab('branches')
          break

        case 'run-lfs-migrate':
          await ipc.lfsMigrate(repoPath, action.patterns.length ? action.patterns : ['*.uasset', '*.umap'])
          setAutoFixResult('LFS migration complete. Force-push required.')
          break

        case 'open-settings':
          handleDismiss()
          onNavigateTab('settings')
          break

        case 'set-upstream':
          await ipc.setUpstream(repoPath, currentBranch ?? action.branch)
          setAutoFixResult('Upstream set and branch pushed.')
          break

        case 'abort-rebase':
          await ipc.rebaseAbort(repoPath)
          setAutoFixResult('Rebase aborted.')
          handleDismiss()
          break

        case 'clean-pack-files':
          await ipc.cleanupGc(repoPath, false)
          setAutoFixResult('Git GC complete.')
          break

        case 'increase-buffer':
          await ipc.setGitConfig(repoPath, 'http.postBuffer', '524288000')
          setAutoFixResult('HTTP buffer set to 500 MB. Retry your push.')
          break

        case 'retry-with-ssh':
          setAutoFixResult('Switch the remote URL to SSH:\n  git remote set-url origin git@github.com:org/repo.git')
          break
      }
    } catch (e) {
      setAutoFixResult(`Fix failed: ${String(e)}`)
    } finally {
      setAutoFixBusy(false)
    }
  }

  const severityColor = (s: LucidGitError['severity']) =>
    s === 'fatal' ? 'border-lg-error bg-lg-error/5 text-lg-error' :
    s === 'error' ? 'border-lg-error/70 bg-lg-error/5 text-lg-error' :
                   'border-lg-warning/70 bg-lg-warning/5 text-lg-warning'

  const severityLabel = (s: LucidGitError['severity']) =>
    s === 'fatal' ? 'FATAL' : s === 'error' ? 'ERROR' : 'WARNING'

  const severityDot = (s: LucidGitError['severity']) =>
    s === 'fatal'   ? 'bg-lg-error' :
    s === 'error'   ? 'bg-lg-error' :
                      'bg-lg-warning'

  if (!current && !showHistory) return null

  return (
    <>
      {/* ── Overlay backdrop for history panel ── */}
      {showHistory && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowHistory(false)}
        />
      )}

      {/* ── Slide-up error panel ── */}
      {current && (
        <div className={cn(
          'fixed bottom-6 left-1/2 -translate-x-1/2 z-50',
          'w-full max-w-lg mx-4',
          'rounded-lg border shadow-2xl',
          'font-mono text-[11px]',
          severityColor(current.severity)
        )}>
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-current/20">
            <span className={cn('w-2 h-2 rounded-full shrink-0', severityDot(current.severity))} />
            <span className="text-[9px] tracking-widest uppercase opacity-70">
              {severityLabel(current.severity)} · {current.code}
            </span>
            <span className="flex-1 font-semibold text-[12px]">{current.title}</span>
            <button
              onClick={() => setExpanded(v => !v)}
              className="text-[10px] opacity-60 hover:opacity-100 transition-opacity"
              title="Toggle details"
            >
              {expanded ? '▲' : '▼'}
            </button>
            <button
              onClick={handleDismiss}
              className="text-[10px] opacity-60 hover:opacity-100 transition-opacity ml-1"
              title="Dismiss"
            >
              ✕
            </button>
          </div>

          {/* Body */}
          <div className="px-4 py-2.5 space-y-2">
            <p className="text-[11px] opacity-90">{current.description}</p>

            {/* Causes — collapsed by default */}
            {expanded && current.causes.length > 0 && (
              <div>
                <div className="text-[9px] uppercase tracking-widest opacity-50 mb-1">Likely causes</div>
                <ul className="space-y-0.5">
                  {current.causes.map((c, i) => (
                    <li key={i} className="flex gap-1.5 opacity-75">
                      <span className="shrink-0">·</span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Fix steps */}
            {current.fixes.length > 0 && (
              <div>
                <div className="text-[9px] uppercase tracking-widest opacity-50 mb-1.5">Fixes</div>
                <div className="space-y-1">
                  {current.fixes.map((step, i) => (
                    <FixRow
                      key={i}
                      step={step}
                      busy={autoFixBusy}
                      copied={copied}
                      onDispatch={dispatch}
                      onCopy={copyToClipboard}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Auto-fix result */}
            {autoFixResult && (
              <pre className="text-[10px] opacity-80 whitespace-pre-wrap border-t border-current/20 pt-1.5 mt-1">
                {autoFixResult}
              </pre>
            )}

            {/* Raw output toggle */}
            {expanded && (
              <details className="text-[9px] opacity-60">
                <summary className="cursor-pointer hover:opacity-100">Raw git output</summary>
                <pre className="mt-1 max-h-24 overflow-y-auto whitespace-pre-wrap opacity-80">
                  {current.gitMessage}
                </pre>
              </details>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-1.5 border-t border-current/20 opacity-60">
            <button
              onClick={() => setShowHistory(true)}
              className="text-[9px] hover:opacity-100 transition-opacity"
            >
              Error history ({history.length})
            </button>
            {current.docsUrl && (
              <button
                onClick={() => ipc.openExternal(current.docsUrl!)}
                className="text-[9px] hover:opacity-100 transition-opacity"
              >
                Docs ↗
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Error history panel ── */}
      {showHistory && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-lg-bg-elevated border-t border-lg-border max-h-64 overflow-y-auto font-mono text-[11px]">
          <div className="flex items-center justify-between px-4 py-2 border-b border-lg-border sticky top-0 bg-lg-bg-elevated">
            <span className="text-[10px] uppercase tracking-widest text-lg-text-secondary">
              Error history ({history.length})
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={clearHistory}
                className="text-[10px] text-lg-text-secondary hover:text-lg-error transition-colors"
              >
                Clear
              </button>
              <button
                onClick={() => setShowHistory(false)}
                className="text-[10px] text-lg-text-secondary hover:text-lg-text-primary transition-colors"
              >
                ✕
              </button>
            </div>
          </div>

          {history.length === 0 && (
            <div className="px-4 py-3 text-lg-text-secondary text-[10px]">No errors recorded.</div>
          )}

          {history.map((err, i) => (
            <div
              key={i}
              className="flex items-start gap-3 px-4 py-2 border-b border-lg-border/50 hover:bg-lg-bg-secondary transition-colors cursor-pointer"
              onClick={() => { useErrorStore.getState().push(err); setShowHistory(false) }}
            >
              <span className={cn(
                'text-[9px] px-1.5 py-0.5 rounded shrink-0 mt-0.5',
                err.severity === 'fatal' ? 'bg-lg-error/20 text-lg-error' :
                err.severity === 'error' ? 'bg-lg-error/15 text-lg-error' :
                                           'bg-lg-warning/20 text-lg-warning'
              )}>
                {err.code}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-lg-text-primary font-semibold truncate">{err.title}</div>
                <div className="text-lg-text-secondary text-[10px] truncate">{err.description}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

function FixRow({
  step, busy, copied, onDispatch, onCopy,
}: {
  step: FixStep
  busy: boolean
  copied: string | null
  onDispatch: (a: FixAction) => void
  onCopy: (text: string, key: string) => void
}) {
  const hasAction  = !!step.action
  const hasCommand = !!step.command

  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="shrink-0 opacity-50">→</span>
      <span className="flex-1 opacity-80 truncate">{step.label}</span>
      <div className="flex items-center gap-1 shrink-0">
        {hasCommand && (
          <button
            onClick={() => onCopy(step.command!, `cmd-${step.label}`)}
            title={step.command}
            className="px-1.5 h-5 rounded text-[9px] border border-current/30 hover:border-current/70 transition-colors opacity-70 hover:opacity-100"
          >
            {copied === `cmd-${step.label}` ? '✓ Copied' : 'Copy'}
          </button>
        )}
        {hasAction && (
          <button
            onClick={() => onDispatch(step.action!)}
            disabled={busy}
            className="px-2 h-5 rounded text-[9px] border border-current/50 bg-current/10 hover:bg-current/20 disabled:opacity-40 transition-colors font-semibold"
          >
            {busy ? '…' : 'Fix'}
          </button>
        )}
      </div>
    </div>
  )
}
