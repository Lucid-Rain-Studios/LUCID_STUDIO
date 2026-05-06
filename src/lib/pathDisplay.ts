export function compactPath(filePath: string, maxParents = 2): string {
  const normalized = filePath.replace(/\\/g, '/')
  const parts = normalized.split('/').filter(Boolean)
  const maxParts = maxParents + 1

  if (parts.length <= maxParts) return normalized
  return `.../${parts.slice(-maxParts).join('/')}`
}
