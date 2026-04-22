import { GitProcess } from 'dugite'
import fs from 'fs'
import path from 'path'
import { exec, execSafe, execWithProgress, ProgressCallback } from '../util/dugite-exec'
import { parseGitLog, GIT_LOG_FORMAT } from '../util/git-log-parse'
import { FileStatus, BranchInfo, CommitEntry, DiffContent, StashEntry, ContributorInfo, ConflictPreviewFile, SyncStatus, LFSStatus, SizeBreakdown, CleanupResult } from '../types'

// ── Diff helpers ──────────────────────────────────────────────────────────────

const BINARY_EXTS = new Set([
  '.uasset', '.umap', '.udk', '.ubulk', '.upk', '.pak', '.uexp', '.ucas',
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tga', '.psd', '.tiff', '.ico',
  '.wav', '.mp3', '.ogg', '.flac', '.aiff', '.wem',
  '.ttf', '.otf', '.woff', '.woff2',
  '.exe', '.dll', '.so', '.dylib', '.lib', '.pdb',
  '.zip', '.7z', '.rar', '.tar', '.gz', '.bz2',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx',
  '.mp4', '.avi', '.mov', '.mkv', '.webm',
  '.fbx', '.obj', '.dae',
])

function langFromPath(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  const map: Record<string, string> = {
    '.ts': 'typescript', '.tsx': 'typescript',
    '.js': 'javascript', '.jsx': 'javascript',
    '.json': 'json', '.md': 'markdown',
    '.css': 'css', '.html': 'html', '.htm': 'html',
    '.py': 'python', '.rs': 'rust', '.go': 'go',
    '.cpp': 'cpp', '.cc': 'cpp', '.cxx': 'cpp',
    '.c': 'c', '.h': 'cpp', '.hpp': 'cpp',
    '.cs': 'csharp', '.java': 'java', '.kt': 'kotlin',
    '.yaml': 'yaml', '.yml': 'yaml',
    '.xml': 'xml', '.sh': 'shell', '.bash': 'shell',
    '.ini': 'ini', '.toml': 'toml', '.cfg': 'ini',
    '.sql': 'sql', '.lua': 'lua', '.glsl': 'glsl',
    '.hlsl': 'hlsl', '.usf': 'hlsl', '.ush': 'hlsl',
  }
  return map[ext] ?? 'plaintext'
}

// ── Status parser ─────────────────────────────────────────────────────────────

function parseStatus(raw: string): FileStatus[] {
  if (!raw) return []

  const result: FileStatus[] = []
  // git status --porcelain=v1 -z: null-terminated records
  // Format: "XY path\0" or "XY new-path\0orig-path\0" for renames
  const entries = raw.split('\0')
  let i = 0

  while (i < entries.length) {
    const entry = entries[i]
    if (!entry || entry.length < 3) { i++; continue }

    const indexStatus  = entry[0]  // X: staged status
    const workingStatus = entry[1] // Y: working-tree status
    const path = entry.slice(3)

    if (!path) { i++; continue }

    result.push({
      path,
      indexStatus,
      workingStatus,
      staged: indexStatus !== ' ' && indexStatus !== '?' && indexStatus !== '!',
    })

    // Renamed / copied files consume an extra entry (the original path)
    i += (indexStatus === 'R' || indexStatus === 'C') ? 2 : 1
  }

  return result
}

// ── GitService ────────────────────────────────────────────────────────────────

class GitService {
  /** Returns the bundled git version string. */
  async version(): Promise<string> {
    const { stdout } = await exec(['version'], process.cwd())
    return stdout.trim()
  }

  /** True if `repoPath` is inside a git repository. */
  async isRepo(repoPath: string): Promise<boolean> {
    const { exitCode } = await execSafe(['rev-parse', '--git-dir'], repoPath)
    return exitCode === 0
  }

  /** Clone a repository. Streams progress events if `onProgress` supplied. */
  async clone(
    args: { url: string; dir: string; depth?: number },
    onProgress?: ProgressCallback
  ): Promise<void> {
    const cmdArgs = ['clone', '--progress']
    if (args.depth) cmdArgs.push('--depth', String(args.depth))
    cmdArgs.push(args.url, args.dir)
    await execWithProgress(cmdArgs, process.cwd(), onProgress)
  }

  /** git status --porcelain=v1 */
  async status(repoPath: string): Promise<FileStatus[]> {
    const { exitCode, stdout, stderr } = await execSafe(
      ['status', '--porcelain=v1', '-z'],
      repoPath
    )
    if (exitCode !== 0) throw new Error(stderr || `git status failed (exit ${exitCode})`)
    return parseStatus(stdout)
  }

  /** Returns the short name of HEAD (branch name, or "HEAD" if detached). */
  async currentBranch(repoPath: string): Promise<string> {
    const { exitCode, stdout } = await execSafe(
      ['rev-parse', '--abbrev-ref', 'HEAD'],
      repoPath
    )
    return exitCode === 0 ? stdout.trim() : 'unknown'
  }

  /** Stage specific paths. */
  async stage(repoPath: string, paths: string[]): Promise<void> {
    await exec(['add', '--', ...paths], repoPath)
  }

  /** Unstage specific paths (moves them back to working tree). */
  async unstage(repoPath: string, paths: string[]): Promise<void> {
    await exec(['restore', '--staged', '--', ...paths], repoPath)
  }

  /** Create a commit with the given message. Pass noVerify=true to skip hooks. */
  async commit(repoPath: string, message: string, noVerify = false): Promise<void> {
    const args = ['commit', '-m', message]
    if (noVerify) args.push('--no-verify')
    await exec(args, repoPath)
  }

  /** Push current branch to its upstream. Streams progress. */
  async push(repoPath: string, onProgress?: ProgressCallback): Promise<void> {
    await execWithProgress(['push', '--progress'], repoPath, onProgress)
  }

  /** Pull current branch. Streams progress. */
  async pull(repoPath: string, onProgress?: ProgressCallback): Promise<void> {
    await execWithProgress(['pull', '--progress'], repoPath, onProgress)
  }

  /** Fetch all remotes. Streams progress. */
  async fetch(repoPath: string, onProgress?: ProgressCallback): Promise<void> {
    await execWithProgress(['fetch', '--all', '--progress'], repoPath, onProgress)
  }

  /** List local AND remote-tracking branches with upstream tracking info. */
  async branchList(repoPath: string): Promise<BranchInfo[]> {
    const [refRes, currentRes] = await Promise.all([
      execSafe(
        [
          'for-each-ref',
          '--format=%(refname)\t%(refname:short)\t%(upstream:short)\t%(upstream:track)',
          'refs/heads/',
          'refs/remotes/origin/',
        ],
        repoPath
      ),
      execSafe(['rev-parse', '--abbrev-ref', 'HEAD'], repoPath),
    ])

    if (refRes.exitCode !== 0) return []
    const current = currentRes.stdout.trim()

    const results: BranchInfo[] = []

    for (const line of refRes.stdout.trim().split('\n').filter(Boolean)) {
      const [refname, shortName, upstream, track] = line.split('\t')

      // Skip the symbolic remote HEAD pointer (origin/HEAD)
      if (shortName === 'origin/HEAD' || shortName.endsWith('/HEAD')) continue

      const isRemote = refname.startsWith('refs/remotes/')
      const remoteName = isRemote ? shortName.split('/')[0] : undefined
      const displayName = isRemote && remoteName
        ? shortName.slice(remoteName.length + 1)   // strip "origin/"
        : shortName

      let ahead = 0, behind = 0
      if (track) {
        const a = track.match(/ahead (\d+)/);  if (a) ahead  = parseInt(a[1])
        const b = track.match(/behind (\d+)/); if (b) behind = parseInt(b[1])
      }

      results.push({
        name:        shortName,
        displayName,
        current:     !isRemote && shortName === current,
        upstream:    upstream || undefined,
        ahead,
        behind,
        isRemote,
        remoteName,
        // hasLocal is filled in below after we have all branches
      })
    }

    // Mark remote branches that have a corresponding local branch
    const localNames = new Set(results.filter(b => !b.isRemote).map(b => b.name))
    for (const b of results) {
      if (b.isRemote) b.hasLocal = localNames.has(b.displayName)
    }

    return results
  }

  /** Delete a remote branch via `git push <remote> --delete <branch>`. */
  async deleteRemoteBranch(repoPath: string, remoteName: string, branch: string): Promise<void> {
    await exec(['push', remoteName, '--delete', branch], repoPath)
  }

  /** Create a new branch (and optionally check it out). */
  async createBranch(repoPath: string, name: string, from?: string): Promise<void> {
    const args = from
      ? ['checkout', '-b', name, from]
      : ['checkout', '-b', name]
    await exec(args, repoPath)
  }

  /** Rename a branch. Renames the current branch when oldName === HEAD. */
  async renameBranch(repoPath: string, oldName: string, newName: string): Promise<void> {
    await exec(['branch', '-m', oldName, newName], repoPath)
  }

  /** Delete a branch. Uses -D (force) when force=true. */
  async deleteBranch(repoPath: string, name: string, force: boolean): Promise<void> {
    await exec(['branch', force ? '-D' : '-d', name], repoPath)
  }

  /** Return the URL of the 'origin' remote, or null if not set. */
  async getRemoteUrl(repoPath: string): Promise<string | null> {
    const res = await execSafe(['remote', 'get-url', 'origin'], repoPath)
    return res.exitCode === 0 ? res.stdout.trim() : null
  }

  /** Return ahead/behind counts for HEAD vs its upstream. */
  async getSyncStatus(repoPath: string): Promise<SyncStatus> {
    const upRes = await execSafe(
      ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'],
      repoPath
    )
    if (upRes.exitCode !== 0) {
      return { ahead: 0, behind: 0, remoteName: 'origin', remoteBranch: '', hasUpstream: false }
    }
    const remoteBranch = upRes.stdout.trim()
    const remoteName   = remoteBranch.split('/')[0]

    const [aRes, bRes] = await Promise.all([
      execSafe(['rev-list', '--count', `${remoteBranch}..HEAD`], repoPath),
      execSafe(['rev-list', '--count', `HEAD..${remoteBranch}`], repoPath),
    ])

    return {
      ahead:        parseInt(aRes.stdout.trim())  || 0,
      behind:       parseInt(bRes.stdout.trim())  || 0,
      remoteName,
      remoteBranch,
      hasUpstream:  true,
    }
  }

  /** Fetch origin then merge origin/main (or origin/master) into HEAD. */
  async updateFromMain(repoPath: string): Promise<void> {
    await execSafe(['fetch', 'origin'], repoPath)
    for (const branch of ['origin/main', 'origin/master']) {
      const check = await execSafe(['rev-parse', '--verify', branch], repoPath)
      if (check.exitCode === 0) {
        await exec(['merge', branch], repoPath)
        return
      }
    }
    throw new Error('Could not find origin/main or origin/master')
  }

  /** git log with parsed output. */
  async log(
    repoPath: string,
    args: { limit?: number; all?: boolean } = {}
  ): Promise<CommitEntry[]> {
    const cmdArgs = ['log', `--format=${GIT_LOG_FORMAT}`, '--topo-order']
    if (args.all) cmdArgs.push('--all')
    if (args.limit) cmdArgs.push(`-${args.limit}`)

    const { exitCode, stdout } = await execSafe(cmdArgs, repoPath)
    if (exitCode !== 0) return []
    return parseGitLog(stdout)
  }

  /** Files changed in a specific commit (uses diff-tree). */
  async commitFiles(
    repoPath: string,
    hash: string,
  ): Promise<Array<{ status: string; path: string; oldPath?: string }>> {
    const { exitCode, stdout } = await execSafe(
      ['diff-tree', '--no-commit-id', '-r', '--name-status', '-M', hash],
      repoPath,
    )
    if (exitCode !== 0 || !stdout.trim()) return []
    return stdout.trim().split('\n')
      .filter(Boolean)
      .map(line => {
        const parts = line.split('\t')
        const status  = parts[0].trim().charAt(0)  // M, A, D, R, C, T
        const path    = parts[parts.length - 1].trim()
        const oldPath = parts.length === 3 ? parts[1].trim() : undefined
        return { status, path, oldPath }
      })
  }

  /** Discard changes to the given paths. Untracked files are deleted from disk. */
  async discard(repoPath: string, paths: string[], isUntracked: boolean): Promise<void> {
    if (isUntracked) {
      for (const p of paths) {
        try { fs.unlinkSync(path.join(repoPath, p)) } catch { /* ignore */ }
      }
    } else {
      // Unstage first (no-op if not staged), then restore working tree
      await execSafe(['restore', '--staged', '--', ...paths], repoPath)
      await execSafe(['restore', '--', ...paths], repoPath)
    }
  }

  /** Discard all working-tree modifications (does not delete untracked files). */
  async discardAll(repoPath: string): Promise<void> {
    await execSafe(['restore', '--staged', '.'], repoPath)
    await execSafe(['restore', '.'], repoPath)
  }

  /** Append a pattern to .gitignore, creating the file if needed. */
  async addToGitignore(repoPath: string, pattern: string): Promise<void> {
    const p = path.join(repoPath, '.gitignore')
    let existing = ''
    try { existing = fs.readFileSync(p, 'utf8') } catch { /* new file */ }
    if (existing.split('\n').map(l => l.trim()).includes(pattern)) return
    const sep = existing && !existing.endsWith('\n') ? '\n' : ''
    fs.writeFileSync(p, existing + sep + pattern + '\n', 'utf8')
  }

  // ── Stash ─────────────────────────────────────────────────────────────────

  async stashList(repoPath: string): Promise<StashEntry[]> {
    const { exitCode, stdout } = await execSafe(
      ['stash', 'list', '--format=%gd\x1f%gs\x1f%ci'],
      repoPath
    )
    if (exitCode !== 0 || !stdout.trim()) return []
    return stdout
      .trim()
      .split('\n')
      .map((line, i) => {
        const [ref, subject, date] = line.split('\x1f')
        const branchMatch = subject?.match(/(?:WIP on|On) ([^:]+):/)
        return {
          index:   i,
          ref:     ref?.trim()     ?? `stash@{${i}}`,
          message: subject?.trim() ?? 'stash',
          branch:  branchMatch?.[1] ?? '',
          date:    date?.trim()    ?? '',
        }
      })
  }

  async stashSave(repoPath: string, message?: string): Promise<void> {
    const args = ['stash', 'push']
    if (message?.trim()) args.push('-m', message.trim())
    await exec(args, repoPath)
  }

  async stashPop(repoPath: string, ref: string): Promise<void> {
    await exec(['stash', 'pop', ref], repoPath)
  }

  async stashApply(repoPath: string, ref: string): Promise<void> {
    await exec(['stash', 'apply', ref], repoPath)
  }

  async stashDrop(repoPath: string, ref: string): Promise<void> {
    await exec(['stash', 'drop', ref], repoPath)
  }

  /** Switch to an existing branch. */
  async checkout(repoPath: string, branch: string): Promise<void> {
    await exec(['checkout', branch], repoPath)
  }

  /** Dry-run merge: returns files that would conflict. Does not modify the working tree. */
  async mergePreview(repoPath: string, targetBranch: string): Promise<ConflictPreviewFile[]> {
    // 1. Find the common ancestor
    const baseRes = await execSafe(['merge-base', 'HEAD', targetBranch], repoPath)
    if (baseRes.exitCode !== 0) throw new Error(`Could not find merge base with "${targetBranch}"`)
    const base = baseRes.stdout.trim()

    // 2. Files changed on each side since the merge base
    const [oursRes, theirsRes] = await Promise.all([
      execSafe(['diff', '--name-status', base, 'HEAD'], repoPath),
      execSafe(['diff', '--name-status', base, targetBranch], repoPath),
    ])

    const parseNameStatus = (out: string): Map<string, string> => {
      const m = new Map<string, string>()
      for (const line of out.trim().split('\n')) {
        const parts = line.trim().split('\t')
        if (parts.length >= 2) {
          // Rename lines look like "R100\told\tnew" — use the new name
          const filePath = parts[parts.length - 1]
          const status   = parts[0][0]  // first char: M A D R C
          if (filePath) m.set(filePath, status)
        }
      }
      return m
    }

    const oursMap   = parseNameStatus(oursRes.stdout)
    const theirsMap = parseNameStatus(theirsRes.stdout)

    const UE_EXTS = new Set(['.uasset', '.umap', '.udk', '.ubulk', '.uexp', '.ucas'])
    const currentBranch = await this.currentBranch(repoPath)

    const conflicts: ConflictPreviewFile[] = []
    for (const [filePath, oursStatus] of oursMap) {
      if (!theirsMap.has(filePath)) continue   // only one side changed it — no conflict
      const theirsStatus = theirsMap.get(filePath)!

      const ext    = path.extname(filePath).toLowerCase()
      const isBin  = BINARY_EXTS.has(ext)
      const type: ConflictPreviewFile['type'] = UE_EXTS.has(ext) ? 'ue-asset'
        : isBin ? 'binary' : 'text'

      const conflictType: ConflictPreviewFile['conflictType'] =
        (oursStatus === 'D' || theirsStatus === 'D') ? 'delete-modify'
        : isBin ? 'binary'
        : 'content'

      const [oursInfo, theirsInfo] = await Promise.all([
        this._contributorInfo(repoPath, filePath, 'HEAD', currentBranch),
        this._contributorInfo(repoPath, filePath, targetBranch, targetBranch),
      ])

      conflicts.push({ path: filePath, type, conflictType, ours: oursInfo, theirs: theirsInfo })
    }

    return conflicts
  }

  private async _contributorInfo(
    repoPath: string, filePath: string, ref: string, branch: string
  ): Promise<ContributorInfo> {
    const SEP = '\x1f'
    const [logRes, sizeRes] = await Promise.all([
      execSafe(['log', '-1', `--format=%an${SEP}%ae${SEP}%aI${SEP}%s`, ref, '--', filePath], repoPath),
      execSafe(['cat-file', '-s', `${ref}:${filePath}`], repoPath),
    ])
    const parts = logRes.stdout.trim().split(SEP)
    return {
      branch,
      lastContributor: { name: parts[0] ?? '', email: parts[1] ?? '' },
      lastEditedAt:    parts[2] ?? new Date().toISOString(),
      lastCommitMessage: parts[3]?.trim() ?? '',
      sizeBytes: sizeRes.exitCode === 0 ? (parseInt(sizeRes.stdout.trim(), 10) || 0) : 0,
    }
  }

  /** Merge targetBranch into HEAD. Throws if there are conflicts. */
  async merge(repoPath: string, targetBranch: string): Promise<void> {
    await exec(['merge', targetBranch], repoPath)
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────

  private async _dirBytes(dirPath: string): Promise<number> {
    let total = 0
    let entries: fs.Dirent[]
    try {
      entries = await fs.promises.readdir(dirPath, { withFileTypes: true })
    } catch {
      return 0
    }
    await Promise.all(entries.map(async entry => {
      const full = path.join(dirPath, entry.name)
      if (entry.isDirectory()) {
        total += await this._dirBytes(full)
      } else if (entry.isFile() || entry.isSymbolicLink()) {
        try { total += (await fs.promises.stat(full)).size } catch { /* skip */ }
      }
    }))
    return total
  }

  async cleanupSize(repoPath: string): Promise<SizeBreakdown> {
    const gitDir = path.join(repoPath, '.git')
    const objectsDir = path.join(gitDir, 'objects')
    const packsDir   = path.join(gitDir, 'objects', 'pack')
    const lfsDir     = path.join(gitDir, 'lfs')
    const logsDir    = path.join(gitDir, 'logs')

    const [totalBytes, objectsBytes, packsBytes, lfsCacheBytes, logsBytes] = await Promise.all([
      this._dirBytes(gitDir),
      this._dirBytes(objectsDir),
      this._dirBytes(packsDir),
      this._dirBytes(lfsDir),
      this._dirBytes(logsDir),
    ])

    return { totalBytes, objectsBytes, packsBytes, lfsCacheBytes, logsBytes }
  }

  async cleanupGc(repoPath: string, aggressive = false): Promise<CleanupResult> {
    const before = await this.cleanupSize(repoPath)
    const args = ['gc', '--quiet']
    if (aggressive) args.push('--aggressive')
    await execSafe(args, repoPath)
    const after = await this.cleanupSize(repoPath)
    return {
      beforeBytes: before.totalBytes,
      afterBytes:  after.totalBytes,
      savedBytes:  Math.max(0, before.totalBytes - after.totalBytes),
    }
  }

  async cleanupPruneLfs(repoPath: string): Promise<void> {
    await exec(['lfs', 'prune'], repoPath)
  }

  async cleanupShallow(repoPath: string, depth: number): Promise<void> {
    await exec(['fetch', '--depth', String(depth)], repoPath)
  }

  async cleanupUnshallow(repoPath: string): Promise<void> {
    await exec(['fetch', '--unshallow'], repoPath)
  }

  // ── LFS ───────────────────────────────────────────────────────────────────

  /** Parse .gitattributes + count LFS objects + suggest untracked binary exts. */
  async lfsStatus(repoPath: string): Promise<LFSStatus> {
    // Tracked patterns from .gitattributes
    const tracked: string[] = []
    try {
      const content = fs.readFileSync(path.join(repoPath, '.gitattributes'), 'utf8')
      for (const line of content.split('\n')) {
        const trimmed = line.trim()
        if (trimmed && trimmed.includes('filter=lfs')) {
          const pattern = trimmed.split(/\s+/)[0]
          if (pattern) tracked.push(pattern)
        }
      }
    } catch { /* no .gitattributes */ }

    // Count LFS objects and estimate total bytes
    let objects = 0, totalBytes = 0
    const lsRes = await execSafe(['lfs', 'ls-files', '-s'], repoPath)
    if (lsRes.exitCode === 0 && lsRes.stdout.trim()) {
      for (const line of lsRes.stdout.trim().split('\n').filter(Boolean)) {
        objects++
        // Format: "oid * path (1.23 MB)"
        const m = line.match(/\(([\d.]+)\s*(B|KB|MB|GB|TB)\)$/)
        if (m) {
          const n = parseFloat(m[1])
          const u = m[2]
          totalBytes += u === 'TB' ? n * 1e12
            : u === 'GB' ? n * 1e9
            : u === 'MB' ? n * 1e6
            : u === 'KB' ? n * 1e3 : n
        }
      }
    }

    // Suggest binary extensions in the repo not yet covered by a tracked pattern
    const trackedExts = new Set(
      tracked.map(p => path.extname(p.split('/').pop() ?? p).toLowerCase()).filter(Boolean)
    )
    const untrackedSet = new Set<string>()
    const lsFiles = await execSafe(['ls-files'], repoPath)
    if (lsFiles.exitCode === 0) {
      for (const f of lsFiles.stdout.trim().split('\n').filter(Boolean)) {
        const ext = path.extname(f).toLowerCase()
        if (ext && BINARY_EXTS.has(ext) && !trackedExts.has(ext)) {
          untrackedSet.add(`*${ext}`)
        }
      }
    }

    return { tracked, untracked: [...untrackedSet].sort(), objects, totalBytes }
  }

  /** Run `git lfs track` for each pattern. */
  async lfsTrack(repoPath: string, patterns: string[]): Promise<void> {
    for (const p of patterns) {
      await exec(['lfs', 'track', p], repoPath)
    }
  }

  /** Remove a pattern from LFS tracking (edits .gitattributes). */
  async lfsUntrack(repoPath: string, pattern: string): Promise<void> {
    await exec(['lfs', 'untrack', pattern], repoPath)
  }

  /** Return binary-extension patterns present in the repo but not yet LFS-tracked. */
  async lfsAutodetect(repoPath: string): Promise<string[]> {
    const status = await this.lfsStatus(repoPath)
    return status.untracked
  }

  /**
   * Migrate existing committed files to LFS.
   * ⚠ Rewrites history — callers must warn the user and force-push afterward.
   */
  async lfsMigrate(repoPath: string, patterns: string[]): Promise<void> {
    const include = patterns.join(',')
    await exec(['lfs', 'migrate', 'import', `--include=${include}`, '--everything'], repoPath)
  }

  /** Return old/new content for the Monaco diff viewer. */
  async diff(repoPath: string, filePath: string, staged: boolean): Promise<DiffContent> {
    const isBinary = BINARY_EXTS.has(path.extname(filePath).toLowerCase())
    const language = langFromPath(filePath)

    if (isBinary) return { oldContent: '', newContent: '', isBinary: true, language }

    // HEAD content — empty string for new files
    const headRes = await execSafe(['show', `HEAD:${filePath}`], repoPath)
    const oldContent = headRes.exitCode === 0 ? headRes.stdout : ''

    // Working/index content
    let newContent = ''
    if (staged) {
      const idxRes = await execSafe(['show', `:${filePath}`], repoPath)
      newContent = idxRes.exitCode === 0 ? idxRes.stdout : ''
    } else {
      try {
        newContent = fs.readFileSync(path.join(repoPath, filePath), 'utf8')
      } catch {
        // deleted in working tree
      }
    }

    return { oldContent, newContent, isBinary: false, language }
  }

  // ── Auto-fix helpers ────────────────────────────────────────────────────────

  async rebaseAbort(repoPath: string): Promise<void> {
    await exec(['rebase', '--abort'], repoPath)
  }

  async setUpstream(repoPath: string, branch: string): Promise<void> {
    await execWithProgress(['push', '--set-upstream', 'origin', branch], repoPath)
  }

  async setGitConfig(repoPath: string, key: string, value: string): Promise<void> {
    await exec(['config', key, value], repoPath)
  }
}

export const gitService = new GitService()
