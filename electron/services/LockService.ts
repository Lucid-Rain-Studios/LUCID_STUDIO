import { BrowserWindow, Notification } from 'electron'
import { execSafe, exec } from '../util/dugite-exec'
import { CHANNELS } from '../ipc/channels'
import type { Lock } from '../types'
import { notificationService } from './NotificationService'
import { webhookService } from './WebhookService'

class LockService {
  private pollTimers  = new Map<string, ReturnType<typeof setInterval>>()
  private prevLocks   = new Map<string, Lock[]>()   // repoPath → last known locks
  private watchedFiles: Array<{ repoPath: string; filePath: string }> = []

  // ── Core LFS commands ───────────────────────────────────────────────────────

  async listLocks(repoPath: string): Promise<Lock[]> {
    const { exitCode, stdout } = await execSafe(['lfs', 'locks', '--json'], repoPath)
    if (exitCode !== 0 || !stdout.trim()) return []
    try {
      const raw = JSON.parse(stdout) as Array<{
        id: string
        path: string
        owner: { name: string }
        locked_at: string
      }>
      return raw.map(l => ({
        id:       l.id,
        path:     l.path,
        owner:    { name: l.owner.name, login: l.owner.name },
        lockedAt: l.locked_at,
      }))
    } catch {
      return []
    }
  }

  async lockFile(repoPath: string, filePath: string): Promise<Lock> {
    await exec(['lfs', 'lock', filePath], repoPath)
    const locks = await this.listLocks(repoPath)
    const lock  = locks.find(l => l.path === filePath)
    if (!lock) throw new Error(`Lock not found for "${filePath}" after locking`)
    return lock
  }

  async unlockFile(repoPath: string, filePath: string, force = false): Promise<void> {
    const args = ['lfs', 'unlock', filePath]
    if (force) args.push('--force')
    await exec(args, repoPath)
  }

  async watchFile(repoPath: string, filePath: string): Promise<void> {
    const already = this.watchedFiles.some(
      w => w.repoPath === repoPath && w.filePath === filePath
    )
    if (!already) this.watchedFiles.push({ repoPath, filePath })
  }

  // ── Polling ─────────────────────────────────────────────────────────────────

  startPolling(repoPath: string, intervalMs = 30_000): void {
    if (this.pollTimers.has(repoPath)) return
    // Seed the previous-lock snapshot immediately so the first real poll
    // doesn't fire spurious "new lock" events for existing locks
    this.listLocks(repoPath).then(locks => {
      this.prevLocks.set(repoPath, locks)
    })
    const id = setInterval(() => this.poll(repoPath), intervalMs)
    this.pollTimers.set(repoPath, id)
  }

  stopPolling(repoPath: string): void {
    const id = this.pollTimers.get(repoPath)
    if (id !== undefined) {
      clearInterval(id)
      this.pollTimers.delete(repoPath)
    }
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  private async poll(repoPath: string): Promise<void> {
    const current  = await this.listLocks(repoPath)
    const previous = this.prevLocks.get(repoPath) ?? []

    // New locks since last poll
    for (const lock of current) {
      if (!previous.find(l => l.path === lock.path)) {
        const title = `${lock.owner.name} locked a file`
        const body  = lock.path
        const n = notificationService.push(repoPath, 'lock', title, body)
        this.emitNotification(n)
        this.showSystemNotification(title, body)
        webhookService.send(repoPath, 'fileLocked', title, body).catch(() => {})
      }
    }

    // Released locks since last poll
    for (const lock of previous) {
      if (!current.find(l => l.path === lock.path)) {
        const title = 'File unlocked'
        const body  = `${lock.path} released by ${lock.owner.name}`
        const n = notificationService.push(repoPath, 'unlock', title, body)
        this.emitNotification(n)
        webhookService.send(repoPath, 'fileUnlocked', title, body).catch(() => {})

        // High-priority notification if this file was being watched
        const watchIdx = this.watchedFiles.findIndex(
          w => w.repoPath === repoPath && w.filePath === lock.path
        )
        if (watchIdx >= 0) {
          this.watchedFiles.splice(watchIdx, 1)
          this.showSystemNotification(
            '🔓 File available — lock it now',
            `${lock.path} was released by ${lock.owner.name}`
          )
        }
      }
    }

    this.prevLocks.set(repoPath, current)
    this.broadcastLocks(repoPath, current)
  }

  private emitNotification(notification: import('../types').AppNotification): void {
    BrowserWindow.getAllWindows().forEach(win => {
      if (!win.webContents.isDestroyed()) {
        win.webContents.send(CHANNELS.EVT_NOTIFICATION, notification)
      }
    })
  }

  private broadcastLocks(repoPath: string, locks: Lock[]): void {
    BrowserWindow.getAllWindows().forEach(win => {
      if (!win.webContents.isDestroyed()) {
        win.webContents.send(CHANNELS.EVT_LOCK_CHANGED, locks)
      }
    })
  }

  private showSystemNotification(title: string, body: string): void {
    try {
      new Notification({ title, body }).show()
    } catch {
      // Notification API unavailable on some Linux setups — ignore
    }
  }
}

export const lockService = new LockService()
