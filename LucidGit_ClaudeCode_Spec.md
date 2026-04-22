# Lucid Git — Git Client for Game Developers
## Claude Code Build Specification — v2.0 (Audited)

---

## Overview

Build **Lucid Git**, a cross-platform desktop Git client built with **Electron + React + TypeScript**, purpose-built for game development teams (especially Unreal Engine 5). It replaces GitHub Desktop with a far more capable tool that handles binary files, LFS, file locking, `.git` size management, and provides rich developer feedback at every step.

**Non-goals:** Lucid Git does not require Redis, Node, or Git to be pre-installed by end users. It must run after a single installer with no external dependencies.

---

## Tech Stack (verified)

| Layer | Technology | Why |
|---|---|---|
| Shell | Electron 33+ | Cross-platform desktop |
| Frontend | React 18 + TypeScript | Industry standard for Electron UIs |
| Styling | Tailwind CSS + shadcn/ui | Fast, composable, good defaults |
| State (UI) | Zustand | Simple, no boilerplate |
| State (async/cache) | `@tanstack/react-query` | Handles git data cache + invalidation |
| Git operations | `dugite` ^3.2 (bundled Git + LFS binaries) | No system Git required |
| Auth | GitHub Device Flow OAuth | No callback server needed for a desktop app |
| Secure storage | `keytar` (OS keychain) | Tokens never hit disk in plaintext |
| Non-secret settings | `electron-store` | JSON in userData dir |
| Background jobs | Node `worker_threads` + in-process queue (`p-queue`) | **No Redis required** |
| Notifications | Electron `Notification` API | Native OS notifications |
| DB (local) | SQLite via `better-sqlite3` | Notification log, repo metadata |
| Editor/Diff | `monaco-editor` via `@monaco-editor/react` | Same engine as VS Code |
| HTTP | Native `fetch` (Node 18+) | No extra dep for Discord webhooks |
| Packaging | `electron-builder` ^25 | Cross-platform installers |
| Auto-update | `electron-updater` | GitHub Releases as update server |

**Key corrections from v1.1:**
- ❌ Removed `bull` (requires Redis — would break one-click install) → ✅ `p-queue` (in-process, zero runtime dep)
- ❌ Removed `simple-git` (requires system Git; redundant with dugite) → ✅ `dugite` only
- ❌ Removed `react-virtual` v2 (deprecated) → ✅ `@tanstack/react-virtual` v3
- ❌ Removed `node-fetch` (not needed, Node 18+ has native `fetch`)
- ❌ OAuth2 PKCE doesn't work cleanly without a callback URL → ✅ GitHub **Device Flow** (built for desktop apps)
- ✅ Corrected dugite API: it's `exec()` not `git()`

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Renderer (React)                    │
│  UI components, Zustand stores, React Query caches  │
└────────────────────┬────────────────────────────────┘
                     │ IPC (contextBridge, typed)
┌────────────────────┴────────────────────────────────┐
│                 Main (Node)                          │
│  ┌────────────────────────────────────────────┐    │
│  │  Services (singletons)                      │    │
│  │  GitService, LockService, LFSService,       │    │
│  │  CleanupService, NotificationService,       │    │
│  │  AuthService, ErrorParser                   │    │
│  └──────────────┬─────────────────────────────┘    │
│                 │                                    │
│  ┌──────────────┴─────────────────────────────┐    │
│  │  Worker threads (p-queue)                   │    │
│  │  runs git operations off main thread        │    │
│  └────────────────────────────────────────────┘    │
│                                                      │
│  dugite (bundled git + git-lfs binaries)            │
│  keytar (OS keychain)                               │
│  better-sqlite3 (local DB)                          │
└──────────────────────────────────────────────────────┘
```

---

## Project Structure

```
lucid-git/
├── package.json
├── electron-builder.yml
├── tsconfig.json
├── tsconfig.main.json        # main process uses CommonJS
├── tsconfig.renderer.json    # renderer uses ESM
├── vite.config.ts            # renderer bundler
├── .github/
│   └── workflows/
│       ├── ci.yml            # lint + typecheck on PR
│       └── release.yml       # builds + publishes on tag
├── assets/
│   ├── icon.ico              # Windows
│   ├── icon.icns             # macOS
│   └── icon.png              # Linux + in-app
├── electron/
│   ├── main.ts               # App entry, window mgmt, IPC registration
│   ├── preload.ts            # contextBridge — typed IPC surface
│   ├── ipc/
│   │   ├── channels.ts       # IPC channel name constants
│   │   └── handlers.ts       # Maps channel → service method
│   ├── services/
│   │   ├── GitService.ts
│   │   ├── LockService.ts
│   │   ├── LFSService.ts
│   │   ├── CleanupService.ts
│   │   ├── ShallowCloneService.ts
│   │   ├── NotificationService.ts
│   │   ├── AuthService.ts
│   │   ├── UnrealService.ts
│   │   ├── HookService.ts
│   │   └── ErrorParser.ts
│   ├── workers/
│   │   └── git-worker.ts     # Long-running git ops run here
│   ├── db/
│   │   ├── schema.sql
│   │   └── migrations.ts
│   └── util/
│       ├── dugite-exec.ts    # Wraps dugite with progress streaming
│       └── git-log-parse.ts  # Parses --format output
├── src/                      # Renderer
│   ├── main.tsx
│   ├── App.tsx
│   ├── ipc.ts                # Typed wrappers around window.lucidGit.*
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppShell.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── TopBar.tsx    # Notification bell, update banner
│   │   │   └── StatusBar.tsx # Progress strip
│   │   ├── auth/
│   │   │   ├── DeviceFlowLogin.tsx
│   │   │   └── AccountSwitcher.tsx
│   │   ├── repo/
│   │   │   ├── RepoList.tsx
│   │   │   ├── CloneDialog.tsx
│   │   │   └── BranchSelector.tsx
│   │   ├── changes/
│   │   │   ├── FileTree.tsx
│   │   │   ├── FileRow.tsx
│   │   │   ├── FileLockBadge.tsx
│   │   │   ├── StagingArea.tsx
│   │   │   └── CommitBox.tsx
│   │   ├── diff/
│   │   │   ├── TextDiff.tsx       # monaco-based
│   │   │   └── BinaryDiff.tsx     # size / hash / metadata
│   │   ├── conflicts/
│   │   │   ├── ConflictPreview.tsx    # Pre-merge flight check
│   │   │   ├── ConflictCard.tsx       # Per-file card
│   │   │   ├── TextResolver.tsx
│   │   │   └── BinaryResolver.tsx
│   │   ├── history/
│   │   │   ├── CommitGraph.tsx
│   │   │   ├── CommitDetail.tsx
│   │   │   └── RestoreDialog.tsx
│   │   ├── progress/
│   │   │   ├── OperationProgress.tsx
│   │   │   └── StepTracker.tsx
│   │   ├── lfs/
│   │   │   ├── LFSManager.tsx
│   │   │   └── LFSAutoDetect.tsx
│   │   ├── cleanup/
│   │   │   ├── GitCleaner.tsx
│   │   │   ├── ShallowCloneManager.tsx
│   │   │   └── SizeDashboard.tsx
│   │   ├── notifications/
│   │   │   ├── NotificationBell.tsx
│   │   │   ├── NotificationFeed.tsx
│   │   │   └── WatchFileButton.tsx
│   │   ├── errors/
│   │   │   └── ErrorPanel.tsx
│   │   ├── unreal/
│   │   │   ├── UProjectDetector.tsx
│   │   │   ├── GitAttributesEditor.tsx
│   │   │   └── GitIgnoreEditor.tsx
│   │   ├── hooks/
│   │   │   └── HooksManager.tsx
│   │   ├── settings/
│   │   │   ├── SettingsPage.tsx
│   │   │   ├── GeneralSettings.tsx
│   │   │   ├── LFSSettings.tsx
│   │   │   ├── CleanupScheduler.tsx
│   │   │   ├── DiscordWebhookSettings.tsx
│   │   │   └── NotificationSettings.tsx
│   │   └── command-palette/
│   │       └── CommandPalette.tsx
│   ├── stores/
│   │   ├── authStore.ts
│   │   ├── repoStore.ts
│   │   ├── operationStore.ts
│   │   ├── lockStore.ts
│   │   └── notificationStore.ts
│   ├── hooks/
│   │   ├── useRepoStatus.ts
│   │   ├── useLocks.ts
│   │   └── useOperation.ts
│   └── lib/
│       ├── formatters.ts
│       ├── gitErrors.ts
│       ├── unrealAssets.ts
│       └── discordEmbeds.ts
└── tests/
    ├── unit/
    └── e2e/                   # Playwright for electron
```

---

## IPC Contract (must be defined first)

Claude Code builds this **before** any services, so the contract is fixed up front and everything downstream has a stable interface.

```typescript
// electron/ipc/channels.ts
export const CHANNELS = {
  // Auth
  AUTH_START_DEVICE_FLOW: 'auth:start-device-flow',
  AUTH_POLL_DEVICE_FLOW: 'auth:poll-device-flow',
  AUTH_LIST_ACCOUNTS: 'auth:list-accounts',
  AUTH_LOGOUT: 'auth:logout',

  // Git core
  GIT_CLONE: 'git:clone',
  GIT_STATUS: 'git:status',
  GIT_STAGE: 'git:stage',
  GIT_UNSTAGE: 'git:unstage',
  GIT_COMMIT: 'git:commit',
  GIT_PUSH: 'git:push',
  GIT_PULL: 'git:pull',
  GIT_FETCH: 'git:fetch',
  GIT_LOG: 'git:log',
  GIT_BRANCH_LIST: 'git:branch-list',
  GIT_CHECKOUT: 'git:checkout',
  GIT_MERGE_PREVIEW: 'git:merge-preview',  // Pre-merge flight check
  GIT_MERGE: 'git:merge',

  // Locks
  LOCK_FILE: 'lock:file',
  LOCK_UNLOCK: 'lock:unlock',
  LOCK_LIST: 'lock:list',
  LOCK_WATCH: 'lock:watch',           // "notify me when unlocked"

  // LFS
  LFS_STATUS: 'lfs:status',
  LFS_TRACK: 'lfs:track',
  LFS_MIGRATE: 'lfs:migrate',
  LFS_AUTODETECT: 'lfs:autodetect',

  // Cleanup
  CLEANUP_SIZE: 'cleanup:size',
  CLEANUP_GC: 'cleanup:gc',
  CLEANUP_PRUNE_LFS: 'cleanup:prune-lfs',
  CLEANUP_SHALLOW: 'cleanup:shallow',
  CLEANUP_UNSHALLOW: 'cleanup:unshallow',

  // Notifications + webhooks
  NOTIFICATION_LIST: 'notification:list',
  NOTIFICATION_MARK_READ: 'notification:mark-read',
  WEBHOOK_TEST: 'webhook:test',
  WEBHOOK_SAVE: 'webhook:save',

  // Unreal
  UE_DETECT: 'ue:detect',
  UE_WRITE_GITATTRIBUTES: 'ue:write-gitattributes',
  UE_WRITE_GITIGNORE: 'ue:write-gitignore',

  // Events (main → renderer, one-way)
  EVT_OPERATION_PROGRESS: 'evt:operation-progress',
  EVT_LOCK_CHANGED: 'evt:lock-changed',
  EVT_NOTIFICATION: 'evt:notification',
  EVT_UPDATE_AVAILABLE: 'evt:update-available',
} as const
```

Every service method has a matching IPC handler and a typed renderer wrapper. Claude Code generates all three in lockstep.

---

## Feature Specifications

### 1. Authentication — GitHub Device Flow

**Why Device Flow not PKCE:** Desktop apps can't reliably register an OAuth callback URL. Device Flow is purpose-built for this — the user is shown a code, opens github.com/login/device in their browser, enters the code, and the app polls for the token.

**Flow:**
1. App calls `POST https://github.com/login/device/code` with client_id + scopes
2. GitHub returns `user_code`, `device_code`, `verification_uri`, `interval`
3. App displays `user_code` + an "Open GitHub" button that opens `verification_uri`
4. App polls `POST https://github.com/login/oauth/access_token` every `interval` seconds
5. On success, token stored via `keytar.setPassword('lucid-git', 'github:{userId}', token)`

**Scopes:** `repo`, `write:lfs`, `read:user`

**Providers (v1):** GitHub, GitHub Enterprise. GitLab/Bitbucket deferred to v2.

**UI:**
- Large monospace code display with countdown to expiry
- "Copy code" + "Open GitHub" buttons
- Polling indicator ("Waiting for authorization...")
- Account badge in top bar; Settings → Accounts → Add / Sign out

---

### 2. File Locking (Git LFS Locks)

Critical for UE `.uasset`, `.umap`, `.png`, `.wav`, etc.

**Implementation:**
```typescript
// services/LockService.ts
class LockService {
  async lockFile(repoPath: string, filePath: string): Promise<Lock>
  async unlockFile(repoPath: string, filePath: string, force?: boolean): Promise<void>
  async listLocks(repoPath: string): Promise<Lock[]>       // git lfs locks --json
  async watchFile(repoPath: string, filePath: string): Promise<void>  // stored in SQLite
  async isLockedByOther(repoPath: string, filePath: string): Promise<boolean>
  async lockBatch(repoPath: string, filePaths: string[]): Promise<BatchLockResult>
  startPolling(repoPath: string, intervalMs: number): void  // emits EVT_LOCK_CHANGED
}
```

Poll loop runs in main process; diffs previous locks vs current; emits `EVT_LOCK_CHANGED` events; for any watched file that transitioned to unlocked, fires notification + clears watch.

**UI Behavior:**
- File tree badges: 🔒 locked by you | ⚠️ locked by teammate | 🔓 unlocked
- Right-click: Lock / Unlock / Force Unlock (with confirmation)
- Stage blocker if file locked by someone else — dialog shows who + email
- "My Locks" panel
- Auto-unlock on merge/commit (optional setting)
- Warn before checkout if incoming branch has locked files you've modified
- Live badges update on `EVT_LOCK_CHANGED`

**Lock Notifications (in-app):**
- Teammate locks a file → Electron system notification
- A lock you're watching is released → high-priority notification with one-click lock action
- Right-click any locked file → "Notify me when unlocked"
- Notification bell in top bar with full history for the current repo
- Per-repo, per-file-type filters (e.g. only notify on `.umap` locks)

---

### 3. Smart Merge Conflict Resolution & Pre-merge Flight Check

**Text conflicts:**
- Monaco-based 3-way merge (yours / base / theirs)
- Accept ours / Accept theirs / Accept both / Custom per-block
- Syntax highlighting per file type
- "Mark as resolved" per file

**Binary conflicts:**
- No auto-merge for `.uasset` / `.umap` — show clear binary conflict UI
- "Keep mine" / "Keep theirs" / "Open file manager to choose manually"
- Show metadata: file size, last modified, author, commit message per branch

**Pre-merge Flight Check — implementation:**

```typescript
// GitService.mergePreview(repoPath, targetBranch)
// 1. git merge-tree --write-tree --name-only HEAD <targetBranch>
//    → returns list of conflicting paths without actually merging (Git 2.38+)
// 2. For each path, collect metadata:
//    - git log -1 --format='%an|%ae|%at|%s' HEAD -- <path>          (ours)
//    - git log -1 --format='%an|%ae|%at|%s' <targetBranch> -- <path> (theirs)
//    - git cat-file -s HEAD:<path>                                   (our size)
//    - git cat-file -s <targetBranch>:<path>                         (their size)
// 3. Classify type from extension (.uasset/.umap → ue-asset, etc.)
// 4. Return ConflictPreviewFile[]
```

dugite ships a recent Git, so `merge-tree --write-tree` is available.

```typescript
interface ConflictPreviewFile {
  path: string
  type: 'text' | 'binary' | 'ue-asset'
  conflictType: 'content' | 'binary' | 'delete-modify'
  ours: {
    branch: string
    lastContributor: { name: string; email: string; avatarUrl?: string }
    lastEditedAt: Date
    lastCommitMessage: string
    sizeBytes: number
  }
  theirs: {
    branch: string
    lastContributor: { name: string; email: string; avatarUrl?: string }
    lastEditedAt: Date
    lastCommitMessage: string
    sizeBytes: number
  }
}
```

**UI:**
- Card per conflicting file with both contributors side-by-side
- Sort by most recently edited first
- `TEXT` vs `BINARY` badge per card
- "Proceed with merge" / "Abort" at the bottom — never silently start a doomed merge

---

### 4. Progress System

Every long-running op (fetch, pull, push, merge, GC, LFS migrate) emits:

```typescript
interface OperationStep {
  id: string
  label: string           // e.g. "Uploading LFS objects (47/203)"
  status: 'pending' | 'running' | 'done' | 'error'
  progress?: number       // 0–100
  detail?: string         // e.g. "textures/T_Ground_D.uasset (24.3 MB)"
  duration?: number       // ms elapsed
}
```

Progress parsed from Git stderr (`--progress` flag):
```typescript
// util/dugite-exec.ts
export async function execWithProgress(
  args: string[],
  repoPath: string,
  onProgress: (step: OperationStep) => void
): Promise<ExecResult> {
  const proc = GitProcess.spawn(args, repoPath)
  proc.stderr.on('data', (chunk) => {
    const step = parseGitProgress(chunk.toString())
    if (step) onProgress(step)
  })
  // ...
}
```

LFS progress parsed from `git lfs push` stderr:
`Uploading LFS objects: 47% (42/89), 412 MB | 8.3 MB/s`

**UI:** Bottom strip always visible during ops, expandable step list, ETA, cancel button, post-op summary ("Push complete — 14 files, 3 LFS objects (847 MB) in 12s"), toast for background ops.

---

### 5. .git Size Management & History Optimization

**Shallow Clone Manager — honest about Git's constraints:**
- `git clone --depth N --shallow-since=DATE` for initial shallow clone
- `git fetch --unshallow` to restore full history (permanent for that working copy)
- "Re-shallowing" after unshallow isn't a native Git operation. Lucid Git does it by: cloning a new shallow copy in a temp dir, copying the user's working changes over, swapping directories atomically.

**Features:**
- Set per-repo local history depth (last 90 days, last 500 commits, etc.)
- Full history always retrievable from remote
- "Time travel" restore: unshallow → checkout any commit → create restore branch → offer to re-shallow
- Size dashboard: `.git/objects/` breakdown, LFS cache, pack files, logs (via `git count-objects -v -H`)

**Cleanup Service:**
```typescript
class CleanupService {
  async getRepoSize(repoPath: string): Promise<SizeBreakdown>
  async runGC(repoPath: string, aggressive?: boolean): Promise<CleanupResult>
  async pruneRemoteRefs(repoPath: string): Promise<void>
  async expireLFSCache(repoPath: string, olderThanDays: number): Promise<void>
  async fullSweep(repoPath: string): Promise<CleanupReport>
}
```

**Scheduled Cleanup:**
- Weekly / monthly schedule
- Before/after size bar chart
- "Quick clean" (safe, fast) vs "Deep clean" (`gc --aggressive`)
- LFS object pruning for files not needed by current branch

---

### 6. Error Resolution System

Every git error parsed and returned as:

```typescript
interface LucidGitError {
  code: string              // internal error code
  gitMessage: string        // raw git output
  title: string             // human-readable title
  description: string       // plain-English explanation
  causes: string[]          // likely reasons
  fixes: FixStep[]          // ordered list of things to try
  docsUrl?: string
  severity: 'warning' | 'error' | 'fatal'
  canAutoFix: boolean
}

interface FixStep {
  label: string
  command?: string          // shell command if applicable
  action?: FixAction        // serializable dispatch descriptor (not a function!)
}

// FixAction must be serializable across IPC — so it's a discriminated union, not a callback:
type FixAction =
  | { type: 'reauth' }
  | { type: 'open-conflict-resolver'; repoPath: string }
  | { type: 'run-lfs-migrate'; patterns: string[] }
  | { type: 'open-settings'; section: string }
  | { type: 'set-upstream'; branch: string }
  | { type: 'abort-rebase' }
  | { type: 'clean-pack-files' }
  | { type: 'increase-buffer' }
  | { type: 'retry-with-ssh' }
```

The renderer has a dispatcher that maps each `FixAction` type to actual UI/IPC behavior. This avoids the previous spec's bug of trying to send functions across IPC.

**Error library (14 codes minimum):**
- `EAUTH`, `MERGE_CONFLICT`, `LFS_LOCK_CONFLICT`, `PUSH_REJECTED`, `DETACHED_HEAD`, `LARGE_FILE_NO_LFS`, `LFS_QUOTA_EXCEEDED`, `PACK_CORRUPT`, `NO_UPSTREAM`, `STASH_CONFLICT`, `REBASE_ABORT_NEEDED`, `PERMISSION_DENIED`, `NETWORK_TIMEOUT`, `DISK_SPACE`

**UI:** Error panel slides up, color-coded, "Fix automatically" when `canAutoFix`, copy-command buttons per step, persistent error history log.

---

### 7. Notification System & Discord Webhooks

**In-app notification center:**
- Bell icon with unread count
- Per-repo feed: locks, conflict warnings, teammate pushes to shared branches, cleanup completions
- Persisted in SQLite — full history
- Click notification → jump to relevant file/branch/commit

**Discord Webhook Integration:**

```typescript
class NotificationService {
  async sendDiscordNotification(webhookUrl: string, event: LucidGitEvent): Promise<void>
  async testWebhook(webhookUrl: string): Promise<boolean>
  async getWebhookSettings(repoPath: string): Promise<WebhookConfig>
  async saveWebhookSettings(repoPath: string, config: WebhookConfig): Promise<void>
}

interface WebhookConfig {
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
```

Posted via native `fetch`:
```typescript
await fetch(webhookUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'Lucid Git',
    avatar_url: 'https://.../lucid-git-icon.png',
    embeds: [buildEmbed(event)]
  })
})
```

Rate-limit handling: Discord returns 429 with `Retry-After`. Queue via `p-queue` with concurrency=1 per webhook URL, respect backoff.

**Discord message formats — rich embeds:**

```
🔒 File Locked
Alex Turner locked Content/Characters/Hero/SK_Hero.uasset
Branch: feature/hero-rework  |  Repo: INFERIUS
3 minutes ago
[View in Lucid Git]  [Contact Alex]
```

```
⚠️ Merge Conflicts Detected
8 conflicts found before merging feature/lighting → main
Binary conflicts (need manual choice): 3
  • Content/Maps/L_TownCenter.umap — last edited by Jordan (2h ago)
  • Content/Maps/L_Forest.umap — last edited by Alex (yesterday)
  • Content/Characters/NPC_Vendor.uasset — last edited by Sam (4h ago)
Text conflicts (auto-resolvable): 5
```

```
✅ File Unlocked — Available Now
Content/Characters/Hero/SK_Hero.uasset is now free
Previously locked by: Alex Turner
Lock held for: 2h 14m
[Lock it now]
```

**Settings UI:** Per-repo webhook URL field + "Test Webhook" button, checkbox list for events, embed preview, optional separate webhooks per category.

**Event triggers that fire Discord notifications:**

| Event | Severity |
|---|---|
| File locked | Info |
| File unlocked | Info |
| Merge conflict detected (pre-flight) | Warning |
| Push to main/master | Info |
| Force unlock (another user's lock) | Warning — @mention lock owner |
| Large file pushed without LFS | Warning |
| Fatal git error | Critical |
| Cleanup completed (size saved) | Info |
| Branch deleted | Info |

**Storage note:** Webhook URL in `electron-store` (non-secret per-repo setting). OAuth tokens go in keychain.

---

### 8. Unreal Engine Specific Features

**Auto-detect UE project:**
- Glob `.uproject` in repo root
- Auto-suggest LFS patterns: `*.uasset *.umap *.udk *.ubulk *.upk *.pak *.uexp *.ucas`
- Offer to write `.gitattributes` with LFS + binary flags

**`.gitignore` manager:**
- Built-in UE5-optimized template as a bundled asset
- Visual editor for DDC, Saved/, Intermediate/, Binaries/
- Warning if `DerivedDataCache/` accidentally tracked

**Check-out-for-edit workflow (Perforce-style, optional setting):**
- One-click: lock + stage for modification
- "Submit" = unlock + commit + push atomically

**Pak size estimator:**
- Walk staged files, sum sizes of files matching LFS patterns
- Warn if single commit adds > configurable threshold (e.g. 500 MB raw assets)

---

### 9. Branch & History Visualization

- `git log --all --graph --format=%H|%P|%an|%at|%s` parsed into a graph model
- Custom lane allocator (~200 lines) — faster and leaner than d3
- Branch lanes, merge commits, tags, PR status badges (open / merged / draft / CI status via GitHub API)
- Filter by author, date range, file path
- "Restore to this commit" creates a safety branch first
- Tag manager
- Cherry-pick via drag-and-drop on graph

---

### 10. Pre-commit Hooks UI

- Reads `.git/hooks/`, shows enable/disable toggles
- Built-in library: file size guard, `.uasset` validation, lint
- Inline hook output before commit completes
- Bypass requires explicit confirmation (not silent `--no-verify`)

---

### 11. Performance

- Worker threads for: clone, fetch, push, pull, gc, lfs-migrate, merge
- `@tanstack/react-virtual` for file trees > 500 rows
- React Query 30s stale time for repo status
- Debounced file watcher events (100ms)
- Incremental diff computation — don't re-diff unchanged files

---

### 12. Distribution — One-Click Install

**Bundling:**
- `dugite` downloads platform-specific Git + LFS binaries in its postinstall
- `electron-builder` bundles these automatically via `asarUnpack`
- No admin rights needed on install (user-space by default)

**Per-platform output:**

| Platform | Installer | Notes |
|---|---|---|
| Windows | `.exe` (NSIS) | Installs to AppData, Start Menu shortcut, optional desktop icon |
| macOS | `.dmg` | Drag-to-Applications; unsigned requires right-click → Open |
| Linux | `.AppImage` | Single portable file |

**`electron-builder.yml`:**
```yaml
appId: com.yourteam.lucid-git
productName: Lucid Git
directories:
  output: dist
  buildResources: assets
files:
  - "dist-electron/**/*"
  - "dist-renderer/**/*"
  - "package.json"
asarUnpack:
  - "node_modules/dugite/**/*"        # Git binaries must be outside asar
  - "node_modules/keytar/**/*"        # Native module
  - "node_modules/better-sqlite3/**/*"
win:
  target: nsis
  icon: assets/icon.ico
mac:
  target: dmg
  icon: assets/icon.icns
  hardenedRuntime: true
  category: public.app-category.developer-tools
linux:
  target: AppImage
  icon: assets/icon.png
  category: Development
publish:
  provider: github
  releaseType: release
```

**GitHub Actions (`.github/workflows/release.yml`):**
```yaml
name: Release
on:
  push:
    tags: ['v*']
jobs:
  release:
    strategy:
      matrix:
        os: [windows-latest, macos-latest, ubuntu-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm run build
      - run: npx electron-builder --publish always
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          # Optional for macOS signing:
          APPLE_ID: ${{ secrets.APPLE_ID }}
          APPLE_APP_SPECIFIC_PASSWORD: ${{ secrets.APPLE_APP_SPECIFIC_PASSWORD }}
```

**Auto-updater:** `electron-updater` checks GitHub Releases on launch, banner in TopBar, delta updates, stable/beta channels.

**First-run experience for teammates:**
1. Download installer from GitHub Releases
2. Run installer — no prompts, no dependencies
3. Lucid Git opens → welcome screen → "Sign in with GitHub" (Device Flow)
4. Authorize in browser → paste repo URL or pick from their repos → done

**Team config sync:**
- Export `.lucid-git-config.json` — share with team
- Repo-level `.lucid-git/team-config.json` committed to repo: new teammates inherit Discord webhooks, LFS patterns, notification prefs on first clone

---

## Design System

**Aesthetic:** Industrial/utilitarian dark theme. Heavy-duty tool for serious teams.

```css
--bg-primary: #0d0f14;
--bg-secondary: #13161e;
--bg-elevated: #1a1e2a;
--accent: #e85d2f;           /* accent orange */
--accent-secondary: #4a9eff; /* steel blue */
--success: #2dbd6e;
--warning: #f5a623;
--error: #e84040;
--text-primary: #e8eaf2;
--text-secondary: #8892a4;
--lock-mine: #2dbd6e;
--lock-other: #e85d2f;
--border: #252a38;
```

**Typography:** JetBrains Mono (display) + IBM Plex Sans (UI)

**Layout:** 3-panel (sidebar / main / detail), collapsible, Cmd+K command palette

---

## package.json (concrete, verified versions — April 2026)

```json
{
  "name": "lucid-git",
  "version": "0.1.0",
  "main": "dist-electron/main.js",
  "scripts": {
    "dev": "concurrently \"vite\" \"electron .\"",
    "build": "tsc -p tsconfig.main.json && vite build",
    "package": "npm run build && electron-builder",
    "release": "npm run build && electron-builder --publish always",
    "typecheck": "tsc --noEmit",
    "lint": "eslint . --ext ts,tsx"
  },
  "dependencies": {
    "dugite": "^3.2.1",
    "keytar": "^7.9.0",
    "better-sqlite3": "^11.0.0",
    "electron-store": "^10.0.0",
    "electron-updater": "^6.3.0",
    "zustand": "^5.0.0",
    "@tanstack/react-query": "^5.59.0",
    "@tanstack/react-virtual": "^3.10.0",
    "p-queue": "^8.0.1",
    "date-fns": "^4.1.0",
    "lucide-react": "^0.454.0",
    "@monaco-editor/react": "^4.6.0",
    "recharts": "^2.13.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "tailwind-merge": "^2.5.0",
    "clsx": "^2.1.0",
    "cmdk": "^1.0.0"
  },
  "devDependencies": {
    "electron": "^33.0.0",
    "electron-builder": "^25.0.0",
    "typescript": "^5.6.0",
    "vite": "^5.4.0",
    "@vitejs/plugin-react": "^4.3.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "concurrently": "^9.0.0",
    "eslint": "^9.0.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@types/better-sqlite3": "^7.6.0",
    "@playwright/test": "^1.48.0"
  }
}
```

---

## Claude Code Implementation Order

### Phase 0 — Preflight
Claude Code should confirm with you:
- GitHub OAuth App Client ID (from github.com/settings/developers)
- GitHub org/repo where Lucid Git source + releases will live
- macOS code-signing: set up now or defer

### Phase 1 — Scaffold + IPC contract
- Electron + Vite + React + TypeScript
- Tailwind + shadcn/ui setup
- Define all `CHANNELS` and the full typed IPC surface in `src/ipc.ts` **before any features**
- `electron-builder.yml` skeleton
- Bare 3-panel layout

### Phase 2 — dugite + GitService skeleton
- Install dugite; verify `exec(['--version'], cwd)` works
- GitService: clone, status, stage, unstage, commit, push, pull, fetch
- Wire through IPC
- Stderr progress parsing

### Phase 3 — Auth (Device Flow)
- AuthService + device flow
- keytar integration
- Login screen + account switcher

### Phase 4 — File tree + status + basic diff
- FileTree + staging
- Monaco TextDiff + BinaryDiff
- CommitBox

### Phase 5 — Locking + lock notifications
- LockService + poller
- Lock badges
- "Watch file" → unlock notifications
- In-app notification bell + feed

### Phase 6 — Merge preview + conflict resolution
- `mergePreview` via `merge-tree`
- ConflictPreview UI with contributor cards
- TextResolver + BinaryResolver

### Phase 7 — LFS manager + auto-detect
- LFSService
- Large-file scan + migration UI

### Phase 8 — Cleanup + shallow clone + size dashboard
- CleanupService (gc, prune, lfs-prune)
- ShallowCloneManager
- Size dashboard with recharts

### Phase 9 — Discord webhooks + notification settings
- NotificationService webhook posting via p-queue
- Webhook settings UI + test button
- Per-event toggles + quiet hours

### Phase 10 — History graph + restore
- `git log --graph` parser
- CommitGraph canvas render
- Restore-to-commit with safety branch

### Phase 11 — Unreal features
- `.uproject` detection
- `.gitattributes` + `.gitignore` editors
- Pak size estimator
- Check-out-for-edit workflow

### Phase 12 — Pre-commit hooks UI

### Phase 13 — Error resolution polish
- Full 14-code library wired through UI
- Auto-fix dispatchers

### Phase 14 — Distribution + auto-update
- Finalize electron-builder
- GitHub Actions release workflow
- Test installers on all three platforms
- Auto-updater UI

### Phase 15 — Settings, command palette, final polish

---

## What Claude Code cannot do (manual steps you handle)

1. **Create a GitHub OAuth App** — github.com/settings/developers → register new OAuth app, enable Device Flow, copy Client ID into Lucid Git config.
2. **Create the GitHub repo** for Lucid Git source + releases.
3. **(Optional) Code-signing certs** — Apple Developer ID ($99/yr), Windows EV cert (~$300/yr). Skip for internal team use; teammates can bypass SmartScreen/Gatekeeper once.
4. **App icon** — Claude can generate a 1024×1024 PNG but you may want to provide your own. Claude Code converts to .ico/.icns.

Everything else — code, config, tests, CI workflows — Claude Code generates.

---

## Known limitations — set your expectations

1. **Build time:** 40–80 hours of focused Claude Code sessions across 15 phases. This is a real application, not a weekend project.
2. **Electron has sharp edges** — native modules, ASAR, code signing, IPC serialization. Budget debugging time.
3. **Installer size ~120 MB** — dugite's bundled Git is ~40 MB per platform. Normal for Electron.
4. **First clone of a large UE repo is still slow** — Lucid Git can't make Git faster, only friendlier. Shallow + LFS mitigate this.
5. **GitHub LFS free tier is 1 GB storage / 1 GB bandwidth per month.** INFERIUS will need a paid LFS plan or self-hosted (e.g. Gitea). Lucid Git uses whatever backend you have.

---

*Lucid Git Specification v2.0 — Audited.*
*Fixes from v1.1: Device Flow auth (PKCE doesn't work on desktop), dugite API correction (exec not git), removed Redis dep (bull → p-queue), removed redundant simple-git, current package versions verified April 2026, concrete IPC contract, git merge-tree for preview, serializable FixActions, electron-builder ASAR unpack for native modules, honest shallow-clone behavior, manual-steps callout.*
