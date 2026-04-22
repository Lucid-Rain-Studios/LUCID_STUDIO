import { create } from 'zustand'
import { AppNotification } from '@/ipc'

const MAX_NOTIFICATIONS = 100

interface NotificationState {
  notifications: AppNotification[]
  unreadCount:   number

  push:        (n: AppNotification) => void
  markRead:    (id: number) => void
  markAllRead: () => void
  clearAll:    () => void
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount:   0,

  push: (n) => set(state => {
    const notifications = [n, ...state.notifications].slice(0, MAX_NOTIFICATIONS)
    return {
      notifications,
      unreadCount: state.unreadCount + (n.read ? 0 : 1),
    }
  }),

  markRead: (id) => set(state => {
    const notifications = state.notifications.map(n =>
      n.id === id ? { ...n, read: true } : n
    )
    const unreadCount = notifications.filter(n => !n.read).length
    return { notifications, unreadCount }
  }),

  markAllRead: () => set(state => ({
    notifications: state.notifications.map(n => ({ ...n, read: true })),
    unreadCount:   0,
  })),

  clearAll: () => set({ notifications: [], unreadCount: 0 }),
}))
