import React, { useCallback, useEffect, useState } from 'react'
import { ipc, SyncStatus, Lock, BranchActivity, FileStatus } from '@/ipc'
import { useRepoStore } from '@/stores/repoStore'
import { useAuthStore } from '@/stores/authStore'
import { useOperationStore } from '@/stores/operationStore'
import { useLockStore } from '@/stores/lockStore'

interface DashboardPanelProps {
  repoPath: string
  onNavigate: (tab: string) => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const LAST_PULL_KEY  = (p: string) => `lucid-git:last-pull:${p}`
const LAST_FETCH_KEY = (p: string) => `lucid-git:last-fetch:${p}`

function greeting(): string {
  const h = new Date().getHours()
  if (h >= 5  && h < 12) return 'Good morning'
  if (h >= 12 && h < 18) return 'Good afternoon'
  return 'Good evening'
}

function parseFirstName(login: string): string {
  const word = login.split(/[_.\-@]/)[0]
  return word.charAt(0).toUpperCase() + word.slice(1)
}

function timeAgo(ts: number): string {
  const s = (Date.now() - ts) / 1000
  if (s < 60)     return 'just now'
  if (s < 3600)   return `${Math.floor(s / 60)}m ago`
  if (s < 86400)  return `${Math.floor(s / 3600)}h ago`
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`
  return new Date(ts).toLocaleDateString()
}

function timeAgoStr(iso: string): string { return timeAgo(new Date(iso).getTime()) }

function authorColor(name: string): string {
  const palette = ['#4a9eff', '#a27ef0', '#2dbd6e', '#f5a832', '#e8622f', '#1abc9c', '#e91e63']
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return palette[h % palette.length]
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return parts.length >= 2 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : name.slice(0, 2).toUpperCase()
}

function parseGitHubSlug(url: string): string | null {
  const m = url.match(/github\.com[/:]([\w.-]+\/[\w.-]+?)(?:\.git)?$/)
  return m ? m[1] : null
}

function stripBranchRef(ref: string): string {
  return ref
    .replace(/^refs\/heads\//, '')
    .replace(/^refs\/remotes\/[^/]+\//, '')
}

function fileStatusLabel(f: FileStatus): { char: string; color: string } {
  if (f.staged) {
    if (f.indexStatus === 'A') return { char: 'A', color: '#2dbd6e' }
    if (f.indexStatus === 'D') return { char: 'D', color: '#e84040' }
    return { char: 'M', color: '#4a9eff' }
  }
  if (f.workingStatus === '?') return { char: '?', color: '#344057' }
  if (f.workingStatus === 'D') return { char: 'D', color: '#e84040' }
  return { char: 'M', color: '#f5a832' }
}

// ── Main Component ────────────────────────────────────────────────────────────

export function DashboardPanel({ repoPath, onNavigate }: DashboardPanelProps) {
  const { currentBranch, fileStatus } = useRepoStore()
  const { accounts, currentAccountId } = useAuthStore()
  const opRun = useOperationStore(s => s.run)
  const { locks } = useLockStore()

  const [sync,      setSync]      = useState<SyncStatus | null>(null)
  const [activity,  setActivity]  = useState<BranchActivity[]>([])
  const [remoteUrl, setRemoteUrl] = useState<string | null>(null)
  const [busy,      setBusy]      = useState<string | null>(null)
  const [lastPull,  setLastPull]  = useState<number | null>(null)
  const [lastFetch, setLastFetch] = useState<number | null>(null)

  const staged   = fileStatus.filter(f =>  f.staged).length
  const unstaged = fileStatus.filter(f => !f.staged).length
  const currentLogin = accounts.find(a => a.userId === currentAccountId)?.login ?? null
  const repoName = repoPath.replace(/\\/g, '/').split('/').pop() ?? repoPath
  const ghSlug   = remoteUrl ? parseGitHubSlug(remoteUrl) : null

  const loadSync = useCallback(async () => {
    try { setSync(await ipc.getSyncStatus(repoPath)) } catch { setSync(null) }
  }, [repoPath])

  const reload = useCallback(() => {
    loadSync()
    ipc.gitBranchActivity(repoPath).then(setActivity).catch(() => {})
  }, [repoPath, loadSync])

  useEffect(() => {
    reload()
    ipc.getRemoteUrl(repoPath).then(setRemoteUrl).catch(() => {})
    const storedPull  = localStorage.getItem(LAST_PULL_KEY(repoPath))
    const storedFetch = localStorage.getItem(LAST_FETCH_KEY(repoPath))
    setLastPull(storedPull   ? parseInt(storedPull,  10) : null)
    setLastFetch(storedFetch ? parseInt(storedFetch, 10) : null)
  }, [repoPath])

  const doSync = async () => {
    setBusy('sync')
    try {
      await opRun('Fetching…', () => ipc.fetch(repoPath))
      const now = Date.now()
      localStorage.setItem(LAST_FETCH_KEY(repoPath), String(now))
      setLastFetch(now)

      const fresh = await ipc.getSyncStatus(repoPath)
      setSync(fresh)

      if (fresh.behind > 0) {
        await opRun('Pulling…', () => ipc.pull(repoPath))
        localStorage.setItem(LAST_PULL_KEY(repoPath), String(now))
        setLastPull(now)
      }

      const afterPull = await ipc.getSyncStatus(repoPath)
      setSync(afterPull)

      if (afterPull.ahead > 0) {
        await opRun('Pushing…', () => ipc.push(repoPath))
      }

      await loadSync()
    } finally { setBusy(null) }
  }

  const TWO_DAYS  = 2 * 24 * 60 * 60 * 1000
  const behind    = sync?.behind ?? 0
  const stalePull = behind > 0 && (lastPull === null || Date.now() - lastPull > TWO_DAYS)

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: '#0d0f15', padding: '22px 24px', fontFamily: "'IBM Plex Sans', system-ui" }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#c8d0e8', letterSpacing: '-0.03em', lineHeight: 1 }}>
            {greeting()}{currentLogin ? `, ${parseFirstName(currentLogin)}` : ''}
          </div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#344057', marginTop: 5 }}>
            {currentBranch || 'no branch'} · {repoName}
          </div>
        </div>
        <button
          onClick={reload}
          style={{ display: 'flex', alignItems: 'center', gap: 5, height: 26, padding: '0 10px', borderRadius: 5, border: '1px solid #1a2030', background: 'transparent', color: '#344057', fontSize: 11, cursor: 'pointer', fontFamily: "'IBM Plex Sans', system-ui" }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#283047'; e.currentTarget.style.color = '#5a6880' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#1a2030'; e.currentTarget.style.color = '#344057' }}
        >
          <RefreshIcon /> Refresh
        </button>
      </div>

      {/* ── Stale-pull warning ─────────────────────────────────────────── */}
      {stalePull && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18,
          padding: '10px 16px', borderRadius: 8,
          background: 'rgba(245,168,50,0.05)', border: '1px solid rgba(245,168,50,0.18)',
        }}>
          <span style={{ fontSize: 15, flexShrink: 0, color: '#f5a832' }}>⚠</span>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 12.5, color: '#f5a832', fontWeight: 600 }}>
              {behind} commit{behind !== 1 ? 's' : ''} behind {sync?.remoteName ?? 'remote'}
            </span>
            <span style={{ fontSize: 11.5, color: '#5a6880', marginLeft: 8 }}>
              {lastPull === null ? "Haven't pulled yet" : `Last pulled ${timeAgo(lastPull)}`}
            </span>
          </div>
          <SmallBtn label={busy === 'sync' ? 'Syncing…' : 'Sync Now'} color="#f5a832" disabled={!!busy} onClick={doSync} />
        </div>
      )}

      {/* ── Daily Flow Guide ───────────────────────────────────────────── */}
      <DailyFlowStrip
        sync={sync}
        staged={staged}
        unstaged={unstaged}
        busy={busy}
        ghSlug={ghSlug}
        currentBranch={currentBranch}
        onSync={doSync}
        onGoChanges={() => onNavigate('changes')}
      />

      {/* ── Status grid (3 columns) ─────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginTop: 16 }}>
        <SyncCard sync={sync} busy={busy} onSync={doSync} />
        <ChangesCard files={fileStatus} staged={staged} unstaged={unstaged} onNavigate={onNavigate} />
        <LocksCard locks={locks} currentLogin={currentLogin} />
      </div>

      {/* ── Suggestions ─────────────────────────────────────────────────── */}
      <div style={{ marginTop: 14 }}>
        <SuggestionsCard
          lastFetch={lastFetch}
          lastPull={lastPull}
          sync={sync}
          fileStatus={fileStatus}
          onSync={doSync}
          busy={busy}
        />
      </div>

      {/* ── Activity ─────────────────────────────────────────────────────── */}
      <div style={{ marginTop: 14 }}>
        <ActivityCard activity={activity} onNavigate={onNavigate} />
      </div>
    </div>
  )
}

// ── Daily Flow Strip ──────────────────────────────────────────────────────────

type StepState = 'done' | 'warn' | 'action' | 'neutral'

interface FlowStepDef {
  n: number
  label: string
  sub: string
  state: StepState
  btn?: { label: string; color?: string; disabled: boolean; onClick: () => void }
}

function DailyFlowStrip({
  sync, staged, unstaged, busy, ghSlug, currentBranch,
  onSync, onGoChanges,
}: {
  sync: SyncStatus | null
  staged: number; unstaged: number
  busy: string | null
  ghSlug: string | null
  currentBranch: string
  onSync: () => void; onGoChanges: () => void
}) {
  const behind     = sync?.behind ?? 0
  const ahead      = sync?.ahead  ?? 0
  const hasChanges = staged + unstaged > 0

  let syncState: StepState   = 'done'
  let syncSub                = 'In sync with remote'
  let syncBtnColor: string | undefined = undefined

  if (behind > 0 && ahead > 0) {
    syncState    = 'warn'
    syncSub      = `${behind} behind · ${ahead} ahead`
    syncBtnColor = '#f5a832'
  } else if (behind > 0) {
    syncState    = 'warn'
    syncSub      = `${behind} commit${behind !== 1 ? 's' : ''} behind remote`
    syncBtnColor = '#f5a832'
  } else if (ahead > 0) {
    syncState    = 'action'
    syncSub      = `${ahead} commit${ahead !== 1 ? 's' : ''} ready to push`
    syncBtnColor = '#2dbd6e'
  }

  const steps: FlowStepDef[] = [
    {
      n: 1, label: 'Sync',
      sub: syncSub,
      state: syncState,
      btn: {
        label: busy === 'sync' ? 'Syncing…' : 'Sync',
        color: syncBtnColor,
        disabled: !!busy,
        onClick: onSync,
      },
    },
    {
      n: 2, label: 'Work & Commit',
      sub: hasChanges
        ? `${staged > 0 ? `${staged} staged` : ''}${staged > 0 && unstaged > 0 ? ' · ' : ''}${unstaged > 0 ? `${unstaged} modified` : ''}`
        : 'Working directory clean',
      state: hasChanges ? 'action' : 'done',
      btn: hasChanges ? {
        label: 'View Changes',
        color: '#4a9eff', disabled: false, onClick: onGoChanges,
      } : undefined,
    },
    {
      n: 3, label: 'Open PR',
      sub: ghSlug
        ? `Merge ${currentBranch} into ${sync?.remoteBranch ?? 'main'}`
        : 'No GitHub remote detected',
      state: 'neutral',
      btn: ghSlug ? {
        label: 'Open PR ↗',
        color: '#a78bfa', disabled: false,
        onClick: () => ipc.openExternal(`https://github.com/${ghSlug}/compare/${encodeURIComponent(currentBranch)}?expand=1`),
      } : undefined,
    },
  ]

  return (
    <div style={{
      display: 'flex', alignItems: 'stretch',
      background: '#131720', border: '1px solid #1a2030', borderRadius: 10,
      overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    }}>
      {steps.map((step, i) => (
        <React.Fragment key={step.n}>
          {i > 0 && <div style={{ width: 1, background: '#1a2030', alignSelf: 'stretch', flexShrink: 0 }} />}
          <FlowStep step={step} />
        </React.Fragment>
      ))}
    </div>
  )
}

function FlowStep({ step }: { step: FlowStepDef }) {
  const stateStyle: Record<StepState, { dot: string; accent: string; glow: string; bg: string }> = {
    neutral: { dot: '#252e42', accent: '#5a6880', glow: 'transparent',           bg: 'transparent' },
    done:    { dot: '#2dbd6e', accent: '#2dbd6e', glow: 'rgba(45,189,110,0.08)', bg: 'rgba(45,189,110,0.03)' },
    warn:    { dot: '#f5a832', accent: '#f5a832', glow: 'rgba(245,168,50,0.08)', bg: 'rgba(245,168,50,0.04)' },
    action:  { dot: '#4a9eff', accent: '#4a9eff', glow: 'rgba(74,158,255,0.08)', bg: 'rgba(74,158,255,0.03)' },
  }
  const s           = stateStyle[step.state]
  const highlighted = step.state !== 'neutral'

  return (
    <div style={{ flex: 1, padding: '14px 16px 12px', background: s.bg, boxShadow: highlighted ? `inset 0 0 20px ${s.glow}` : 'none', minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
        <div style={{
          width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: highlighted ? `${s.dot}22` : '#151b27',
          border: `1.5px solid ${highlighted ? `${s.dot}66` : '#1d2535'}`,
          fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700,
          color: highlighted ? s.dot : '#2a3348',
          boxShadow: highlighted ? `0 0 8px ${s.dot}44` : 'none',
        }}>
          {step.state === 'done' ? '✓' : step.n}
        </div>
        <span style={{ fontSize: 12.5, fontWeight: highlighted ? 600 : 500, color: highlighted ? s.accent : '#5a6880', letterSpacing: '-0.01em' }}>
          {step.label}
        </span>
      </div>

      {/* No truncation — text wraps freely */}
      <div style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5,
        color: highlighted ? `${s.accent}99` : '#283047',
        marginBottom: step.btn ? 10 : 2, marginLeft: 27, lineHeight: 1.5,
      }}>
        {step.sub}
      </div>

      {step.btn && (
        <div style={{ marginLeft: 27 }}>
          <SmallBtn label={step.btn.label} color={step.btn.color} disabled={step.btn.disabled} onClick={step.btn.onClick} />
        </div>
      )}
    </div>
  )
}

// ── Suggestions Card ──────────────────────────────────────────────────────────

type SuggestionUrgency = 'ok' | 'tip' | 'warn' | 'high' | 'critical'

interface Suggestion {
  urgency: SuggestionUrgency
  text: string
  action?: { label: string; onClick: () => void; disabled: boolean }
}

const URGENCY_COLOR: Record<SuggestionUrgency, { dot: string; bg: string; border: string; text: string }> = {
  ok:       { dot: '#2dbd6e', bg: 'rgba(45,189,110,0.04)',  border: 'rgba(45,189,110,0.12)',  text: '#4a7a60'  },
  tip:      { dot: '#4a9eff', bg: 'rgba(74,158,255,0.04)',  border: 'rgba(74,158,255,0.12)',  text: '#6a849a'  },
  warn:     { dot: '#f5a832', bg: 'rgba(245,168,50,0.05)',  border: 'rgba(245,168,50,0.18)',  text: '#b08040'  },
  high:     { dot: '#e8622f', bg: 'rgba(232,98,47,0.06)',   border: 'rgba(232,98,47,0.20)',   text: '#b06040'  },
  critical: { dot: '#e84545', bg: 'rgba(232,69,69,0.08)',   border: 'rgba(232,69,69,0.28)',   text: '#c05050'  },
}

function SuggestionsCard({ lastFetch, lastPull, sync, fileStatus, onSync, busy }: {
  lastFetch: number | null
  lastPull: number | null
  sync: SyncStatus | null
  fileStatus: FileStatus[]
  onSync: () => void
  busy: string | null
}) {
  const h            = new Date().getHours()
  const lastSyncTime = (lastFetch !== null || lastPull !== null)
    ? Math.max(lastFetch ?? 0, lastPull ?? 0)
    : null
  const sinceMs    = lastSyncTime !== null ? Date.now() - lastSyncTime : null
  const sinceHours = sinceMs !== null ? sinceMs / 3_600_000 : null
  const sinceDays  = sinceMs !== null ? sinceMs / 86_400_000 : null
  const aheadCount = sync?.ahead ?? 0
  const hasWork    = fileStatus.some(f => f.staged || f.workingStatus === 'M' || f.workingStatus === 'A' || f.workingStatus === '?')

  const suggestions: Suggestion[] = []

  // ── Sync age ──────────────────────────────────────────────────────────────
  if (lastSyncTime === null) {
    suggestions.push({
      urgency: 'high',
      text: "You haven't synced with the remote yet. Fetch now to see if your teammates have pushed new commits.",
      action: { label: 'Sync Now', onClick: onSync, disabled: !!busy },
    })
  } else if (sinceDays! >= 2) {
    const d = Math.floor(sinceDays!)
    suggestions.push({
      urgency: 'critical',
      text: `Last synced ${d} day${d !== 1 ? 's' : ''} ago — you may be significantly out of date with your team. Fetch and pull before continuing work to avoid difficult merge conflicts.`,
      action: { label: 'Sync Now', onClick: onSync, disabled: !!busy },
    })
  } else if (sinceHours! >= 8) {
    const hrs = Math.floor(sinceHours!)
    suggestions.push({
      urgency: 'warn',
      text: `${hrs} hour${hrs !== 1 ? 's' : ''} since last sync — consider fetching to check whether teammates have pushed new commits since then.`,
      action: { label: 'Sync', onClick: onSync, disabled: !!busy },
    })
  } else if (sinceHours! >= 4) {
    const hrs = Math.floor(sinceHours!)
    suggestions.push({
      urgency: 'tip',
      text: `${hrs} hour${hrs !== 1 ? 's' : ''} since last sync. Nothing urgent, but a quick fetch keeps you current with the team.`,
    })
  } else {
    suggestions.push({
      urgency: 'ok',
      text: `Last synced ${timeAgo(lastSyncTime)} — you are up to date with the remote.`,
    })
  }

  // ── Morning tip ───────────────────────────────────────────────────────────
  if (h >= 5 && h < 12 && (lastSyncTime === null || sinceHours! > 1)) {
    suggestions.push({
      urgency: 'tip',
      text: 'Morning tip: Start your day with a sync to pick up any commits your teammates pushed overnight.',
    })
  }

  // ── Evening tip ───────────────────────────────────────────────────────────
  if (h >= 17 && h < 22) {
    if (aheadCount > 0) {
      suggestions.push({
        urgency: 'tip',
        text: `End of day: You have ${aheadCount} unpushed commit${aheadCount !== 1 ? 's' : ''}. Push before you finish so your team has your latest work.`,
      })
    } else if (hasWork) {
      suggestions.push({
        urgency: 'tip',
        text: 'End of day: You have local changes. Consider committing your work in progress and pushing before you wrap up.',
      })
    }
  }

  return (
    <Card title="Suggestions" icon={<SuggestionsIcon />}>
      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {suggestions.map((s, i) => {
          const uc = URGENCY_COLOR[s.urgency]
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 7, background: uc.bg, border: `1px solid ${uc.border}` }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: uc.dot, marginTop: 5, boxShadow: `0 0 6px ${uc.dot}66` }} />
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 12, lineHeight: 1.65, color: uc.text, fontFamily: "'IBM Plex Sans', system-ui" }}>
                  {s.text}
                </p>
                {s.action && (
                  <div style={{ marginTop: 8 }}>
                    <SmallBtn label={s.action.label} color={uc.dot} disabled={s.action.disabled} onClick={s.action.onClick} />
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

// ── Sync Status Card ──────────────────────────────────────────────────────────

function SyncCard({ sync, busy, onSync }: {
  sync: SyncStatus | null; busy: string | null; onSync: () => void
}) {
  const behind = sync?.behind ?? 0
  const ahead  = sync?.ahead  ?? 0
  const clean  = sync && behind === 0 && ahead === 0

  return (
    <Card title="Sync Status" icon={<SyncIcon />}>
      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#344057', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {sync?.hasUpstream ? `→ ${sync.remoteName}/${sync.remoteBranch}` : 'No upstream configured'}
        </div>

        <div style={{ display: 'flex', gap: 14 }}>
          <StatPill icon="↑" value={sync?.ahead  ?? '—'} label="ahead"  color={ahead  > 0 ? '#e8622f' : '#283047'} />
          <StatPill icon="↓" value={sync?.behind ?? '—'} label="behind" color={behind > 0 ? '#f5a832' : '#283047'} />
        </div>

        {clean && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: '#2dbd6e', fontSize: 12 }}>✓</span>
            <span style={{ fontSize: 11.5, color: '#344057' }}>In sync with remote</span>
          </div>
        )}

        <SmallBtn
          label={busy === 'sync' ? 'Syncing…' : 'Sync'}
          color={behind > 0 ? '#f5a832' : ahead > 0 ? '#2dbd6e' : undefined}
          disabled={!!busy}
          onClick={onSync}
        />
      </div>
    </Card>
  )
}

// ── Changes Card ──────────────────────────────────────────────────────────────

function ChangesCard({ files, staged, unstaged, onNavigate }: {
  files: FileStatus[]; staged: number; unstaged: number; onNavigate: (tab: string) => void
}) {
  const total   = staged + unstaged
  const preview = files.slice(0, 6)

  return (
    <Card title="Current Changes" icon={<ChangesCardIcon />} onAction={() => onNavigate('changes')} actionLabel="View All">
      <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <StatPill icon="●" value={staged}  label="staged"   color={staged   > 0 ? '#2dbd6e' : '#283047'} />
          <StatPill icon="○" value={unstaged} label="modified" color={unstaged > 0 ? '#f5a832' : '#283047'} />
        </div>

        {total === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingTop: 2 }}>
            <span style={{ color: '#2dbd6e', fontSize: 12 }}>✓</span>
            <span style={{ fontSize: 11.5, color: '#344057' }}>Working directory clean</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {preview.map(f => {
              const { char, color } = fileStatusLabel(f)
              const name = f.path.replace(/\\/g, '/').split('/').pop() ?? f.path
              return (
                <div key={f.path} style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700,
                    color, background: `${color}18`, border: `1px solid ${color}33`,
                    borderRadius: 3, padding: '0 4px', flexShrink: 0, lineHeight: '14px',
                  }}>{char}</span>
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, color: '#5a6880',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
                  }} title={f.path}>{name}</span>
                </div>
              )
            })}
            {files.length > 6 && (
              <button onClick={() => onNavigate('changes')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', marginTop: 2 }}>
                <span style={{ fontFamily: "'IBM Plex Sans', system-ui", fontSize: 11, color: '#344057' }}>
                  +{files.length - 6} more files…
                </span>
              </button>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}

// ── Active Locks Card ─────────────────────────────────────────────────────────

function LocksCard({ locks, currentLogin }: { locks: Lock[]; currentLogin: string | null }) {
  return (
    <Card title="Active Locks" icon={<LockCardIcon />}>
      <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {locks.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: '#2dbd6e', fontSize: 12 }}>✓</span>
            <span style={{ fontSize: 11.5, color: '#344057' }}>No active locks</span>
          </div>
        ) : (
          locks.slice(0, 7).map(lock => {
            const filename = lock.path.replace(/\\/g, '/').split('/').pop() ?? lock.path
            const isOwn    = currentLogin && lock.owner.login === currentLogin
            const color    = isOwn ? '#4a9eff' : '#7b8499'
            return (
              <div key={lock.id} style={{ display: 'flex', alignItems: 'center', gap: 7, overflow: 'hidden' }}>
                <div style={{
                  width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                  background: `${authorColor(lock.owner.name)}22`,
                  border: `1px solid ${authorColor(lock.owner.name)}55`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 7, fontWeight: 700,
                  color: authorColor(lock.owner.name),
                }}>
                  {initials(lock.owner.name)}
                </div>
                <div style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={lock.path}>
                    {filename}
                  </div>
                  <div style={{ fontSize: 10, color: '#344057', fontFamily: "'JetBrains Mono', monospace" }}>
                    {lock.owner.login} · {timeAgoStr(lock.lockedAt)}
                  </div>
                </div>
                {isOwn && (
                  <span style={{
                    fontSize: 8, fontWeight: 700, letterSpacing: '0.06em',
                    background: 'rgba(74,158,255,0.1)', color: '#4a9eff',
                    border: '1px solid rgba(74,158,255,0.2)', borderRadius: 3,
                    padding: '1px 5px', flexShrink: 0,
                  }}>YOU</span>
                )}
              </div>
            )
          })
        )}
        {locks.length > 7 && (
          <span style={{ fontSize: 11, color: '#344057', fontFamily: "'IBM Plex Sans', system-ui" }}>
            +{locks.length - 7} more locks
          </span>
        )}
      </div>
    </Card>
  )
}

// ── Activity Card ─────────────────────────────────────────────────────────────

function ActivityCard({ activity, onNavigate }: { activity: BranchActivity[]; onNavigate: (tab: string) => void }) {
  const shown = activity.slice(0, 12)

  return (
    <Card title="Activity" icon={<ActivityIcon />} onAction={() => onNavigate('history')} actionLabel="Full History">
      <div style={{ padding: '6px 14px 10px' }}>
        {shown.length === 0 ? (
          <p style={{ margin: 0, fontSize: 11.5, color: '#344057', padding: '6px 0' }}>No recent activity</p>
        ) : (
          <div>
            {shown.map((a, i) => {
              const branch = stripBranchRef(a.ref)
              const color  = authorColor(a.author)
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '10px 0',
                  borderBottom: i < shown.length - 1 ? '1px solid #141a26' : 'none',
                }}>
                  {/* Avatar */}
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                    background: `${color}18`, border: `1px solid ${color}44`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700, color,
                  }}>
                    {initials(a.author)}
                  </div>

                  <div style={{ flex: 1 }}>
                    {/* Commit message — full text, wraps naturally */}
                    <div style={{
                      fontFamily: "'IBM Plex Sans', system-ui", fontSize: 12.5, fontWeight: 500,
                      color: '#c8d0e8', lineHeight: 1.5,
                    }}>
                      {a.message}
                    </div>

                    {/* Branch + author + time — all on one line, wraps if needed */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5, flexWrap: 'wrap' }}>
                      <span style={{
                        fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5,
                        color, background: `${color}12`, border: `1px solid ${color}30`,
                        borderRadius: 4, padding: '1px 6px', flexShrink: 0,
                      }}>{branch}</span>
                      <span style={{ fontFamily: "'IBM Plex Sans', system-ui", fontSize: 11, color: '#5a6880' }}>
                        {a.author}
                      </span>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#283047' }}>
                        {timeAgoStr(a.date)}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Card>
  )
}

// ── Shared UI Primitives ──────────────────────────────────────────────────────

function Card({ title, icon, children, onAction, actionLabel }: {
  title: string; icon: React.ReactNode; children: React.ReactNode
  onAction?: () => void; actionLabel?: string
}) {
  return (
    <div style={{
      background: '#131720', border: '1px solid #1a2030', borderRadius: 10,
      boxShadow: '0 2px 8px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.025)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, height: 34,
        paddingLeft: 13, paddingRight: 10, flexShrink: 0,
        borderBottom: '1px solid #18202e', background: 'rgba(0,0,0,0.12)',
      }}>
        <span style={{ color: '#2e3a50', display: 'flex', flexShrink: 0 }}>{icon}</span>
        <span style={{ fontFamily: "'IBM Plex Sans', system-ui", fontSize: 10.5, fontWeight: 700, color: '#4a566a', flex: 1, letterSpacing: '0.07em', textTransform: 'uppercase' }}>
          {title}
        </span>
        {onAction && actionLabel && (
          <button
            onClick={onAction}
            style={{ fontFamily: "'IBM Plex Sans', system-ui", fontSize: 11, color: '#4a9eff', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', borderRadius: 4 }}
            onMouseEnter={e => { e.currentTarget.style.color = '#e8622f'; e.currentTarget.style.background = 'rgba(232,98,47,0.08)' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#4a9eff'; e.currentTarget.style.background = 'none' }}
          >
            {actionLabel} →
          </button>
        )}
      </div>
      {children}
    </div>
  )
}

function StatPill({ icon, value, label, color }: { icon: string; value: number | string; label: string; color: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <span style={{ fontFamily: "'IBM Plex Sans', system-ui", fontSize: 9, fontWeight: 700, color: '#283047', letterSpacing: '0.09em', textTransform: 'uppercase' }}>{label}</span>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 700, color, lineHeight: 1, textShadow: `0 0 18px ${color}40` }}>
        {icon}{value}
      </span>
    </div>
  )
}

function SmallBtn({ label, color, disabled, onClick }: {
  label: string; color?: string; disabled: boolean; onClick: () => void
}) {
  const [hover, setHover] = useState(false)
  const c = color ?? '#5a6880'
  return (
    <button
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => !disabled && setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        height: 24, paddingLeft: 12, paddingRight: 12, borderRadius: 5,
        background: hover ? `${c}14` : 'rgba(255,255,255,0.025)',
        border: `1px solid ${hover ? `${c}55` : '#1a2030'}`,
        color: disabled ? '#2a3348' : hover ? c : '#4a566a',
        fontFamily: "'IBM Plex Sans', system-ui", fontSize: 11.5, fontWeight: 500,
        cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1,
        boxShadow: hover && !disabled ? `0 0 10px ${c}18` : 'none',
        whiteSpace: 'nowrap',
      }}
    >{label}</button>
  )
}

// ── SVG Icons ─────────────────────────────────────────────────────────────────

function RefreshIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
      <path d="M13.5 8a5.5 5.5 0 1 1-1.1-3.3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M12.5 3v3h-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function SyncIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
      <path d="M3 8C3 5.2 5.2 3 8 3c1.5 0 2.8.6 3.8 1.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M13 8c0 2.8-2.2 5-5 5-1.5 0-2.8-.6-3.8-1.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M11.5 1.5v3.5H15" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4.5 14.5V11H1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ChangesCardIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5 6h6M5 8.5h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="11" cy="9" r="2.3" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.1" />
      <path d="M10.3 9l.7.7 1.2-1.2" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function LockCardIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
      <rect x="3" y="7" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="8" cy="10.5" r="1" fill="currentColor" />
    </svg>
  )
}

function SuggestionsIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M6 7a2 2 0 1 1 4 0c0 1-.8 1.5-1.5 2v.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="8.5" cy="12" r="0.8" fill="currentColor" />
    </svg>
  )
}

function ActivityIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
      <circle cx="4" cy="4"  r="1.5" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="4" cy="8"  r="1.5" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="4" cy="12" r="1.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M6.5 4h6M6.5 8h4.5M6.5 12h5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}
