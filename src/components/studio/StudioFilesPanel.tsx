import React, { useEffect, useMemo, useState } from 'react'
import { ipc, StudioFileRef } from '@/ipc'
import { ActionBtn } from '@/components/ui/ActionBtn'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

function fileAge(ts: number): string {
  const days = Math.floor((Date.now() - ts) / 86_400_000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  return `${days} days ago`
}

export function StudioFilesPanel() {
  const [files, setFiles] = useState<StudioFileRef[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    ipc.studioFilesList()
      .then(setFiles)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return files
    return files.filter(file =>
      file.name.toLowerCase().includes(q) ||
      file.path.toLowerCase().includes(q) ||
      file.mimeHint.toLowerCase().includes(q)
    )
  }, [files, query])

  const addFile = async () => {
    const filePath = await ipc.openFile()
    if (!filePath) return
    const file = await ipc.studioFileAdd(filePath)
    setFiles(prev => [file, ...prev.filter(item => item.id !== file.id)])
  }

  const removeFile = async (id: string) => {
    await ipc.studioFileRemove(id)
    setFiles(prev => prev.filter(file => file.id !== id))
  }

  return (
    <div style={{ flex: 1, overflow: 'auto', background: 'var(--lg-bg-primary)' }}>
      <div style={{ maxWidth: 1040, margin: '0 auto', padding: '32px 28px 44px' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 18, marginBottom: 18 }}>
          <div>
            <div style={{ fontFamily: 'var(--lg-font-mono)', fontSize: 11, color: 'var(--lg-text-secondary)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>
              Local-first storage
            </div>
            <h1 style={{ margin: 0, fontSize: 26, color: 'var(--lg-text-primary)', letterSpacing: 0 }}>Files</h1>
            <p style={{ margin: '8px 0 0', color: 'var(--lg-text-secondary)', lineHeight: 1.55, maxWidth: 640 }}>
              Index local files without moving them. These references are sync-ready metadata for future cloud backup and shared workspaces.
            </p>
          </div>
          <ActionBtn onClick={addFile}>Add File</ActionBtn>
        </header>

        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search files"
            style={{
              flex: 1, height: 34, background: '#0d1018', border: '1px solid var(--lg-border)',
              borderRadius: 6, color: 'var(--lg-text-primary)', padding: '0 11px', outline: 'none',
            }}
          />
          <div style={{
            height: 34, minWidth: 92, display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid var(--lg-border)', borderRadius: 6, color: 'var(--lg-text-secondary)',
            fontFamily: 'var(--lg-font-mono)', fontSize: 11,
          }}>
            {filtered.length} files
          </div>
        </div>

        <section style={{
          border: '1px solid var(--lg-border)', borderRadius: 8, overflow: 'hidden',
          background: 'var(--lg-bg-secondary)', boxShadow: 'var(--lg-shadow-card)',
        }}>
          {loading ? (
            <EmptyRow text="Loading files..." />
          ) : filtered.length === 0 ? (
            <EmptyRow text={files.length === 0 ? 'No files indexed yet.' : 'No files match your search.'} />
          ) : (
            filtered.map((file, index) => (
              <div
                key={file.id}
                style={{
                  display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) 110px 100px 210px',
                  gap: 12, alignItems: 'center', minHeight: 54, padding: '9px 12px',
                  borderTop: index === 0 ? 'none' : '1px solid var(--lg-border)',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: 'var(--lg-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</div>
                  <div style={{ color: '#4a566a', fontSize: 11, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.path}</div>
                </div>
                <Badge text={file.mimeHint} />
                <div style={{ color: 'var(--lg-text-secondary)', fontFamily: 'var(--lg-font-mono)', fontSize: 11 }}>{formatBytes(file.sizeBytes)}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 7 }}>
                  <span style={{ color: '#4a566a', fontSize: 11, marginRight: 4 }}>{fileAge(file.updatedAt)}</span>
                  <ActionBtn size="sm" onClick={() => { void ipc.openPath(file.path) }}>Open</ActionBtn>
                  <ActionBtn size="sm" ghost onClick={() => { void ipc.showInFolder(file.path) }}>Reveal</ActionBtn>
                  <ActionBtn size="sm" ghost color="#e84040" onClick={() => { void removeFile(file.id) }}>Remove</ActionBtn>
                </div>
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  )
}

function Badge({ text }: { text: string }) {
  return (
    <span style={{
      justifySelf: 'start', height: 22, display: 'inline-flex', alignItems: 'center',
      border: '1px solid var(--lg-border)', borderRadius: 999, padding: '0 8px',
      color: 'var(--lg-text-secondary)', background: '#0d1018', fontSize: 11,
    }}>
      {text}
    </span>
  )
}

function EmptyRow({ text }: { text: string }) {
  return (
    <div style={{ padding: 28, color: 'var(--lg-text-secondary)', textAlign: 'center' }}>
      {text}
    </div>
  )
}
