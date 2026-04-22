import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { GeneralSettings } from './GeneralSettings'
import { WebhookPanel } from './WebhookPanel'
import { TeamConfigPanel } from './TeamConfigPanel'

interface SettingsPageProps {
  repoPath: string | null
}

type SettingsTab = 'general' | 'discord' | 'team'

const TABS: { id: SettingsTab; label: string; requiresRepo?: boolean }[] = [
  { id: 'general', label: 'General' },
  { id: 'discord', label: 'Discord', requiresRepo: true },
  { id: 'team',    label: 'Team config', requiresRepo: true },
]

export function SettingsPage({ repoPath }: SettingsPageProps) {
  const [tab, setTab] = useState<SettingsTab>('general')

  const availableTabs = TABS.filter(t => !t.requiresRepo || !!repoPath)

  // If selected tab requires repo but repo was closed, fall back
  const activeTab = availableTabs.find(t => t.id === tab) ? tab : 'general'

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Sub-tab bar */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-lg-border bg-lg-bg-secondary shrink-0">
        {availableTabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'px-2.5 py-0.5 rounded text-[10px] font-mono transition-colors',
              activeTab === t.id
                ? 'bg-lg-accent/20 text-lg-accent'
                : 'text-lg-text-secondary hover:text-lg-text-primary'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'general' && <GeneralSettings />}
      {activeTab === 'discord' && repoPath && <WebhookPanel repoPath={repoPath} />}
      {activeTab === 'team'    && repoPath && <TeamConfigPanel repoPath={repoPath} />}
    </div>
  )
}
