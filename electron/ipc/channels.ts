export const CHANNELS = {
  // Auth
  AUTH_START_DEVICE_FLOW:  'auth:start-device-flow',
  AUTH_POLL_DEVICE_FLOW:   'auth:poll-device-flow',
  AUTH_LIST_ACCOUNTS:      'auth:list-accounts',
  AUTH_LOGOUT:             'auth:logout',

  // Git core
  GIT_IS_REPO:       'git:is-repo',
  GIT_CLONE:         'git:clone',
  GIT_STATUS:        'git:status',
  GIT_CURRENT_BRANCH:'git:current-branch',
  GIT_STAGE:         'git:stage',
  GIT_UNSTAGE:       'git:unstage',
  GIT_COMMIT:        'git:commit',
  GIT_PUSH:          'git:push',
  GIT_PULL:          'git:pull',
  GIT_FETCH:         'git:fetch',
  GIT_LOG:           'git:log',
  GIT_BRANCH_LIST:   'git:branch-list',
  GIT_BRANCH_CREATE: 'git:branch-create',
  GIT_BRANCH_RENAME: 'git:branch-rename',
  GIT_BRANCH_DELETE:        'git:branch-delete',
  GIT_BRANCH_DELETE_REMOTE: 'git:branch-delete-remote',
  GIT_CHECKOUT:      'git:checkout',
  GIT_MERGE_PREVIEW: 'git:merge-preview',
  GIT_MERGE:         'git:merge',
  GIT_REMOTE_URL:    'git:remote-url',
  GIT_SYNC_STATUS:   'git:sync-status',
  GIT_UPDATE_FROM_MAIN: 'git:update-from-main',
  GIT_DIFF:             'git:diff',
  GIT_DISCARD:          'git:discard',
  GIT_DISCARD_ALL:      'git:discard-all',
  GIT_COMMIT_FILES:     'git:commit-files',
  GIT_ADD_GITIGNORE:    'git:add-gitignore',
  GIT_STASH_LIST:       'git:stash-list',
  GIT_STASH_SAVE:       'git:stash-save',
  GIT_STASH_POP:        'git:stash-pop',
  GIT_STASH_APPLY:      'git:stash-apply',
  GIT_STASH_DROP:       'git:stash-drop',

  // Locks
  LOCK_FILE:          'lock:file',
  LOCK_UNLOCK:        'lock:unlock',
  LOCK_LIST:          'lock:list',
  LOCK_WATCH:         'lock:watch',
  LOCK_START_POLLING: 'lock:start-polling',
  LOCK_STOP_POLLING:  'lock:stop-polling',

  // LFS
  LFS_STATUS:     'lfs:status',
  LFS_TRACK:      'lfs:track',
  LFS_UNTRACK:    'lfs:untrack',
  LFS_MIGRATE:    'lfs:migrate',
  LFS_AUTODETECT: 'lfs:autodetect',

  // Cleanup
  CLEANUP_SIZE:      'cleanup:size',
  CLEANUP_GC:        'cleanup:gc',
  CLEANUP_PRUNE_LFS: 'cleanup:prune-lfs',
  CLEANUP_SHALLOW:   'cleanup:shallow',
  CLEANUP_UNSHALLOW: 'cleanup:unshallow',

  // Notifications + webhooks
  NOTIFICATION_LIST:      'notification:list',
  NOTIFICATION_MARK_READ: 'notification:mark-read',
  WEBHOOK_TEST:           'webhook:test',
  WEBHOOK_SAVE:           'webhook:save',

  // Auto-updater
  UPDATE_CHECK:    'update:check',
  UPDATE_DOWNLOAD: 'update:download',
  UPDATE_INSTALL:  'update:install',
  EVT_UPDATE_READY: 'evt:update-ready',

  // Auto-fix helpers
  GIT_REBASE_ABORT:  'git:rebase-abort',
  GIT_SET_UPSTREAM:  'git:set-upstream',
  GIT_SET_CONFIG:    'git:set-config',

  // Hooks
  HOOK_LIST:            'hook:list',
  HOOK_ENABLE:          'hook:enable',
  HOOK_DISABLE:         'hook:disable',
  HOOK_BUILTINS:        'hook:builtins',
  HOOK_INSTALL_BUILTIN: 'hook:install-builtin',
  HOOK_RUN_PRECOMMIT:   'hook:run-precommit',

  // Unreal
  UE_DETECT:              'ue:detect',
  UE_SETUP_STATUS:        'ue:setup-status',
  UE_TEMPLATES:           'ue:templates',
  UE_WRITE_GITATTRIBUTES: 'ue:write-gitattributes',
  UE_WRITE_GITIGNORE:     'ue:write-gitignore',
  UE_PAK_SIZE:            'ue:pak-size',

  // Settings
  SETTINGS_GET: 'settings:get',
  SETTINGS_SAVE: 'settings:save',

  // Team config
  TEAM_CONFIG_LOAD: 'team-config:load',
  TEAM_CONFIG_SAVE: 'team-config:save',

  // OS dialogs + shell
  DIALOG_OPEN_DIRECTORY: 'dialog:open-directory',
  SHELL_OPEN_EXTERNAL:   'shell:open-external',
  SHELL_SHOW_IN_FOLDER:  'shell:show-in-folder',
  SHELL_OPEN_PATH:       'shell:open-path',

  // Events: main → renderer (one-way via ipcRenderer.on)
  EVT_OPERATION_PROGRESS: 'evt:operation-progress',
  EVT_LOCK_CHANGED:       'evt:lock-changed',
  EVT_NOTIFICATION:       'evt:notification',
  EVT_UPDATE_AVAILABLE:   'evt:update-available',
} as const

export type Channel = typeof CHANNELS[keyof typeof CHANNELS]
