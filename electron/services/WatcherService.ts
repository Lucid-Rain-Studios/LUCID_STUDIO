import chokidar, { FSWatcher } from 'chokidar'
import { logService } from './LogService'

type ChangeCallback = () => void

// Errors emitted by chokidar's underlying fs.watch on transient files
// (LFS tmp objects, pack tmp files, index.lock, etc.). These churn rapidly
// during git operations and surface as EPERM / ENOENT on Windows. Swallow
// them so they never escalate to unhandledRejection.
const TRANSIENT_WATCH_ERRORS = /^(EPERM|ENOENT|EBUSY|EACCES)\b/

class WatcherService {
  private watchers = new Map<string, FSWatcher>()
  private timers   = new Map<string, ReturnType<typeof setTimeout>>()

  watch(repoPath: string, onChange: ChangeCallback): void {
    this.unwatch(repoPath)

    const watcher = chokidar.watch(repoPath, {
      ignored: [
        // Ignore everything under .git/ except the few files that signal
        // git-state changes we care about (HEAD, index, MERGE_HEAD, ORIG_HEAD).
        // This keeps LFS tmp files, pack tmp files, index.lock churn, etc.
        // out of the watcher entirely.
        (filePath: string) => {
          const norm = filePath.replace(/\\/g, '/')
          const m = norm.match(/\.git\/(.*)$/)
          if (!m) return false
          const rest = m[1]
          if (rest === '' || rest === 'HEAD' || rest === 'index'
              || rest === 'MERGE_HEAD' || rest === 'ORIG_HEAD'
              || rest === 'CHERRY_PICK_HEAD' || rest === 'REBASE_HEAD') {
            return false
          }
          return true
        },
        /[/\\]node_modules[/\\]/,
        /[/\\]\.vs[/\\]/,
        /[/\\]Binaries[/\\]/,
        /[/\\]Intermediate[/\\]/,
        /[/\\]DerivedDataCache[/\\]/,
        /[/\\]Saved[/\\]Autosaves[/\\]/,
      ],
      ignoreInitial: true,
      persistent: true,
      // Prevent expensive deep crawls on very large repos during first boot.
      // We only need near-root activity to trigger a lightweight refresh.
      depth: 3,
      awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 100 },
    })

    const fire = () => {
      const prev = this.timers.get(repoPath)
      if (prev) clearTimeout(prev)
      this.timers.set(repoPath, setTimeout(() => {
        this.timers.delete(repoPath)
        onChange()
      }, 500))
    }

    watcher
      .on('add',       fire)
      .on('change',    fire)
      .on('unlink',    fire)
      .on('addDir',    fire)
      .on('unlinkDir', fire)
      .on('error', (err) => {
        const msg = err instanceof Error ? err.message : String(err)
        if (TRANSIENT_WATCH_ERRORS.test(msg)) return
        logService.warn('watcher', `chokidar error in ${repoPath}: ${msg}`)
      })

    this.watchers.set(repoPath, watcher)
  }

  unwatch(repoPath: string): void {
    const timer = this.timers.get(repoPath)
    if (timer) { clearTimeout(timer); this.timers.delete(repoPath) }
    const watcher = this.watchers.get(repoPath)
    if (watcher) { watcher.close().catch(() => {}); this.watchers.delete(repoPath) }
  }

  unwatchAll(): void {
    for (const key of [...this.watchers.keys()]) this.unwatch(key)
  }
}

export const watcherService = new WatcherService()
