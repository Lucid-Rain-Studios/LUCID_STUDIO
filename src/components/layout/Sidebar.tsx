import React from 'react'
import { cn } from '@/lib/utils'
import { useRepoStore } from '@/stores/repoStore'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { repoPath, currentBranch, fileStatus } = useRepoStore()

  const repoName = repoPath
    ? (repoPath.replace(/\\/g, '/').split('/').pop() ?? repoPath)
    : null

  const stagedCount   = fileStatus.filter((f) => f.staged).length
  const unstagedCount = fileStatus.filter((f) => !f.staged).length

  return (
    <aside
      className={cn(
        'flex flex-col bg-lg-bg-secondary border-r border-lg-border transition-all duration-200 shrink-0',
        collapsed ? 'w-10' : 'w-56'
      )}
    >
      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className="flex items-center justify-center h-8 border-b border-lg-border text-lg-text-secondary hover:text-lg-text-primary hover:bg-lg-bg-elevated transition-colors shrink-0"
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <span className="font-mono text-xs select-none">{collapsed ? '›' : '‹'}</span>
      </button>

      {!collapsed && (
        <div className="flex-1 overflow-y-auto py-2">
          {repoName ? (
            <>
              {/* Repo info */}
              <div className="px-3 py-1">
                <span className="text-[10px] font-mono uppercase tracking-widest text-lg-text-secondary">
                  Repository
                </span>
              </div>
              <div className="px-3 py-1.5">
                <div className="text-xs font-mono text-lg-text-primary font-semibold truncate" title={repoPath ?? ''}>
                  {repoName}
                </div>
                {currentBranch && (
                  <div className="text-[10px] font-mono text-[#4a9eff] mt-0.5">
                    @ {currentBranch}
                  </div>
                )}
              </div>

              {/* Change counts */}
              <div className="px-3 pt-3 pb-1 border-t border-lg-border mt-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-lg-text-secondary">
                  Status
                </span>
              </div>
              <div className="px-3 py-1 space-y-1">
                {stagedCount > 0 && (
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-lg-text-secondary">Staged</span>
                    <span className="text-lg-success font-bold">{stagedCount}</span>
                  </div>
                )}
                {unstagedCount > 0 && (
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-lg-text-secondary">Changed</span>
                    <span className="text-lg-accent font-bold">{unstagedCount}</span>
                  </div>
                )}
                {stagedCount === 0 && unstagedCount === 0 && (
                  <div className="text-[10px] font-mono text-lg-text-secondary">Clean</div>
                )}
              </div>
            </>
          ) : (
            <div className="px-3 py-4 text-center">
              <span className="text-xs text-lg-text-secondary font-mono">No repository</span>
            </div>
          )}
        </div>
      )}
    </aside>
  )
}
