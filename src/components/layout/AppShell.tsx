import React, { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { ipc, OperationStep, FileStatus, DiffContent, Lock, AppNotification } from '@/ipc'
import { useRepoStore } from '@/stores/repoStore'
import { useOperationStore } from '@/stores/operationStore'
import { useAuthStore } from '@/stores/authStore'
import { useLockStore } from '@/stores/lockStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { useErrorStore } from '@/stores/errorStore'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { StatusBar } from './StatusBar'
import { CloneDialog } from '@/components/repo/CloneDialog'
import { DeviceFlowLogin } from '@/components/auth/DeviceFlowLogin'
import { FileTree } from '@/components/changes/FileTree'
import { CommitBox } from '@/components/changes/CommitBox'
import { StashPanel } from '@/components/changes/StashPanel'
import { BranchPanel } from '@/components/branches/BranchPanel'
import { MergePreviewDialog } from '@/components/merge/MergePreviewDialog'
import { LfsPanel } from '@/components/lfs/LfsPanel'
import { CleanupPanel } from '@/components/cleanup/CleanupPanel'
import { SettingsPage } from '@/components/settings/SettingsPage'
import { HistoryPanel } from '@/components/history/HistoryPanel'
import { UnrealPanel } from '@/components/unreal/UnrealPanel'
import { HooksManager } from '@/components/hooks/HooksManager'
import { ErrorPanel } from '@/components/errors/ErrorPanel'
import { CommandPalette } from '@/components/command-palette/CommandPalette'
import { TextDiff } from '@/components/diff/TextDiff'
import { BinaryDiff } from '@/components/diff/BinaryDiff'

export function AppShell() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [showCloneDialog, setShowCloneDialog]   = useState(false)
  const [showLoginDialog, setShowLoginDialog]   = useState(false)
  const [leftTab, setLeftTab] = useState<'changes' | 'stash' | 'branches' | 'lfs' | 'cleanup' | 'unreal' | 'hooks' | 'settings' | 'history'>('changes')
  const [mergeTarget, setMergeTarget] = useState<string | null>(null)
  const [cmdOpen, setCmdOpen]         = useState(false)

  // Diff panel state
  const [selectedFile, setSelectedFile] = useState<FileStatus | null>(null)
  const [diffContent, setDiffContent]   = useState<DiffContent | null>(null)
  const [diffLoading, setDiffLoading]   = useState(false)

  const { repoPath, fileStatus, isLoading, error, openRepo, refreshStatus } = useRepoStore()
  const { updateStep } = useOperationStore()
  const { loadAccounts, accounts, currentAccountId } = useAuthStore()
  const { locks, loadLocks, setLocks } = useLockStore()
  const { notifications, push: pushNotification } = useNotificationStore()
  const pushError = useErrorStore(s => s.pushRaw)

  const currentUserName = accounts.find(a => a.userId === currentAccountId)?.login ?? null

  // ── IPC event subscriptions ────────────────────────────────────────────────
  useEffect(() => {
    const unsub = ipc.onOperationProgress((step: OperationStep) => updateStep(step))
    return unsub
  }, [updateStep])

  useEffect(() => {
    const unsub = ipc.onLockChanged((updated: Lock[]) => setLocks(updated))
    return unsub
  }, [setLocks])

  useEffect(() => {
    const unsub = ipc.onNotification((n: AppNotification) => pushNotification(n))
    return unsub
  }, [pushNotification])

  // ── Cmd+K / Ctrl+K — command palette ─────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCmdOpen(o => !o)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // ── Startup ────────────────────────────────────────────────────────────────
  useEffect(() => {
    loadAccounts()
  }, [])

  // ── When repo changes ──────────────────────────────────────────────────────
  useEffect(() => {
    setSelectedFile(null)
    setDiffContent(null)

    if (repoPath) {
      loadLocks(repoPath)
      ipc.startLockPolling(repoPath)
      // Load persisted notifications for this repo into the store
      ipc.notificationList(repoPath).then(persisted => {
        // Only load ones not already in the store (avoid duplicates on repo re-open)
        const existingIds = new Set(notifications.map(n => n.id))
        persisted
          .filter(n => !existingIds.has(n.id))
          .forEach(n => pushNotification(n))
      }).catch(() => {})
    }
  }, [repoPath])

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleOpenRepo = async () => {
    const dir = await ipc.openDirectory()
    if (dir) openRepo(dir)
  }

  const handleRefresh = () => {
    setSelectedFile(null)
    setDiffContent(null)
    refreshStatus()
    if (repoPath) loadLocks(repoPath)
  }

  const handleSelectFile = async (file: FileStatus) => {
    setSelectedFile(file)
    setDiffLoading(true)
    setDiffContent(null)
    try {
      const diff = await ipc.diff(repoPath!, file.path, file.staged)
      setDiffContent(diff)
    } catch (e) {
      console.error('Diff error:', e)
    } finally {
      setDiffLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-lg-bg-primary text-lg-text-primary overflow-hidden">
      <TopBar
        onOpen={handleOpenRepo}
        onClone={() => setShowCloneDialog(true)}
        onAddAccount={() => setShowLoginDialog(true)}
        onSynced={handleRefresh}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(c => !c)} />

        <main className="flex-1 flex flex-col overflow-hidden">
          {!repoPath ? (
            /* ── Welcome ── */
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-6">
                <div>
                  <div className="font-mono text-5xl font-bold text-lg-accent tracking-tight">
                    LUCID GIT
                  </div>
                  <div className="text-lg-text-secondary text-sm font-mono mt-2">
                    Git client for game development teams
                  </div>
                </div>

                {error && (
                  <div className="bg-lg-error/10 border border-lg-error/40 rounded px-4 py-2 text-xs font-mono text-lg-error max-w-sm text-left whitespace-pre-wrap">
                    {error}
                  </div>
                )}

                <div className="flex gap-3 justify-center pt-2">
                  <button
                    onClick={handleOpenRepo}
                    className="px-5 py-2 bg-lg-bg-elevated border border-lg-border rounded text-sm font-mono text-lg-text-primary hover:border-lg-accent hover:text-lg-accent transition-colors"
                  >
                    Open Repository
                  </button>
                  <button
                    onClick={() => setShowCloneDialog(true)}
                    className="px-5 py-2 bg-lg-accent rounded text-sm font-mono text-white hover:bg-lg-accent/80 transition-colors"
                  >
                    Clone Repository
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* ── Repo open: split view ── */
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Header with tab bar */}
              <div className="flex items-center justify-between px-3 py-1.5 bg-lg-bg-secondary border-b border-lg-border shrink-0">
                <div className="flex items-center gap-1">
                  {(['changes', 'stash', 'branches', 'lfs', 'cleanup', 'unreal', 'hooks', 'settings', 'history'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setLeftTab(tab)}
                      className={cn(
                        'px-2.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-widest transition-colors',
                        leftTab === tab
                          ? 'bg-lg-accent/20 text-lg-accent'
                          : 'text-lg-text-secondary hover:text-lg-text-primary'
                      )}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
                {leftTab === 'changes' && (
                  <button
                    onClick={handleRefresh}
                    disabled={isLoading}
                    className="text-[10px] font-mono text-lg-text-secondary hover:text-lg-accent transition-colors disabled:opacity-40"
                  >
                    {isLoading ? 'Refreshing…' : 'Refresh'}
                  </button>
                )}
              </div>

              {/* History tab: full-width, no diff panel */}
              {leftTab === 'history' ? (
                <HistoryPanel repoPath={repoPath} />
              ) : (

              /* Split: file list | diff */
              <div className="flex-1 flex overflow-hidden">
                {/* Left: file list + commit box */}
                <div className="w-72 flex flex-col border-r border-lg-border overflow-hidden shrink-0">
                  {leftTab === 'changes' ? (
                    <>
                      <FileTree
                        files={fileStatus}
                        repoPath={repoPath}
                        selectedPath={selectedFile?.path ?? null}
                        locks={locks}
                        currentUserName={currentUserName}
                        onSelect={handleSelectFile}
                        onRefresh={handleRefresh}
                      />
                      <CommitBox />
                    </>
                  ) : leftTab === 'stash' ? (
                    <StashPanel repoPath={repoPath} onRefresh={handleRefresh} />
                  ) : leftTab === 'branches' ? (
                    <BranchPanel
                      onMergePreview={branch => setMergeTarget(branch)}
                      onRefresh={handleRefresh}
                    />
                  ) : leftTab === 'lfs' ? (
                    <LfsPanel repoPath={repoPath} />
                  ) : leftTab === 'cleanup' ? (
                    <CleanupPanel repoPath={repoPath} />
                  ) : leftTab === 'unreal' ? (
                    <UnrealPanel repoPath={repoPath} />
                  ) : leftTab === 'hooks' ? (
                    <HooksManager repoPath={repoPath} />
                  ) : (
                    <SettingsPage repoPath={repoPath} />
                  )}
                </div>

                {/* Right: diff panel */}
                <div className="flex-1 flex flex-col overflow-hidden">
                  {diffLoading && (
                    <div className="flex-1 flex items-center justify-center">
                      <span className="text-xs font-mono text-lg-text-secondary animate-pulse">
                        Loading diff…
                      </span>
                    </div>
                  )}

                  {!diffLoading && diffContent && (
                    diffContent.isBinary
                      ? <BinaryDiff file={selectedFile!} />
                      : <TextDiff diff={diffContent} />
                  )}

                  {!diffLoading && !diffContent && (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-xs font-mono text-lg-text-secondary">
                        Select a file to view its diff
                      </div>
                    </div>
                  )}
                </div>
              </div>
              )} {/* end history ternary */}
            </div>
          )}
        </main>
      </div>

      <StatusBar />

      {showCloneDialog && <CloneDialog onClose={() => setShowCloneDialog(false)} />}
      {showLoginDialog && <DeviceFlowLogin onClose={() => setShowLoginDialog(false)} />}
      {mergeTarget && (
        <MergePreviewDialog
          targetBranch={mergeTarget}
          onClose={() => setMergeTarget(null)}
          onMerged={() => { setMergeTarget(null); handleRefresh() }}
        />
      )}

      <ErrorPanel
        onReauth={() => setShowLoginDialog(true)}
        onNavigateTab={(tab) => setLeftTab(tab as typeof leftTab)}
      />

      <CommandPalette
        open={cmdOpen}
        onClose={() => setCmdOpen(false)}
        onNavigateTab={(tab) => setLeftTab(tab as typeof leftTab)}
        onOpenRepo={handleOpenRepo}
        onClone={() => setShowCloneDialog(true)}
        onAddAccount={() => setShowLoginDialog(true)}
      />
    </div>
  )
}
