import React, { useState, useEffect, useRef } from 'react'
import { FileStatus, Lock, ipc } from '@/ipc'
import { useLockStore } from '@/stores/lockStore'
import { cn } from '@/lib/utils'

interface FileRowProps {
  file: FileStatus
  repoPath: string
  selected: boolean
  lock: Lock | null
  currentUserName: string | null
  onSelect: () => void
  onRefresh: () => void
}

const STATUS_COLOR: Record<string, string> = {
  M: 'bg-[#4a9eff]/20 text-[#4a9eff]',
  A: 'bg-lg-success/20 text-lg-success',
  D: 'bg-lg-error/20 text-lg-error',
  R: 'bg-lg-warning/20 text-lg-warning',
  C: 'bg-lg-warning/20 text-lg-warning',
  U: 'bg-lg-error/20 text-lg-error',
  '?': 'bg-lg-text-secondary/10 text-lg-text-secondary',
  '!': 'bg-lg-text-secondary/10 text-lg-text-secondary',
}

function Checkbox({ checked, className }: { checked: boolean; className?: string }) {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" className={className}>
      <rect x="0.75" y="0.75" width="11.5" height="11.5" rx="2"
        stroke="currentColor" strokeWidth="1.25"
        fill={checked ? 'currentColor' : 'none'} fillOpacity={checked ? 0.15 : 0}
      />
      {checked && (
        <polyline points="3,6.5 5.5,9 10,4"
          stroke="currentColor" strokeWidth="1.5"
          strokeLinecap="round" strokeLinejoin="round"
        />
      )}
    </svg>
  )
}

export function FileRow({
  file, repoPath, selected, lock, currentUserName, onSelect, onRefresh,
}: FileRowProps) {
  const { lockFile, unlockFile, watchFile } = useLockStore()

  const effectiveStatus = file.staged ? file.indexStatus : file.workingStatus
  const statusColor     = STATUS_COLOR[effectiveStatus] ?? 'bg-lg-text-secondary/10 text-lg-text-secondary'
  const isUntracked     = effectiveStatus === '?'

  const fileName = file.path.includes('/') || file.path.includes('\\')
    ? file.path.replace(/\\/g, '/').split('/').pop()!
    : file.path
  const dir = file.path.replace(/\\/g, '/').includes('/')
    ? file.path.replace(/\\/g, '/').slice(0, file.path.replace(/\\/g, '/').lastIndexOf('/'))
    : ''

  const fullPath     = `${repoPath.replace(/\\/g, '/')}/${file.path.replace(/\\/g, '/')}`
  const folderPath   = dir ? `${repoPath.replace(/\\/g, '/')}/${dir}` : repoPath.replace(/\\/g, '/')

  const isLockedByMe    = lock !== null && lock.owner.login === currentUserName
  const isLockedByOther = lock !== null && !isLockedByMe

  // ── Context menu ───────────────────────────────────────────────────────────
  const [ctx, setCtx] = useState<{ x: number; y: number } | null>(null)
  const ctxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ctx) return
    const handler = (e: MouseEvent) => {
      if (ctxRef.current && !ctxRef.current.contains(e.target as Node)) setCtx(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [ctx])

  // ── Stage / unstage ────────────────────────────────────────────────────────
  const toggleStage = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isLockedByOther) {
      alert(`Cannot stage "${file.path}" — locked by ${lock!.owner.name}`)
      return
    }
    try {
      if (file.staged) await ipc.unstage(repoPath, [file.path])
      else             await ipc.stage(repoPath, [file.path])
      onRefresh()
    } catch (err) {
      console.error('Stage/unstage error:', err)
    }
  }

  // ── Context menu actions ───────────────────────────────────────────────────
  const close = () => setCtx(null)

  const doDiscard = async () => {
    close()
    const label = isUntracked ? 'Delete' : 'Discard changes to'
    if (!confirm(`${label} "${file.path}"? This cannot be undone.`)) return
    try {
      await ipc.discard(repoPath, [file.path], isUntracked)
      onRefresh()
    } catch (e) { alert(String(e)) }
  }

  const doIgnoreFile = async () => {
    close()
    try { await ipc.addToGitignore(repoPath, file.path); onRefresh() }
    catch (e) { alert(String(e)) }
  }

  const doIgnoreFolder = async () => {
    close()
    if (!dir) return
    try { await ipc.addToGitignore(repoPath, dir + '/'); onRefresh() }
    catch (e) { alert(String(e)) }
  }

  const doCopyFullPath     = () => { close(); navigator.clipboard.writeText(fullPath.replace(/\//g, '\\')) }
  const doCopyRelativePath = () => { close(); navigator.clipboard.writeText(file.path.replace(/\//g, '\\')) }

  const doShowInExplorer = () => { close(); ipc.showInFolder(fullPath.replace(/\//g, '\\')) }
  const doOpenVSCode     = () => { close(); ipc.openExternal(`vscode://file/${fullPath}`) }
  const doOpenDefault    = () => { close(); ipc.openPath(fullPath.replace(/\//g, '\\')) }

  // Lock actions — go through lockStore for instant state update
  const doLock    = async () => { close(); try { await lockFile(repoPath, file.path) } catch (e) { alert(String(e)) } }
  const doUnlock  = async (force = false) => {
    close()
    if (force && !confirm(`Force-unlock "${file.path}" (held by ${lock?.owner.name})?`)) return
    try { await unlockFile(repoPath, file.path, force) } catch (e) { alert(String(e)) }
  }
  const doWatch   = async () => { close(); await watchFile(repoPath, file.path) }

  return (
    <div className="relative">
      <div
        onClick={onSelect}
        onContextMenu={e => { e.preventDefault(); setCtx({ x: e.clientX, y: e.clientY }) }}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-1.5 cursor-pointer transition-colors border-l-2',
          selected
            ? 'bg-lg-bg-elevated border-lg-accent'
            : 'hover:bg-lg-bg-elevated/60 border-transparent'
        )}
        title={file.path}
      >
        {/* Stage/unstage checkbox */}
        <button
          onClick={toggleStage}
          title={file.staged ? 'Click to unstage' : 'Click to stage'}
          className={cn('shrink-0 transition-colors',
            file.staged ? 'text-lg-success' : 'text-lg-border hover:text-lg-text-secondary'
          )}
        >
          <Checkbox checked={file.staged} />
        </button>

        {/* File name + dir */}
        <div className="flex-1 min-w-0">
          <span className={cn('block text-xs font-mono truncate',
            isLockedByOther ? 'text-lg-warning' : 'text-lg-text-primary'
          )}>
            {fileName}
          </span>
          {dir && (
            <span className="block text-[10px] font-mono text-lg-text-secondary truncate">{dir}</span>
          )}
        </div>

        {/* Status pill */}
        <span className={cn('shrink-0 px-1 rounded text-[9px] font-mono font-bold uppercase', statusColor)}>
          {effectiveStatus}
        </span>

        {/* Lock badge */}
        {isLockedByMe    && <span className="shrink-0 text-[11px] text-lg-success" title="Locked by you">🔒</span>}
        {isLockedByOther && <span className="shrink-0 text-[11px]" title={`Locked by ${lock!.owner.name}`}>⚠️</span>}
      </div>

      {/* Context menu */}
      {ctx && (
        <div
          ref={ctxRef}
          style={{ position: 'fixed', top: ctx.y, left: ctx.x }}
          className="z-50 bg-lg-bg-elevated border border-lg-border rounded shadow-xl py-1 min-w-[200px]"
        >
          {/* File actions */}
          <CtxItem label={isUntracked ? 'Delete file…' : 'Discard changes…'} onClick={doDiscard} danger />
          <CtxSep />
          <CtxItem label="Ignore file"   onClick={doIgnoreFile} />
          {dir && <CtxItem label="Ignore folder" onClick={doIgnoreFolder} />}
          <CtxSep />
          <CtxItem label="Copy file path"          onClick={doCopyFullPath} />
          <CtxItem label="Copy relative file path" onClick={doCopyRelativePath} />
          <CtxSep />
          <CtxItem label="Show in Explorer"        onClick={doShowInExplorer} />
          <CtxItem label="Open in VS Code"         onClick={doOpenVSCode} />
          <CtxItem label="Open with default app"   onClick={doOpenDefault} />
          <CtxSep />
          {/* Lock actions */}
          {!lock && <CtxItem label="Lock file" onClick={doLock} />}
          {isLockedByMe && <CtxItem label="Unlock" onClick={() => doUnlock(false)} />}
          {isLockedByOther && (
            <>
              <CtxItem label={`Locked by ${lock!.owner.name}`} disabled />
              <CtxItem label="Force unlock…" onClick={() => doUnlock(true)} danger />
              <CtxItem label="Notify me when unlocked" onClick={doWatch} />
            </>
          )}
        </div>
      )}
    </div>
  )
}

function CtxItem({ label, onClick, disabled, danger }: {
  label: string; onClick?: () => void; disabled?: boolean; danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full text-left px-3 py-1 text-[11px] font-mono transition-colors',
        disabled
          ? 'text-lg-text-secondary/50 cursor-default'
          : danger
            ? 'text-lg-error hover:bg-lg-bg-secondary'
            : 'text-lg-text-primary hover:bg-lg-bg-secondary'
      )}
    >
      {label}
    </button>
  )
}

function CtxSep() {
  return <div className="my-1 border-t border-lg-border/50" />
}
