import React, { useState, useRef, useEffect } from 'react'
import { BranchInfo, ipc } from '@/ipc'
import { useRepoStore } from '@/stores/repoStore'
import { useOperationStore } from '@/stores/operationStore'
import { cn } from '@/lib/utils'

interface BranchPanelProps {
  onMergePreview: (targetBranch: string) => void
  onRefresh: () => void
}

function parseGitHubSlug(remoteUrl: string): string | null {
  const m = remoteUrl.match(/github\.com[/:]([\w.-]+\/[\w.-]+?)(?:\.git)?$/)
  return m ? m[1] : null
}

function TrackPill({ n, dir }: { n: number; dir: 'ahead' | 'behind' }) {
  if (n === 0) return null
  return (
    <span className={cn(
      'shrink-0 px-1 rounded text-[9px] font-mono leading-4',
      dir === 'ahead' ? 'text-lg-success bg-lg-success/10' : 'text-lg-warning bg-lg-warning/10'
    )}>
      {dir === 'ahead' ? '↑' : '↓'}{n}
    </span>
  )
}

function SectionHeader({ label, count }: { label: string; count: number }) {
  return (
    <div className="sticky top-0 z-10 flex items-center gap-2 px-3 py-1 bg-lg-bg-secondary border-b border-lg-border">
      <span className="text-[10px] font-mono uppercase tracking-widest text-lg-text-secondary flex-1">
        {label}
      </span>
      <span className="text-[9px] font-mono text-lg-text-secondary/60">{count}</span>
    </div>
  )
}

export function BranchPanel({ onMergePreview, onRefresh }: BranchPanelProps) {
  const { repoPath, branches, currentBranch, checkout, loadBranches } = useRepoStore()
  const opRun = useOperationStore(s => s.run)

  const [newName, setNewName]               = useState('')
  const [creating, setCreating]             = useState(false)
  const [renamingBranch, setRenamingBranch] = useState<string | null>(null)
  const [renameValue, setRenameValue]       = useState('')
  const [busy, setBusy]                     = useState<string | null>(null)
  const [error, setError]                   = useState<string | null>(null)
  const [updatingMain, setUpdatingMain]     = useState(false)
  const [remoteUrl, setRemoteUrl]           = useState<string | null>(null)
  const renameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!repoPath) return
    ipc.getRemoteUrl(repoPath).then(setRemoteUrl).catch(() => {})
  }, [repoPath])

  useEffect(() => {
    if (renamingBranch) renameInputRef.current?.select()
  }, [renamingBranch])

  const withBusy = async (key: string, fn: () => Promise<void>) => {
    setBusy(key)
    setError(null)
    try {
      await fn()
      await loadBranches()
    } catch (e) {
      setError(String(e))
    } finally {
      setBusy(null)
    }
  }

  // ── Create ──────────────────────────────────────────────────────────────
  const doCreate = async () => {
    const name = newName.trim()
    if (!name || !repoPath) return
    setCreating(true)
    setError(null)
    try {
      await opRun(`Creating branch ${name}…`, () => ipc.createBranch(repoPath, name))
      setNewName('')
      await loadBranches()
      onRefresh()
    } catch (e) {
      setError(String(e))
    } finally {
      setCreating(false)
    }
  }

  // ── Local branch actions ─────────────────────────────────────────────────
  const doCheckoutLocal = async (branch: BranchInfo) => {
    if (branch.current || busy) return
    // repoStore.checkout already calls opRun
    await withBusy(branch.name, () => checkout(branch.name))
    onRefresh()
  }

  const startRename = (branch: BranchInfo) => {
    setRenamingBranch(branch.name)
    setRenameValue(branch.name)
  }

  const doRename = async (oldName: string) => {
    const newVal = renameValue.trim()
    setRenamingBranch(null)
    if (!newVal || newVal === oldName || !repoPath) return
    await withBusy(oldName, () => ipc.renameBranch(repoPath, oldName, newVal))
  }

  const doDeleteLocal = async (branch: BranchInfo) => {
    if (!repoPath) return
    if (!confirm(`Delete local branch "${branch.name}"?`)) return
    setBusy(branch.name)
    setError(null)
    try {
      await ipc.deleteBranch(repoPath, branch.name, false)
      await loadBranches()
    } catch (e) {
      const msg = String(e)
      if (msg.includes('not fully merged') || msg.includes('unmerged')) {
        if (confirm(`"${branch.name}" is not fully merged. Force-delete anyway?`)) {
          try { await ipc.deleteBranch(repoPath, branch.name, true); await loadBranches() }
          catch (e2) { setError(String(e2)) }
        }
      } else {
        setError(msg)
      }
    } finally {
      setBusy(null)
    }
  }

  // ── Remote branch actions ────────────────────────────────────────────────
  const doCheckoutRemote = async (branch: BranchInfo) => {
    if (!repoPath || busy) return
    // Checkout the short display name — git DWIM creates a local tracking branch
    await withBusy(branch.name, () => checkout(branch.displayName))
    onRefresh()
  }

  const doDeleteRemote = async (branch: BranchInfo) => {
    if (!repoPath || !branch.remoteName) return
    if (!confirm(`Delete remote branch "${branch.name}"?\nThis cannot be undone.`)) return
    await withBusy(branch.name, () =>
      opRun(`Deleting ${branch.name}…`, () =>
        ipc.deleteRemoteBranch(repoPath, branch.remoteName!, branch.displayName)
      )
    )
  }

  // ── Update from main ─────────────────────────────────────────────────────
  const doUpdateFromMain = async () => {
    if (!repoPath) return
    setUpdatingMain(true)
    setError(null)
    try {
      await opRun('Updating from main…', () => ipc.updateFromMain(repoPath))
      await loadBranches()
      onRefresh()
    } catch (e) {
      setError(String(e))
    } finally {
      setUpdatingMain(false)
    }
  }

  const openPR = (branchName: string) => {
    if (!remoteUrl) return
    const slug = parseGitHubSlug(remoteUrl)
    if (!slug) return
    ipc.openExternal(`https://github.com/${slug}/compare/${encodeURIComponent(branchName)}?expand=1`)
  }

  const ghSlug = remoteUrl ? parseGitHubSlug(remoteUrl) : null

  const localBranches  = branches.filter(b => !b.isRemote)
    .sort((a, b) => (a.current ? -1 : b.current ? 1 : a.name.localeCompare(b.name)))
  const remoteBranches = branches.filter(b => b.isRemote)
    .sort((a, b) => a.displayName.localeCompare(b.displayName))

  return (
    <div className="flex-1 flex flex-col overflow-hidden">

      {/* ── Create branch ──────────────────────────────────────────────── */}
      <div className="px-3 py-2 border-b border-lg-border shrink-0 space-y-1.5">
        <span className="text-[10px] font-mono uppercase tracking-widest text-lg-text-secondary">
          New branch
        </span>
        <div className="flex gap-1">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && doCreate()}
            placeholder="branch-name"
            className="flex-1 min-w-0 bg-lg-bg-primary border border-lg-border rounded px-2 py-1 text-[11px] font-mono text-lg-text-primary placeholder:text-lg-text-secondary focus:outline-none focus:border-lg-accent transition-colors"
          />
          <button
            onClick={doCreate}
            disabled={!newName.trim() || creating}
            className="shrink-0 px-2 h-7 rounded text-[10px] font-mono border border-lg-border text-lg-text-secondary hover:border-lg-accent hover:text-lg-accent disabled:opacity-40 transition-colors"
          >
            {creating ? '…' : '+ Create'}
          </button>
        </div>
      </div>

      {/* ── Error banner ───────────────────────────────────────────────── */}
      {error && (
        <div className="px-3 py-1.5 text-[10px] font-mono text-lg-error bg-lg-error/10 border-b border-lg-border shrink-0 whitespace-pre-wrap">
          {error}
        </div>
      )}

      {/* ── Scrollable branch lists ─────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">

        {/* ── LOCAL ──────────────────────────────────────────────────────── */}
        <SectionHeader label="Local" count={localBranches.length} />

        {localBranches.length === 0 && (
          <div className="px-3 py-3 text-[10px] font-mono text-lg-text-secondary">No local branches</div>
        )}

        {localBranches.map(branch => {
          const isRenaming = renamingBranch === branch.name
          const isBusy     = busy === branch.name
          return (
            <div
              key={branch.name}
              className={cn(
                'group flex items-center gap-1.5 px-3 py-2 border-b border-lg-border/40 transition-colors min-w-0',
                branch.current ? 'bg-lg-bg-elevated' : 'hover:bg-lg-bg-elevated/60'
              )}
            >
              {/* Current dot */}
              <span className={cn(
                'shrink-0 w-1.5 h-1.5 rounded-full',
                branch.current ? 'bg-lg-accent' : 'bg-lg-border group-hover:bg-lg-text-secondary'
              )} />

              {/* Name / rename */}
              <div className="flex-1 min-w-0">
                {isRenaming ? (
                  <input
                    ref={renameInputRef}
                    value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter')  doRename(branch.name)
                      if (e.key === 'Escape') setRenamingBranch(null)
                    }}
                    onBlur={() => doRename(branch.name)}
                    className="w-full bg-lg-bg-primary border border-lg-accent rounded px-1 py-0 text-[11px] font-mono text-lg-text-primary focus:outline-none"
                  />
                ) : (
                  <button
                    onClick={() => doCheckoutLocal(branch)}
                    disabled={branch.current || !!busy}
                    className={cn(
                      'w-full text-left text-xs font-mono truncate transition-colors disabled:cursor-default',
                      branch.current
                        ? 'text-lg-accent font-semibold cursor-default'
                        : 'text-lg-text-primary hover:text-lg-accent'
                    )}
                    title={branch.current ? 'Current branch' : `Switch to "${branch.name}"`}
                  >
                    {branch.name}
                  </button>
                )}

                {(branch.ahead > 0 || branch.behind > 0) && !isRenaming && (
                  <div className="flex gap-1 mt-0.5">
                    <TrackPill n={branch.ahead}  dir="ahead" />
                    <TrackPill n={branch.behind} dir="behind" />
                  </div>
                )}
              </div>

              {isBusy && (
                <span className="shrink-0 text-[9px] font-mono text-lg-text-secondary animate-pulse">…</span>
              )}

              {!isBusy && !isRenaming && (
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  {ghSlug && (
                    <IconBtn title="Open PR on GitHub" onClick={() => openPR(branch.name)}>PR↗</IconBtn>
                  )}
                  {!branch.current && (
                    <IconBtn title={`Merge "${branch.name}" into ${currentBranch}`} onClick={() => onMergePreview(branch.name)}>
                      ↓merge
                    </IconBtn>
                  )}
                  <IconBtn title="Rename" onClick={() => startRename(branch)}>✎</IconBtn>
                  {!branch.current && (
                    <IconBtn title="Delete local branch" danger onClick={() => doDeleteLocal(branch)}>✕</IconBtn>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {/* ── ORIGIN (remote) ────────────────────────────────────────────── */}
        {remoteBranches.length > 0 && (
          <>
            <SectionHeader label="Origin" count={remoteBranches.length} />

            {remoteBranches.map(branch => {
              const isBusy = busy === branch.name
              return (
                <div
                  key={branch.name}
                  className="group flex items-center gap-1.5 px-3 py-2 border-b border-lg-border/40 hover:bg-lg-bg-elevated/40 transition-colors min-w-0"
                >
                  {/* Remote indicator */}
                  <span className="shrink-0 text-[9px] font-mono text-lg-text-secondary/50 leading-none">
                    ⇡
                  </span>

                  {/* Name + local indicator */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className="text-xs font-mono text-lg-text-secondary truncate"
                        title={branch.name}
                      >
                        {branch.displayName}
                      </span>
                      {branch.hasLocal && (
                        <span className="shrink-0 text-[9px] font-mono text-lg-success/70" title="Local branch exists">
                          ✓ local
                        </span>
                      )}
                    </div>
                    <div className="text-[9px] font-mono text-lg-text-secondary/40 mt-0.5">
                      {branch.remoteName}/{branch.displayName}
                    </div>
                  </div>

                  {isBusy && (
                    <span className="shrink-0 text-[9px] font-mono text-lg-text-secondary animate-pulse">…</span>
                  )}

                  {!isBusy && (
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      {ghSlug && (
                        <IconBtn title="Open PR on GitHub" onClick={() => openPR(branch.displayName)}>PR↗</IconBtn>
                      )}
                      {!branch.hasLocal && (
                        <IconBtn
                          title={`Checkout "${branch.displayName}" (creates local tracking branch)`}
                          onClick={() => doCheckoutRemote(branch)}
                        >
                          checkout
                        </IconBtn>
                      )}
                      {branch.hasLocal && (
                        <IconBtn
                          title={`Switch to local "${branch.displayName}"`}
                          onClick={() => {
                            const local = localBranches.find(b => b.name === branch.displayName)
                            if (local) doCheckoutLocal(local)
                          }}
                        >
                          switch
                        </IconBtn>
                      )}
                      <IconBtn
                        title={`Delete remote branch "${branch.name}"`}
                        danger
                        onClick={() => doDeleteRemote(branch)}
                      >
                        ✕
                      </IconBtn>
                    </div>
                  )}
                </div>
              )
            })}
          </>
        )}

        {remoteBranches.length === 0 && (
          <>
            <SectionHeader label="Origin" count={0} />
            <div className="px-3 py-3 text-[10px] font-mono text-lg-text-secondary">
              No remote branches — fetch to update
            </div>
          </>
        )}

      </div>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <div className="px-3 py-2 border-t border-lg-border shrink-0">
        <button
          onClick={doUpdateFromMain}
          disabled={updatingMain}
          className="w-full h-7 rounded text-[10px] font-mono border border-lg-border text-lg-text-secondary hover:border-lg-accent hover:text-lg-accent disabled:opacity-40 transition-colors"
        >
          {updatingMain ? 'Updating…' : '↓ Update from main'}
        </button>
      </div>
    </div>
  )
}

function IconBtn({
  children, onClick, title, danger,
}: {
  children: React.ReactNode
  onClick: () => void
  title?: string
  danger?: boolean
}) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onClick() }}
      title={title}
      className={cn(
        'px-1.5 h-5 rounded text-[9px] font-mono border transition-colors',
        danger
          ? 'border-lg-error/30 text-lg-error hover:bg-lg-error/10'
          : 'border-lg-border text-lg-text-secondary hover:border-lg-accent hover:text-lg-accent'
      )}
    >
      {children}
    </button>
  )
}
