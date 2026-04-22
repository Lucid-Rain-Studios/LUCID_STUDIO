import React, { useEffect, useRef } from 'react'
import { useNotificationStore } from '@/stores/notificationStore'
import { AppNotification } from '@/ipc'

interface NotificationFeedProps {
  onClose: () => void
}

const TYPE_ICON: Record<string, string> = {
  lock:   '🔒',
  unlock: '🔓',
  error:  '⚠️',
}

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60)   return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export function NotificationFeed({ onClose }: NotificationFeedProps) {
  const { notifications, unreadCount, markRead, markAllRead, clearAll } = useNotificationStore()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  return (
    <div
      ref={ref}
      className="absolute right-0 top-9 z-50 w-80 bg-lg-bg-elevated border border-lg-border rounded-lg shadow-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-lg-border">
        <span className="text-[10px] font-mono uppercase tracking-widest text-lg-text-secondary">
          Notifications {unreadCount > 0 && `(${unreadCount} unread)`}
        </span>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-[10px] font-mono text-lg-text-secondary hover:text-lg-accent transition-colors"
            >
              Mark all read
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={clearAll}
              className="text-[10px] font-mono text-lg-text-secondary hover:text-lg-error transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="max-h-80 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="px-3 py-6 text-center text-[11px] font-mono text-lg-text-secondary">
            No notifications
          </div>
        ) : (
          notifications.map(n => (
            <NotificationItem
              key={n.id}
              notification={n}
              onRead={() => markRead(n.id)}
            />
          ))
        )}
      </div>
    </div>
  )
}

function NotificationItem({
  notification: n,
  onRead,
}: {
  notification: AppNotification
  onRead: () => void
}) {
  return (
    <div
      onClick={onRead}
      title={`${n.title}\n${n.body}`}
      className={`flex items-start gap-2.5 px-3 py-2.5 border-b border-lg-border/50 cursor-pointer transition-colors hover:bg-lg-bg-secondary ${
        n.read ? 'opacity-60' : ''
      }`}
    >
      <span className="text-sm shrink-0 mt-0.5">{TYPE_ICON[n.type] ?? '●'}</span>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-mono text-lg-text-primary font-semibold truncate" title={n.title}>
          {n.title}
        </div>
        <div className="text-[10px] font-mono text-lg-text-secondary truncate" title={n.body}>
          {n.body}
        </div>
        <div className="text-[9px] font-mono text-lg-text-secondary/60 mt-0.5">
          {timeAgo(n.createdAt)}
        </div>
      </div>
      {!n.read && (
        <span className="w-1.5 h-1.5 rounded-full bg-lg-accent shrink-0 mt-1.5" />
      )}
    </div>
  )
}
