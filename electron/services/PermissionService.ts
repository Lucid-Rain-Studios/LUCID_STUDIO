import { app } from 'electron'
import fs from 'fs'
import path from 'path'
import type { RepoPermission } from '../types'
import { authService } from './AuthService'
import { gitService } from './GitService'

const TTL_MS = 5 * 60 * 1000  // 5 minutes

interface PermissionStore {
  cache: Record<string, { permission: RepoPermission; fetchedAt: number }>
}

function storePath(): string {
  return path.join(app.getPath('userData'), 'permissions.json')
}

function readStore(): PermissionStore {
  try { return JSON.parse(fs.readFileSync(storePath(), 'utf8')) as PermissionStore }
  catch { return { cache: {} } }
}

function writeStore(store: PermissionStore): void {
  const p = storePath()
  fs.mkdirSync(path.dirname(p), { recursive: true })
  fs.writeFileSync(p, JSON.stringify(store, null, 2), 'utf8')
}

function parseRemoteUrl(remoteUrl: string): { owner: string; repo: string; apiBase: string } | null {
  // SSH: git@github.com:owner/repo.git
  const sshMatch = remoteUrl.match(/^git@([^:]+):([^/]+)\/(.+?)(?:\.git)?$/)
  if (sshMatch) {
    const [, host, owner, repo] = sshMatch
    const apiBase = host === 'github.com'
      ? 'https://api.github.com'
      : `https://${host}/api/v3`
    return { owner, repo, apiBase }
  }
  // HTTPS: https://github.com/owner/repo.git
  try {
    const url = new URL(remoteUrl)
    const parts = url.pathname.replace(/^\//, '').replace(/\.git$/, '').split('/')
    if (parts.length >= 2) {
      const [owner, repo] = parts
      const host = url.hostname
      const apiBase = host === 'github.com'
        ? 'https://api.github.com'
        : `https://${host}/api/v3`
      return { owner, repo, apiBase }
    }
  } catch {}
  return null
}

class PermissionService {
  getCachedPermission(repoPath: string): RepoPermission | null {
    const store = readStore()
    const entry = store.cache[repoPath]
    if (!entry) return null
    if (Date.now() - entry.fetchedAt > TTL_MS) return null
    return entry.permission
  }

  private setCache(repoPath: string, permission: RepoPermission): void {
    const store = readStore()
    store.cache[repoPath] = { permission, fetchedAt: Date.now() }
    writeStore(store)
  }

  invalidateCache(repoPath: string): void {
    const store = readStore()
    delete store.cache[repoPath]
    writeStore(store)
  }

  isAdmin(repoPath: string): boolean {
    return this.getCachedPermission(repoPath) === 'admin'
  }

  // Returns permission. On any failure, fails-open to 'write' (never 'admin').
  // Returns 'write' rather than 'read' so basic git ops remain unblocked.
  async fetchPermission(repoPath: string): Promise<RepoPermission> {
    const { accounts, currentAccountId } = authService.listAccounts()
    if (!currentAccountId || accounts.length === 0) return 'write'

    const token = await authService.getToken(currentAccountId)
    if (!token) return 'write'

    let remoteUrl: string | null = null
    try { remoteUrl = await gitService.getRemoteUrl(repoPath) } catch {}
    if (!remoteUrl) return 'write'

    const parsed = parseRemoteUrl(remoteUrl)
    if (!parsed) return 'write'

    try {
      const res = await fetch(`${parsed.apiBase}/repos/${parsed.owner}/${parsed.repo}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      })

      if (!res.ok) {
        // Use stale cache on non-auth errors; 401/403 means definitely not admin
        if (res.status === 401 || res.status === 403) {
          this.setCache(repoPath, 'write')
          return 'write'
        }
        const stale = readStore().cache[repoPath]
        if (stale) return stale.permission
        return 'write'
      }

      const data = await res.json() as {
        permissions?: { admin?: boolean; push?: boolean }
      }

      const permission: RepoPermission =
        data.permissions?.admin === true ? 'admin' :
        data.permissions?.push  === true ? 'write' :
        'read'

      this.setCache(repoPath, permission)
      return permission
    } catch {
      // Network error — use stale cache or fail-open
      const stale = readStore().cache[repoPath]
      if (stale) return stale.permission
      return 'write'
    }
  }
}

export const permissionService = new PermissionService()
