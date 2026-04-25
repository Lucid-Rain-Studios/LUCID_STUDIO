# Graph Report - .  (2026-04-23)

## Corpus Check
- 98 files · ~83,095 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 794 nodes · 1708 edges · 71 communities detected
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 160 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Bundled Renderer (Minified)|Bundled Renderer (Minified)]]
- [[_COMMUNITY_Git Core Operations|Git Core Operations]]
- [[_COMMUNITY_UI Prototype & Build Artifacts|UI Prototype & Build Artifacts]]
- [[_COMMUNITY_Bundled UI Library Internals|Bundled UI Library Internals]]
- [[_COMMUNITY_Notification & History Graph|Notification & History Graph]]
- [[_COMMUNITY_App Entry & Webhook Service|App Entry & Webhook Service]]
- [[_COMMUNITY_Lock Service & File Actions|Lock Service & File Actions]]
- [[_COMMUNITY_Bundled Animation Layer|Bundled Animation Layer]]
- [[_COMMUNITY_Bundled State Primitives|Bundled State Primitives]]
- [[_COMMUNITY_Device Flow Auth Service|Device Flow Auth Service]]
- [[_COMMUNITY_Unreal Asset Icons & Binary Diff|Unreal Asset Icons & Binary Diff]]
- [[_COMMUNITY_Branch Panel Operations|Branch Panel Operations]]
- [[_COMMUNITY_Hook Service (Git Hooks)|Hook Service (Git Hooks)]]
- [[_COMMUNITY_Bundled Utility Functions|Bundled Utility Functions]]
- [[_COMMUNITY_Cleanup & Repo Maintenance|Cleanup & Repo Maintenance]]
- [[_COMMUNITY_Sidebar Navigation (Prototype)|Sidebar Navigation (Prototype)]]
- [[_COMMUNITY_History Graph Layout|History Graph Layout]]
- [[_COMMUNITY_Unreal Engine Service|Unreal Engine Service]]
- [[_COMMUNITY_Presence Service|Presence Service]]
- [[_COMMUNITY_Status Bar (Prototype)|Status Bar (Prototype)]]
- [[_COMMUNITY_History Panel|History Panel]]
- [[_COMMUNITY_Tools Panel (Cherry-pickRevert)|Tools Panel (Cherry-pick/Revert)]]
- [[_COMMUNITY_LFS Panel|LFS Panel]]
- [[_COMMUNITY_Overview Panel|Overview Panel]]
- [[_COMMUNITY_Settings Service|Settings Service]]
- [[_COMMUNITY_Team Config Service|Team Config Service]]
- [[_COMMUNITY_Unreal Panel UI|Unreal Panel UI]]
- [[_COMMUNITY_Device Flow Login UI|Device Flow Login UI]]
- [[_COMMUNITY_Hooks Manager UI|Hooks Manager UI]]
- [[_COMMUNITY_Webhook Panel UI|Webhook Panel UI]]
- [[_COMMUNITY_Commit Box|Commit Box]]
- [[_COMMUNITY_File Tree|File Tree]]
- [[_COMMUNITY_Top Bar (FetchPullPush)|Top Bar (Fetch/Pull/Push)]]
- [[_COMMUNITY_Merge Preview Dialog|Merge Preview Dialog]]
- [[_COMMUNITY_IPC Handlers|IPC Handlers]]
- [[_COMMUNITY_App Root Component|App Root Component]]
- [[_COMMUNITY_Diff Panel (Prototype)|Diff Panel (Prototype)]]
- [[_COMMUNITY_File Panel (Prototype)|File Panel (Prototype)]]
- [[_COMMUNITY_Notification Feed|Notification Feed]]
- [[_COMMUNITY_History Panel (Prototype)|History Panel (Prototype)]]
- [[_COMMUNITY_Top Bar (Prototype)|Top Bar (Prototype)]]
- [[_COMMUNITY_Account Switcher|Account Switcher]]
- [[_COMMUNITY_Text Diff Component|Text Diff Component]]
- [[_COMMUNITY_App Shell Layout|App Shell Layout]]
- [[_COMMUNITY_Team Config Panel|Team Config Panel]]
- [[_COMMUNITY_Utility Functions|Utility Functions]]
- [[_COMMUNITY_ESLint Config|ESLint Config]]
- [[_COMMUNITY_PostCSS Config|PostCSS Config]]
- [[_COMMUNITY_Tailwind Config|Tailwind Config]]
- [[_COMMUNITY_Vite Build Config|Vite Build Config]]
- [[_COMMUNITY_Electron Preload (Built)|Electron Preload (Built)]]
- [[_COMMUNITY_Electron Types (Built)|Electron Types (Built)]]
- [[_COMMUNITY_IPC Channels (Built)|IPC Channels (Built)]]
- [[_COMMUNITY_Electron Preload (Source)|Electron Preload (Source)]]
- [[_COMMUNITY_Electron Types (Source)|Electron Types (Source)]]
- [[_COMMUNITY_IPC Channels (Source)|IPC Channels (Source)]]
- [[_COMMUNITY_Prototype Data|Prototype Data]]
- [[_COMMUNITY_IPC Bridge|IPC Bridge]]
- [[_COMMUNITY_React Entry Point|React Entry Point]]
- [[_COMMUNITY_Sidebar Component|Sidebar Component]]
- [[_COMMUNITY_Status Bar Component|Status Bar Component]]
- [[_COMMUNITY_Notification Bell|Notification Bell]]
- [[_COMMUNITY_Appearance Settings|Appearance Settings]]
- [[_COMMUNITY_Settings Page|Settings Page]]
- [[_COMMUNITY_Auth Store|Auth Store]]
- [[_COMMUNITY_Error Store|Error Store]]
- [[_COMMUNITY_Lock Store|Lock Store]]
- [[_COMMUNITY_Notification Store|Notification Store]]
- [[_COMMUNITY_Operation Store|Operation Store]]
- [[_COMMUNITY_Repo State Store|Repo State Store]]
- [[_COMMUNITY_Pre-commit Hook Service|Pre-commit Hook Service]]

## God Nodes (most connected - your core abstractions)
1. `GitService` - 56 edges
2. `g()` - 48 edges
3. `ld()` - 43 edges
4. `exec()` - 34 edges
5. `Ql()` - 26 edges
6. `k()` - 24 edges
7. `execSafe()` - 23 edges
8. `tc()` - 22 edges
9. `ge()` - 19 edges
10. `rc()` - 19 edges

## Surprising Connections (you probably didn't know these)
- `Built Renderer index.html (dist-renderer)` --semantically_similar_to--> `Lucid Git App Entry Point`  [INFERRED] [semantically similar]
  dist-renderer/index.html → index.html
- `createWindow()` --calls--> `on()`  [INFERRED]
  electron\main.ts → dist-renderer\assets\index-BHZMuCRA.js
- `notifFile()` --calls--> `update()`  [INFERRED]
  electron\services\NotificationService.ts → src\components\settings\GeneralSettings.tsx
- `ep()` --calls--> `exec()`  [INFERRED]
  dist-renderer\assets\index-BHZMuCRA.js → electron\util\dugite-exec.ts
- `yn()` --calls--> `exec()`  [INFERRED]
  dist-renderer\assets\index-BHZMuCRA.js → electron\util\dugite-exec.ts

## Hyperedges (group relationships)
- **Lucid Git Core Service Layer** — spec_git_service, spec_lock_service, spec_lfs_service, spec_cleanup_service, spec_notification_service, spec_auth_service, spec_error_parser, spec_unreal_service, spec_hook_service [EXTRACTED 1.00]
- **Zero External Runtime Dependency Technologies** — spec_dugite, spec_p_queue, spec_electron_store, spec_keytar, spec_better_sqlite3 [EXTRACTED 1.00]
- **IPC Channel Groups (Auth, Git, Lock, LFS, Cleanup, Notify, UE)** — spec_ipc_contract, spec_auth_service, spec_git_service, spec_lock_service, spec_lfs_service, spec_cleanup_service, spec_notification_service, spec_unreal_service [EXTRACTED 1.00]
- **UI Prototype Component Set** — handoff_statusbar_jsx, handoff_topbar_jsx, handoff_sidebar_jsx, handoff_filepanel_jsx, handoff_diffpanel_jsx, handoff_historypanel_jsx, handoff_app_jsx [EXTRACTED 1.00]
- **Unreal Engine 5 Feature Set** — spec_unreal_service, spec_ue_gitplugin, spec_unreal_ue5_target, spec_lock_service [EXTRACTED 1.00]
- **Design Token Application (Fonts + Colors)** — index_ibm_plex_sans, index_jetbrains_mono, spec_design_system, handoff_tokens_js, handoff_dark_theme [INFERRED 0.80]

## Communities

### Community 0 - "Bundled Renderer (Minified)"
Cohesion: 0.04
Nodes (130): _a(), aa(), Ad(), ai(), ao(), ap(), B(), Ba() (+122 more)

### Community 1 - "Git Core Operations"
Cohesion: 0.05
Nodes (20): handleClone(), handleKeyDown(), exec(), execSafe(), execWithProgress(), parseGitProgress(), dispatch(), handleDismiss() (+12 more)

### Community 2 - "UI Prototype & Build Artifacts"
Cohesion: 0.04
Nodes (79): Bundled Renderer CSS (index-CZCxhjr7.css), Bundled Renderer JS (index-BHZMuCRA.js), Built Renderer index.html (dist-renderer), App Prototype Root Component (App.jsx), Babel Standalone 7.29 (JSX Transpilation), Dark Theme Design (#0b0d13 Background), UI Prototype Data (data.js), DiffPanel Prototype Component (DiffPanel.jsx) (+71 more)

### Community 3 - "Bundled UI Library Internals"
Cohesion: 0.07
Nodes (70): $(), ae(), an(), Au(), bc(), Bu(), cn(), Cr() (+62 more)

### Community 4 - "Notification & History Graph"
Cohesion: 0.08
Nodes (36): computeGraph(), Bt(), ea(), gu(), Hd(), hn(), ip(), jn() (+28 more)

### Community 5 - "App Entry & Webhook Service"
Cohesion: 0.09
Nodes (19): update(), parseGitError(), parseGitErrorOrGeneric(), $e(), ep(), j(), np(), Pp() (+11 more)

### Community 6 - "Lock Service & File Actions"
Cohesion: 0.12
Nodes (13): close(), doCopyFullPath(), doCopyRelPath(), doDiscard(), doIgnoreFile(), doIgnoreFolder(), doLock(), doOpenDefault() (+5 more)

### Community 7 - "Bundled Animation Layer"
Cohesion: 0.11
Nodes (21): Di(), ja(), ji(), Jl(), La(), ma(), Ml(), Oa() (+13 more)

### Community 8 - "Bundled State Primitives"
Cohesion: 0.11
Nodes (23): At(), Cf(), Ci(), Dr(), ef(), fi(), fs(), gl() (+15 more)

### Community 9 - "Device Flow Auth Service"
Cohesion: 0.2
Nodes (7): AuthService, readData(), storePath(), writeData(), doFetch(), doPull(), doPush()

### Community 10 - "Unreal Asset Icons & Binary Diff"
Cohesion: 0.13
Nodes (2): BinaryDiff(), classifyAsset()

### Community 11 - "Branch Panel Operations"
Cohesion: 0.2
Nodes (8): doCheckoutLocal(), doCheckoutRemote(), doDeleteLocal(), doDeleteRemote(), doRename(), openPR(), parseGitHubSlug(), withBusy()

### Community 12 - "Hook Service (Git Hooks)"
Cohesion: 0.31
Nodes (4): getShell(), hooksDir(), HookService, scriptPreview()

### Community 13 - "Bundled Utility Functions"
Cohesion: 0.35
Nodes (11): Br(), cl(), eo(), ka(), mi(), Ne(), nr(), Pd() (+3 more)

### Community 14 - "Cleanup & Repo Maintenance"
Cohesion: 0.25
Nodes (6): doPruneLfs(), doShallow(), doUnshallow(), fmt(), loadSize(), ResultBadge()

### Community 15 - "Sidebar Navigation (Prototype)"
Cohesion: 0.2
Nodes (0): 

### Community 16 - "History Graph Layout"
Cohesion: 0.2
Nodes (1): buildTree()

### Community 17 - "Unreal Engine Service"
Cohesion: 0.22
Nodes (1): UnrealService

### Community 18 - "Presence Service"
Cohesion: 0.46
Nodes (1): PresenceService

### Community 19 - "Status Bar (Prototype)"
Cohesion: 0.25
Nodes (0): 

### Community 20 - "History Panel"
Cohesion: 0.25
Nodes (0): 

### Community 21 - "Tools Panel (Cherry-pick/Revert)"
Cohesion: 0.36
Nodes (5): doPick(), doRestore(), doRevert(), load(), run()

### Community 22 - "LFS Panel"
Cohesion: 0.43
Nodes (4): doMigrate(), doTrack(), doUntrack(), load()

### Community 23 - "Overview Panel"
Cohesion: 0.33
Nodes (2): timeAgoMs(), timeAgoStr()

### Community 24 - "Settings Service"
Cohesion: 0.47
Nodes (1): SettingsService

### Community 25 - "Team Config Service"
Cohesion: 0.47
Nodes (1): TeamConfigService

### Community 26 - "Unreal Panel UI"
Cohesion: 0.33
Nodes (0): 

### Community 27 - "Device Flow Login UI"
Cohesion: 0.4
Nodes (0): 

### Community 28 - "Hooks Manager UI"
Cohesion: 0.6
Nodes (3): install(), load(), toggle()

### Community 29 - "Webhook Panel UI"
Cohesion: 0.4
Nodes (0): 

### Community 30 - "Commit Box"
Cohesion: 0.83
Nodes (3): handleBypass(), handleCommit(), runCommit()

### Community 31 - "File Tree"
Cohesion: 0.5
Nodes (0): 

### Community 32 - "Top Bar (Fetch/Pull/Push)"
Cohesion: 0.5
Nodes (0): 

### Community 33 - "Merge Preview Dialog"
Cohesion: 0.5
Nodes (0): 

### Community 34 - "IPC Handlers"
Cohesion: 0.67
Nodes (1): registerHandlers()

### Community 35 - "App Root Component"
Cohesion: 0.67
Nodes (1): App()

### Community 36 - "Diff Panel (Prototype)"
Cohesion: 0.67
Nodes (0): 

### Community 37 - "File Panel (Prototype)"
Cohesion: 0.67
Nodes (0): 

### Community 38 - "Notification Feed"
Cohesion: 0.67
Nodes (0): 

### Community 39 - "History Panel (Prototype)"
Cohesion: 1.0
Nodes (0): 

### Community 40 - "Top Bar (Prototype)"
Cohesion: 1.0
Nodes (0): 

### Community 41 - "Account Switcher"
Cohesion: 1.0
Nodes (0): 

### Community 42 - "Text Diff Component"
Cohesion: 1.0
Nodes (0): 

### Community 43 - "App Shell Layout"
Cohesion: 1.0
Nodes (0): 

### Community 44 - "Team Config Panel"
Cohesion: 1.0
Nodes (0): 

### Community 45 - "Utility Functions"
Cohesion: 1.0
Nodes (0): 

### Community 46 - "ESLint Config"
Cohesion: 1.0
Nodes (0): 

### Community 47 - "PostCSS Config"
Cohesion: 1.0
Nodes (0): 

### Community 48 - "Tailwind Config"
Cohesion: 1.0
Nodes (0): 

### Community 49 - "Vite Build Config"
Cohesion: 1.0
Nodes (0): 

### Community 50 - "Electron Preload (Built)"
Cohesion: 1.0
Nodes (0): 

### Community 51 - "Electron Types (Built)"
Cohesion: 1.0
Nodes (0): 

### Community 52 - "IPC Channels (Built)"
Cohesion: 1.0
Nodes (0): 

### Community 53 - "Electron Preload (Source)"
Cohesion: 1.0
Nodes (0): 

### Community 54 - "Electron Types (Source)"
Cohesion: 1.0
Nodes (0): 

### Community 55 - "IPC Channels (Source)"
Cohesion: 1.0
Nodes (0): 

### Community 56 - "Prototype Data"
Cohesion: 1.0
Nodes (0): 

### Community 57 - "IPC Bridge"
Cohesion: 1.0
Nodes (0): 

### Community 58 - "React Entry Point"
Cohesion: 1.0
Nodes (0): 

### Community 59 - "Sidebar Component"
Cohesion: 1.0
Nodes (0): 

### Community 60 - "Status Bar Component"
Cohesion: 1.0
Nodes (0): 

### Community 61 - "Notification Bell"
Cohesion: 1.0
Nodes (0): 

### Community 62 - "Appearance Settings"
Cohesion: 1.0
Nodes (0): 

### Community 63 - "Settings Page"
Cohesion: 1.0
Nodes (0): 

### Community 64 - "Auth Store"
Cohesion: 1.0
Nodes (0): 

### Community 65 - "Error Store"
Cohesion: 1.0
Nodes (0): 

### Community 66 - "Lock Store"
Cohesion: 1.0
Nodes (0): 

### Community 67 - "Notification Store"
Cohesion: 1.0
Nodes (0): 

### Community 68 - "Operation Store"
Cohesion: 1.0
Nodes (0): 

### Community 69 - "Repo State Store"
Cohesion: 1.0
Nodes (0): 

### Community 70 - "Pre-commit Hook Service"
Cohesion: 1.0
Nodes (1): HookService (Pre-commit Hooks)

## Knowledge Gaps
- **27 isolated node(s):** `React Root Mount Point`, `Main TSX Entry Script`, `React 18 + TypeScript (Frontend)`, `Tailwind CSS + shadcn/ui (Styling)`, `Zustand (UI State)` (+22 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `History Panel (Prototype)`** (2 nodes): `HistoryPanel()`, `HistoryPanel.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Top Bar (Prototype)`** (2 nodes): `TopBar.jsx`, `TopBar()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Account Switcher`** (2 nodes): `handler()`, `AccountSwitcher.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Text Diff Component`** (2 nodes): `TextDiff.tsx`, `TextDiff()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `App Shell Layout`** (2 nodes): `AppShell()`, `AppShell.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Team Config Panel`** (2 nodes): `TeamConfigPanel.tsx`, `TeamConfigPanel()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Utility Functions`** (2 nodes): `utils.ts`, `cn()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `ESLint Config`** (1 nodes): `eslint.config.mjs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `PostCSS Config`** (1 nodes): `postcss.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Tailwind Config`** (1 nodes): `tailwind.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Vite Build Config`** (1 nodes): `vite.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Electron Preload (Built)`** (1 nodes): `preload.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Electron Types (Built)`** (1 nodes): `types.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `IPC Channels (Built)`** (1 nodes): `channels.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Electron Preload (Source)`** (1 nodes): `preload.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Electron Types (Source)`** (1 nodes): `types.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `IPC Channels (Source)`** (1 nodes): `channels.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Prototype Data`** (1 nodes): `data.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `IPC Bridge`** (1 nodes): `ipc.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `React Entry Point`** (1 nodes): `main.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Sidebar Component`** (1 nodes): `Sidebar.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Status Bar Component`** (1 nodes): `StatusBar.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Notification Bell`** (1 nodes): `NotificationBell.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Appearance Settings`** (1 nodes): `AppearanceSettings.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Settings Page`** (1 nodes): `SettingsPage.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Auth Store`** (1 nodes): `authStore.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Error Store`** (1 nodes): `errorStore.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Lock Store`** (1 nodes): `lockStore.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Notification Store`** (1 nodes): `notificationStore.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Operation Store`** (1 nodes): `operationStore.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Repo State Store`** (1 nodes): `repoStore.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Pre-commit Hook Service`** (1 nodes): `HookService (Pre-commit Hooks)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `exec()` connect `Git Core Operations` to `Bundled Renderer (Minified)`, `App Entry & Webhook Service`, `Lock Service & File Actions`?**
  _High betweenness centrality (0.112) - this node is a cross-community bridge._
- **Why does `GitService` connect `Git Core Operations` to `Device Flow Auth Service`, `Lock Service & File Actions`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **Why does `ep()` connect `App Entry & Webhook Service` to `Bundled Renderer (Minified)`, `Git Core Operations`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Are the 31 inferred relationships involving `exec()` (e.g. with `ep()` and `yn()`) actually correct?**
  _`exec()` has 31 INFERRED edges - model-reasoned connections that need verification._
- **What connects `React Root Mount Point`, `Main TSX Entry Script`, `React 18 + TypeScript (Frontend)` to the rest of the system?**
  _27 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Bundled Renderer (Minified)` be split into smaller, more focused modules?**
  _Cohesion score 0.04 - nodes in this community are weakly interconnected._
- **Should `Git Core Operations` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._