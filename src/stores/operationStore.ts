import { create } from 'zustand'
import { OperationStep } from '@/ipc'

interface OperationState {
  isRunning: boolean
  label: string
  steps: OperationStep[]
  latestStep: OperationStep | null

  start: (label: string) => void
  updateStep: (step: OperationStep) => void
  finish: () => void
  reset: () => void
  /** Wrap any async fn: sets label while running, clears on done/error. */
  run: <T>(label: string, fn: () => Promise<T>) => Promise<T>
}

export const useOperationStore = create<OperationState>((set, get) => ({
  isRunning: false,
  label: '',
  steps: [],
  latestStep: null,

  start: (label) => set({ isRunning: true, label, steps: [], latestStep: null }),

  updateStep: (step) =>
    set((state) => ({
      steps: [...state.steps.filter((s) => s.id !== step.id), step],
      latestStep: step,
      isRunning: true,
    })),

  finish: () => set({ isRunning: false, latestStep: null }),

  reset: () => set({ isRunning: false, label: '', steps: [], latestStep: null }),

  run: async <T>(label: string, fn: () => Promise<T>): Promise<T> => {
    get().start(label)
    try {
      return await fn()
    } finally {
      get().finish()
    }
  },
}))
