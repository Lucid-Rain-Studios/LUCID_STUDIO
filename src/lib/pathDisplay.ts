export function compactPath(filePath: string, maxParents = 2): string {
  const normalized = filePath.replace(/\\/g, '/')
  const parts = normalized.split('/').filter(Boolean)

  if (parts.length <= maxParents + 1) return normalized
  return `${parts[0]}/.../${parts.slice(-maxParents).join('/')}`
}
