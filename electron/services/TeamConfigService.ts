import * as fs from 'fs'
import * as path from 'path'

export interface TeamConfig {
  lfsPatterns: string[]
  webhookEvents: Record<string, boolean>
  hookIds: string[]
  largeFileWarnMB?: number
}

const CONFIG_PATH = '.lucid-git/team-config.json'

class TeamConfigService {
  private configPath(repoPath: string): string {
    return path.join(repoPath, CONFIG_PATH)
  }

  load(repoPath: string): TeamConfig | null {
    const p = this.configPath(repoPath)
    if (!fs.existsSync(p)) return null
    try {
      return JSON.parse(fs.readFileSync(p, 'utf8')) as TeamConfig
    } catch {
      return null
    }
  }

  save(repoPath: string, config: TeamConfig): void {
    const dir = path.dirname(this.configPath(repoPath))
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(this.configPath(repoPath), JSON.stringify(config, null, 2), 'utf8')
  }
}

export const teamConfigService = new TeamConfigService()
