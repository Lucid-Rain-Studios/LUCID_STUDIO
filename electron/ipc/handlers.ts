import { ipcMain, dialog, shell, BrowserWindow } from 'electron'
import { CHANNELS } from './channels'
import { gitService } from '../services/GitService'
import { authService } from '../services/AuthService'
import { lockService } from '../services/LockService'
import { notificationService } from '../services/NotificationService'
import { webhookService } from '../services/WebhookService'
import { unrealService } from '../services/UnrealService'
import { hookService } from '../services/HookService'
import { settingsService } from '../services/SettingsService'
import { teamConfigService } from '../services/TeamConfigService'
import type { WebhookConfig, AppSettings, TeamConfig } from '../types'

export function registerHandlers(): void {

  // ── Shell ──────────────────────────────────────────────────────────────────
  ipcMain.handle(CHANNELS.SHELL_OPEN_EXTERNAL, async (_event, url: string) => {
    await shell.openExternal(url)
  })

  ipcMain.handle(CHANNELS.SHELL_SHOW_IN_FOLDER, async (_event, fullPath: string) => {
    shell.showItemInFolder(fullPath)
  })

  ipcMain.handle(CHANNELS.SHELL_OPEN_PATH, async (_event, fullPath: string) => {
    await shell.openPath(fullPath)
  })

  // ── OS Dialogs ─────────────────────────────────────────────────────────────
  ipcMain.handle(CHANNELS.DIALOG_OPEN_DIRECTORY, async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const result = await dialog.showOpenDialog(win ?? BrowserWindow.getFocusedWindow()!, {
      properties: ['openDirectory', 'createDirectory'],
      title: 'Select Repository Folder',
    })
    return result.canceled ? null : result.filePaths[0]
  })

  // ── Git — Phase 2 ──────────────────────────────────────────────────────────
  ipcMain.handle(CHANNELS.GIT_IS_REPO, async (_event, repoPath: string) => {
    return gitService.isRepo(repoPath)
  })

  ipcMain.handle(CHANNELS.GIT_STATUS, async (_event, repoPath: string) => {
    return gitService.status(repoPath)
  })

  ipcMain.handle(CHANNELS.GIT_CURRENT_BRANCH, async (_event, repoPath: string) => {
    return gitService.currentBranch(repoPath)
  })

  ipcMain.handle(CHANNELS.GIT_CLONE, async (event, args: { url: string; dir: string; depth?: number }) => {
    await gitService.clone(args, (step) => {
      if (!event.sender.isDestroyed()) {
        event.sender.send(CHANNELS.EVT_OPERATION_PROGRESS, step)
      }
    })
  })

  ipcMain.handle(CHANNELS.GIT_STAGE, async (_event, repoPath: string, paths: string[]) => {
    return gitService.stage(repoPath, paths)
  })

  ipcMain.handle(CHANNELS.GIT_UNSTAGE, async (_event, repoPath: string, paths: string[]) => {
    return gitService.unstage(repoPath, paths)
  })

  ipcMain.handle(CHANNELS.GIT_COMMIT, async (_event, repoPath: string, message: string, noVerify?: boolean) => {
    return gitService.commit(repoPath, message, noVerify)
  })

  ipcMain.handle(CHANNELS.GIT_PUSH, async (event, repoPath: string) => {
    return gitService.push(repoPath, (step) => {
      if (!event.sender.isDestroyed()) event.sender.send(CHANNELS.EVT_OPERATION_PROGRESS, step)
    })
  })

  ipcMain.handle(CHANNELS.GIT_PULL, async (event, repoPath: string) => {
    return gitService.pull(repoPath, (step) => {
      if (!event.sender.isDestroyed()) event.sender.send(CHANNELS.EVT_OPERATION_PROGRESS, step)
    })
  })

  ipcMain.handle(CHANNELS.GIT_FETCH, async (event, repoPath: string) => {
    return gitService.fetch(repoPath, (step) => {
      if (!event.sender.isDestroyed()) event.sender.send(CHANNELS.EVT_OPERATION_PROGRESS, step)
    })
  })

  ipcMain.handle(CHANNELS.GIT_LOG, async (_event, repoPath: string, args?: { limit?: number; all?: boolean }) => {
    return gitService.log(repoPath, args)
  })

  ipcMain.handle(CHANNELS.GIT_BRANCH_LIST, async (_event, repoPath: string) => {
    return gitService.branchList(repoPath)
  })

  ipcMain.handle(CHANNELS.GIT_BRANCH_CREATE, async (_event, repoPath: string, name: string, from?: string) => {
    return gitService.createBranch(repoPath, name, from)
  })

  ipcMain.handle(CHANNELS.GIT_BRANCH_RENAME, async (_event, repoPath: string, oldName: string, newName: string) => {
    return gitService.renameBranch(repoPath, oldName, newName)
  })

  ipcMain.handle(CHANNELS.GIT_BRANCH_DELETE, async (_event, repoPath: string, name: string, force: boolean) => {
    return gitService.deleteBranch(repoPath, name, force)
  })

  ipcMain.handle(CHANNELS.GIT_BRANCH_DELETE_REMOTE, async (_event, repoPath: string, remoteName: string, branch: string) => {
    return gitService.deleteRemoteBranch(repoPath, remoteName, branch)
  })

  ipcMain.handle(CHANNELS.GIT_REMOTE_URL, async (_event, repoPath: string) => {
    return gitService.getRemoteUrl(repoPath)
  })

  ipcMain.handle(CHANNELS.GIT_SYNC_STATUS, async (_event, repoPath: string) => {
    return gitService.getSyncStatus(repoPath)
  })

  ipcMain.handle(CHANNELS.GIT_UPDATE_FROM_MAIN, async (_event, repoPath: string) => {
    return gitService.updateFromMain(repoPath)
  })

  ipcMain.handle(CHANNELS.GIT_DIFF, async (_event, repoPath: string, filePath: string, staged: boolean) => {
    return gitService.diff(repoPath, filePath, staged)
  })

  ipcMain.handle(CHANNELS.GIT_DISCARD, async (_event, repoPath: string, paths: string[], isUntracked: boolean) => {
    return gitService.discard(repoPath, paths, isUntracked)
  })

  ipcMain.handle(CHANNELS.GIT_DISCARD_ALL, async (_event, repoPath: string) => {
    return gitService.discardAll(repoPath)
  })

  ipcMain.handle(CHANNELS.GIT_COMMIT_FILES, async (_event, repoPath: string, hash: string) => {
    return gitService.commitFiles(repoPath, hash)
  })

  ipcMain.handle(CHANNELS.GIT_ADD_GITIGNORE, async (_event, repoPath: string, pattern: string) => {
    return gitService.addToGitignore(repoPath, pattern)
  })

  ipcMain.handle(CHANNELS.GIT_STASH_LIST, async (_event, repoPath: string) => {
    return gitService.stashList(repoPath)
  })

  ipcMain.handle(CHANNELS.GIT_STASH_SAVE, async (_event, repoPath: string, message?: string) => {
    return gitService.stashSave(repoPath, message)
  })

  ipcMain.handle(CHANNELS.GIT_STASH_POP, async (_event, repoPath: string, ref: string) => {
    return gitService.stashPop(repoPath, ref)
  })

  ipcMain.handle(CHANNELS.GIT_STASH_APPLY, async (_event, repoPath: string, ref: string) => {
    return gitService.stashApply(repoPath, ref)
  })

  ipcMain.handle(CHANNELS.GIT_STASH_DROP, async (_event, repoPath: string, ref: string) => {
    return gitService.stashDrop(repoPath, ref)
  })

  // ── Auth — Phase 3 ────────────────────────────────────────────────────────
  ipcMain.handle(CHANNELS.AUTH_START_DEVICE_FLOW, async () => {
    return authService.startDeviceFlow()
  })

  ipcMain.handle(CHANNELS.AUTH_POLL_DEVICE_FLOW, async (_event, deviceCode: string) => {
    return authService.pollDeviceFlow(deviceCode)
  })

  ipcMain.handle(CHANNELS.AUTH_LIST_ACCOUNTS, async () => {
    return authService.listAccounts()
  })

  ipcMain.handle(CHANNELS.AUTH_LOGOUT, async (_event, userId: string) => {
    return authService.logout(userId)
  })

  ipcMain.handle(CHANNELS.GIT_CHECKOUT, async (_event, repoPath: string, branch: string) => {
    return gitService.checkout(repoPath, branch)
  })

  ipcMain.handle(CHANNELS.GIT_MERGE_PREVIEW, async (_event, repoPath: string, targetBranch: string) => {
    return gitService.mergePreview(repoPath, targetBranch)
  })

  ipcMain.handle(CHANNELS.GIT_MERGE, async (_event, repoPath: string, targetBranch: string) => {
    return gitService.merge(repoPath, targetBranch)
  })

  // ── Locks — Phase 5 ───────────────────────────────────────────────────────
  ipcMain.handle(CHANNELS.LOCK_LIST, async (_event, repoPath: string) => {
    return lockService.listLocks(repoPath)
  })

  ipcMain.handle(CHANNELS.LOCK_FILE, async (_event, repoPath: string, filePath: string) => {
    return lockService.lockFile(repoPath, filePath)
  })

  ipcMain.handle(CHANNELS.LOCK_UNLOCK, async (_event, repoPath: string, filePath: string, force?: boolean) => {
    return lockService.unlockFile(repoPath, filePath, force)
  })

  ipcMain.handle(CHANNELS.LOCK_WATCH, async (_event, repoPath: string, filePath: string) => {
    return lockService.watchFile(repoPath, filePath)
  })

  ipcMain.handle(CHANNELS.LOCK_START_POLLING, async (_event, repoPath: string) => {
    lockService.startPolling(repoPath)
  })

  ipcMain.handle(CHANNELS.LOCK_STOP_POLLING, async (_event, repoPath: string) => {
    lockService.stopPolling(repoPath)
  })

  ipcMain.handle(CHANNELS.LFS_STATUS, async (_event, repoPath: string) => {
    return gitService.lfsStatus(repoPath)
  })

  ipcMain.handle(CHANNELS.LFS_TRACK, async (_event, repoPath: string, patterns: string[]) => {
    return gitService.lfsTrack(repoPath, patterns)
  })

  ipcMain.handle(CHANNELS.LFS_UNTRACK, async (_event, repoPath: string, pattern: string) => {
    return gitService.lfsUntrack(repoPath, pattern)
  })

  ipcMain.handle(CHANNELS.LFS_AUTODETECT, async (_event, repoPath: string) => {
    return gitService.lfsAutodetect(repoPath)
  })

  ipcMain.handle(CHANNELS.LFS_MIGRATE, async (_event, repoPath: string, patterns: string[]) => {
    return gitService.lfsMigrate(repoPath, patterns)
  })

  ipcMain.handle(CHANNELS.CLEANUP_SIZE, async (_event, repoPath: string) => {
    return gitService.cleanupSize(repoPath)
  })

  ipcMain.handle(CHANNELS.CLEANUP_GC, async (_event, repoPath: string, aggressive?: boolean) => {
    return gitService.cleanupGc(repoPath, aggressive)
  })

  ipcMain.handle(CHANNELS.CLEANUP_PRUNE_LFS, async (_event, repoPath: string) => {
    return gitService.cleanupPruneLfs(repoPath)
  })

  ipcMain.handle(CHANNELS.CLEANUP_SHALLOW, async (_event, repoPath: string, depth: number) => {
    return gitService.cleanupShallow(repoPath, depth)
  })

  ipcMain.handle(CHANNELS.CLEANUP_UNSHALLOW, async (_event, repoPath: string) => {
    return gitService.cleanupUnshallow(repoPath)
  })

  ipcMain.handle(CHANNELS.NOTIFICATION_LIST, async (_event, repoPath: string) => {
    return notificationService.list(repoPath)
  })

  ipcMain.handle(CHANNELS.NOTIFICATION_MARK_READ, async (_event, id: number) => {
    notificationService.markRead(id)
  })

  ipcMain.handle(CHANNELS.WEBHOOK_TEST, async (_event, url: string) => {
    return webhookService.test(url)
  })

  ipcMain.handle(CHANNELS.WEBHOOK_SAVE, async (_event, repoPath: string, config: WebhookConfig) => {
    webhookService.saveConfig(repoPath, config)
  })

  // ── Auto-fix helpers — Phase 13 ───────────────────────────────────────────
  ipcMain.handle(CHANNELS.GIT_REBASE_ABORT, (_event, repoPath: string) =>
    gitService.rebaseAbort(repoPath)
  )

  ipcMain.handle(CHANNELS.GIT_SET_UPSTREAM, (_event, repoPath: string, branch: string) =>
    gitService.setUpstream(repoPath, branch)
  )

  ipcMain.handle(CHANNELS.GIT_SET_CONFIG, (_event, repoPath: string, key: string, value: string) =>
    gitService.setGitConfig(repoPath, key, value)
  )

  // ── Hooks — Phase 12 ──────────────────────────────────────────────────────
  ipcMain.handle(CHANNELS.HOOK_LIST, (_event, repoPath: string) =>
    hookService.listHooks(repoPath)
  )

  ipcMain.handle(CHANNELS.HOOK_ENABLE, (_event, repoPath: string, name: string) =>
    hookService.enableHook(repoPath, name)
  )

  ipcMain.handle(CHANNELS.HOOK_DISABLE, (_event, repoPath: string, name: string) =>
    hookService.disableHook(repoPath, name)
  )

  ipcMain.handle(CHANNELS.HOOK_BUILTINS, () =>
    hookService.builtins()
  )

  ipcMain.handle(CHANNELS.HOOK_INSTALL_BUILTIN, (_event, repoPath: string, id: string) =>
    hookService.installBuiltin(repoPath, id)
  )

  ipcMain.handle(CHANNELS.HOOK_RUN_PRECOMMIT, (_event, repoPath: string) =>
    hookService.runPreCommit(repoPath)
  )

  ipcMain.handle(CHANNELS.UE_DETECT, (_event, repoPath: string) =>
    unrealService.detect(repoPath)
  )

  ipcMain.handle(CHANNELS.UE_SETUP_STATUS, (_event, repoPath: string) =>
    unrealService.setupStatus(repoPath)
  )

  ipcMain.handle(CHANNELS.UE_TEMPLATES, () =>
    unrealService.templates()
  )

  ipcMain.handle(CHANNELS.UE_WRITE_GITATTRIBUTES, (_event, repoPath: string) =>
    unrealService.writeGitattributes(repoPath)
  )

  ipcMain.handle(CHANNELS.UE_WRITE_GITIGNORE, (_event, repoPath: string) =>
    unrealService.writeGitignore(repoPath)
  )

  ipcMain.handle(CHANNELS.UE_PAK_SIZE, (_event, repoPath: string, stagedPaths: string[]) =>
    unrealService.pakSizeEstimate(repoPath, stagedPaths)
  )

  // ── App Settings — Phase 15 ───────────────────────────────────────────────
  ipcMain.handle(CHANNELS.SETTINGS_GET, () =>
    settingsService.getAll()
  )

  ipcMain.handle(CHANNELS.SETTINGS_SAVE, (_event, settings: AppSettings) =>
    settingsService.save(settings)
  )

  // ── Team Config — Phase 15 ────────────────────────────────────────────────
  ipcMain.handle(CHANNELS.TEAM_CONFIG_LOAD, (_event, repoPath: string) =>
    teamConfigService.load(repoPath)
  )

  ipcMain.handle(CHANNELS.TEAM_CONFIG_SAVE, (_event, repoPath: string, config: TeamConfig) =>
    teamConfigService.save(repoPath, config)
  )
}
