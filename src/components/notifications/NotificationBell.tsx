import React, { useState } from 'react'
import { useNotificationStore } from '@/stores/notificationStore'
import { NotificationFeed } from './NotificationFeed'

export function NotificationBell() {
  const { unreadCount } = useNotificationStore()
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="lg-toolbar-control lg-icon-control flex items-center justify-center w-8 h-8 rounded text-lg-text-secondary hover:text-lg-text-primary hover:bg-lg-bg-elevated transition-colors"
        title="Notifications"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {unreadCount > 0 && (
          <span className="lg-toolbar-badge lg-notification-badge absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-lg-accent text-[8px] font-mono font-bold text-white flex items-center justify-center leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && <NotificationFeed onClose={() => setOpen(false)} />}
    </div>
  )
}
