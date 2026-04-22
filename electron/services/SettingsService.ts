import * as fs from 'fs'
import * as path from 'path'
import { app } from 'electron'

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

const DEFAULTS: AppSettings = {
  autoFetchIntervalMinutes: 15,
  defaultCloneDepth: 50,
  largeFileWarnMB: 100,
  scheduledCleanup: {
    enabled: false,
    frequencyDays: 7,
    includeGc: true,
    includePruneLfs: true,
  },
}

class SettingsService {
  private filePath(): string {
    return path.join(app.getPath('userData'), 'lucid-git-settings.json')
  }

  getAll(): AppSettings {
    try {
      const raw = fs.readFileSync(this.filePath(), 'utf8')
      return { ...DEFAULTS, ...JSON.parse(raw) }
    } catch {
      return { ...DEFAULTS }
    }
  }

  save(settings: AppSettings): void {
    fs.writeFileSync(this.filePath(), JSON.stringify(settings, null, 2), 'utf8')
  }
}

export const settingsService = new SettingsService()
