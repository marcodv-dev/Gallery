import { randomBytes } from '../crypto'

function toUint8(value: unknown): Uint8Array | null {
  if (!value) return null
  if (value instanceof ArrayBuffer) return new Uint8Array(value)
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength)
  return null
}

export async function isFaceIdSupported(): Promise<boolean> {
  if (typeof window === 'undefined' || !window.PublicKeyCredential) return false
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch {
    return false
  }
}

export async function createPlatformCredential(): Promise<Uint8Array> {
  const challenge = randomBytes(32)
  const userId = randomBytes(32)

  const publicKey = {
    challenge: challenge as BufferSource,
    rp: { name: 'Zero-Knowledge Vault' },
    user: {
      id: userId as BufferSource,
      name: 'vault',
      displayName: 'Vault'
    },
    pubKeyCredParams: [
      { type: 'public-key', alg: -7 },
      { type: 'public-key', alg: -257 }
    ],
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      userVerification: 'required',
      residentKey: 'preferred'
    },
    timeout: 60000,
    attestation: 'none',
    extensions: { prf: {} }
  } as unknown as PublicKeyCredentialCreationOptions

  const credential = (await navigator.credentials.create({ publicKey })) as PublicKeyCredential | null

  if (!credential) throw new Error('Credenziale annullata')
  const rawId = toUint8(credential.rawId)
  if (!rawId) throw new Error('Credenziale non valida')
  return rawId
}

export async function getPrfOutput(credentialId: Uint8Array, prfSalt: Uint8Array): Promise<Uint8Array | null> {
  try {
    const challenge = randomBytes(32)
    const publicKey = {
      challenge: challenge as BufferSource,
      allowCredentials: [{ id: credentialId as BufferSource, type: 'public-key' }],
      userVerification: 'required',
      timeout: 60000,
      extensions: {
        prf: { eval: { first: prfSalt as BufferSource } }
      }
    } as unknown as PublicKeyCredentialRequestOptions

    const assertion = (await navigator.credentials.get({ publicKey })) as PublicKeyCredential | null

    if (!assertion) return null
    const results = assertion.getClientExtensionResults() as Record<string, unknown>
    const prf = results.prf as
      | { results?: { first?: unknown } }
      | undefined
    const first = toUint8(prf?.results?.first)
    if (!first || first.byteLength === 0) return null
    return first
  } catch {
    return null
  }
}
