import React, { useState } from 'react'
import { FileStatus, Lock, ipc } from '@/ipc'
import { useOperationStore } from '@/stores/operationStore'
import { FileRow } from './FileRow'

interface FileTreeProps {
  files: FileStatus[]
  repoPath: string
  selectedPath: string | null
  locks: Lock[]
  currentUserName: string | null
  onSelect: (file: FileStatus) => void
  onRefresh: () => void
}

// Small SVG checkbox matching FileRow's style
function SectionCheckbox({ checked, onClick, title }: {
  checked: boolean
  onClick: () => void
  title: string
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`shrink-0 transition-colors ${
        checked ? 'text-lg-success' : 'text-lg-border hover:text-lg-text-secondary'
      }`}
    >
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
        <rect
          x="0.75" y="0.75" width="11.5" height="11.5" rx="2"
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
    </button>
  )
}

export function FileTree({
  files,
  repoPath,
  selectedPath,
  locks,
  currentUserName,
  onSelect,
  onRefresh,
}: FileTreeProps) {
  const staged   = files.filter(f => f.staged)
  const unstaged = files.filter(f => !f.staged)
  const [busy, setBusy] = useState(false)
  const opRun = useOperationStore(s => s.run)

  const lockFor = (file: FileStatus): Lock | null =>
    locks.find(l => l.path === file.path) ?? null

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(true)
    try { await opRun(label, fn) } catch (e) { alert(String(e)) } finally { setBusy(false) }
    onRefresh()
  }

  if (files.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-1">
          <div className="text-lg-success text-xs font-mono">✓ Working directory clean</div>
          <div className="text-lg-text-secondary text-[10px] font-mono">No changes detected</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* ── Action toolbar ────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-lg-border shrink-0 flex-wrap">
        {unstaged.length > 0 && (
          <ActionBtn
            label="Stage all"
            disabled={busy}
            onClick={() => run('Staging all…', () => ipc.stage(repoPath, unstaged.map(f => f.path)))}
          />
        )}
        {unstaged.some(f => f.workingStatus !== '?') && (
          <ActionBtn
            label="Discard all…"
            disabled={busy}
            danger
            onClick={() => {
              if (!confirm('Discard all working-tree changes? This cannot be undone.')) return
              run('Discarding changes…', () => ipc.discardAll(repoPath))
            }}
          />
        )}
        <ActionBtn
          label="Stash…"
          disabled={busy}
          onClick={async () => {
            const msg = window.prompt('Stash message (optional):') ?? ''
            if (msg === null) return
            run('Stashing…', () => ipc.stashSave(repoPath, msg || undefined))
          }}
        />
      </div>

      {/* ── File sections ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {/* Staged */}
        {staged.length > 0 && (
          <section>
            <div className="sticky top-0 flex items-center gap-2 px-3 py-1 bg-lg-bg-secondary border-b border-lg-border z-10">
              <SectionCheckbox
                checked
                title="Unstage all"
                onClick={() => run('Unstaging all…', () => ipc.unstage(repoPath, staged.map(f => f.path)))}
              />
              <span className="text-[10px] font-mono uppercase tracking-widest text-lg-text-secondary flex-1">
                Staged ({staged.length})
              </span>
            </div>
            {staged.map(file => (
              <FileRow
                key={`staged-${file.path}`}
                file={file}
                repoPath={repoPath}
                selected={selectedPath === file.path && file.staged}
                lock={lockFor(file)}
                currentUserName={currentUserName}
                onSelect={() => onSelect(file)}
                onRefresh={onRefresh}
              />
            ))}
          </section>
        )}

        {/* Unstaged / Untracked */}
        {unstaged.length > 0 && (
          <section>
            <div className="sticky top-0 flex items-center gap-2 px-3 py-1 bg-lg-bg-secondary border-b border-lg-border z-10">
              <SectionCheckbox
                checked={false}
                title="Stage all"
                onClick={() => run('Staging all…', () => ipc.stage(repoPath, unstaged.map(f => f.path)))}
              />
              <span className="text-[10px] font-mono uppercase tracking-widest text-lg-text-secondary flex-1">
                Changes ({unstaged.length})
              </span>
            </div>
            {unstaged.map(file => (
              <FileRow
                key={`unstaged-${file.path}`}
                file={file}
                repoPath={repoPath}
                selected={selectedPath === file.path && !file.staged}
                lock={lockFor(file)}
                currentUserName={currentUserName}
                onSelect={() => onSelect(file)}
                onRefresh={onRefresh}
              />
            ))}
          </section>
        )}
      </div>
    </div>
  )
}

function ActionBtn({
  label, onClick, disabled, danger,
}: {
  label: string; onClick: () => void; disabled?: boolean; danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-2 h-5 rounded text-[10px] font-mono border transition-colors disabled:opacity-40 ${
        danger
          ? 'border-lg-error/40 text-lg-error hover:bg-lg-error/10'
          : 'border-lg-border text-lg-text-secondary hover:border-lg-accent hover:text-lg-accent'
      }`}
    >
      {label}
    </button>
  )
}
