import { GitProcess } from 'dugite'
import { OperationStep } from '../types'

export type ProgressCallback = (step: OperationStep) => void

// ── Progress parser ───────────────────────────────────────────────────────────

interface ProgressPattern {
  regex: RegExp
  id: string
  label: string
}

const PROGRESS_PATTERNS: ProgressPattern[] = [
  { regex: /Enumerating objects:\s+(\d+)/i,              id: 'enumerate',    label: 'Enumerating objects' },
  { regex: /Counting objects:\s+(\d+)/i,                 id: 'count',        label: 'Counting objects' },
  { regex: /Compressing objects:\s+(\d+)%/i,             id: 'compress',     label: 'Compressing objects' },
  { regex: /Receiving objects:\s+(\d+)%/i,               id: 'receive',      label: 'Receiving objects' },
  { regex: /Resolving deltas:\s+(\d+)%/i,                id: 'resolve',      label: 'Resolving deltas' },
  { regex: /Writing objects:\s+(\d+)%/i,                 id: 'write',        label: 'Writing objects' },
  { regex: /remote:\s+Counting objects:\s+(\d+)/i,       id: 'remote-count', label: 'Remote: counting objects' },
  { regex: /remote:\s+Compressing objects:\s+(\d+)%/i,   id: 'remote-zip',   label: 'Remote: compressing' },
  { regex: /Uploading LFS objects:\s+(\d+)%/i,           id: 'lfs-up',       label: 'Uploading LFS objects' },
  { regex: /Downloading LFS objects:\s+(\d+)%/i,         id: 'lfs-down',     label: 'Downloading LFS objects' },
]

function parseGitProgress(line: string): OperationStep | null {
  for (const { regex, id, label } of PROGRESS_PATTERNS) {
    if (!regex.test(line)) continue

    const progressMatch = line.match(/(\d+)%/)
    const isDone = /done\./i.test(line)

    return {
      id,
      label,
      status: isDone ? 'done' : 'running',
      progress: progressMatch ? parseInt(progressMatch[1], 10) : undefined,
      detail: line.trim().replace(/\r/g, ''),
    }
  }
  return null
}

// ── execWithProgress (uses spawn for real-time stderr) ────────────────────────

export async function execWithProgress(
  args: string[],
  repoPath: string,
  onProgress?: ProgressCallback
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const proc = GitProcess.spawn(args, repoPath, {
      env: {
        ...process.env,
        GIT_TERMINAL_PROMPT: '0',
        GIT_ASKPASS: 'echo',
      },
    })

    let stdout = ''
    let stderr = ''

    proc.stdout?.on('data', (chunk: Buffer) => {
      stdout += chunk.toString()
    })

    proc.stderr?.on('data', (chunk: Buffer) => {
      const text = chunk.toString()
      stderr += text

      if (onProgress) {
        // Git writes multiple progress lines per chunk, separated by \r or \n
        for (const line of text.split(/[\r\n]+/)) {
          const step = parseGitProgress(line)
          if (step) onProgress(step)
        }
      }
    })

    proc.on('error', reject)

    proc.on('close', (code: number | null) => {
      if (code === 0 || code === null) {
        resolve({ stdout, stderr })
      } else {
        reject(new Error(`git ${args[0]} failed (exit ${code}):\n${stderr || stdout}`))
      }
    })
  })
}

// ── exec (simple, awaitable, throws on non-zero exit) ─────────────────────────

export async function exec(
  args: string[],
  repoPath: string
): Promise<{ stdout: string; stderr: string }> {
  const result = await GitProcess.exec(args, repoPath, {
    env: {
      ...process.env,
      GIT_TERMINAL_PROMPT: '0',
      GIT_ASKPASS: 'echo',
    },
  })

  if (result.exitCode !== 0) {
    throw new Error(
      `git ${args[0]} failed (exit ${result.exitCode}):\n${result.stderr || result.stdout}`
    )
  }

  return { stdout: result.stdout, stderr: result.stderr }
}

// ── execSafe (never throws — returns exitCode instead) ────────────────────────

export async function execSafe(
  args: string[],
  repoPath: string
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const result = await GitProcess.exec(args, repoPath, {
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
  })
  return {
    stdout: result.stdout,
    stderr: result.stderr,
    exitCode: result.exitCode,
  }
}
