import React, { useEffect, useState } from 'react'
import { ipc, StashEntry } from '@/ipc'
import { useOperationStore } from '@/stores/operationStore'
import { ActionBtn } from '@/components/ui/ActionBtn'

interface StashPanelProps {
  repoPath: string
  onRefresh: () => void   // called after pop/apply so Changes tab updates
}

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60)    return 'just now'
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export function StashPanel({ repoPath, onRefresh }: StashPanelProps) {
  const [stashes, setStashes]     = useState<StashEntry[]>([])
  const [loading, setLoading]     = useState(false)
  const [message, setMessage]     = useState('')
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [actionId, setActionId]   = useState<number | null>(null)
  const opRun = useOperationStore(s => s.run)

  const load = async () => {
    setLoading(true)
    try {
      setStashes(await ipc.stashList(repoPath))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [repoPath])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      await opRun('Stashing changes…', () => ipc.stashSave(repoPath, message || undefined))
      setMessage('')
      await load()
      onRefresh()
    } catch (e) {
      setError(String(e))
    } finally {
      setSaving(false)
    }
  }

  const handlePop = async (entry: StashEntry) => {
    setActionId(entry.index)
    setError(null)
    try {
      await opRun('Applying stash…', () => ipc.stashPop(repoPath, entry.ref))
      await load()
      onRefresh()
    } catch (e) {
      setError(String(e))
    } finally {
      setActionId(null)
    }
  }

  const handleApply = async (entry: StashEntry) => {
    setActionId(entry.index)
    setError(null)
    try {
      await opRun('Applying stash…', () => ipc.stashApply(repoPath, entry.ref))
      await load()
      onRefresh()
    } catch (e) {
      setError(String(e))
    } finally {
      setActionId(null)
    }
  }

  const handleDrop = async (entry: StashEntry) => {
    if (!confirm(`Drop "${entry.message}"?`)) return
    setActionId(entry.index)
    setError(null)
    try {
      await opRun('Dropping stash…', () => ipc.stashDrop(repoPath, entry.ref))
      await load()
    } catch (e) {
      setError(String(e))
    } finally {
      setActionId(null)
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Create stash */}
      <div className="p-2.5 border-b border-lg-border space-y-2 shrink-0">
        <input
          value={message}
          onChange={e => setMessage(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !saving && handleSave()}
          placeholder="Stash message (optional)"
          className="w-full bg-lg-bg-primary border border-lg-border rounded px-2 py-1.5 text-xs font-mono text-lg-text-primary placeholder:text-lg-text-secondary focus:outline-none focus:border-lg-accent transition-colors"
        />
        <ActionBtn
          onClick={handleSave}
          disabled={saving}
          size="sm"
          style={{ width: '100%', height: 28, fontSize: 11 }}
        >
          {saving ? 'Stashing…' : 'Stash all changes'}
        </ActionBtn>
        {error && (
          <div className="text-[10px] font-mono text-lg-error" title={error}>{error}</div>
        )}
      </div>

      {/* Stash list */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <span className="text-xs font-mono text-lg-text-secondary animate-pulse">Loading…</span>
          </div>
        )}
        {!loading && stashes.length === 0 && (
          <div className="flex items-center justify-center py-8">
            <span className="text-xs font-mono text-lg-text-secondary">No stashes</span>
          </div>
        )}
        {!loading && stashes.map(entry => (
          <div
            key={entry.ref}
            className="px-3 py-2.5 border-b border-lg-border/50 hover:bg-lg-bg-elevated transition-colors"
          >
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="min-w-0">
                <div className="text-[11px] font-mono text-lg-text-primary font-semibold truncate" title={entry.message}>
                  {entry.message}
                </div>
                <div className="text-[9px] font-mono text-lg-text-secondary mt-0.5">
                  {entry.ref}
                  {entry.branch && ` · ${entry.branch}`}
                  {entry.date && ` · ${timeAgo(entry.date)}`}
                </div>
              </div>
            </div>
            <div className="flex gap-1 mt-1.5">
              <StashBtn
                label="Pop"
                busy={actionId === entry.index}
                onClick={() => handlePop(entry)}
                title="Apply and remove from stash list"
              />
              <StashBtn
                label="Apply"
                busy={actionId === entry.index}
                onClick={() => handleApply(entry)}
                title="Apply and keep in stash list"
              />
              <StashBtn
                label="Drop"
                busy={actionId === entry.index}
                onClick={() => handleDrop(entry)}
                danger
                title="Delete this stash"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function StashBtn({
  label, busy, onClick, danger, title,
}: {
  label: string; busy: boolean; onClick: () => void; danger?: boolean; title?: string
}) {
  return (
    <ActionBtn
      onClick={onClick}
      disabled={busy}
      title={title}
      color={danger ? '#e84545' : undefined}
      size="sm"
      style={{ height: 22, paddingLeft: 8, paddingRight: 8, fontSize: 10 }}
    >
      {label}
    </ActionBtn>
  )
}
