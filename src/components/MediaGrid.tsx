import { FileIcon, FileTextIcon, FileVideoIcon, ImagesIcon, FolderIcon, VideoCameraIcon } from '@phosphor-icons/react'
import type { VaultFile, VaultFolder } from '../lib/types'

interface MediaGridProps {
  files: VaultFile[]
  urls: Record<string, string>
  thumbs: Record<string, string>
  folders: VaultFolder[]
  gridCols: number
  emptyTitle: string
  emptyHint: string
  onOpen: (file: VaultFile) => void
  onOpenFolder: (folderId: string) => void
}

export default function MediaGrid({
  files,
  urls,
  thumbs,
  folders,
  gridCols,
  emptyTitle,
  emptyHint,
  onOpen,
  onOpenFolder
}: MediaGridProps) {
  if (files.length === 0 && folders.length === 0) {
    return (
      <div className='page empty'>
        <ImagesIcon size={64} weight='thin' />
        <p className='title-empty-page intel'>{emptyTitle}</p>
        <p className='p-empty-page intel'>{emptyHint}</p>
      </div>
    )
  }

  return (
    <div className='vault-media'>
      {folders.length > 0 && (
        <div className='vault-folders'>
          {folders.map(folder => (
            <button
              key={folder.id}
              type='button'
              className='vault-folder'
              onClick={() => onOpenFolder(folder.id)}
              title={folder.name}
            >
              <FolderIcon size={30} weight='regular' className='vault-folder-icon' />
              <span className='vault-folder-name'>{folder.name}</span>
            </button>
          ))}
        </div>
      )}

      {files.length > 0 && (
        <div className={`vault-grid cols-${gridCols}`}>
          {files.map(file => {
            const mediaUrl = urls[file.id]
            const thumbUrl = thumbs[file.id]
            const isVideo = file.type === 'video'

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
                  <img src={mediaUrl} alt={file.name} draggable={false} />
                ) : isVideo && (thumbUrl || mediaUrl) ? (
                  <>
                    {thumbUrl ? (
                      <img src={thumbUrl} alt={file.name} draggable={false} />
                    ) : (
                      <video src={mediaUrl} muted playsInline preload='auto' />
                    )}
                    <div className='vault-video-badge'>
                      <VideoCameraIcon size={16} weight='fill' />
                    </div>
                  </>
                ) : (
                  <div className='vault-tile-fallback'>
                    {file.type === 'document' ? (
                      <FileTextIcon size={40} weight='thin' />
                    ) : isVideo ? (
                      <>
                        <FileVideoIcon size={40} weight='thin' />
                        <div className='vault-video-badge'>
                          <VideoCameraIcon size={16} weight='fill' />
                        </div>
                      </>
                    ) : (
                      <FileIcon size={40} weight='thin' />
                    )}
                    <span className='intel'>
                      {file.name.split('.').pop()?.toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}