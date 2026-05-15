import { getDb } from '../db/database'

export interface StudioTodo {
  id: string
  title: string
  done: boolean
  createdAt: number
  updatedAt: number
}

export interface StudioTimeEntry {
  id: string
  day: string
  startedAt: number
  stoppedAt: number | null
  durationMs: number
  createdAt: number
  updatedAt: number
}

export interface StudioDashboardData {
  day: string
  todos: StudioTodo[]
  note: string
  timeEntries: StudioTimeEntry[]
  activeTimerStartedAt: number | null
}

type TodoRow = {
  id: string
  title: string
  done: number
  created_at: number
  updated_at: number
}

type TimeEntryRow = {
  id: string
  day: string
  started_at: number
  stopped_at: number | null
  duration_ms: number
  created_at: number
  updated_at: number
}

const WORKSPACE_ID = 'local'

function makeId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

function writeChange(entityType: string, entityId: string, operation: string, payload: unknown): void {
  getDb().prepare(`
    INSERT INTO studio_sync_changes (entity_type, entity_id, operation, changed_at, payload)
    VALUES (?, ?, ?, ?, ?)
  `).run(entityType, entityId, operation, Date.now(), JSON.stringify(payload))
}

export class StudioService {
  dashboard(day: string): StudioDashboardData {
    const db = getDb()
    const todos = db.prepare(`
      SELECT id, title, done, created_at, updated_at
      FROM studio_todos
      WHERE workspace_id = ? AND deleted_at IS NULL
      ORDER BY done ASC, created_at DESC
    `).all(WORKSPACE_ID) as TodoRow[]

    const note = db.prepare(`
      SELECT content
      FROM studio_daily_notes
      WHERE workspace_id = ? AND day = ? AND deleted_at IS NULL
    `).get(WORKSPACE_ID, day) as { content: string } | undefined

    const timeEntries = db.prepare(`
      SELECT id, day, started_at, stopped_at, duration_ms, created_at, updated_at
      FROM studio_time_entries
      WHERE workspace_id = ? AND day = ? AND deleted_at IS NULL
      ORDER BY started_at ASC
    `).all(WORKSPACE_ID, day) as TimeEntryRow[]

    return {
      day,
      todos: todos.map(row => ({
        id: row.id,
        title: row.title,
        done: row.done === 1,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
      note: note?.content ?? '',
      timeEntries: timeEntries.map(row => ({
        id: row.id,
        day: row.day,
        startedAt: row.started_at,
        stoppedAt: row.stopped_at,
        durationMs: row.duration_ms,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
      activeTimerStartedAt: timeEntries.find(row => row.stopped_at === null)?.started_at ?? null,
    }
  }

  addTodo(title: string): StudioTodo {
    const now = Date.now()
    const todo: StudioTodo = {
      id: makeId('todo'),
      title: title.trim(),
      done: false,
      createdAt: now,
      updatedAt: now,
    }
    if (!todo.title) throw new Error('Todo title is required')

    getDb().prepare(`
      INSERT INTO studio_todos (id, workspace_id, title, done, created_at, updated_at)
      VALUES (?, ?, ?, 0, ?, ?)
    `).run(todo.id, WORKSPACE_ID, todo.title, now, now)
    writeChange('studio_todo', todo.id, 'create', todo)
    return todo
  }

  updateTodo(id: string, patch: { title?: string; done?: boolean }): StudioTodo {
    const existing = getDb().prepare(`
      SELECT id, title, done, created_at, updated_at
      FROM studio_todos
      WHERE workspace_id = ? AND id = ? AND deleted_at IS NULL
    `).get(WORKSPACE_ID, id) as TodoRow | undefined
    if (!existing) throw new Error(`Todo not found: ${id}`)

    const next = {
      title: patch.title ?? existing.title,
      done: typeof patch.done === 'boolean' ? patch.done : existing.done === 1,
      updatedAt: Date.now(),
    }
    getDb().prepare(`
      UPDATE studio_todos
      SET title = ?, done = ?, updated_at = ?
      WHERE workspace_id = ? AND id = ?
    `).run(next.title, next.done ? 1 : 0, next.updatedAt, WORKSPACE_ID, id)

    const todo = {
      id,
      title: next.title,
      done: next.done,
      createdAt: existing.created_at,
      updatedAt: next.updatedAt,
    }
    writeChange('studio_todo', id, 'update', todo)
    return todo
  }

  deleteTodo(id: string): void {
    const now = Date.now()
    getDb().prepare(`
      UPDATE studio_todos
      SET deleted_at = ?, updated_at = ?
      WHERE workspace_id = ? AND id = ?
    `).run(now, now, WORKSPACE_ID, id)
    writeChange('studio_todo', id, 'delete', { id, deletedAt: now })
  }

  saveDailyNote(day: string, content: string): void {
    const now = Date.now()
    getDb().prepare(`
      INSERT INTO studio_daily_notes (day, workspace_id, content, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(day) DO UPDATE SET
        content = excluded.content,
        updated_at = excluded.updated_at,
        deleted_at = NULL
    `).run(day, WORKSPACE_ID, content, now, now)
    writeChange('studio_daily_note', day, 'upsert', { day, content, updatedAt: now })
  }

  startTimer(day: string): StudioTimeEntry {
    const active = this.dashboard(day).timeEntries.find(entry => entry.stoppedAt === null)
    if (active) return active

    const now = Date.now()
    const entry: StudioTimeEntry = {
      id: makeId('time'),
      day,
      startedAt: now,
      stoppedAt: null,
      durationMs: 0,
      createdAt: now,
      updatedAt: now,
    }
    getDb().prepare(`
      INSERT INTO studio_time_entries (id, workspace_id, day, started_at, stopped_at, duration_ms, created_at, updated_at)
      VALUES (?, ?, ?, ?, NULL, 0, ?, ?)
    `).run(entry.id, WORKSPACE_ID, day, now, now, now)
    writeChange('studio_time_entry', entry.id, 'create', entry)
    return entry
  }

  stopTimer(day: string): StudioTimeEntry | null {
    const active = this.dashboard(day).timeEntries.find(entry => entry.stoppedAt === null)
    if (!active) return null

    const now = Date.now()
    const durationMs = Math.max(0, now - active.startedAt)
    getDb().prepare(`
      UPDATE studio_time_entries
      SET stopped_at = ?, duration_ms = ?, updated_at = ?
      WHERE workspace_id = ? AND id = ?
    `).run(now, durationMs, now, WORKSPACE_ID, active.id)

    const entry = { ...active, stoppedAt: now, durationMs, updatedAt: now }
    writeChange('studio_time_entry', active.id, 'update', entry)
    return entry
  }
}

export const studioService = new StudioService()
