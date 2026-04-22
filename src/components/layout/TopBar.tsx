import React, { useState, useEffect, useCallback } from 'react'
import { ipc, SyncStatus, UpdateInfo } from '@/ipc'
import { useRepoStore } from '@/stores/repoStore'
import { useAuthStore } from '@/stores/authStore'
import { useOperationStore } from '@/stores/operationStore'
import { AccountSwitcher } from '@/components/auth/AccountSwitcher'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import { cn } from '@/lib/utils'
import { useErrorStore } from '@/stores/errorStore'

interface TopBarProps {
  onOpen:       () => void
  onClone:      () => void
  onAddAccount: () => void
  onSynced?:    () => void   // called after pull/push so Changes tab refreshes
}

export function TopBar({ onOpen, onClone, onAddAccount, onSynced }: TopBarProps) {
  const { repoPath, currentBranch, refreshStatus } = useRepoStore()
  const { accounts, currentAccountId } = useAuthStore()

  const [showSwitcher, setShowSwitcher] = useState(false)
  const [sync, setSync]       = useState<SyncStatus | null>(null)
  const [syncOp, setSyncOp]   = useState<'idle' | 'fetching' | 'pulling' | 'pushing'>('idle')
  const [syncErr, setSyncErr] = useState<string | null>(null)
  const opRun   = useOperationStore(s => s.run)
  const pushErr = useErrorStore(s => s.pushRaw)

  const [updateInfo, setUpdateInfo]     = useState<UpdateInfo | null>(null)
  const [updateReady, setUpdateReady]   = useState(false)
  const [updateDismissed, setUpdateDismissed] = useState(false)
  const [downloading, setDownloading]   = useState(false)

  const loadSync = useCallback(async () => {
    if (!repoPath) return
    try {
      const s = await ipc.getSyncStatus(repoPath)
      setSync(s)
    } catch { /* no upstream is fine */ }
  }, [repoPath])

  useEffect(() => {
    setSync(null)
    setSyncErr(null)
    if (repoPath) loadSync()
  }, [repoPath, currentBranch])

  // ── Update events ────────────────────────────────────────────────────────
  useEffect(() => {
    const unsubAvail = ipc.onUpdateAvailable((info: UpdateInfo) => {
      setUpdateInfo(info)
      setUpdateDismissed(false)
    })
    const unsubReady = ipc.onUpdateReady(() => {
      setUpdateReady(true)
      setDownloading(false)
    })
    return () => { unsubAvail(); unsubReady() }
  }, [])

  const handleDownload = async () => {
    setDownloading(true)
    try { await ipc.updateDownload() } catch { setDownloading(false) }
  }

  const handleInstall = () => ipc.updateInstall()

  const doFetch = async () => {
    if (!repoPath || syncOp !== 'idle') return
    setSyncOp('fetching')
    setSyncErr(null)
    try {
      await opRun('Fetching…', () => ipc.fetch(repoPath))
      await loadSync()
    } catch (e) { const s = String(e); setSyncErr(s); pushErr(s) }
    finally { setSyncOp('idle') }
  }

  const doPull = async () => {
    if (!repoPath || syncOp !== 'idle') return
    setSyncOp('pulling')
    setSyncErr(null)
    try {
      await opRun('Pulling…', () => ipc.pull(repoPath))
      await loadSync()
      await refreshStatus()
      onSynced?.()
    } catch (e) { const s = String(e); setSyncErr(s); pushErr(s) }
    finally { setSyncOp('idle') }
  }

  const doPush = async () => {
    if (!repoPath || syncOp !== 'idle') return
    setSyncOp('pushing')
    setSyncErr(null)
    try {
      await opRun('Pushing…', () => ipc.push(repoPath))
      await loadSync()
    } catch (e) { const s = String(e); setSyncErr(s); pushErr(s) }
    finally { setSyncOp('idle') }
  }

  // Decide what the primary sync button does
  const syncLabel = (() => {
    if (syncOp === 'fetching') return 'Fetching…'
    if (syncOp === 'pulling')  return 'Pulling…'
    if (syncOp === 'pushing')  return 'Pushing…'
    if (!sync?.hasUpstream)    return 'Fetch'
    if (sync.behind > 0)       return `Pull  ↓${sync.behind}`
    if (sync.ahead  > 0)       return `Push  ↑${sync.ahead}`
    return 'Fetch'
  })()

  const syncAction = (() => {
    if (!sync?.hasUpstream) return doFetch
    if (sync.behind > 0)    return doPull
    if (sync.ahead  > 0)    return doPush
    return doFetch
  })()

  const repoName = repoPath
    ? (repoPath.replace(/\\/g, '/').split('/').pop() ?? repoPath)
    : null

  const currentAccount = accounts.find(a => a.userId === currentAccountId)

  const showBanner = !updateDismissed && (updateReady || !!updateInfo)

  return (
    <>
    {showBanner && (
      <div className={cn(
        'flex items-center justify-between px-4 py-1 text-[10px] font-mono shrink-0',
        updateReady
          ? 'bg-lg-success/15 border-b border-lg-success/30 text-lg-success'
          : 'bg-lg-accent-secondary/15 border-b border-lg-accent-secondary/30 text-lg-accent-secondary'
      )}>
        <span>
          {updateReady
            ? `Update v${updateInfo?.version ?? ''} downloaded and ready to install`
            : `Update v${updateInfo?.version ?? ''} available`}
        </span>
        <div className="flex items-center gap-2">
          {!updateReady && (
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="px-2 h-5 rounded border border-current/50 hover:bg-current/10 disabled:opacity-40 transition-colors"
            >
              {downloading ? 'Downloading…' : 'Download'}
            </button>
          )}
          {updateReady && (
            <button
              onClick={handleInstall}
              className="px-2 h-5 rounded border border-current/50 hover:bg-current/10 transition-colors font-semibold"
            >
              Restart &amp; Install
            </button>
          )}
          <button
            onClick={() => setUpdateDismissed(true)}
            className="opacity-50 hover:opacity-100 transition-opacity"
          >
            ✕
          </button>
        </div>
      </div>
    )}
    <header className="flex items-center justify-between h-10 bg-lg-bg-secondary border-b border-lg-border px-4 shrink-0 relative">
      {/* Left: wordmark + repo + branch */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="font-mono text-sm font-bold text-lg-accent shrink-0 tracking-wider">
          LUCID GIT
        </span>

        {repoName ? (
          <>
            <span className="text-lg-border select-none shrink-0">›</span>
            <span className="text-xs font-mono text-lg-text-primary truncate">{repoName}</span>
            {currentBranch && (
              <>
                <span className="text-lg-border select-none shrink-0">@</span>
                <span className="text-xs font-mono text-[#4a9eff] shrink-0">{currentBranch}</span>
              </>
            )}
          </>
        ) : (
          <>
            <span className="text-lg-border select-none shrink-0">|</span>
            <span className="text-xs font-mono text-lg-text-secondary">No repository</span>
          </>
        )}
      </div>

      {/* Right: quick actions + account */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Open / Clone quick buttons when no repo */}
        {!repoPath && (
          <>
            <button
              onClick={onOpen}
              className="px-2 h-7 rounded text-[11px] font-mono text-lg-text-secondary hover:text-lg-text-primary hover:bg-lg-bg-elevated transition-colors"
            >
              Open
            </button>
            <button
              onClick={onClone}
              className="px-2 h-7 rounded text-[11px] font-mono text-lg-accent border border-lg-accent/40 hover:bg-lg-accent/10 transition-colors"
            >
              Clone
            </button>
          </>
        )}

        {/* Sync button — Fetch / Pull / Push */}
        {repoPath && (
          <div className="flex items-center gap-px">
            {/* Primary action */}
            <button
              onClick={syncAction}
              disabled={syncOp !== 'idle'}
              title={syncErr ?? undefined}
              className={cn(
                'h-7 px-2.5 rounded-l text-[11px] font-mono border transition-colors disabled:opacity-60',
                syncErr
                  ? 'border-lg-error/50 text-lg-error hover:bg-lg-error/10'
                  : sync?.behind
                    ? 'border-lg-warning/50 text-lg-warning hover:bg-lg-warning/10'
                    : sync?.ahead
                      ? 'border-lg-success/50 text-lg-success hover:bg-lg-success/10'
                      : 'border-lg-border text-lg-text-secondary hover:border-lg-accent hover:text-lg-accent'
              )}
            >
              {syncErr ? '⚠ Sync error' : syncLabel}
            </button>

            {/* Secondary: always-available individual fetch/pull/push after first fetch */}
            {sync && (
              <>
                {sync.behind > 0 && syncOp === 'idle' && (
                  <button
                    onClick={doPull}
                    title="Pull"
                    className="h-7 px-1.5 border-y border-lg-warning/50 text-lg-warning hover:bg-lg-warning/10 text-[10px] font-mono transition-colors"
                  >↓</button>
                )}
                {sync.ahead > 0 && syncOp === 'idle' && (
                  <button
                    onClick={doPush}
                    title="Push"
                    className="h-7 px-1.5 border-y border-lg-success/50 text-lg-success hover:bg-lg-success/10 text-[10px] font-mono transition-colors"
                  >↑</button>
                )}
              </>
            )}

            {/* Reload sync status */}
            <button
              onClick={loadSync}
              disabled={syncOp !== 'idle'}
              title="Refresh sync status"
              className="h-7 px-1.5 rounded-r border border-lg-border text-lg-text-secondary hover:border-lg-accent hover:text-lg-accent disabled:opacity-40 text-[10px] font-mono transition-colors"
            >
              ↺
            </button>
          </div>
        )}

        {/* Notification bell */}
        <NotificationBell />

        {/* Account */}
        {currentAccount ? (
          <button
            onClick={() => setShowSwitcher(s => !s)}
            className="flex items-center gap-2 px-2 h-8 rounded hover:bg-lg-bg-elevated transition-colors"
            title={`Signed in as @${currentAccount.login}`}
          >
            <img
              src={currentAccount.avatarUrl}
              alt={currentAccount.login}
              className="w-5 h-5 rounded-full bg-lg-border"
            />
            <span className="text-xs font-mono text-lg-text-secondary">
              @{currentAccount.login}
            </span>
          </button>
        ) : (
          <button
            onClick={onAddAccount}
            className="flex items-center gap-2 px-2 h-8 rounded text-lg-text-secondary hover:text-lg-text-primary hover:bg-lg-bg-elevated transition-colors"
            title="Sign in"
          >
            <div className="w-5 h-5 rounded-full bg-lg-border flex items-center justify-center text-[10px] font-mono">
              ?
            </div>
            <span className="text-xs font-mono">Sign in</span>
          </button>
        )}
      </div>

      {/* Account switcher dropdown */}
      {showSwitcher && (
        <AccountSwitcher
          onAddAccount={onAddAccount}
          onClose={() => setShowSwitcher(false)}
        />
      )}
    </header>
    </>
  )
}
