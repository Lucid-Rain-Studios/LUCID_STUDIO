import * as fs from 'fs'
import * as path from 'path'
import { execSync, spawn } from 'child_process'

export interface CommandletResult {
  success: boolean
  output: string
  outputPath: string | null
  error: string | null
}

class UEHeadlessService {
  /**
   * Locate the UnrealEditor-Cmd binary for a given engine version.
   * Priority: user override → Windows registry → standard install paths → macOS paths.
   */
  async findEditorBinary(engineVersion: string, override?: string): Promise<string | null> {
    if (override?.trim() && fs.existsSync(override.trim())) return override.trim()
    if (!/^\d+\.\d+/.test(engineVersion)) return null

    const ueFolder = `UE_${engineVersion}`
    const candidates: string[] = []

    if (process.platform === 'win32') {
      // Registry first (custom / non-default install paths)
      try {
        const raw = execSync(
          `reg query "HKEY_LOCAL_MACHINE\\SOFTWARE\\EpicGames\\Unreal Engine\\${engineVersion}" /v InstalledDirectory`,
          { encoding: 'utf8', stdio: 'pipe' }
        )
        const m = raw.match(/InstalledDirectory\s+REG_SZ\s+(.+)/)
        if (m) {
          candidates.push(path.join(m[1].trim(), 'Engine', 'Binaries', 'Win64', 'UnrealEditor-Cmd.exe'))
        }
      } catch { /* registry key absent */ }

      for (const base of [
        process.env['PROGRAMFILES']     ?? 'C:\\Program Files',
        process.env['PROGRAMFILES(X86)'] ?? 'C:\\Program Files (x86)',
      ]) {
        candidates.push(path.join(base, 'Epic Games', ueFolder, 'Engine', 'Binaries', 'Win64', 'UnrealEditor-Cmd.exe'))
      }
    } else if (process.platform === 'darwin') {
      candidates.push(
        path.join('/Users', 'Shared', 'Epic Games', ueFolder, 'Engine', 'Binaries', 'Mac', 'UnrealEditor-Cmd'),
        path.join('/Library', 'Application Support', 'Epic', 'UnrealEngine', ueFolder, 'Engine', 'Binaries', 'Mac', 'UnrealEditor-Cmd'),
      )
    }

    for (const c of candidates) {
      if (fs.existsSync(c)) return c
    }
    return null
  }

  /**
   * Returns true when the Unreal Editor has the project open.
   * UE writes a lock file to Saved/ while running; spawning a second instance corrupts the project.
   */
  isEditorRunning(projectPath: string): boolean {
    const dir = path.extname(projectPath) ? path.dirname(projectPath) : projectPath
    return fs.existsSync(path.join(dir, 'Saved', 'Lock'))
  }

  /** Invoke a UE commandlet. Times out after `timeoutMs` and kills the process. */
  async runCommandlet(args: {
    editorBin: string
    projectPath: string
    commandlet: 'DiffAssets' | 'DataTableCSVExporter' | 'ExportThumbnail' | 'DumpAssetRegistry'
    params: string[]
    timeoutMs: number
  }): Promise<CommandletResult> {
    return new Promise((resolve) => {
      const argv = [
        args.projectPath,
        `-run=${args.commandlet}`,
        '-unattended', '-nopause', '-nosplash', '-nullrhi',
        ...args.params,
      ]

      let output = ''
      let settled = false

      const proc = spawn(args.editorBin, argv, { stdio: ['ignore', 'pipe', 'pipe'] })
      proc.stdout?.on('data', (b: Buffer) => { output += b.toString() })
      proc.stderr?.on('data', (b: Buffer) => { output += b.toString() })

      const timer = setTimeout(() => {
        if (settled) return
        settled = true
        proc.kill()
        resolve({ success: false, output, outputPath: null, error: `Timed out after ${args.timeoutMs}ms` })
      }, args.timeoutMs)

      proc.on('close', (code) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        resolve({
          success: code === 0,
          output,
          outputPath: null,
          error: code !== 0 ? `Exited with code ${code}` : null,
        })
      })

      proc.on('error', (err) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        resolve({ success: false, output, outputPath: null, error: err.message })
      })
    })
  }
}

export const ueHeadlessService = new UEHeadlessService()
