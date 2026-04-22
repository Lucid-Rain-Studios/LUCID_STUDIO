import { CommitEntry } from '../types'

// Delimiters that won't appear in commit messages
const SEP = '\x1f'   // unit separator — between fields
const REC = '\x1e'   // record separator — between commits

// Pass this format string to `git log`:
// git log --format=<GIT_LOG_FORMAT> [other args]
export const GIT_LOG_FORMAT = `${SEP}%H${SEP}%P${SEP}%an${SEP}%ae${SEP}%at${SEP}%s${REC}`

export function parseGitLog(output: string): CommitEntry[] {
  if (!output.trim()) return []

  return output
    .split(REC)
    .map(record => record.trim())
    .filter(record => record.includes(SEP))
    .map(record => {
      // Leading SEP produces an empty first element — drop it
      const parts = record.split(SEP).slice(1)
      const [hash = '', parents = '', author = '', email = '', ts = '0', message = ''] = parts

      return {
        hash:        hash.trim(),
        parentHashes: parents.trim() ? parents.trim().split(' ') : [],
        author:      author.trim(),
        email:       email.trim(),
        timestamp:   parseInt(ts.trim(), 10) * 1000, // unix → ms
        message:     message.trim(),
      }
    })
    .filter(c => c.hash.length > 0)
}
