import Dexie, { type EntityTable } from 'dexie'
import type { VaultFile, Setting, KeyringRecord } from './lib/types'

class VaultDB extends Dexie {
  files!: EntityTable<VaultFile, 'id'>
  settings!: EntityTable<Setting, 'key'>
  keyring!: EntityTable<KeyringRecord, 'id'>

  constructor() {
    super('zero-knowledge-vault')
    this.version(1).stores({
      files: 'id, name, type, createdAt',
      settings: 'key',
      keyring: 'id'
    })
  }
}

export const db = new VaultDB()
