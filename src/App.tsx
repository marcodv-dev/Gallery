import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import {
  ShieldCheckIcon,
  ArrowsClockwiseIcon,
  FingerprintIcon,
  ArrowLeftIcon,
  PencilSimpleIcon,
  TrashSimpleIcon
} from '@phosphor-icons/react'
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
import { buildFolderPath, collectFolderIds, folderKey, newId, segmentsOf } from './lib/folders'
import { captureVideoThumbnail } from './lib/thumbnail'
import type { VaultFile, VaultFolder } from './lib/types'
import { ToastProvider, useToast } from './context/ToastContext'
import LockScreen from './components/LockScreen'
import Toolbar from './components/Toolbar'
import MediaGrid from './components/MediaGrid'
import Lightbox from './components/Lightbox'
import FolderDialog from './components/FolderDialog'

function revokeUrls(map: Record<string, string>) {
  Object.values(map).forEach(url => URL.revokeObjectURL(url))
}

function VaultApp() {
  const toast = useToast()

  const [isUnlocked, setIsUnlocked] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [hasVault, setHasVault] = useState(false)

  const [vaultKey, setVaultKey] = useState<CryptoKey | null>(null)
  const [vaultFiles, setVaultFiles] = useState<VaultFile[]>([])
  const [folders, setFolders] = useState<VaultFolder[]>([])
  const [decryptedUrls, setDecryptedUrls] = useState<Record<string, string>>({})
  const [decryptedThumbs, setDecryptedThumbs] = useState<Record<string, string>>({})

  const [faceIdSupported, setFaceIdSupported] = useState(false)
  const [faceIdEnabled, setFaceIdEnabled] = useState(false)

  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [sortBy, setSortBy] = useState('date-desc')
  const [gridCols, setGridCols] = useState(4)
  const [activeMedia, setActiveMedia] = useState<VaultFile | null>(null)

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [dialog, setDialog] = useState<{ kind: 'create' | 'rename' | 'delete' } | null>(null)
  const [deletePreview, setDeletePreview] = useState<{ folderIds: Set<string>; fileCount: number } | null>(null)

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
      revokeUrls(urlsRef.current)
      revokeUrls(thumbsRef.current)
    }
  }, [])

  const urlsRef = useRef(decryptedUrls)
  urlsRef.current = decryptedUrls
  const thumbsRef = useRef(decryptedThumbs)
  thumbsRef.current = decryptedThumbs

  async function finishUnlock(key: CryptoKey) {
    setBusy('Lettura del vault in corso…')
    const files = await db.files.toArray()
    const folderList = await db.folders.toArray()
    const newUrls: Record<string, string> = {}
    const newThumbs: Record<string, string> = {}

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      setBusy(`Decifratura dei file… ${i + 1}/${files.length}`)
      try {
        const plain = await decryptBuffer(file.encryptedData, key)
        newUrls[file.id] = URL.createObjectURL(
          new Blob([plain], { type: file.mimeType || 'application/octet-stream' })
        )
        if (file.thumbnailData) {
          const thumb = await decryptBuffer(file.thumbnailData, key)
          newThumbs[file.id] = URL.createObjectURL(new Blob([thumb], { type: 'image/jpeg' }))
        }
      } catch (err) {
        console.error('Decifratura fallita per', file.name, err)
        toast.show(`Impossibile decifrare: ${file.name}`)
      }
    }

    setVaultKey(key)
    setVaultFiles(files)
    setFolders(folderList)
    setDecryptedUrls(newUrls)
    setDecryptedThumbs(newThumbs)
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
    revokeUrls(decryptedThumbs)
    setDecryptedUrls({})
    setDecryptedThumbs({})
    setVaultFiles([])
    setFolders([])
    setVaultKey(null)
    setIsUnlocked(false)
    setActiveMedia(null)
    setCurrentFolderId(null)
    setDialog(null)
    setDeletePreview(null)
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

    const isDir = !!(e.target as HTMLInputElement).webkitdirectory
    setBusy(isDir ? 'Cifratura della cartella in corso…' : 'Cifratura dei file in corso…')
    try {
      const newFiles: VaultFile[] = []
      const newFolders: VaultFolder[] = []
      const newUrls = { ...decryptedUrls }
      const newThumbs = { ...decryptedThumbs }
      const created = new Map<string, VaultFolder>()
      const prefix = buildFolderPath(folders, currentFolderId)

      const findOrCreate = async (parentId: string | null, name: string): Promise<VaultFolder> => {
        const key = folderKey(parentId, name)
        const known = created.get(key)
        if (known) return known
        const existing = folders.find(f => f.parentId === parentId && f.name === name)
        if (existing) {
          created.set(key, existing)
          return existing
        }
        const folder: VaultFolder = { id: newId(), name, parentId, createdAt: Date.now() }
        await db.folders.add(folder)
        created.set(key, folder)
        newFolders.push(folder)
        return folder
      }

      for (const file of uploadedFiles) {
        let folderId: string | null = currentFolderId
        let path: string

        if (isDir) {
          const dirs = segmentsOf(file.webkitRelativePath).slice(0, -1)
          let cur = currentFolderId
          for (const dir of dirs) cur = (await findOrCreate(cur, dir)).id
          folderId = cur
          path = prefix ? `${prefix}/${file.webkitRelativePath}` : file.webkitRelativePath
        } else {
          path = prefix ? `${prefix}/${file.name}` : file.name
        }

        const arrayBuffer = await file.arrayBuffer()
        const encryptedData = await encryptBuffer(arrayBuffer, vaultKey)
        const id = newId()
        const kind = getFileType(file.name)

        const newFile: VaultFile = {
          id,
          name: file.name,
          size: file.size,
          type: kind,
          mimeType: file.type,
          path,
          folderId,
          createdAt: Date.now(),
          encryptedData
        }

        if (kind === 'video') {
          setBusy(`Generazione anteprima: ${file.name}`)
          const thumb = await captureVideoThumbnail(file)
          if (thumb) {
            newFile.thumbnailData = await encryptBuffer(await thumb.arrayBuffer(), vaultKey)
            newThumbs[id] = URL.createObjectURL(thumb)
          }
          setBusy(isDir ? 'Cifratura della cartella in corso…' : 'Cifratura dei file in corso…')
        }

        await db.files.add(newFile)
        newFiles.push(newFile)
        newUrls[id] = URL.createObjectURL(new Blob([arrayBuffer], { type: file.type }))
      }

      if (newFolders.length) setFolders(prev => [...prev, ...newFolders])
      setVaultFiles(prev => [...prev, ...newFiles])
      setDecryptedUrls(newUrls)
      setDecryptedThumbs(newThumbs)
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
      setDecryptedThumbs(prev => {
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

  const currentFolder = currentFolderId ? folders.find(f => f.id === currentFolderId) ?? null : null
  const isSubfolder = !!currentFolder

  function handleOpenFolder(id: string) {
    setActiveMedia(null)
    setCurrentFolderId(id)
    setSearchQuery('')
  }

  function handleBackFolder() {
    setActiveMedia(null)
    setCurrentFolderId(currentFolder?.parentId ?? null)
    setSearchQuery('')
  }

  async function handleCreateFolder(name: string) {
    const folder: VaultFolder = { id: newId(), name, parentId: currentFolderId, createdAt: Date.now() }
    await db.folders.add(folder)
    setFolders(prev => [...prev, folder])
    setDialog(null)
    toast.show('Cartella creata')
  }

  async function handleRenameFolder(name: string) {
    if (!currentFolder || !name.trim() || name === currentFolder.name) {
      setDialog(null)
      return
    }
    try {
      await db.folders.update(currentFolder.id, { name })
      setFolders(prev => prev.map(f => (f.id === currentFolder.id ? { ...f, name } : f)))
      toast.show('Cartella rinominata')
    } catch (err) {
      console.error(err)
      toast.show('Errore durante la rinomina.')
    }
    setDialog(null)
  }

  function openDeleteDialog() {
    if (!currentFolder) return
    const folderIds = collectFolderIds(folders, currentFolder)
    const fileCount = vaultFiles.filter(f => f.folderId && folderIds.has(f.folderId)).length
    setDeletePreview({ folderIds, fileCount })
    setDialog({ kind: 'delete' })
  }

  async function handleDeleteFolder() {
    const folder = currentFolder
    const preview = deletePreview
    if (!folder || !preview) {
      setDialog(null)
      return
    }
    try {
      const fileIds = vaultFiles
        .filter(f => f.folderId && preview.folderIds.has(f.folderId))
        .map(f => f.id)
      await db.files.bulkDelete(fileIds)
      await db.folders.bulkDelete([...preview.folderIds])
      setVaultFiles(prev => prev.filter(f => !f.folderId || !preview.folderIds.has(f.folderId)))
      setFolders(prev => prev.filter(f => !preview.folderIds.has(f.id)))
      setDecryptedUrls(prev => {
        const next = { ...prev }
        for (const id of fileIds) {
          if (next[id]) {
            URL.revokeObjectURL(next[id])
            delete next[id]
          }
        }
        return next
      })
      setDecryptedThumbs(prev => {
        const next = { ...prev }
        for (const id of fileIds) {
          if (next[id]) {
            URL.revokeObjectURL(next[id])
            delete next[id]
          }
        }
        return next
      })
      setActiveMedia(null)
      setCurrentFolderId(folder.parentId)
      toast.show(`Cartella "${folder.name}" eliminata`)
    } catch (err) {
      console.error(err)
      toast.show('Errore durante l\'eliminazione.')
    }
    setDialog(null)
    setDeletePreview(null)
  }

  function handleDialogConfirm(value?: string) {
    if (!dialog) return
    if (dialog.kind === 'delete') {
      void handleDeleteFolder()
    } else if (value) {
      if (dialog.kind === 'create') void handleCreateFolder(value)
      else void handleRenameFolder(value)
    }
  }

  const visibleFolders = useMemo(() => {
    const q = searchQuery.toLowerCase()
    return folders
      .filter(f => f.parentId === currentFolderId && f.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [folders, currentFolderId, searchQuery])

  const processedFiles = useMemo(() => {
    const q = searchQuery.toLowerCase()
    return vaultFiles
      .filter(file => (file.folderId ?? null) === currentFolderId)
      .filter(file => file.name.toLowerCase().includes(q))
      .filter(file => typeFilter === 'all' || file.type === typeFilter)
      .sort((a, b) => {
        if (sortBy === 'name-asc') return a.name.localeCompare(b.name)
        if (sortBy === 'name-desc') return b.name.localeCompare(a.name)
        if (sortBy === 'size-asc') return a.size - b.size
        if (sortBy === 'size-desc') return b.size - a.size
        if (sortBy === 'date-asc') return a.createdAt - b.createdAt
        return b.createdAt - a.createdAt
      })
  }, [vaultFiles, currentFolderId, searchQuery, typeFilter, sortBy])

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
        {isSubfolder ? (
          <div className='header-sub'>
            <button className='btn glass sm circle sc' type='button' onClick={handleBackFolder} title='Indietro'>
              <ArrowLeftIcon size={20} weight='regular' />
            </button>
            <h2 className='header-title intel header-folder-title'>{currentFolder.name}</h2>
          </div>
        ) : (
          <>
            <div className='header-div'>
              <ShieldCheckIcon className='header-logo' size={32} weight='regular' />
              <h2 className='header-title intel'>Vault</h2>
              <span className='header-badge intel'>AES-256</span>
            </div>
            <div className='header-actions' style={{marginLeft:'auto'}}>
              {isSubfolder && (
                <>
                  <button
                    className='btn glass sm circle sc'
                    type='button'
                    onClick={() => setDialog({ kind: 'rename' })}
                    title='Rinomina cartella'
                  >
                    <PencilSimpleIcon size={18} weight='regular' />
                  </button>
                  <button
                    className='btn glass sm circle sc'
                    type='button'
                    onClick={openDeleteDialog}
                    title='Elimina cartella'
                  >
                    <TrashSimpleIcon size={18} weight='regular' />
                  </button>
                </>
              )}
              {faceIdSupported && (
                <button
                  className={`btn ${faceIdEnabled ? 'accent' : 'glass'} sm circle sc`}
                  type='button'
                  onClick={handleToggleFaceId}
                  title={faceIdEnabled ? 'Disattiva Face ID' : 'Attiva Face ID'}
                >
                  <FingerprintIcon size={20} weight='regular' />
                </button>
              )}
              <button className='btn danger md sc' type='button' onClick={handleLock}>
                Chiudi
              </button>
            </div>
          </>
        )}
        
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
          onNewFolder={() => setDialog({ kind: 'create' })}
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
            thumbs={decryptedThumbs}
            folders={visibleFolders}
            gridCols={gridCols}
            emptyTitle={isSubfolder ? 'Cartella vuota' : 'Vault vuoto'}
            emptyHint={isSubfolder ? 'Usa File o Cartella per aggiungere elementi.' : 'Carica foto o video per popolare la griglia.'}
            onOpen={setActiveMedia}
            onOpenFolder={handleOpenFolder}
          />
        </section>
      </main>

      {activeMedia && (
        <Lightbox
          file={activeMedia}
          url={decryptedUrls[activeMedia.id]}
          files={processedFiles}
          onNavigate={setActiveMedia}
          onClose={() => setActiveMedia(null)}
          onDelete={handleDelete}
        />
      )}

      {dialog && (
        <FolderDialog
          kind={dialog.kind}
          folderName={currentFolder?.name}
          fileCount={deletePreview?.fileCount}
          onConfirm={handleDialogConfirm}
          onCancel={() => {
            setDialog(null)
            setDeletePreview(null)
          }}
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