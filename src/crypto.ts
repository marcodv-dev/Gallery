const PBKDF2_ITERATIONS = 100000

export function isCryptoAvailable(): boolean {
  return typeof window !== 'undefined' && window.isSecureContext && !!window.crypto?.subtle
}

export function randomBytes(n: number): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(n))
}

export function assertCryptoAvailable(): void {
  if (!isCryptoAvailable()) {
    throw new Error('Web Crypto API non disponibile: serve HTTPS o localhost.')
  }
}

export async function deriveVaultKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password) as BufferSource,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )
}

export async function encryptBuffer(data: ArrayBuffer, key: CryptoKey): Promise<Blob> {
  const iv = randomBytes(12)
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    data
  )
  const out = new Uint8Array(iv.length + ciphertext.byteLength)
  out.set(iv, 0)
  out.set(new Uint8Array(ciphertext), iv.length)
  return new Blob([out], { type: 'application/octet-stream' })
}

export async function decryptBuffer(blob: Blob, key: CryptoKey): Promise<ArrayBuffer> {
  const buf = new Uint8Array(await blob.arrayBuffer())
  const iv = buf.subarray(0, 12)
  const ciphertext = buf.subarray(12)
  return crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    ciphertext as BufferSource
  )
}

const VERIFIER_PLAINTEXT = 'vault-ok'

export async function createVerifier(key: CryptoKey): Promise<Blob> {
  const data = new TextEncoder().encode(VERIFIER_PLAINTEXT)
  return encryptBuffer(data.buffer as ArrayBuffer, key)
}

export async function checkVerifier(blob: Blob, key: CryptoKey): Promise<boolean> {
  try {
    const plain = await decryptBuffer(blob, key)
    return new TextDecoder().decode(plain) === VERIFIER_PLAINTEXT
  } catch {
    return false
  }
}
