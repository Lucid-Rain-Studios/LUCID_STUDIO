import { create } from 'zustand'
import { ipc, OperationStep } from '@/ipc'

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

// Operations shorter than this are not worth a desktop toast — the user
// almost certainly saw the inline progress and feedback.
const OPERATION_DESKTOP_NOTIFY_MIN_MS = 5_000

function maybeNotifyOperationComplete(label: string, durationMs: number, error: unknown): void {
  if (durationMs < OPERATION_DESKTOP_NOTIFY_MIN_MS) return
  // Only toast when the user has alt-tabbed away — no point doubling up if
  // they're already looking at the inline progress UI.
  if (typeof document !== 'undefined' && document.hasFocus()) return

  const failed = error !== undefined
  ipc.notifyDesktop({
    event:  'operationComplete',
    title:  failed ? `${label} failed` : `${label} finished`,
    body:   failed
      ? (error instanceof Error ? error.message : String(error)).slice(0, 140)
      : 'Click to return to Lucid Git',
    urgent: failed,
  }).catch(() => {})
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
    const startedAt = Date.now()
    // Pause background auto-fetch (ForecastService) so it doesn't race with
    // the user-driven operation we're about to run. Refcounted in the main
    // process, so nested run() calls remain safe.
    ipc.forecastPause().catch(() => {})
    try {
      const result = await fn()
      maybeNotifyOperationComplete(label, Date.now() - startedAt, undefined)
      return result
    } catch (err) {
      maybeNotifyOperationComplete(label, Date.now() - startedAt, err)
      throw err
    } finally {
      get().finish()
      ipc.forecastResume().catch(() => {})
    }
  },
}))
