export type FileKind = 'image' | 'video' | 'document' | 'other'

export interface VaultFolder {
  id: string
  name: string
  parentId: string | null
  createdAt: number
}

export interface VaultFile {
  id: string
  name: string
  size: number
  type: FileKind
  mimeType: string
  path: string
  folderId: string | null
  createdAt: number
  encryptedData: Blob
  thumbnailData?: Blob
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
