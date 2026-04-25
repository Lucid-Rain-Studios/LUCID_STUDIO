import { getDb } from '../db/database'

export interface LockEventRecord {
  repoPath: string
  filePath: string
  eventType: 'locked' | 'unlocked' | 'force-unlocked'
  actorLogin: string
  actorName: string
  timestamp: number
  durationMs: number
}

export interface ConflictEventRecord {
  repoPath: string
  filePath: string
  ourBranch: string
  theirBranch: string
  conflictType: string
  resolved?: boolean
}

export interface HeatmapNode {
  name: string
  path: string
  score: number
  value: number
  lockCount: number
  conflictCount: number
  uniqueContributors: number
  meanDurationMs: number
  children?: HeatmapNode[]
}

export interface HeatmapTimelineEntry {
  id: number
  timestamp: number
  eventType: string
  actor: string
  durationMs: number
  source: 'lock' | 'conflict'
}

// ── Write helpers ─────────────────────────────────────────────────────────────

class HeatmapService {

  recordLockEvent(e: LockEventRecord): void {
    try {
      getDb().prepare(
        'INSERT INTO lock_events (repo_path, file_path, event_type, actor_login, actor_name, timestamp, duration_ms) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(e.repoPath, e.filePath, e.eventType, e.actorLogin, e.actorName, e.timestamp, e.durationMs)
    } catch { /* ignore DB errors — non-critical */ }
  }

  recordConflictEvent(e: ConflictEventRecord): void {
    try {
      getDb().prepare(
        'INSERT INTO conflict_events (repo_path, file_path, our_branch, their_branch, conflict_type, timestamp) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(e.repoPath, e.filePath, e.ourBranch, e.theirBranch, e.conflictType, Date.now())
    } catch { /* ignore */ }
  }

  markConflictsResolved(repoPath: string, ourBranch: string, theirBranch: string): void {
    try {
      getDb().prepare(
        'UPDATE conflict_events SET resolved = 1 WHERE repo_path = ? AND our_branch = ? AND their_branch = ? AND resolved = 0'
      ).run(repoPath, ourBranch, theirBranch)
    } catch { /* ignore */ }
  }

  // ── Query helpers ───────────────────────────────────────────────────────────

  private cutoff(timeWindowDays: number): number {
    if (timeWindowDays <= 0) return 0
    return Date.now() - timeWindowDays * 86_400_000
  }

  computeHeatmap(repoPath: string, timeWindowDays: number, groupBy: 'folder' | 'type'): HeatmapNode {
    const db = getDb()
    const since = this.cutoff(timeWindowDays)

    type LockRow = { file_path: string; lock_count: number; contributors: string; total_duration: number }
    const lockRows = db.prepare(`
      SELECT file_path,
             COUNT(*) as lock_count,
             GROUP_CONCAT(DISTINCT actor_login) as contributors,
             SUM(duration_ms) as total_duration
      FROM lock_events
      WHERE repo_path = ? AND timestamp >= ?
      GROUP BY file_path
    `).all(repoPath, since) as LockRow[]

    type ConflictRow = { file_path: string; conflict_count: number }
    const conflictRows = db.prepare(`
      SELECT file_path, COUNT(*) as conflict_count
      FROM conflict_events
      WHERE repo_path = ? AND timestamp >= ?
      GROUP BY file_path
    `).all(repoPath, since) as ConflictRow[]

    const conflictMap = new Map(conflictRows.map(r => [r.file_path, r.conflict_count]))

    if (lockRows.length === 0 && conflictRows.length === 0) {
      return { name: 'root', path: '', score: 0, value: 1, lockCount: 0, conflictCount: 0, uniqueContributors: 0, meanDurationMs: 0, children: [] }
    }

    // Collect all file paths
    const allPaths = new Set([...lockRows.map(r => r.file_path), ...conflictRows.map(r => r.file_path)])

    // Build raw stats per file
    const fileStats = new Map<string, { lockCount: number; totalDuration: number; contributors: Set<string>; conflictCount: number }>()
    for (const r of lockRows) {
      fileStats.set(r.file_path, {
        lockCount: r.lock_count,
        totalDuration: r.total_duration ?? 0,
        contributors: new Set((r.contributors ?? '').split(',').filter(Boolean)),
        conflictCount: conflictMap.get(r.file_path) ?? 0,
      })
    }
    for (const path of allPaths) {
      if (!fileStats.has(path)) {
        fileStats.set(path, {
          lockCount: 0, totalDuration: 0, contributors: new Set(),
          conflictCount: conflictMap.get(path) ?? 0,
        })
      }
    }

    // Normalize components across all files
    const stats = [...fileStats.entries()]
    const maxLock     = Math.max(1, ...stats.map(([, s]) => s.lockCount))
    const maxDuration = Math.max(1, ...stats.map(([, s]) => s.lockCount > 0 ? s.totalDuration / s.lockCount : 0))
    const maxContrib  = Math.max(1, ...stats.map(([, s]) => s.contributors.size))
    const maxConflict = Math.max(1, ...stats.map(([, s]) => s.conflictCount))

    const nodes: HeatmapNode[] = stats.map(([filePath, s]) => {
      const meanDuration = s.lockCount > 0 ? s.totalDuration / s.lockCount : 0
      const score = Math.round(
        (s.lockCount / maxLock) * 35 +
        (meanDuration / maxDuration) * 25 +
        (s.contributors.size / maxContrib) * 25 +
        (s.conflictCount / maxConflict) * 15
      )
      return {
        name: filePath.replace(/\\/g, '/').split('/').pop() ?? filePath,
        path: filePath,
        score,
        value: Math.max(1, score),
        lockCount: s.lockCount,
        conflictCount: s.conflictCount,
        uniqueContributors: s.contributors.size,
        meanDurationMs: Math.round(meanDuration),
      }
    })

    // Group
    if (groupBy === 'type') {
      return this.groupByType(nodes)
    }
    return this.groupByFolder(nodes)
  }

  private groupByFolder(nodes: HeatmapNode[]): HeatmapNode {
    const groups = new Map<string, HeatmapNode[]>()
    for (const node of nodes) {
      const parts = node.path.replace(/\\/g, '/').split('/')
      const folder = parts.length > 1 ? parts.slice(0, -1).join('/') : '(root)'
      const group = groups.get(folder) ?? []
      group.push(node)
      groups.set(folder, group)
    }
    const children: HeatmapNode[] = [...groups.entries()].map(([folder, items]) => ({
      name: folder.split('/').pop() ?? folder,
      path: folder,
      score: Math.round(items.reduce((a, b) => a + b.score, 0) / items.length),
      value: items.reduce((a, b) => a + b.value, 0),
      lockCount: items.reduce((a, b) => a + b.lockCount, 0),
      conflictCount: items.reduce((a, b) => a + b.conflictCount, 0),
      uniqueContributors: Math.max(...items.map(i => i.uniqueContributors)),
      meanDurationMs: Math.round(items.reduce((a, b) => a + b.meanDurationMs, 0) / items.length),
      children: items,
    }))
    return { name: 'root', path: '', score: 0, value: children.reduce((a, b) => a + b.value, 0), lockCount: 0, conflictCount: 0, uniqueContributors: 0, meanDurationMs: 0, children }
  }

  private groupByType(nodes: HeatmapNode[]): HeatmapNode {
    const groups = new Map<string, HeatmapNode[]>()
    for (const node of nodes) {
      const ext = node.path.split('.').pop()?.toLowerCase() ?? 'other'
      const group = groups.get(ext) ?? []
      group.push(node)
      groups.set(ext, group)
    }
    const children: HeatmapNode[] = [...groups.entries()].map(([ext, items]) => ({
      name: `.${ext}`,
      path: ext,
      score: Math.round(items.reduce((a, b) => a + b.score, 0) / items.length),
      value: items.reduce((a, b) => a + b.value, 0),
      lockCount: items.reduce((a, b) => a + b.lockCount, 0),
      conflictCount: items.reduce((a, b) => a + b.conflictCount, 0),
      uniqueContributors: Math.max(...items.map(i => i.uniqueContributors)),
      meanDurationMs: Math.round(items.reduce((a, b) => a + b.meanDurationMs, 0) / items.length),
      children: items,
    }))
    return { name: 'root', path: '', score: 0, value: children.reduce((a, b) => a + b.value, 0), lockCount: 0, conflictCount: 0, uniqueContributors: 0, meanDurationMs: 0, children }
  }

  topContended(repoPath: string, timeWindowDays: number, limit = 10): HeatmapNode[] {
    const root = this.computeHeatmap(repoPath, timeWindowDays, 'folder')
    const flat: HeatmapNode[] = []
    const collect = (node: HeatmapNode) => {
      if (!node.children) flat.push(node)
      else node.children.forEach(c => collect(c))
    }
    collect(root)
    return flat.sort((a, b) => b.score - a.score).slice(0, limit)
  }

  getTimeline(repoPath: string, filePath: string, timeWindowDays: number): HeatmapTimelineEntry[] {
    const db = getDb()
    const since = this.cutoff(timeWindowDays)

    type LockTimelineRow = { id: number; timestamp: number; event_type: string; actor_login: string; actor_name: string; duration_ms: number }
    const lockRows = db.prepare(
      'SELECT id, timestamp, event_type, actor_login, actor_name, duration_ms FROM lock_events WHERE repo_path = ? AND file_path = ? AND timestamp >= ? ORDER BY timestamp DESC LIMIT 100'
    ).all(repoPath, filePath, since) as LockTimelineRow[]

    type ConflictTimelineRow = { id: number; timestamp: number; their_branch: string; our_branch: string }
    const conflictRows = db.prepare(
      'SELECT id, timestamp, their_branch, our_branch FROM conflict_events WHERE repo_path = ? AND file_path = ? AND timestamp >= ? ORDER BY timestamp DESC LIMIT 50'
    ).all(repoPath, filePath, since) as ConflictTimelineRow[]

    const entries: HeatmapTimelineEntry[] = [
      ...lockRows.map(r => ({
        id: r.id, timestamp: r.timestamp, eventType: r.event_type,
        actor: r.actor_name || r.actor_login, durationMs: r.duration_ms, source: 'lock' as const,
      })),
      ...conflictRows.map(r => ({
        id: r.id, timestamp: r.timestamp, eventType: 'conflict',
        actor: r.their_branch, durationMs: 0, source: 'conflict' as const,
      })),
    ]
    return entries.sort((a, b) => b.timestamp - a.timestamp)
  }
}

export const heatmapService = new HeatmapService()
