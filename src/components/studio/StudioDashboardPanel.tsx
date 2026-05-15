import React, { useEffect, useMemo, useState } from 'react'
import { ActionBtn } from '@/components/ui/ActionBtn'
import { ipc, StudioFileRef, StudioTimeEntry, StudioTodo } from '@/ipc'

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`
  return `${m}m ${String(s).padStart(2, '0')}s`
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${value >= 10 || unit === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unit]}`
}

function greeting(): string {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return 'Good morning'
  if (h >= 12 && h < 18) return 'Good afternoon'
  return 'Good evening'
}

interface StudioDashboardPanelProps {
  onOpenWorkspace: () => void
  onCloneWorkspace: () => void
  onNavigate: (tab: string) => void
}

interface DashboardSummary {
  workspaceName: string
  openTasks: number
  completedTasks: number
  indexedFiles: number
  trackedTodayMs: number
}

const emptySummary: DashboardSummary = {
  workspaceName: 'Local Studio',
  openTasks: 0,
  completedTasks: 0,
  indexedFiles: 0,
  trackedTodayMs: 0,
}

export function StudioDashboardPanel({ onOpenWorkspace, onCloneWorkspace, onNavigate }: StudioDashboardPanelProps) {
  const day = todayKey()
  const [todos, setTodos] = useState<StudioTodo[]>([])
  const [todoText, setTodoText] = useState('')
  const [dailyNote, setDailyNote] = useState('')
  const [timerStart, setTimerStart] = useState<number | null>(null)
  const [timeEntries, setTimeEntries] = useState<StudioTimeEntry[]>([])
  const [recentFiles, setRecentFiles] = useState<StudioFileRef[]>([])
  const [summary, setSummary] = useState<DashboardSummary>(emptySummary)
  const [now, setNow] = useState(Date.now())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ipc.studioDashboardGet(day)
      .then(data => {
        if (cancelled) return
        setTodos(data.todos)
        setDailyNote(data.note)
        setTimeEntries(data.timeEntries)
        setTimerStart(data.activeTimerStartedAt)
        setRecentFiles(data.recentFiles)
        setSummary(data.summary)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [day])

  useEffect(() => {
    if (loading) return
    const id = window.setTimeout(() => {
      ipc.studioNoteSave(day, dailyNote).catch(() => {})
    }, 350)
    return () => window.clearTimeout(id)
  }, [dailyNote, day, loading])

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const openTodos = todos.filter(t => !t.done)
  const doneTodos = todos.filter(t => t.done)
  const elapsed = timerStart ? now - timerStart : 0
  const timeLog = timeEntries.reduce((sum, entry) => sum + entry.durationMs, 0)
  const totalToday = timeLog + elapsed
  const workspaceSummary = {
    ...summary,
    openTasks: openTodos.length,
    completedTasks: doneTodos.length,
    trackedTodayMs: totalToday,
  }

  const focusLabel = useMemo(() => {
    if (openTodos.length === 0) return 'Clear'
    return `${openTodos.length} open`
  }, [openTodos.length])

  const addTodo = async () => {
    const title = todoText.trim()
    if (!title) return
    const todo = await ipc.studioTodoAdd(title)
    setTodos(prev => [todo, ...prev])
    setTodoText('')
  }

  const toggleTodo = async (todo: StudioTodo) => {
    const next = await ipc.studioTodoUpdate(todo.id, { done: !todo.done })
    setTodos(prev => prev.map(item => item.id === todo.id ? next : item))
  }

  const removeTodo = async (id: string) => {
    await ipc.studioTodoDelete(id)
    setTodos(prev => prev.filter(todo => todo.id !== id))
  }

  const startTimer = async () => {
    const entry = await ipc.studioTimerStart(day)
    setTimerStart(entry.startedAt)
    setTimeEntries(prev => prev.some(item => item.id === entry.id) ? prev : [...prev, entry])
  }

  const stopTimer = async () => {
    const entry = await ipc.studioTimerStop(day)
    if (!entry) return
    setTimerStart(null)
    setTimeEntries(prev => prev.map(item => item.id === entry.id ? entry : item))
  }

  return (
    <div style={{ flex: 1, overflow: 'auto', background: 'var(--lg-bg-primary)' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '28px 28px 40px' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', gap: 20, alignItems: 'flex-start', marginBottom: 22 }}>
          <div>
            <div style={{ fontFamily: 'var(--lg-font-mono)', fontSize: 11, color: 'var(--lg-text-secondary)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>
              {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
            </div>
            <h1 style={{ margin: 0, fontSize: 28, lineHeight: 1.15, color: 'var(--lg-text-primary)', letterSpacing: 0 }}>
              {greeting()}
            </h1>
            <div style={{ marginTop: 8, color: 'var(--lg-text-secondary)', fontSize: 13 }}>
              Your local daily workspace is ready. Cloud sync can come later.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <ActionBtn onClick={onOpenWorkspace}>Open Workspace</ActionBtn>
            <ActionBtn onClick={onCloneWorkspace} color="#2dbd6e">Clone Workspace</ActionBtn>
          </div>
        </header>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12, marginBottom: 16 }}>
          <Metric label="Tasks" value={focusLabel} detail={`${doneTodos.length} completed`} />
          <Metric label="Tracked Today" value={formatDuration(totalToday)} detail={timerStart ? 'Timer running' : 'Timer stopped'} />
          <Metric label="Daily Note" value={dailyNote.trim() ? 'Started' : 'Empty'} detail={`${dailyNote.length} characters`} />
          <Metric label="Files" value={`${workspaceSummary.indexedFiles}`} detail="indexed locally" />
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 0.95fr) minmax(380px, 1.25fr)', gap: 14 }}>
          <Panel title="Today">
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input
                value={todoText}
                onChange={e => setTodoText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addTodo() }}
                placeholder="Add a task"
                style={inputStyle}
              />
              <ActionBtn onClick={addTodo} disabled={!todoText.trim()}>Add</ActionBtn>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minHeight: 220 }}>
              {todos.length === 0 ? (
                <EmptyState title="No tasks yet" detail="Capture the first thing that needs your attention today." />
              ) : (
                todos.map(todo => (
                  <TodoRow
                    key={todo.id}
                    todo={todo}
                    onToggle={() => { void toggleTodo(todo) }}
                    onRemove={() => { void removeTodo(todo.id) }}
                  />
                ))
              )}
            </div>
          </Panel>

          <Panel title="Daily Note">
            <textarea
              value={dailyNote}
              onChange={e => setDailyNote(e.target.value)}
              placeholder="Write the shape of the day, meeting notes, loose ideas, or decisions."
              style={{
                width: '100%', minHeight: 286, resize: 'vertical',
                background: '#0d1018', border: '1px solid var(--lg-border)', borderRadius: 7,
                color: 'var(--lg-text-primary)', padding: 12,
                fontFamily: 'var(--lg-font-ui)', fontSize: 13, lineHeight: 1.55,
                outline: 'none',
              }}
            />
          </Panel>
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 0.95fr) minmax(380px, 1.25fr)', gap: 14, marginTop: 14 }}>
          <Panel title="Time">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
              <div>
                <div style={{ fontFamily: 'var(--lg-font-mono)', fontSize: 24, color: 'var(--lg-text-primary)' }}>
                  {formatDuration(totalToday)}
                </div>
                <div style={{ marginTop: 5, color: 'var(--lg-text-secondary)', fontSize: 12 }}>
                  {timerStart ? `Current session ${formatDuration(elapsed)}` : 'Start a focused work session'}
                </div>
              </div>
              {timerStart ? (
                <ActionBtn onClick={stopTimer} color="#e84040">Stop</ActionBtn>
              ) : (
                <ActionBtn onClick={() => { void startTimer() }} color="#2dbd6e">Start</ActionBtn>
              )}
            </div>
          </Panel>

          <Panel title="Modules">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
              <ModuleButton label="Notes" onClick={() => onNavigate('timeline')} />
              <ModuleButton label="Tasks" onClick={() => onNavigate('branches')} />
              <ModuleButton label="Marketing" onClick={() => onNavigate('tools')} />
              <ModuleButton label="Files" onClick={() => onNavigate('content')} />
              <ModuleButton label="Time" onClick={() => onNavigate('locks')} />
              <ModuleButton label="Planning" onClick={() => onNavigate('forecast')} />
            </div>
          </Panel>
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 0.95fr) minmax(380px, 1.25fr)', gap: 14, marginTop: 14 }}>
          <Panel title="Active Workspace">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
              <SummaryItem label="Workspace" value={workspaceSummary.workspaceName} />
              <SummaryItem label="Mode" value="Local first" />
              <SummaryItem label="Open Tasks" value={`${workspaceSummary.openTasks}`} />
              <SummaryItem label="Completed" value={`${workspaceSummary.completedTasks}`} />
              <SummaryItem label="Indexed Files" value={`${workspaceSummary.indexedFiles}`} />
              <SummaryItem label="Tracked Today" value={formatDuration(workspaceSummary.trackedTodayMs)} />
            </div>
          </Panel>

          <Panel title="Recent Files">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 154 }}>
              {recentFiles.length === 0 ? (
                <EmptyState title="No files indexed" detail="Add files from the Files module to keep local references handy." />
              ) : (
                recentFiles.map(file => (
                  <FileRow key={file.id} file={file} />
                ))
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                <ActionBtn onClick={() => onNavigate('content')}>Files</ActionBtn>
              </div>
            </div>
          </Panel>
        </section>
      </div>
    </div>
  )
}

export function StudioModulePanel({ title, eyebrow, description }: { title: string; eyebrow: string; description: string }) {
  return (
    <div style={{ flex: 1, overflow: 'auto', background: 'var(--lg-bg-primary)' }}>
      <div style={{ maxWidth: 880, margin: '0 auto', padding: '42px 28px' }}>
        <div style={{ fontFamily: 'var(--lg-font-mono)', fontSize: 11, color: 'var(--lg-text-secondary)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>
          {eyebrow}
        </div>
        <h1 style={{ margin: 0, fontSize: 26, color: 'var(--lg-text-primary)', letterSpacing: 0 }}>{title}</h1>
        <p style={{ marginTop: 10, maxWidth: 620, color: 'var(--lg-text-secondary)', lineHeight: 1.6 }}>
          {description}
        </p>
      </div>
    </div>
  )
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div style={panelStyle}>
      <div style={{ color: 'var(--lg-text-secondary)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 9 }}>{label}</div>
      <div style={{ color: 'var(--lg-text-primary)', fontSize: 20, fontWeight: 650 }}>{value}</div>
      <div style={{ color: '#4a566a', fontSize: 12, marginTop: 5 }}>{detail}</div>
    </div>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={panelStyle}>
      <h2 style={{ margin: '0 0 12px', color: 'var(--lg-text-primary)', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {title}
      </h2>
      {children}
    </section>
  )
}

function TodoRow({ todo, onToggle, onRemove }: { todo: StudioTodo; onToggle: () => void; onRemove: () => void }) {
  return (
    <div style={{
      minHeight: 36, display: 'flex', alignItems: 'center', gap: 9,
      border: '1px solid var(--lg-border)', borderRadius: 6,
      background: todo.done ? 'rgba(45,189,110,0.05)' : '#0d1018',
      padding: '6px 8px',
    }}>
      <input type="checkbox" checked={todo.done} onChange={onToggle} />
      <span style={{ flex: 1, color: todo.done ? '#5f6b7d' : 'var(--lg-text-primary)', textDecoration: todo.done ? 'line-through' : 'none' }}>
        {todo.title}
      </span>
      <button
        onClick={onRemove}
        title="Remove"
        style={{ width: 24, height: 24, border: 'none', background: 'transparent', color: '#4a566a', cursor: 'pointer' }}
      >
        x
      </button>
    </div>
  )
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      minHeight: 54,
      border: '1px solid var(--lg-border)',
      borderRadius: 6,
      background: '#0d1018',
      padding: '9px 10px',
      overflow: 'hidden',
    }}>
      <div style={{ color: 'var(--lg-text-secondary)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{label}</div>
      <div style={{ color: 'var(--lg-text-primary)', fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>
    </div>
  )
}

function FileRow({ file }: { file: StudioFileRef }) {
  return (
    <div style={{
      minHeight: 42,
      display: 'grid',
      gridTemplateColumns: '1fr auto auto',
      alignItems: 'center',
      gap: 8,
      border: '1px solid var(--lg-border)',
      borderRadius: 6,
      background: '#0d1018',
      padding: '7px 8px',
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ color: 'var(--lg-text-primary)', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {file.name}
        </div>
        <div style={{ marginTop: 3, color: 'var(--lg-text-secondary)', fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {file.extension.toUpperCase()} - {formatBytes(file.sizeBytes)}
        </div>
      </div>
      <button onClick={() => { void ipc.openPath(file.path) }} style={smallButtonStyle}>Open</button>
      <button onClick={() => { void ipc.showInFolder(file.path) }} style={smallButtonStyle}>Reveal</button>
    </div>
  )
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div style={{ border: '1px dashed var(--lg-border)', borderRadius: 7, padding: 18, color: 'var(--lg-text-secondary)' }}>
      <div style={{ color: 'var(--lg-text-primary)', marginBottom: 5 }}>{title}</div>
      <div style={{ fontSize: 12, lineHeight: 1.5 }}>{detail}</div>
    </div>
  )
}

function ModuleButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        height: 42, borderRadius: 6, border: '1px solid var(--lg-border)',
        background: '#0d1018', color: 'var(--lg-text-primary)',
        cursor: 'pointer', textAlign: 'left', padding: '0 12px',
      }}
    >
      {label}
    </button>
  )
}

const panelStyle: React.CSSProperties = {
  background: 'var(--lg-bg-secondary)',
  border: '1px solid var(--lg-border)',
  borderRadius: 8,
  padding: 14,
  boxShadow: 'var(--lg-shadow-card)',
}

const inputStyle: React.CSSProperties = {
  flex: 1,
  height: 32,
  background: '#0d1018',
  border: '1px solid var(--lg-border)',
  borderRadius: 6,
  color: 'var(--lg-text-primary)',
  padding: '0 10px',
  outline: 'none',
}

const smallButtonStyle: React.CSSProperties = {
  height: 26,
  borderRadius: 5,
  border: '1px solid var(--lg-border)',
  background: 'transparent',
  color: 'var(--lg-text-secondary)',
  cursor: 'pointer',
  padding: '0 9px',
  fontSize: 12,
}
