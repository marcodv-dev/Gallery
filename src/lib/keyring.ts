import { db } from '../db'
import { randomBytes } from '../crypto'
import { createPlatformCredential, getPrfOutput } from './webauthn'

const KEYRING_ID = 'main'

async function importWrapKey(raw: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', raw as BufferSource, { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt'
  ])
}

export async function isFaceIdEnabled(): Promise<boolean> {
  const record = await db.keyring.get(KEYRING_ID)
  return !!record
}

export async function enableFaceId(vaultKey: CryptoKey): Promise<void> {
  const credentialId = await createPlatformCredential()
  const prfSalt = randomBytes(32)
  const prfOutput = await getPrfOutput(credentialId, prfSalt)
  if (!prfOutput) throw new Error('PRF non supportato su questo dispositivo')

  const wrapKey = await importWrapKey(prfOutput)
  const rawKey = await crypto.subtle.exportKey('raw', vaultKey)
  const iv = randomBytes(12)
  const wrapped = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    wrapKey,
    rawKey
  )

  const packed = new Uint8Array(iv.length + wrapped.byteLength)
  packed.set(iv, 0)
  packed.set(new Uint8Array(wrapped), iv.length)

  await db.keyring.put({
    id: KEYRING_ID,
    credentialId,
    prfSalt,
    wrappedKey: new Blob([packed], { type: 'application/octet-stream' })
  })
}

export async function disableFaceId(): Promise<void> {
  await db.keyring.delete(KEYRING_ID)
}

export async function unlockWithFaceId(): Promise<CryptoKey | null> {
  const record = await db.keyring.get(KEYRING_ID)
  if (!record) return null

  const prfOutput = await getPrfOutput(record.credentialId, record.prfSalt)
  if (!prfOutput) return null

  try {
    const wrapKey = await importWrapKey(prfOutput)
    const packed = new Uint8Array(await record.wrappedKey.arrayBuffer())
    const iv = packed.subarray(0, 12)
    const wrapped = packed.subarray(12)
    const rawKey = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      wrapKey,
      wrapped as BufferSource
    )
    return await crypto.subtle.importKey('raw', rawKey, { name: 'AES-GCM' }, true, [
      'encrypt',
      'decrypt'
    ])
  } catch {
    return null
  }
}
