import Dexie, { type EntityTable } from 'dexie'
import type { VaultFile, VaultFolder, Setting, KeyringRecord } from './lib/types'
import { folderKey, newId, segmentsOf } from './lib/folders'

class VaultDB extends Dexie {
  files!: EntityTable<VaultFile, 'id'>
  folders!: EntityTable<VaultFolder, 'id'>
  settings!: EntityTable<Setting, 'key'>
  keyring!: EntityTable<KeyringRecord, 'id'>

  constructor() {
    super('zero-knowledge-vault')
    this.version(1).stores({
      files: 'id, name, type, createdAt',
      settings: 'key',
      keyring: 'id'
    })
    this.version(2)
      .stores({
        files: 'id, name, type, createdAt',
        folders: 'id',
        settings: 'key',
        keyring: 'id'
      })
      .upgrade(async tx => {
        const byKey = new Map<string, VaultFolder>()
        const ensureFolder = async (parentId: string | null, name: string): Promise<string> => {
          const key = folderKey(parentId, name)
          let existing = byKey.get(key)
          if (!existing) {
            existing = await tx
              .table('folders')
              .toArray()
              .then(all => all.find(f => f.parentId === parentId && f.name === name))
          }
          if (!existing) {
            existing = { id: newId(), name, parentId, createdAt: Date.now() }
            await tx.table('folders').add(existing)
          }
          byKey.set(key, existing)
          return existing.id
        }

        const files = await tx.table('files').toArray()
        for (const file of files) {
          const dirs = segmentsOf(file.path)
          dirs.pop()
          if (!dirs.length) {
            await tx.table('files').update(file.id, { folderId: null })
            continue
          }
          let parentId: string | null = null
          for (const dir of dirs) {
            parentId = await ensureFolder(parentId, dir)
          }
          await tx.table('files').update(file.id, { folderId: parentId })
        }
      })
  }
}

export const db = new VaultDB()