import { useState, type FormEvent } from 'react'
import { ShieldCheckIcon, FingerprintIcon, LockKeyIcon } from '@phosphor-icons/react'

interface LockScreenProps {
  onUnlock: (password: string) => void
  onFaceIdUnlock: () => void
  faceIdAvailable: boolean
  firstRun: boolean
  busy: string | null
}

export default function LockScreen({
  onUnlock,
  onFaceIdUnlock,
  faceIdAvailable,
  firstRun,
  busy
}: LockScreenProps) {
  const [password, setPassword] = useState('')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    onUnlock(password)
  }

  return (
    <div className='lock'>
      <div className='lock-card'>
        <div className='lock-badge'>
          <ShieldCheckIcon size={48} weight='regular' />
        </div>

        <div>
          <h1 className='lock-title intel'>Master password</h1>
          <p className='lock-sub'>Zero-Knowledge Vault</p>
          <p className='lock-sub'>
            {firstRun
              ? 'Scegli una Master Password: cifrerà i tuoi file in locale con AES-256-GCM. Non potrà essere recuperata.'
              : 'Tutti i file vengono cifrati e decifrati in locale nel tuo browser con AES-256-GCM.'}
          </p>
        </div>

        {faceIdAvailable && (
          <>
            <button
              className='btn glass lg sc lock-faceid'
              type='button'
              onClick={onFaceIdUnlock}
              disabled={!!busy}
            >
              <FingerprintIcon size={24} weight='regular' />
              <span>Sblocca con Face ID</span>
            </button>
            <div className='lock-divider'><span>oppure</span></div>
          </>
        )}

        <form onSubmit={handleSubmit} className='lock-form'>
          <div className='page-input'>
            <LockKeyIcon size={24} weight='regular' />
            <input
              className='search'
              type='password'
              placeholder={firstRun ? 'Crea la Master Password' : 'Inserisci la Master Password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={!!busy}
              autoComplete='current-password'
            />
          </div>
          {busy && <p className='lock-progress'>{busy}</p>}

          <button className='btn accent lg sc' style={{marginTop:10}} type='submit' disabled={!!busy}>
            {firstRun ? 'Crea Cassaforte' : 'Sblocca Cassaforte'}
          </button>
        </form>

        <p className='lock-foot'>Nessun dato o password lascia mai questo dispositivo.</p>
      </div>
    </div>
  )
}
