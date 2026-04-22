import { create } from 'zustand'
import { ipc, Lock } from '@/ipc'

interface LockState {
  locks: Lock[]
  isLoading: boolean
  error: string | null

  loadLocks:   (repoPath: string) => Promise<void>
  lockFile:    (repoPath: string, filePath: string) => Promise<void>
  unlockFile:  (repoPath: string, filePath: string, force?: boolean) => Promise<void>
  watchFile:   (repoPath: string, filePath: string) => Promise<void>
  setLocks:    (locks: Lock[]) => void
  clearLocks:  () => void
}

export const useLockStore = create<LockState>((set, get) => ({
  locks:     [],
  isLoading: false,
  error:     null,

  loadLocks: async (repoPath) => {
    set({ isLoading: true, error: null })
    try {
      const locks = await ipc.listLocks(repoPath)
      set({ locks, isLoading: false })
    } catch (e) {
      // LFS may not be initialised — treat as empty, don't surface error
      set({ locks: [], isLoading: false })
    }
  },

  lockFile: async (repoPath, filePath) => {
    set({ error: null })
    try {
      // ipc.lockFile returns the created Lock — use it immediately, no second round-trip
      const lock = await ipc.lockFile(repoPath, filePath)
      set(state => ({
        locks: [...state.locks.filter(l => l.path !== filePath), lock],
      }))
    } catch (e) {
      set({ error: String(e) })
      throw e
    }
  },

  unlockFile: async (repoPath, filePath, force) => {
    set({ error: null })
    // Optimistic remove — badge disappears before the network call returns
    set(state => ({ locks: state.locks.filter(l => l.path !== filePath) }))
    try {
      await ipc.unlockFile(repoPath, filePath, force)
    } catch (e) {
      // Roll back on failure by reloading authoritative list
      const locks = await ipc.listLocks(repoPath).catch(() => [])
      set({ locks, error: String(e) })
      throw e
    }
  },

  watchFile: async (repoPath, filePath) => {
    await ipc.watchLock(repoPath, filePath)
  },

  setLocks:   (locks) => set({ locks }),
  clearLocks: ()      => set({ locks: [], error: null }),
}))
