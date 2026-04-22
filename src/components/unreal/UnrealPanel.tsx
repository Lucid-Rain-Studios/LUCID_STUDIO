import React, { useEffect, useState } from 'react'
import { ipc, UEProject, UESetupStatus } from '@/ipc'
import { useRepoStore } from '@/stores/repoStore'
import { cn } from '@/lib/utils'

const PAK_WARN_BYTES = 500 * 1024 * 1024 // 500 MB default threshold

function formatBytes(b: number): string {
  if (b < 1024)            return `${b} B`
  if (b < 1_048_576)       return `${(b / 1024).toFixed(1)} KB`
  if (b < 1_073_741_824)   return `${(b / 1_048_576).toFixed(1)} MB`
  return `${(b / 1_073_741_824).toFixed(2)} GB`
}

interface UnrealPanelProps {
  repoPath: string
}

export function UnrealPanel({ repoPath }: UnrealPanelProps) {
  const { fileStatus } = useRepoStore()

  const [project, setProject]       = useState<UEProject | null | 'loading'>('loading')
  const [setupStatus, setSetupStatus] = useState<UESetupStatus | null>(null)
  const [pakSize, setPakSize]       = useState<number | null>(null)
  const [error, setError]           = useState<string | null>(null)
  const [busy, setBusy]             = useState<'gitattributes' | 'gitignore' | null>(null)
  const [written, setWritten]       = useState<Set<'gitattributes' | 'gitignore'>>(new Set())
  const [showAttrPreview, setShowAttrPreview] = useState(false)
  const [showIgnorePreview, setShowIgnorePreview] = useState(false)
  const [attrTemplate, setAttrTemplate]  = useState('')
  const [ignoreTemplate, setIgnoreTemplate] = useState('')

  const load = async () => {
    setError(null)
    try {
      const [proj, status, templates] = await Promise.all([
        ipc.ueDetect(repoPath),
        ipc.ueSetupStatus(repoPath),
        ipc.ueTemplates(),
      ])
      setProject(proj)
      setSetupStatus(status)
      setAttrTemplate(templates.gitattributes)
      setIgnoreTemplate(templates.gitignore)
    } catch (e) {
      setError(String(e))
      setProject(null)
    }
  }

  const loadPakSize = async () => {
    const staged = fileStatus.filter(f => f.staged).map(f => f.path)
    if (staged.length === 0) { setPakSize(0); return }
    try {
      const bytes = await ipc.uePakSize(repoPath, staged)
      setPakSize(bytes)
    } catch {
      setPakSize(null)
    }
  }

  useEffect(() => { load() }, [repoPath])
  useEffect(() => { loadPakSize() }, [fileStatus])

  const writeGitattributes = async () => {
    setBusy('gitattributes')
    setError(null)
    try {
      await ipc.ueWriteGitattributes(repoPath)
      setWritten(prev => new Set(prev).add('gitattributes'))
      const status = await ipc.ueSetupStatus(repoPath)
      setSetupStatus(status)
    } catch (e) {
      setError(String(e))
    } finally {
      setBusy(null)
    }
  }

  const writeGitignore = async () => {
    setBusy('gitignore')
    setError(null)
    try {
      await ipc.ueWriteGitignore(repoPath)
      setWritten(prev => new Set(prev).add('gitignore'))
      const status = await ipc.ueSetupStatus(repoPath)
      setSetupStatus(status)
    } catch (e) {
      setError(String(e))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden text-[11px] font-mono">

      {/* ── Project detection ──────────────────────────────────────── */}
      <div className="px-3 py-2 border-b border-lg-border shrink-0">
        {project === 'loading' && (
          <span className="text-lg-text-secondary animate-pulse text-[10px]">Detecting UE project…</span>
        )}
        {project !== 'loading' && project && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest text-lg-accent font-semibold">UE5</span>
            <span className="text-lg-text-primary font-semibold">{project.name}</span>
            <span className="text-lg-text-secondary">v{project.engineVersion}</span>
          </div>
        )}
        {project !== 'loading' && !project && (
          <div className="flex items-center gap-2 text-lg-text-secondary">
            <span className="text-[10px] uppercase tracking-widest">No .uproject found</span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">

        {error && (
          <div className="mx-3 mt-2 px-3 py-2 bg-lg-error/10 border border-lg-error/40 rounded text-lg-error text-[10px] whitespace-pre-wrap">
            {error}
          </div>
        )}

        {/* ── .gitattributes ─────────────────────────────────────── */}
        <Section label=".gitattributes — LFS tracking">
          <StatusRow
            label="File exists"
            ok={setupStatus?.hasGitattributes ?? false}
          />
          <StatusRow
            label="UE5 LFS patterns present"
            ok={setupStatus?.hasUeGitattributes ?? false}
          />
          {written.has('gitattributes') && (
            <div className="px-3 py-1 text-lg-success text-[10px]">✓ Written successfully</div>
          )}
          <div className="px-3 py-2 flex items-center gap-2">
            <button
              onClick={writeGitattributes}
              disabled={busy !== null}
              className={cn(
                'px-3 h-6 rounded text-[10px] border transition-colors disabled:opacity-40',
                setupStatus?.hasUeGitattributes
                  ? 'border-lg-border text-lg-text-secondary hover:border-lg-warning hover:text-lg-warning'
                  : 'border-lg-accent text-lg-accent hover:bg-lg-accent/10'
              )}
            >
              {busy === 'gitattributes' ? 'Writing…'
                : setupStatus?.hasUeGitattributes ? 'Overwrite with template'
                : 'Write UE5 template'}
            </button>
            <button
              onClick={() => setShowAttrPreview(v => !v)}
              className="text-[10px] text-lg-text-secondary hover:text-lg-text-primary transition-colors"
            >
              {showAttrPreview ? 'Hide preview' : 'Preview'}
            </button>
          </div>
          {showAttrPreview && (
            <pre className="mx-3 mb-2 p-2 bg-lg-bg-primary border border-lg-border rounded text-[9px] overflow-x-auto max-h-48 text-lg-text-secondary whitespace-pre">
              {attrTemplate}
            </pre>
          )}
        </Section>

        {/* ── .gitignore ─────────────────────────────────────────── */}
        <Section label=".gitignore — build artifact exclusions">
          <StatusRow
            label="File exists"
            ok={setupStatus?.hasGitignore ?? false}
          />
          <StatusRow
            label="UE5 build dirs excluded"
            ok={setupStatus?.hasUeGitignore ?? false}
          />
          {written.has('gitignore') && (
            <div className="px-3 py-1 text-lg-success text-[10px]">✓ Written successfully</div>
          )}
          <div className="px-3 py-2 flex items-center gap-2">
            <button
              onClick={writeGitignore}
              disabled={busy !== null}
              className={cn(
                'px-3 h-6 rounded text-[10px] border transition-colors disabled:opacity-40',
                setupStatus?.hasUeGitignore
                  ? 'border-lg-border text-lg-text-secondary hover:border-lg-warning hover:text-lg-warning'
                  : 'border-lg-accent text-lg-accent hover:bg-lg-accent/10'
              )}
            >
              {busy === 'gitignore' ? 'Writing…'
                : setupStatus?.hasUeGitignore ? 'Overwrite with template'
                : 'Write UE5 template'}
            </button>
            <button
              onClick={() => setShowIgnorePreview(v => !v)}
              className="text-[10px] text-lg-text-secondary hover:text-lg-text-primary transition-colors"
            >
              {showIgnorePreview ? 'Hide preview' : 'Preview'}
            </button>
          </div>
          {showIgnorePreview && (
            <pre className="mx-3 mb-2 p-2 bg-lg-bg-primary border border-lg-border rounded text-[9px] overflow-x-auto max-h-48 text-lg-text-secondary whitespace-pre">
              {ignoreTemplate}
            </pre>
          )}
        </Section>

        {/* ── Pak size estimator ─────────────────────────────────── */}
        <Section label="Staged asset size">
          {pakSize === null && (
            <div className="px-3 py-2 text-lg-text-secondary text-[10px]">
              Unable to compute size.
            </div>
          )}
          {pakSize !== null && pakSize === 0 && (
            <div className="px-3 py-2 text-lg-text-secondary text-[10px]">
              No binary assets in current staged changes.
            </div>
          )}
          {pakSize !== null && pakSize > 0 && (
            <div className="px-3 py-2 space-y-1">
              <div className={cn(
                'text-sm font-semibold',
                pakSize > PAK_WARN_BYTES ? 'text-lg-warning' : 'text-lg-text-primary'
              )}>
                {formatBytes(pakSize)}
              </div>
              {pakSize > PAK_WARN_BYTES && (
                <div className="text-[10px] text-lg-warning">
                  ⚠ Staged assets exceed 500 MB. Consider using LFS or splitting this commit.
                </div>
              )}
              <div className="text-[10px] text-lg-text-secondary">
                Total size of staged binary files matching LFS patterns
              </div>
            </div>
          )}
          <div className="px-3 py-2 border-t border-lg-border/50">
            <button
              onClick={loadPakSize}
              className="text-[10px] text-lg-text-secondary hover:text-lg-accent transition-colors"
            >
              ↺ Recalculate
            </button>
          </div>
        </Section>

        {/* ── Check-out for edit ─────────────────────────────────── */}
        <Section label="Perforce-style workflow">
          <div className="px-3 py-2 space-y-2">
            <p className="text-[10px] text-lg-text-secondary leading-relaxed">
              Right-click any file in the Changes tab → <span className="text-lg-text-primary">Check Out for Edit</span> to lock it via LFS before modifying. Commit as normal to release the lock.
            </p>
            <p className="text-[10px] text-lg-text-secondary">
              Lock badges (🔒 / ⚠) are shown in the file tree. Use the <span className="text-lg-text-primary">Locks</span> section in the Changes tab to manage all active locks.
            </p>
          </div>
        </Section>

      </div>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <div className="px-3 py-2 border-t border-lg-border shrink-0">
        <button
          onClick={load}
          className="w-full h-7 rounded text-[10px] border border-lg-border text-lg-text-secondary hover:border-lg-accent hover:text-lg-accent transition-colors"
        >
          ↺ Refresh
        </button>
      </div>
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-lg-border">
      <div className="px-3 py-1.5 bg-lg-bg-secondary sticky top-0 z-10">
        <span className="text-[10px] uppercase tracking-widest text-lg-text-secondary">{label}</span>
      </div>
      {children}
    </div>
  )
}

function StatusRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1">
      <span className={cn('text-[10px]', ok ? 'text-lg-success' : 'text-lg-error')}>
        {ok ? '✓' : '✗'}
      </span>
      <span className="text-[10px] text-lg-text-secondary">{label}</span>
    </div>
  )
}
