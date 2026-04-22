import { create } from 'zustand'
import { LucidGitError, parseGitErrorOrGeneric } from '@/lib/gitErrors'

interface ErrorState {
  current: LucidGitError | null
  history: LucidGitError[]
  push: (error: LucidGitError) => void
  pushRaw: (raw: string) => void
  dismiss: () => void
  clearHistory: () => void
}

export const useErrorStore = create<ErrorState>((set) => ({
  current: null,
  history: [],

  push: (error) =>
    set((s) => ({
      current: error,
      history: [error, ...s.history].slice(0, 50),
    })),

  pushRaw: (raw) => {
    const err = parseGitErrorOrGeneric(raw)
    set((s) => ({
      current: err,
      history: [err, ...s.history].slice(0, 50),
    }))
  },

  dismiss: () => set({ current: null }),

  clearHistory: () => set({ history: [] }),
}))
