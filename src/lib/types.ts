export type FileKind = 'image' | 'video' | 'document' | 'other'

export interface VaultFile {
  id: string
  name: string
  size: number
  type: FileKind
  mimeType: string
  path: string
  createdAt: number
  encryptedData: Blob
}

export interface Setting {
  key: string
  value: Blob
}

export interface KeyringRecord {
  id: string
  credentialId: Uint8Array
  prfSalt: Uint8Array
  wrappedKey: Blob
}
