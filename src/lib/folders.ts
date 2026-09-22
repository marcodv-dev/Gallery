import type { VaultFolder } from './types'

export function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

export function segmentsOf(path: string): string[] {
  return path.split('/').filter(Boolean)
}

export function folderKey(parentId: string | null, name: string): string {
  return `${parentId ?? ''}\u0000${name}`
}

export function buildFolderPath(folders: VaultFolder[], folderId: string | null): string {
  const names: string[] = []
  let cur = folderId ? new Map(folders.map(f => [f.id, f])).get(folderId) : undefined
  while (cur) {
    names.unshift(cur.name)
    cur = cur.parentId ? new Map(folders.map(f => [f.id, f])).get(cur.parentId) : undefined
  }
  return names.join('/')
}

export function collectFolderIds(folders: VaultFolder[], root: VaultFolder): Set<string> {
  const ids = new Set<string>([root.id])
  let changed = true
  while (changed) {
    changed = false
    for (const f of folders) {
      if (f.parentId && ids.has(f.parentId) && !ids.has(f.id)) {
        ids.add(f.id)
        changed = true
      }
    }
  }
  return ids
}