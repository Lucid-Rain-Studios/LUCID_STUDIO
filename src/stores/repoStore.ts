import { create } from 'zustand'
import { FileStatus, BranchInfo } from '@/ipc'
import { useOperationStore } from './operationStore'

interface RepoState {
  repoPath: string | null
  currentBranch: string
  branches: BranchInfo[]
  fileStatus: FileStatus[]
  isLoading: boolean
  error: string | null

  openRepo: (path: string) => Promise<void>
  refreshStatus: () => Promise<void>
  loadBranches: () => Promise<void>
  checkout: (branch: string) => Promise<void>
  clearRepo: () => void
  setError: (error: string | null) => void
}

export const useRepoStore = create<RepoState>((set, get) => ({
  repoPath: null,
  currentBranch: '',
  branches: [],
  fileStatus: [],
  isLoading: false,
  error: null,

  openRepo: async (path: string) => {
    set({ isLoading: true, error: null })
    const op = useOperationStore.getState()
    try {
      await op.run('Opening repository…', async () => {
        const [status, branch, branches] = await Promise.all([
          window.lucidGit.status(path),
          window.lucidGit.currentBranch(path),
          window.lucidGit.branchList(path),
        ])
        set({
          repoPath: path,
          fileStatus: status ?? [],
          currentBranch: branch ?? '',
          branches: branches ?? [],
          error: null,
        })
      })
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to open repository' })
    } finally {
      set({ isLoading: false })
    }
  },

  refreshStatus: async () => {
    const { repoPath } = get()
    if (!repoPath) return
    set({ isLoading: true })
    const op = useOperationStore.getState()
    try {
      await op.run('Refreshing…', async () => {
        const [status, branch, branches] = await Promise.all([
          window.lucidGit.status(repoPath),
          window.lucidGit.currentBranch(repoPath),
          window.lucidGit.branchList(repoPath),
        ])
        set({ fileStatus: status ?? [], currentBranch: branch ?? '', branches: branches ?? [] })
      })
    } catch {
      // silent
    } finally {
      set({ isLoading: false })
    }
  },

  loadBranches: async () => {
    const { repoPath } = get()
    if (!repoPath) return
    const branches = await window.lucidGit.branchList(repoPath).catch(() => [])
    set({ branches })
  },

  checkout: async (branch: string) => {
    const { repoPath } = get()
    if (!repoPath) return
    const op = useOperationStore.getState()
    await op.run(`Switching to ${branch}…`, async () => {
      await window.lucidGit.checkout(repoPath, branch)
      const [status, currentBranch] = await Promise.all([
        window.lucidGit.status(repoPath),
        window.lucidGit.currentBranch(repoPath),
      ])
      set({ currentBranch, fileStatus: status ?? [] })
    })
  },

  clearRepo: () => set({ repoPath: null, fileStatus: [], currentBranch: '', branches: [], error: null }),

  setError: (error) => set({ error }),
}))
