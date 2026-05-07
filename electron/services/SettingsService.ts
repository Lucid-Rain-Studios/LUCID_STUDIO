import * as fs from 'fs'
import * as path from 'path'
import { app } from 'electron'
import type { AppSettings, DesktopNotificationEvents } from '../types'

export type { AppSettings } from '../types'

export const DESKTOP_NOTIFICATION_DEFAULTS: DesktopNotificationEvents = {
  // Tier 1 — high signal
  appUpdate:         true,
  prResolved:        true,
  forceUnlock:       true,
  operationComplete: true,
  fatalError:        true,
  // Tier 2 — opt-in
  conflictForecast:  false,
  lockOnDirtyFile:   false,
}

const DEFAULTS: AppSettings = {
  autoFetchIntervalMinutes: 5,
  defaultCloneDepth: 50,
  largeFileWarnMB: 100,
  scheduledCleanup: {
    enabled: false,
    frequencyDays: 7,
    includeGc: true,
    includePruneLfs: true,
  },
  fontFamily: 'system-ui',
  fontSize: 13,
  uiDensity: 'normal',
  theme: 'dark',
  codeFontFamily: 'Menlo',
  fontWeight: 500,
  borderRadius: 'default',
  defaultBranchName: 'main',
  desktopNotificationEvents: { ...DESKTOP_NOTIFICATION_DEFAULTS },
}

class SettingsService {
  private filePath(): string {
    return path.join(app.getPath('userData'), 'lucid-git-settings.json')
  }

  getAll(): AppSettings {
    try {
      const raw = fs.readFileSync(this.filePath(), 'utf8')
      const stored = JSON.parse(raw) as Partial<AppSettings>
      return {
        ...DEFAULTS,
        ...stored,
        // Merge nested DesktopNotificationEvents so newly-added toggles get
        // their default value when reading an older settings file.
        desktopNotificationEvents: {
          ...DESKTOP_NOTIFICATION_DEFAULTS,
          ...(stored.desktopNotificationEvents ?? {}),
        },
      }
    } catch {
      return { ...DEFAULTS, desktopNotificationEvents: { ...DESKTOP_NOTIFICATION_DEFAULTS } }
    }
  }

  save(settings: AppSettings): void {
    const normalized: AppSettings = {
      ...DEFAULTS,
      ...settings,
      defaultBranchName: (settings.defaultBranchName ?? 'main').trim() || 'main',
      desktopNotificationEvents: {
        ...DESKTOP_NOTIFICATION_DEFAULTS,
        ...(settings.desktopNotificationEvents ?? {}),
      },
    }
    fs.writeFileSync(this.filePath(), JSON.stringify(normalized, null, 2), 'utf8')
  }
}

export const settingsService = new SettingsService()
