const LAST_FETCH_KEY = (repoPath: string) => `lucid-git:last-fetch:${repoPath}`
const FETCH_EVENT = 'lucid-git:fetch-performed'

export function getLastFetch(repoPath: string): number | null {
  const raw = localStorage.getItem(LAST_FETCH_KEY(repoPath))
  const parsed = raw ? parseInt(raw, 10) : NaN
  return Number.isFinite(parsed) ? parsed : null
}

export function markFetchPerformed(repoPath: string, at: number = Date.now()): number {
  localStorage.setItem(LAST_FETCH_KEY(repoPath), String(at))
  window.dispatchEvent(new CustomEvent(FETCH_EVENT, { detail: { repoPath, at } }))
  return at
}

export function onFetchPerformed(listener: (repoPath: string, at: number) => void): () => void {
  const handler = (event: Event) => {
    const custom = event as CustomEvent<{ repoPath?: string; at?: number }>
    const repoPath = custom.detail?.repoPath
    const at = custom.detail?.at
    if (!repoPath || typeof at !== 'number') return
    listener(repoPath, at)
  }
  window.addEventListener(FETCH_EVENT, handler)
  return () => window.removeEventListener(FETCH_EVENT, handler)
}

export function formatFetchAgo(at: number | null, now: number = Date.now()): string {
  if (at === null) return 'never fetched'
  const sec = Math.max(0, Math.floor((now - at) / 1000))
  if (sec < 10)    return 'fetched just now'
  if (sec < 60)    return `fetched ${sec}s ago`
  if (sec < 3600)  return `fetched ${Math.floor(sec / 60)}m ago`
  if (sec < 86400) return `fetched ${Math.floor(sec / 3600)}h ago`
  return `fetched ${Math.floor(sec / 86400)}d ago`
}
