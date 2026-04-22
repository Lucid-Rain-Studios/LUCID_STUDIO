import { create } from 'zustand'
import { ipc, Account, DeviceFlowStart } from '@/ipc'

interface DeviceFlowState {
  deviceCode: string
  userCode: string
  verificationUri: string
  expiresAt: number       // epoch ms
  interval: number        // seconds to wait between polls
}

interface AuthState {
  accounts: Account[]
  currentAccountId: string | null
  isLoading: boolean
  error: string | null
  deviceFlow: DeviceFlowState | null
  isPolling: boolean

  loadAccounts:    () => Promise<void>
  startDeviceFlow: () => Promise<void>
  pollOnce:        () => Promise<boolean>
  logout:          (userId: string) => Promise<void>
  setCurrentAccount: (userId: string) => void
  clearDeviceFlow: () => void
  clearError:      () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accounts:         [],
  currentAccountId: null,
  isLoading:        false,
  error:            null,
  deviceFlow:       null,
  isPolling:        false,

  loadAccounts: async () => {
    set({ isLoading: true, error: null })
    try {
      const accounts = await ipc.listAccounts()
      set({ accounts, isLoading: false })
    } catch (e) {
      set({ error: String(e), isLoading: false })
    }
  },

  startDeviceFlow: async () => {
    set({ isLoading: true, error: null, deviceFlow: null })
    try {
      const flow: DeviceFlowStart = await ipc.startDeviceFlow()
      set({
        isLoading: false,
        deviceFlow: {
          deviceCode:      flow.deviceCode,
          userCode:        flow.userCode,
          verificationUri: flow.verificationUri,
          expiresAt:       Date.now() + flow.expiresIn * 1000,
          interval:        flow.interval,
        },
      })
    } catch (e) {
      set({ error: String(e), isLoading: false })
    }
  },

  // Call once per poll tick. Returns true when auth is complete.
  pollOnce: async () => {
    const { deviceFlow } = get()
    if (!deviceFlow) return false
    set({ isPolling: true })
    try {
      const result = await ipc.pollDeviceFlow(deviceFlow.deviceCode)
      if (result) {
        const accounts = await ipc.listAccounts()
        set({
          accounts,
          currentAccountId: result.userId,
          deviceFlow:       null,
          isPolling:        false,
        })
        return true
      }
      set({ isPolling: false })
      return false
    } catch (e) {
      set({ error: String(e), deviceFlow: null, isPolling: false })
      return false
    }
  },

  logout: async (userId) => {
    set({ isLoading: true })
    try {
      await ipc.logout(userId)
      const accounts = get().accounts.filter(a => a.userId !== userId)
      const currentAccountId =
        get().currentAccountId === userId
          ? (accounts[0]?.userId ?? null)
          : get().currentAccountId
      set({ accounts, currentAccountId, isLoading: false })
    } catch (e) {
      set({ error: String(e), isLoading: false })
    }
  },

  setCurrentAccount: (userId) => set({ currentAccountId: userId }),
  clearDeviceFlow:   ()       => set({ deviceFlow: null, error: null }),
  clearError:        ()       => set({ error: null }),
}))
