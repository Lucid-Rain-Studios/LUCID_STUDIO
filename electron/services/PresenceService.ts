import * as fs from 'fs'
import * as path from 'path'
import type { PresenceEntry, PresenceFile } from '../types'

class PresenceService {
  private filePath(repoPath: string): string {
    return path.join(repoPath, '.lucid-git', 'presence.json')
  }

  read(repoPath: string): PresenceFile {
    try {
      const raw = fs.readFileSync(this.filePath(repoPath), 'utf8')
      return JSON.parse(raw) as PresenceFile
    } catch {
      return { version: 1, entries: {} }
    }
  }

  update(repoPath: string, login: string, entry: PresenceEntry): void {
    const dir = path.join(repoPath, '.lucid-git')
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

    const current = this.read(repoPath)
    current.entries[login] = entry
    fs.writeFileSync(this.filePath(repoPath), JSON.stringify(current, null, 2), 'utf8')

    // Ensure .lucid-git/presence.json is in .gitignore (local ignore)
    this.ensureIgnored(repoPath)
  }

  private ensureIgnored(repoPath: string): void {
    const gitIgnorePath = path.join(repoPath, '.git', 'info', 'exclude')
    try {
      const existing = fs.existsSync(gitIgnorePath) ? fs.readFileSync(gitIgnorePath, 'utf8') : ''
      const entry = '.lucid-git/presence.json'
      if (!existing.includes(entry)) {
        fs.appendFileSync(gitIgnorePath, `\n${entry}\n`, 'utf8')
      }
    } catch {
      // Non-critical: just skip if we can't write the exclude file
    }
  }

  removeStale(repoPath: string, maxAgeMs = 30 * 60 * 1000): void {
    try {
      const current = this.read(repoPath)
      const now = Date.now()
      let changed = false
      for (const [login, entry] of Object.entries(current.entries)) {
        if (now - new Date(entry.lastSeen).getTime() > maxAgeMs) {
          delete current.entries[login]
          changed = true
        }
      }
      if (changed) {
        fs.writeFileSync(this.filePath(repoPath), JSON.stringify(current, null, 2), 'utf8')
      }
    } catch { /* ignore */ }
  }
}

export const presenceService = new PresenceService()
