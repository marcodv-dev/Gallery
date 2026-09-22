import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { ShieldCheckIcon, ArrowsClockwiseIcon } from '@phosphor-icons/react'
import { db } from './db'
import {
  randomBytes,
  deriveVaultKey,
  encryptBuffer,
  decryptBuffer,
  createVerifier,
  checkVerifier,
  isCryptoAvailable
} from './crypto'
import { getFileType } from './lib/fileType'
import { isFaceIdSupported } from './lib/webauthn'
import {
  isFaceIdEnabled,
  enableFaceId,
  disableFaceId,
  unlockWithFaceId
} from './lib/keyring'
import type { VaultFile } from './lib/types'
import { ToastProvider, useToast } from './context/ToastContext'
import LockScreen from './components/LockScreen'
import Toolbar from './components/Toolbar'
import MediaGrid from './components/MediaGrid'
import Lightbox from './components/Lightbox'

function revokeUrls(map: Record<string, string>) {
  Object.values(map).forEach(url => URL.revokeObjectURL(url))
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

function VaultApp() {
  const toast = useToast()

  const [isUnlocked, setIsUnlocked] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [hasVault, setHasVault] = useState(false)

  const [vaultKey, setVaultKey] = useState<CryptoKey | null>(null)
  const [vaultFiles, setVaultFiles] = useState<VaultFile[]>([])
  const [decryptedUrls, setDecryptedUrls] = useState<Record<string, string>>({})

  const [faceIdSupported, setFaceIdSupported] = useState(false)
  const [faceIdEnabled, setFaceIdEnabled] = useState(false)

  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [sortBy, setSortBy] = useState('date-desc')
  const [gridCols, setGridCols] = useState(4)
  const [activeMedia, setActiveMedia] = useState<VaultFile | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const salt = await db.settings.get('salt')
      if (!cancelled) setHasVault(!!salt)
      const supported = await isFaceIdSupported()
      if (cancelled) return
      setFaceIdSupported(supported)
      if (supported) setFaceIdEnabled(await isFaceIdEnabled())
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    return () => {
      revokeUrls(decryptedUrls)
    }
  }, [decryptedUrls])

  async function finishUnlock(key: CryptoKey) {
    setBusy('Lettura del vault in corso…')
    const files = await db.files.toArray()
    const newUrls: Record<string, string> = {}

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      setBusy(`Decifratura dei file… ${i + 1}/${files.length}`)
      try {
        const plain = await decryptBuffer(file.encryptedData, key)
        newUrls[file.id] = URL.createObjectURL(
          new Blob([plain], { type: file.mimeType || 'application/octet-stream' })
        )
      } catch (err) {
        console.error('Decifratura fallita per', file.name, err)
        toast.show(`Impossibile decifrare: ${file.name}`)
      }
    }

    setVaultKey(key)
    setVaultFiles(files)
    setDecryptedUrls(newUrls)
    setIsUnlocked(true)
    setBusy(null)
  }

  async function handleUnlock(password: string) {
    if (!isCryptoAvailable()) {
      toast.show('La crittografia richiede HTTPS o localhost (Web Crypto API).')
      return
    }
    if (!password) {
      toast.show('Inserisci la master password per sbloccare.')
      return
    }
    setBusy('Sblocco in corso…')
    try {
      const saltSetting = await db.settings.get('salt')
      const verifierSetting = await db.settings.get('verifier')
      let key: CryptoKey

      if (!saltSetting || !verifierSetting) {
        const salt = randomBytes(16)
        key = await deriveVaultKey(password, salt)
        await db.settings.put({ key: 'salt', value: new Blob([salt]) })
        await db.settings.put({ key: 'verifier', value: await createVerifier(key) })
        setHasVault(true)
      } else {
        const salt = new Uint8Array(await saltSetting.value.arrayBuffer())
        key = await deriveVaultKey(password, salt)
        const valid = await checkVerifier(verifierSetting.value, key)
        if (!valid) {
          toast.show('Master password errata.')
          setBusy(null)
          return
        }
      }

      await finishUnlock(key)
    } catch (err) {
      console.error(err)
      toast.show('Errore durante lo sblocco.')
      setBusy(null)
    }
  }

  async function handleFaceIdUnlock() {
    if (!isCryptoAvailable()) {
      toast.show('La crittografia richiede HTTPS o localhost (Web Crypto API).')
      return
    }
    setBusy('Autenticazione Face ID…')
    try {
      const key = await unlockWithFaceId()
      if (!key) {
        toast.show('Face ID non riuscito. Usa la master password.')
        setBusy(null)
        return
      }
      await finishUnlock(key)
    } catch (err) {
      console.error(err)
      toast.show('Errore durante lo sblocco con Face ID.')
      setBusy(null)
    }
  }

  function handleLock() {
    revokeUrls(decryptedUrls)
    setDecryptedUrls({})
    setVaultFiles([])
    setVaultKey(null)
    setIsUnlocked(false)
    setActiveMedia(null)
    setBusy(null)
    setSearchQuery('')
    setTypeFilter('all')
  }

  async function handleToggleFaceId() {
    if (!vaultKey) return
    if (faceIdEnabled) {
      await disableFaceId()
      setFaceIdEnabled(false)
      toast.show('Face ID disattivato')
      return
    }
    try {
      setBusy('Attivazione Face ID…')
      await enableFaceId(vaultKey)
      setFaceIdEnabled(true)
      toast.show('Face ID attivato')
    } catch (err) {
      console.error(err)
      toast.show('Attivazione Face ID annullata o non riuscita')
    } finally {
      setBusy(null)
    }
  }

  async function handleUpload(e: ChangeEvent<HTMLInputElement>) {
    const uploadedFiles = Array.from(e.target.files ?? [])
    if (!uploadedFiles.length || !vaultKey) return

    setBusy('Cifratura dei file in corso…')
    try {
      const newFiles: VaultFile[] = []
      const newUrls = { ...decryptedUrls }

      for (const file of uploadedFiles) {
        const arrayBuffer = await file.arrayBuffer()
        const encryptedData = await encryptBuffer(arrayBuffer, vaultKey)
        const id = generateId()

        const newFile: VaultFile = {
          id,
          name: file.name,
          size: file.size,
          type: getFileType(file.name),
          mimeType: file.type,
          path: file.webkitRelativePath || file.name,
          createdAt: Date.now(),
          encryptedData
        }

        await db.files.add(newFile)
        newFiles.push(newFile)
        newUrls[id] = URL.createObjectURL(new Blob([arrayBuffer], { type: file.type }))
      }

      setVaultFiles(prev => [...prev, ...newFiles])
      setDecryptedUrls(newUrls)
    } catch (err) {
      console.error(err)
      toast.show('Errore durante la cifratura dei file.')
    } finally {
      setBusy(null)
      e.target.value = ''
    }
  }

  async function handleDelete(file: VaultFile) {
    try {
      await db.files.delete(file.id)
      setVaultFiles(prev => prev.filter(f => f.id !== file.id))
      setDecryptedUrls(prev => {
        const next = { ...prev }
        if (next[file.id]) {
          URL.revokeObjectURL(next[file.id])
          delete next[file.id]
        }
        return next
      })
      setActiveMedia(null)
      toast.show('File eliminato dal vault')
    } catch (err) {
      console.error(err)
      toast.show('Errore durante l\'eliminazione.')
    }
  }

  const processedFiles = useMemo(() => {
    return vaultFiles
      .filter(file => {
        const matchesQuery =
          file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          file.path.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesType = typeFilter === 'all' || file.type === typeFilter
        return matchesQuery && matchesType
      })
      .sort((a, b) => {
        if (sortBy === 'name-asc') return a.name.localeCompare(b.name)
        if (sortBy === 'name-desc') return b.name.localeCompare(a.name)
        if (sortBy === 'size-asc') return a.size - b.size
        if (sortBy === 'size-desc') return b.size - a.size
        if (sortBy === 'date-asc') return a.createdAt - b.createdAt
        return b.createdAt - a.createdAt
      })
  }, [vaultFiles, searchQuery, typeFilter, sortBy])

  if (!isUnlocked) {
    return (
      <LockScreen
        onUnlock={handleUnlock}
        onFaceIdUnlock={handleFaceIdUnlock}
        faceIdAvailable={faceIdSupported && faceIdEnabled && !busy}
        firstRun={!hasVault}
        busy={busy}
      />
    )
  }

  return (
    <div className='app-root'>
      <header className='header'>
        <div className='header-div'>
          <ShieldCheckIcon className='header-logo' size={32} weight='regular' />
          <h2 className='header-title intel'>Vault</h2>
          <span className='header-badge intel'>AES-256</span>
        </div>
        <button className='btn danger md sc' type='button' onClick={handleLock}>
          Chiudi Vault
        </button>
      </header>
      <div className='statusbar-veil' />

      <main className='app-shell'>
        <Toolbar
          searchQuery={searchQuery}
          onSearch={setSearchQuery}
          typeFilter={typeFilter}
          onTypeFilter={setTypeFilter}
          sortBy={sortBy}
          onSortBy={setSortBy}
          gridCols={gridCols}
          onGridCols={setGridCols}
          onUploadFiles={handleUpload}
          onUploadFolder={handleUpload}
          faceIdSupported={faceIdSupported}
          faceIdEnabled={faceIdEnabled}
          onToggleFaceId={handleToggleFaceId}
          onLock={handleLock}
        />

        {busy && (
          <div className='vault-progress intel'>
            <ArrowsClockwiseIcon size={16} weight='regular' className='spin' />
            <span>{busy}</span>
          </div>
        )}

        <section className='page vault-page'>
          <MediaGrid
            files={processedFiles}
            urls={decryptedUrls}
            gridCols={gridCols}
            onOpen={setActiveMedia}
          />
        </section>
      </main>

      {activeMedia && (
        <Lightbox
          file={activeMedia}
          url={decryptedUrls[activeMedia.id]}
          onClose={() => setActiveMedia(null)}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <VaultApp />
    </ToastProvider>
  )
}
