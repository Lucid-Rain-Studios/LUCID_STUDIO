import React, { useCallback, useEffect, useRef, useState } from 'react'
import { ipc, CommitEntry, CommitFileChange } from '@/ipc'
import { useOperationStore } from '@/stores/operationStore'
import { cn } from '@/lib/utils'
import { computeGraph, GraphNode, LANE_W, ROW_H, DOT_R, LineSegment } from './graphLayout'

interface HistoryPanelProps {
  repoPath: string
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function timeAgo(ts: number): string {
  const s = (Date.now() - ts) / 1000
  if (s < 60)     return 'just now'
  if (s < 3600)   return `${Math.floor(s / 60)}m ago`
  if (s < 86400)  return `${Math.floor(s / 3600)}h ago`
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`
  return new Date(ts).toLocaleDateString()
}

// ── Graph SVG cell ────────────────────────────────────────────────────────────

const GRAPH_COL_W = 100  // fixed px width for the graph column (clips at ~7 lanes)

function linePath(seg: LineSegment, isTop: boolean): string {
  const x1 = seg.from * LANE_W + LANE_W / 2
  const x2 = seg.to   * LANE_W + LANE_W / 2
  const y1 = isTop ? 0       : ROW_H / 2
  const y2 = isTop ? ROW_H / 2 : ROW_H
  if (x1 === x2) return `M ${x1} ${y1} L ${x2} ${y2}`
  // Cubic bezier → smooth S-curve between lanes
  return `M ${x1} ${y1} C ${x1} ${y2} ${x2} ${y1} ${x2} ${y2}`
}

function GraphCell({ node }: { node: GraphNode }) {
  const cx = node.lane * LANE_W + LANE_W / 2
  const cy = ROW_H / 2

  return (
    <svg
      width={GRAPH_COL_W}
      height={ROW_H}
      className="shrink-0"
      style={{ overflow: 'visible' }}
    >
      {node.topLines.map((seg, i) => (
        <path key={`t${i}`} d={linePath(seg, true)}
          stroke={seg.color} strokeWidth={1.75} fill="none" />
      ))}
      {node.bottomLines.map((seg, i) => (
        <path key={`b${i}`} d={linePath(seg, false)}
          stroke={seg.color} strokeWidth={1.75} fill="none" />
      ))}
      <circle cx={cx} cy={cy} r={DOT_R} fill={node.color} />
    </svg>
  )
}

// ── Commit row ────────────────────────────────────────────────────────────────

function CommitRow({
  node, selected, onClick,
}: {
  node: GraphNode
  selected: boolean
  onClick: () => void
}) {
  const { commit } = node
  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-center cursor-pointer border-b border-lg-border/25',
        'hover:bg-lg-bg-secondary transition-colors select-none',
        selected && 'bg-lg-bg-elevated',
      )}
      style={{ height: ROW_H }}
    >
      {/* Graph column — clipped to fixed width */}
      <div className="shrink-0 overflow-hidden" style={{ width: GRAPH_COL_W, height: ROW_H }}>
        <GraphCell node={node} />
      </div>

      {/* Commit message + meta */}
      <div className="flex-1 min-w-0 flex flex-col justify-center px-2">
        <span className="text-[11px] font-mono text-lg-text-primary truncate leading-tight">
          {commit.message}
        </span>
        <span className="text-[9px] font-mono text-lg-text-secondary/70 truncate">
          {commit.author} · {timeAgo(commit.timestamp)}
        </span>
      </div>

      {/* Short hash */}
      <span className="shrink-0 px-2 text-[9px] font-mono text-lg-text-secondary/40">
        {commit.hash.slice(0, 7)}
      </span>
    </div>
  )
}

// ── Commit detail ─────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  M: 'text-lg-warning',
  A: 'text-lg-success',
  D: 'text-lg-error',
  R: 'text-[#4a9eff]',
  C: 'text-[#9b59b6]',
  T: 'text-lg-text-secondary',
}

function FileRow({ file }: { file: CommitFileChange }) {
  const label = file.oldPath ? `${file.oldPath} → ${file.path}` : file.path
  return (
    <div className="flex items-center gap-2 px-4 py-1 border-b border-lg-border/20 hover:bg-lg-bg-secondary">
      <span className={cn('text-[10px] font-mono font-bold w-4 shrink-0 text-center',
        STATUS_COLOR[file.status] ?? 'text-lg-text-secondary')}>
        {file.status}
      </span>
      <span className="text-[11px] font-mono text-lg-text-primary truncate" title={label}>
        {label}
      </span>
    </div>
  )
}

function CommitDetail({
  commit, files, filesLoading,
}: {
  commit: CommitEntry
  files: CommitFileChange[]
  filesLoading: boolean
}) {
  const fullDate = new Date(commit.timestamp).toLocaleString()

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b border-lg-border space-y-1.5 bg-lg-bg-secondary">
        <div>
          <span className="text-[9px] font-mono text-lg-text-secondary/60 bg-lg-border/40 px-1.5 py-0.5 rounded">
            {commit.hash}
          </span>
        </div>
        <p className="text-[13px] font-mono text-lg-text-primary font-semibold leading-snug">
          {commit.message}
        </p>
        <p className="text-[10px] font-mono text-lg-text-secondary">
          {commit.author} &lt;{commit.email}&gt;
        </p>
        <p className="text-[10px] font-mono text-lg-text-secondary/70">{fullDate}</p>
      </div>

      {/* Files changed */}
      <div className="px-4 py-1.5 bg-lg-bg-secondary border-b border-lg-border shrink-0">
        <span className="text-[10px] font-mono uppercase tracking-widest text-lg-text-secondary">
          Files changed {!filesLoading && files.length > 0 && `(${files.length})`}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filesLoading ? (
          <p className="text-[10px] font-mono text-lg-text-secondary animate-pulse px-4 py-3">
            Loading…
          </p>
        ) : files.length === 0 ? (
          <p className="text-[10px] font-mono text-lg-text-secondary/60 px-4 py-3">
            No file changes
          </p>
        ) : (
          files.map((f, i) => <FileRow key={i} file={f} />)
        )}
      </div>
    </div>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────────

const INITIAL_LIMIT = 300
const MORE_INCREMENT = 300

export function HistoryPanel({ repoPath }: HistoryPanelProps) {
  const opRun = useOperationStore(s => s.run)

  const [nodes,        setNodes]        = useState<GraphNode[]>([])
  const [totalLoaded,  setTotalLoaded]  = useState(0)
  const [loading,      setLoading]      = useState(false)
  const [limitRef]                      = useState({ current: INITIAL_LIMIT })

  const [selected,     setSelected]     = useState<CommitEntry | null>(null)
  const [files,        setFiles]        = useState<CommitFileChange[]>([])
  const [filesLoading, setFilesLoading] = useState(false)

  const loadHistory = useCallback(async (limit: number) => {
    setLoading(true)
    try {
      const commits = await opRun(
        'Loading history…',
        () => ipc.log(repoPath, { limit, all: true }),
      )
      setNodes(computeGraph(commits))
      setTotalLoaded(commits.length)
    } finally {
      setLoading(false)
    }
  }, [repoPath, opRun])

  useEffect(() => {
    limitRef.current = INITIAL_LIMIT
    setSelected(null)
    setFiles([])
    loadHistory(INITIAL_LIMIT)
  }, [repoPath])

  const handleLoadMore = () => {
    limitRef.current += MORE_INCREMENT
    loadHistory(limitRef.current)
  }

  const handleSelect = async (commit: CommitEntry) => {
    if (selected?.hash === commit.hash) return
    setSelected(commit)
    setFiles([])
    setFilesLoading(true)
    try {
      const result = await ipc.commitFiles(repoPath, commit.hash)
      setFiles(result)
    } catch {
      setFiles([])
    } finally {
      setFilesLoading(false)
    }
  }

  return (
    <div className="flex-1 flex overflow-hidden">

      {/* ── Left: commit list ─────────────────────────────────────────────── */}
      <div className="w-[420px] shrink-0 flex flex-col border-r border-lg-border overflow-hidden">
        {/* Sub-header */}
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-lg-border bg-lg-bg-secondary shrink-0">
          <span className="text-[10px] font-mono uppercase tracking-widest text-lg-text-secondary">
            {totalLoaded > 0 ? `${totalLoaded} commits` : 'History'}
          </span>
          <button
            onClick={() => loadHistory(limitRef.current)}
            disabled={loading}
            className="text-[10px] font-mono text-lg-text-secondary hover:text-lg-accent disabled:opacity-40 transition-colors"
          >
            {loading ? 'Loading…' : '↺ Refresh'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && nodes.length === 0 && (
            <p className="text-[10px] font-mono text-lg-text-secondary animate-pulse px-3 py-4">
              Loading history…
            </p>
          )}

          {nodes.map(node => (
            <CommitRow
              key={node.commit.hash}
              node={node}
              selected={selected?.hash === node.commit.hash}
              onClick={() => handleSelect(node.commit)}
            />
          ))}

          {/* Load more */}
          {!loading && totalLoaded >= limitRef.current && (
            <button
              onClick={handleLoadMore}
              className="w-full py-2 text-[10px] font-mono text-lg-text-secondary hover:text-lg-accent transition-colors border-t border-lg-border"
            >
              Load more…
            </button>
          )}
        </div>
      </div>

      {/* ── Right: commit detail ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selected ? (
          <CommitDetail
            commit={selected}
            files={files}
            filesLoading={filesLoading}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-[11px] font-mono text-lg-text-secondary">
              Select a commit to view details
            </p>
          </div>
        )}
      </div>

    </div>
  )
}
