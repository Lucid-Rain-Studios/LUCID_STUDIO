import React, { useEffect, useState } from 'react'
import { ipc, TeamConfig } from '@/ipc'
import { cn } from '@/lib/utils'

interface TeamConfigPanelProps {
  repoPath: string
}

const DEFAULTS: TeamConfig = {
  lfsPatterns: [],
  webhookEvents: {},
  hookIds: [],
}

export function TeamConfigPanel({ repoPath }: TeamConfigPanelProps) {
  const [config, setConfig]         = useState<TeamConfig>(DEFAULTS)
  const [patternsText, setPatternsText] = useState('')
  const [hookIdsText, setHookIdsText]   = useState('')
  const [saving, setSaving]         = useState(false)
  const [saved, setSaved]           = useState(false)
  const [loaded, setLoaded]         = useState(false)

  useEffect(() => {
    ipc.teamConfigLoad(repoPath).then(c => {
      const cfg = c ?? DEFAULTS
      setConfig(cfg)
      setPatternsText(cfg.lfsPatterns.join('\n'))
      setHookIdsText(cfg.hookIds.join('\n'))
      setLoaded(true)
    }).catch(() => setLoaded(true))
  }, [repoPath])

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    const patterns = patternsText.split('\n').map(s => s.trim()).filter(Boolean)
    const hookIds  = hookIdsText.split('\n').map(s => s.trim()).filter(Boolean)
    const final: TeamConfig = { ...config, lfsPatterns: patterns, hookIds }
    try {
      await ipc.teamConfigSave(repoPath, final)
      setConfig(final)
      setSaved(true)
    } catch {}
    finally { setSaving(false) }
  }

  if (!loaded) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <span className="text-[11px] font-mono text-lg-text-secondary animate-pulse">Loading…</span>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">

        <div className="border-b border-lg-border">
          <div className="px-3 py-1.5 bg-lg-bg-secondary sticky top-0 z-10">
            <span className="text-[10px] font-mono uppercase tracking-widest text-lg-text-secondary">Team config</span>
          </div>
          <div className="px-3 py-2.5 space-y-2">
            <p className="text-[10px] font-mono text-lg-text-secondary leading-relaxed">
              Saves to <span className="text-lg-accent font-semibold">.lucid-git/team-config.json</span> in your
              repository. Commit this file so teammates inherit these defaults automatically.
            </p>
          </div>
        </div>

        <div className="border-b border-lg-border">
          <div className="px-3 py-1.5 bg-lg-bg-secondary sticky top-0 z-10">
            <span className="text-[10px] font-mono uppercase tracking-widest text-lg-text-secondary">LFS patterns</span>
          </div>
          <div className="px-3 py-2.5 space-y-2">
            <p className="text-[10px] font-mono text-lg-text-secondary">One glob pattern per line. These are applied team-wide when a teammate opens the repo.</p>
            <textarea
              rows={6}
              value={patternsText}
              onChange={e => { setPatternsText(e.target.value); setSaved(false) }}
              placeholder={'*.uasset\n*.umap\n*.png\n*.fbx'}
              className="w-full bg-lg-bg-primary border border-lg-border rounded px-2 py-1.5 text-[11px] font-mono text-lg-text-primary placeholder-lg-text-secondary/40 focus:outline-none focus:border-lg-accent resize-none"
            />
          </div>
        </div>

        <div className="border-b border-lg-border">
          <div className="px-3 py-1.5 bg-lg-bg-secondary sticky top-0 z-10">
            <span className="text-[10px] font-mono uppercase tracking-widest text-lg-text-secondary">Recommended hooks</span>
          </div>
          <div className="px-3 py-2.5 space-y-2">
            <p className="text-[10px] font-mono text-lg-text-secondary">Built-in hook IDs to recommend. Teammates see an install prompt in the Hooks tab.</p>
            <textarea
              rows={3}
              value={hookIdsText}
              onChange={e => { setHookIdsText(e.target.value); setSaved(false) }}
              placeholder={'file-size-guard\nuasset-lfs-check'}
              className="w-full bg-lg-bg-primary border border-lg-border rounded px-2 py-1.5 text-[11px] font-mono text-lg-text-primary placeholder-lg-text-secondary/40 focus:outline-none focus:border-lg-accent resize-none"
            />
          </div>
        </div>

        <div className="px-3 py-3 flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className={cn(
              'px-4 h-7 rounded text-[10px] font-mono border transition-colors disabled:opacity-40',
              'border-lg-accent text-lg-accent hover:bg-lg-accent/10'
            )}
          >
            {saving ? 'Saving…' : 'Save & commit-ready'}
          </button>
          {saved && <span className="text-[10px] font-mono text-lg-success">✓ Saved — remember to commit .lucid-git/team-config.json</span>}
        </div>

      </div>
    </div>
  )
}
