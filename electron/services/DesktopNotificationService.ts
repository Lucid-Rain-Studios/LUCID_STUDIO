import { app, BrowserWindow, Notification } from 'electron'
import path from 'path'
import { settingsService, DESKTOP_NOTIFICATION_DEFAULTS } from './SettingsService'
import { logService } from './LogService'
import type { DesktopNotificationEvents } from '../types'

export type DesktopNotificationEvent = keyof DesktopNotificationEvents

interface NotifyOptions {
  /** Settings flag that gates this notification. */
  event:    DesktopNotificationEvent
  title:    string
  body:     string
  /** Whether to play a sound. Defaults to false; reserve for high-urgency events. */
  urgent?:  boolean
  /** What to do when the user clicks the toast. Defaults to focusing the main window. */
  onClick?: () => void
}

/**
 * Single entry point for all OS-level toast notifications.
 *
 * Reads per-event toggles from AppSettings at notify time so changes take
 * effect immediately without requiring a service restart.
 *
 * Note: the AppUserModelId is set in main.ts during early bootstrap so that
 * Windows attributes toasts to "Lucid Git" rather than electron.exe.
 */
class DesktopNotificationService {
  private isDev(): boolean {
    return !app.isPackaged
  }

  private iconPath(): string {
    return this.isDev()
      ? path.join(process.cwd(), 'assets/icon.png')
      : path.join(process.resourcesPath, 'assets/icon.png')
  }

  private isEnabled(event: DesktopNotificationEvent): boolean {
    try {
      const settings = settingsService.getAll()
      const flags = settings.desktopNotificationEvents ?? DESKTOP_NOTIFICATION_DEFAULTS
      return flags[event] ?? DESKTOP_NOTIFICATION_DEFAULTS[event]
    } catch {
      // If settings can't be read, fall back to defaults (Tier 1 ON, Tier 2 OFF)
      return DESKTOP_NOTIFICATION_DEFAULTS[event]
    }
  }

  private focusMainWindow(): void {
    const win = BrowserWindow.getAllWindows().find(w => !w.isDestroyed())
    if (!win) return
    if (win.isMinimized()) win.restore()
    win.show()
    win.focus()
  }

  /**
   * Fire a toast if the corresponding event toggle is enabled.
   * Errors are logged and swallowed — a misconfigured toast must never crash
   * the calling code path (PR check, lock poll, fatal error reporter, etc.).
   */
  notify(opts: NotifyOptions): void {
    if (!this.isEnabled(opts.event)) return
    if (!Notification.isSupported()) return

    try {
      const n = new Notification({
        title:  opts.title,
        body:   opts.body,
        icon:   this.iconPath(),
        silent: !opts.urgent,
      })
      n.on('click', () => {
        try {
          if (opts.onClick) opts.onClick()
          else this.focusMainWindow()
        } catch (err) {
          logService.error('desktopNotify.onClick', err instanceof Error ? err.message : String(err))
        }
      })
      n.show()
    } catch (err) {
      logService.error('desktopNotify.show', err instanceof Error ? err.message : String(err))
    }
  }
}

export const desktopNotificationService = new DesktopNotificationService()
