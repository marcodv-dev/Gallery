import { useEffect } from 'react'
import { XIcon, DownloadIcon, FileIcon, TrashSimpleIcon } from '@phosphor-icons/react'
import type { VaultFile } from '../lib/types'

interface LightboxProps {
  file: VaultFile
  url: string | undefined
  onClose: () => void
  onDelete: (file: VaultFile) => void
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${bytes} B`
}

export default function Lightbox({ file, url, onClose, onDelete }: LightboxProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className='lightbox' onClick={onClose}>
      <div className='lightbox-top'>
        <button className='btn glass circle sc' type='button' onClick={onClose} title='Chiudi (Esc)'>
          <XIcon size={24} weight='regular' />
        </button>
      </div>

      <div className='lightbox-body' onClick={e => e.stopPropagation()}>
        {file.type === 'image' && url ? (
          <img src={url} alt={file.name} draggable={false} />
        ) : file.type === 'video' && url ? (
          <video src={url} controls autoPlay playsInline />
        ) : (
          <div className='lightbox-fallback'>
            <FileIcon size={56} weight='thin' />
            <p className='lightbox-fallback-name'>{file.name}</p>
            <p className='p-empty-page'>Anteprima non disponibile per questo formato.</p>
            {url && (
              <a className='btn accent md sc' href={url} download={file.name}>
                <DownloadIcon size={20} weight='regular' />
                <span>Scarica</span>
              </a>
            )}
          </div>
        )}
      </div>

      <div className='lightbox-info' onClick={e => e.stopPropagation()}>
        <div className='lightbox-info-text'>
          <p className='lightbox-info-name'>{file.name}</p>
          <p className='lightbox-info-meta intel'>
            {formatSize(file.size)} • {file.path}
          </p>
        </div>

        <div className='lightbox-info-actions'>
          <button
            className='btn danger md sc'
            type='button'
            onClick={() => onDelete(file)}
            title='Elimina dal vault'
          >
            <TrashSimpleIcon size={20} weight='regular' />
          </button>
          {url && (
            <a className='btn accent md sc' href={url} download={file.name}>
              <DownloadIcon size={20} weight='regular' />
              <span>Scarica</span>
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
