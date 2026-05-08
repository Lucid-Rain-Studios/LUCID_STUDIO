import React, { useEffect, useMemo, useState } from 'react'
import { ipc, Lock } from '@/ipc'
import { useRepoStore } from '@/stores/repoStore'
import { useLockStore } from '@/stores/lockStore'
import { useAuthStore } from '@/stores/authStore'
import { useOperationStore } from '@/stores/operationStore'
import { cn } from '@/lib/utils'
import { FilePathText } from '@/components/ui/FilePathText'
import { ActionBtn } from '@/components/ui/ActionBtn'
import { useDialogOverlayDismiss } from '@/lib/useDialogOverlayDismiss'

interface PushBlockedByLocksDialogProps {
  /** The push error message that triggered this dialog. */
  errorMessage: string
  onClose: () => void
  onPushed: () => void
}

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60)     return 'just now'
  if (diff < 3600)   return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h ago`
  return new Date(iso).toLocaleDateString()
}

function normalize(p: string): string {
  return p.replace(/\\/g, '/')
}

export function PushBlockedByLocksDialog({ errorMessage, onClose, onPushed }: PushBlockedByLocksDialogProps) {
  const { repoPath, refreshStatus } = useRepoStore()
  const { locks, loadLocks, unlockFile } = useLockStore()
  const { accounts, currentAccountId } = useAuthStore()
  const opRun = useOperationStore(s => s.run)

  const currentLogin = accounts.find(a => a.userId === currentAccountId)?.login ?? null

  const [loading, setLoading] = useState(true)
  const [aheadFiles, setAheadFiles] = useState<string[]>([])
  const [pushing, setPushing] = useState(false)
  const [unlockingId, setUnlockingId] = useState<string | null>(null)
  const [retryError, setRetryError] = useState<string | null>(null)

  useEffect(() => {
    if (!repoPath) return
    setLoading(true)
    Promise.all([
      ipc.aheadFilePaths(repoPath).catch(() => [] as string[]),
      loadLocks(repoPath),
    ])
      .then(([files]) => setAheadFiles(files.map(normalize)))
      .finally(() => setLoading(false))
  }, [repoPath, loadLocks])

  // Locks that block this push: any lock on a file present in the ahead-commit
  // diff that is owned by someone other than the current user. Locks the user
  // owns themselves don't block their own push, so they're filtered out.
  const blockingLocks = useMemo(() => {
    const ahead = new Set(aheadFiles)
    return locks
      .filter(l => ahead.has(normalize(l.path)))
      .filter(l => !currentLogin || l.owner.login !== currentLogin)
  }, [locks, aheadFiles, currentLogin])

  // The user's own locks on files we're about to push aren't a blocker, but
  // showing them helps explain the situation and lets the user release them
  // if they intend to (e.g. they got the lock pre-push and now want to ship).
  const ownLocksOnPush = useMemo(() => {
    if (!currentLogin) return []
    const ahead = new Set(aheadFiles)
    return locks
      .filter(l => ahead.has(normalize(l.path)))
      .filter(l => l.owner.login === currentLogin)
  }, [locks, aheadFiles, currentLogin])

  const doUnlock = async (lock: Lock, force: boolean) => {
    if (!repoPath) return
    setUnlockingId(lock.id)
    setRetryError(null)
    try {
      await opRun(`Unlocking ${lock.path}…`, () => unlockFile(repoPath, lock.path, force, lock.id))
    } catch (e) {
      setRetryError(String(e))
    } finally {
      setUnlockingId(null)
    }
  }

  const retryPush = async () => {
    if (!repoPath) return
    setPushing(true)
    setRetryError(null)
    try {
      await opRun('Pushing…', () => ipc.push(repoPath))
      await refreshStatus()
      onPushed()
      onClose()
    } catch (e) {
      setRetryError(String(e))
      // Refresh locks in case the server's lock state changed since we opened.
      loadLocks(repoPath).catch(() => {})
    } finally {
      setPushing(false)
    }
  }

  const overlayDismiss = useDialogOverlayDismiss(onClose)
  const canRetry = blockingLocks.length === 0 && !loading

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      {...overlayDismiss}
    >
      <div className="bg-lg-bg-elevated border border-lg-border rounded-lg shadow-2xl w-[660px] max-h-[80vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-lg-border shrink-0">
          <div>
            <div className="text-xs font-mono font-semibold text-lg-text-primary">
              Push blocked by LFS locks
            </div>
            <div className="text-[10px] font-mono text-lg-text-secondary mt-0.5">
              GitHub rejected the push because one or more files in this commit are locked.
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-lg-text-secondary hover:text-lg-text-primary text-lg font-mono leading-none"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <span className="text-xs font-mono text-lg-text-secondary animate-pulse">
                Checking locks…
              </span>
            </div>
          )}

          {!loading && (
            <>
              {/* Server error block */}
              <div className="px-4 py-3 border-b border-lg-border bg-lg-bg-secondary/50">
                <div className="text-[10px] font-mono uppercase tracking-widest text-lg-text-secondary mb-1">
                  Server response
                </div>
                <pre className="text-[11px] font-mono text-lg-error whitespace-pre-wrap break-words leading-snug">
                  {errorMessage.trim()}
                </pre>
              </div>

              {/* Blocking locks */}
              {blockingLocks.length > 0 && (
                <div>
                  <div className="px-4 py-2 border-b border-lg-border bg-lg-warning/5">
                    <span className="text-[10px] font-mono text-lg-warning">
                      ⚠ {blockingLocks.length} file{blockingLocks.length !== 1 ? 's' : ''} locked by other users
                    </span>
                  </div>
                  {blockingLocks.map(lock => (
                    <div key={lock.id} className="px-4 py-3 border-b border-lg-border/50 flex items-start gap-3">
                      <div className="flex-1 min-w-0 space-y-1">
                        <FilePathText path={lock.path} className="block text-xs font-mono text-lg-text-primary truncate" />
                        <div className="text-[10px] font-mono text-lg-text-secondary">
                          Locked by <span className="text-lg-accent">{lock.owner.name || lock.owner.login}</span>
                          <span className="text-lg-text-secondary"> · {timeAgo(lock.lockedAt)}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => doUnlock(lock, true)}
                        disabled={unlockingId === lock.id || pushing}
                        className="px-2 h-6 text-[10px] font-mono border border-lg-error/60 text-lg-error rounded hover:bg-lg-error/10 transition-colors disabled:opacity-40"
                        title="Force-unlock — only do this if you've confirmed with the lock owner that the lock is stale or no longer needed"
                      >
                        {unlockingId === lock.id ? 'Unlocking…' : 'Force-unlock'}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Own locks (informational) */}
              {ownLocksOnPush.length > 0 && (
                <div>
                  <div className="px-4 py-2 border-b border-lg-border bg-lg-bg-secondary/40">
                    <span className="text-[10px] font-mono text-lg-text-secondary">
                      Your locks on files in this push ({ownLocksOnPush.length})
                    </span>
                  </div>
                  {ownLocksOnPush.map(lock => (
                    <div key={lock.id} className="px-4 py-2 border-b border-lg-border/40 flex items-center gap-3">
                      <FilePathText path={lock.path} className="flex-1 min-w-0 text-[11px] font-mono text-lg-text-primary truncate" />
                      <span className="text-[10px] font-mono text-lg-text-secondary">{timeAgo(lock.lockedAt)}</span>
                      <button
                        onClick={() => doUnlock(lock, false)}
                        disabled={unlockingId === lock.id || pushing}
                        className="px-2 h-6 text-[10px] font-mono border border-lg-border text-lg-text-secondary rounded hover:bg-lg-bg-secondary transition-colors disabled:opacity-40"
                      >
                        {unlockingId === lock.id ? 'Unlocking…' : 'Release'}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {blockingLocks.length === 0 && (
                <div className="px-4 py-6 flex flex-col items-center gap-2">
                  <div className="text-lg-success text-2xl">✓</div>
                  <div className="text-xs font-mono text-lg-text-primary font-semibold">No external locks block this push</div>
                  <div className="text-[10px] font-mono text-lg-text-secondary text-center max-w-[420px]">
                    No other user is holding a lock on any file in your unpushed commits. Click "Retry push" to try again — if it still fails, the rejection may be coming from server-side branch protection or another git process on your machine.
                  </div>
                </div>
              )}

              {retryError && (
                <div className="px-4 py-2 text-[11px] font-mono text-lg-error whitespace-pre-wrap border-t border-lg-error/40 bg-lg-error/10">
                  {retryError}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!loading && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-lg-border shrink-0 gap-3">
            <div className="text-[10px] font-mono text-lg-text-secondary">
              {blockingLocks.length > 0
                ? 'Coordinate with the lock owners or force-unlock if you have authority.'
                : 'Locks resolved — retry the push.'}
            </div>
            <div className="flex gap-2 shrink-0">
              <ActionBtn
                onClick={onClose}
                disabled={pushing}
                size="sm"
                style={{ height: 28, paddingLeft: 12, paddingRight: 12, fontSize: 11, fontFamily: 'var(--lg-font-mono)' }}
              >
                Close
              </ActionBtn>
              <button
                onClick={retryPush}
                disabled={pushing || !canRetry}
                className={cn(
                  'px-3 h-7 rounded text-[11px] font-mono transition-colors disabled:opacity-40',
                  canRetry
                    ? 'bg-lg-success/20 border border-lg-success/60 text-lg-success hover:bg-lg-success/30'
                    : 'bg-lg-bg-secondary border border-lg-border text-lg-text-secondary'
                )}
                title={canRetry ? undefined : 'Resolve the blocking locks first'}
              >
                {pushing ? 'Pushing…' : 'Retry push'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
