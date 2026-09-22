import { FileIcon, FileTextIcon, ImagesIcon, ArrowsOutSimpleIcon } from '@phosphor-icons/react'
import type { VaultFile } from '../lib/types'

interface MediaGridProps {
  files: VaultFile[]
  urls: Record<string, string>
  gridCols: number
  onOpen: (file: VaultFile) => void
}

export default function MediaGrid({ files, urls, gridCols, onOpen }: MediaGridProps) {
  if (files.length === 0) {
    return (
      <div className='page empty'>
        <ImagesIcon size={64} weight='thin' />
        <p className='title-empty-page'>Vault vuoto</p>
        <p className='p-empty-page intel'>Carica foto o video per popolare la griglia.</p>
      </div>
    )
  }

  return (
    <div className={`vault-grid cols-${gridCols}`}>
      {files.map(file => {
        const mediaUrl = urls[file.id]

        return (
          <div
            key={file.id}
            className='vault-tile'
            onClick={() => onOpen(file)}
            role='button'
            tabIndex={0}
            onKeyDown={e => {
              if (e.key === 'Enter') onOpen(file)
            }}
          >
            {file.type === 'image' && mediaUrl ? (
              <img src={mediaUrl} alt={file.name} loading='lazy' draggable={false} />
            ) : file.type === 'video' && mediaUrl ? (
              <video src={mediaUrl} muted playsInline preload='metadata' />
            ) : (
              <div className='vault-tile-fallback'>
                {file.type === 'document' ? <FileTextIcon size={40} weight='thin' /> : <FileIcon size={40} weight='thin' />}
                <span className='intel'>
                  {file.name.split('.').pop()?.toUpperCase()}
                </span>
              </div>
            )}

            <div className='vault-tile-hover'>
              <ArrowsOutSimpleIcon size={28} weight='regular' />
            </div>
          </div>
        )
      })}
    </div>
  )
}
