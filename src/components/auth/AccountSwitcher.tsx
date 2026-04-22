import React, { useEffect, useRef } from 'react'
import { useAuthStore } from '@/stores/authStore'

interface AccountSwitcherProps {
  onAddAccount: () => void
  onClose: () => void
}

export function AccountSwitcher({ onAddAccount, onClose }: AccountSwitcherProps) {
  const { accounts, currentAccountId, setCurrentAccount, logout } = useAuthStore()
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const current = accounts.find(a => a.userId === currentAccountId)

  return (
    <div
      ref={ref}
      className="absolute right-2 top-10 z-50 w-64 bg-lg-bg-elevated border border-lg-border rounded-lg shadow-2xl overflow-hidden"
    >
      {/* Current account */}
      {current && (
        <div className="px-3 py-3 border-b border-lg-border">
          <div className="flex items-center gap-2">
            <img
              src={current.avatarUrl}
              alt={current.login}
              className="w-8 h-8 rounded-full bg-lg-border"
            />
            <div className="min-w-0">
              <div className="text-xs font-mono text-lg-text-primary font-semibold truncate">
                {current.name}
              </div>
              <div className="text-[10px] font-mono text-lg-text-secondary truncate">
                @{current.login}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Other accounts */}
      {accounts.length > 1 && (
        <div className="py-1 border-b border-lg-border">
          <div className="px-3 py-1">
            <span className="text-[9px] font-mono uppercase tracking-widest text-lg-text-secondary">
              Switch account
            </span>
          </div>
          {accounts
            .filter(a => a.userId !== currentAccountId)
            .map(account => (
              <button
                key={account.userId}
                onClick={() => { setCurrentAccount(account.userId); onClose() }}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-lg-bg-secondary transition-colors"
              >
                <img
                  src={account.avatarUrl}
                  alt={account.login}
                  className="w-5 h-5 rounded-full bg-lg-border"
                />
                <span className="text-[11px] font-mono text-lg-text-primary truncate">
                  @{account.login}
                </span>
              </button>
            ))}
        </div>
      )}

      {/* Actions */}
      <div className="py-1">
        <button
          onClick={() => { onAddAccount(); onClose() }}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] font-mono text-lg-text-secondary hover:text-lg-accent hover:bg-lg-bg-secondary transition-colors"
        >
          <span className="text-lg-border">+</span>
          Add account
        </button>
        {current && (
          <button
            onClick={async () => {
              await logout(current.userId)
              onClose()
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] font-mono text-lg-text-secondary hover:text-lg-error hover:bg-lg-bg-secondary transition-colors"
          >
            <span className="text-lg-border">→</span>
            Sign out @{current.login}
          </button>
        )}
      </div>
    </div>
  )
}
