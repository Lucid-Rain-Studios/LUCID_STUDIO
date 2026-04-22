// Typed wrappers around window.lucidGit.*
// This file is the single source of truth for the renderer-side IPC contract.

// ── Domain types ─────────────────────────────────────────────────────────────

export interface DeviceFlowStart {
  deviceCode: string
  userCode: string
  verificationUri: string
  expiresIn: number
  interval: number
}

export interface Account {
  userId: string
  login: string
  name: string
  avatarUrl: string
}

export interface FileStatus {
  path: string
  indexStatus: string
  workingStatus: string
  staged: boolean
}

export interface CommitEntry {
  hash: string
  parentHashes: string[]
  author: string
  email: string
  timestamp: number
  message: string
}

export interface CommitFileChange {
  status:   string   // 'M' | 'A' | 'D' | 'R' | 'C' | 'T'
  path:     string
  oldPath?: string   // only for renames/copies
}

export interface BranchInfo {
  name: string          // full short name: "main" or "origin/main"
  displayName: string   // name without remote prefix: always "main"
  current: boolean
  upstream?: string
  ahead: number
  behind: number
  isRemote: boolean
  remoteName?: string
  hasLocal?: boolean    // remote branches: true if a local tracking branch exists
}

export interface ContributorInfo {
  branch: string
  lastContributor: { name: string; email: string }
  lastEditedAt: string   // ISO date string
  lastCommitMessage: string
  sizeBytes: number
}

export interface ConflictPreviewFile {
  path: string
  type: 'text' | 'binary' | 'ue-asset'
  conflictType: 'content' | 'binary' | 'delete-modify'
  ours: ContributorInfo
  theirs: ContributorInfo
}

export interface SyncStatus {
  ahead: number
  behind: number
  remoteName: string
  remoteBranch: string
  hasUpstream: boolean
}

export interface Lock {
  id: string
  path: string
  owner: { name: string; login: string }
  lockedAt: string   // ISO date string
}

export interface LFSStatus {
  tracked: string[]
  untracked: string[]
  objects: number
  totalBytes: number
}

export interface SizeBreakdown {
  totalBytes: number
  objectsBytes: number
  packsBytes: number
  lfsCacheBytes: number
  logsBytes: number
}

export interface CleanupResult {
  beforeBytes: number
  afterBytes: number
  savedBytes: number
}

export interface AppNotification {
  id: number
  type: string
  title: string
  body: string
  repoPath: string
  createdAt: string  // ISO date string
  read: boolean
}

export interface WebhookConfig {
  url: string
  enabled: boolean
  events: {
    fileLocked: boolean
    fileUnlocked: boolean
    mergeConflictDetected: boolean
    pushToMain: boolean
    branchCreated: boolean
    forceUnlock: boolean
    largeFileWarning: boolean
    fatalError: boolean
    cleanupCompleted: boolean
    branchDeleted: boolean
  }
  mentionRoles?: string[]
  quietHours?: { start: string; end: string }
}

export interface UEProject {
  name: string
  uprojectPath: string
  engineVersion: string
}

export interface HookInfo {
  name: string
  enabled: boolean
  isBuiltin: boolean
  scriptPreview: string
}

export interface HookRunResult {
  exists: boolean
  exitCode: number
  output: string
  durationMs: number
}

export interface BuiltinDef {
  id: string
  hookName: string
  description: string
  script: string
}

export interface UESetupStatus {
  hasGitattributes: boolean
  hasUeGitattributes: boolean
  hasGitignore: boolean
  hasUeGitignore: boolean
}

export interface OperationStep {
  id: string
  label: string
  status: 'pending' | 'running' | 'done' | 'error'
  progress?: number
  detail?: string
  duration?: number
}

export interface StashEntry {
  index:   number
  ref:     string
  message: string
  branch:  string
  date:    string
}

export interface DiffContent {
  oldContent: string
  newContent: string
  isBinary: boolean
  language: string
}

export interface UpdateInfo {
  version: string
  releaseDate: string
  releaseNotes?: string
}

export interface AppSettings {
  autoFetchIntervalMinutes: number
  defaultCloneDepth: number
  largeFileWarnMB: number
  scheduledCleanup: {
    enabled: boolean
    frequencyDays: number
    includeGc: boolean
    includePruneLfs: boolean
  }
}

export interface TeamConfig {
  lfsPatterns: string[]
  webhookEvents: Record<string, boolean>
  hookIds: string[]
  largeFileWarnMB?: number
}

// ── API surface type ──────────────────────────────────────────────────────────

export interface LucidGitAPI {
  // OS dialogs + shell
  openDirectory:  () => Promise<string | null>
  openExternal:   (url: string) => Promise<void>
  showInFolder:   (fullPath: string) => Promise<void>
  openPath:       (fullPath: string) => Promise<void>

  // Auth
  startDeviceFlow: () => Promise<DeviceFlowStart>
  pollDeviceFlow: (deviceCode: string) => Promise<{ token: string; userId: string } | null>
  listAccounts: () => Promise<Account[]>
  logout: (userId: string) => Promise<void>

  // Git core
  isRepo: (repoPath: string) => Promise<boolean>
  clone: (args: { url: string; dir: string; depth?: number }) => Promise<void>
  status: (repoPath: string) => Promise<FileStatus[]>
  currentBranch: (repoPath: string) => Promise<string>
  stage: (repoPath: string, paths: string[]) => Promise<void>
  unstage: (repoPath: string, paths: string[]) => Promise<void>
  commit: (repoPath: string, message: string, noVerify?: boolean) => Promise<void>
  push: (repoPath: string) => Promise<void>
  pull: (repoPath: string) => Promise<void>
  fetch: (repoPath: string) => Promise<void>
  log: (repoPath: string, args?: { limit?: number; all?: boolean }) => Promise<CommitEntry[]>
  commitFiles: (repoPath: string, hash: string) => Promise<CommitFileChange[]>
  branchList:    (repoPath: string) => Promise<BranchInfo[]>
  createBranch:  (repoPath: string, name: string, from?: string) => Promise<void>
  renameBranch:  (repoPath: string, oldName: string, newName: string) => Promise<void>
  deleteBranch:        (repoPath: string, name: string, force: boolean) => Promise<void>
  deleteRemoteBranch:  (repoPath: string, remoteName: string, branch: string) => Promise<void>
  getRemoteUrl:  (repoPath: string) => Promise<string | null>
  getSyncStatus: (repoPath: string) => Promise<SyncStatus>
  updateFromMain:(repoPath: string) => Promise<void>
  diff:           (repoPath: string, filePath: string, staged: boolean) => Promise<DiffContent>
  discard:        (repoPath: string, paths: string[], isUntracked: boolean) => Promise<void>
  discardAll:     (repoPath: string) => Promise<void>
  addToGitignore: (repoPath: string, pattern: string) => Promise<void>
  stashList:      (repoPath: string) => Promise<StashEntry[]>
  stashSave:      (repoPath: string, message?: string) => Promise<void>
  stashPop:       (repoPath: string, ref: string) => Promise<void>
  stashApply:     (repoPath: string, ref: string) => Promise<void>
  stashDrop:      (repoPath: string, ref: string) => Promise<void>
  checkout: (repoPath: string, branch: string) => Promise<void>
  mergePreview: (repoPath: string, targetBranch: string) => Promise<ConflictPreviewFile[]>
  merge: (repoPath: string, targetBranch: string) => Promise<void>

  // Locks
  listLocks: (repoPath: string) => Promise<Lock[]>
  lockFile: (repoPath: string, filePath: string) => Promise<Lock>
  unlockFile: (repoPath: string, filePath: string, force?: boolean) => Promise<void>
  watchLock: (repoPath: string, filePath: string) => Promise<void>
  startLockPolling: (repoPath: string) => Promise<void>
  stopLockPolling: (repoPath: string) => Promise<void>

  // LFS
  lfsStatus:    (repoPath: string) => Promise<LFSStatus>
  lfsTrack:     (repoPath: string, patterns: string[]) => Promise<void>
  lfsUntrack:   (repoPath: string, pattern: string) => Promise<void>
  lfsMigrate:   (repoPath: string, patterns: string[]) => Promise<void>
  lfsAutodetect:(repoPath: string) => Promise<string[]>

  // Cleanup
  cleanupSize: (repoPath: string) => Promise<SizeBreakdown>
  cleanupGc: (repoPath: string, aggressive?: boolean) => Promise<CleanupResult>
  cleanupPruneLfs: (repoPath: string) => Promise<void>
  cleanupShallow: (repoPath: string, depth: number) => Promise<void>
  cleanupUnshallow: (repoPath: string) => Promise<void>

  // Notifications + webhooks
  notificationList: (repoPath: string) => Promise<AppNotification[]>
  notificationMarkRead: (id: number) => Promise<void>
  webhookTest: (url: string) => Promise<boolean>
  webhookSave: (repoPath: string, config: WebhookConfig) => Promise<void>

  // Auto-updater
  updateCheck: () => Promise<void>
  updateDownload: () => Promise<void>
  updateInstall: () => Promise<void>
  onUpdateReady: (cb: () => void) => () => void

  // Auto-fix helpers
  rebaseAbort: (repoPath: string) => Promise<void>
  setUpstream: (repoPath: string, branch: string) => Promise<void>
  setGitConfig: (repoPath: string, key: string, value: string) => Promise<void>

  // Hooks
  hookList: (repoPath: string) => Promise<HookInfo[]>
  hookEnable: (repoPath: string, name: string) => Promise<void>
  hookDisable: (repoPath: string, name: string) => Promise<void>
  hookBuiltins: () => Promise<BuiltinDef[]>
  hookInstallBuiltin: (repoPath: string, id: string) => Promise<void>
  hookRunPreCommit: (repoPath: string) => Promise<HookRunResult>

  // Unreal
  ueDetect: (repoPath: string) => Promise<UEProject | null>
  ueSetupStatus: (repoPath: string) => Promise<UESetupStatus>
  ueTemplates: () => Promise<{ gitattributes: string; gitignore: string }>
  ueWriteGitattributes: (repoPath: string) => Promise<void>
  ueWriteGitignore: (repoPath: string) => Promise<void>
  uePakSize: (repoPath: string, stagedPaths: string[]) => Promise<number>

  // App Settings
  settingsGet: () => Promise<AppSettings>
  settingsSave: (settings: AppSettings) => Promise<void>

  // Team Config
  teamConfigLoad: (repoPath: string) => Promise<TeamConfig | null>
  teamConfigSave: (repoPath: string, config: TeamConfig) => Promise<void>

  // Events: main → renderer — each returns an unsubscribe function
  onOperationProgress: (cb: (step: OperationStep) => void) => () => void
  onLockChanged: (cb: (locks: Lock[]) => void) => () => void
  onNotification: (cb: (notification: AppNotification) => void) => () => void
  onUpdateAvailable: (cb: (info: UpdateInfo) => void) => () => void
}

// ── Window augmentation ───────────────────────────────────────────────────────

declare global {
  interface Window {
    lucidGit: LucidGitAPI
  }
}

// ── Typed accessor ────────────────────────────────────────────────────────────

export const ipc: LucidGitAPI = window.lucidGit
