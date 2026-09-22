import { useEffect, useRef, useState, type TouchEvent as ReactTouchEvent } from 'react'
import { XIcon, DownloadIcon, FileIcon, TrashSimpleIcon } from '@phosphor-icons/react'
import type { VaultFile } from '../lib/types'

interface LightboxProps {
  file: VaultFile
  url: string | undefined
  files: VaultFile[]
  onNavigate: (file: VaultFile) => void
  onClose: () => void
  onDelete: (file: VaultFile) => void
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${bytes} B`
}

const SWIPE_THRESHOLD = 70
const SWIPE_CLOSE = 80
const DOUBLE_TAP_MS = 300

export default function Lightbox({ file, url, files, onNavigate, onClose, onDelete }: LightboxProps) {
  const [chrome, setChrome] = useState(false)
  const touchStart = useRef<{ x: number; y: number; target: HTMLElement } | null>(null)
  const suppressClick = useRef(false)
  const lastVideoTap = useRef<number | null>(null)
  const suppressVideoTap = useRef(false)

  useEffect(() => {
    setChrome(false)
  }, [file.id])

  function navigate(delta: number) {
    const index = files.findIndex(f => f.id === file.id)
    const next = index === -1 ? null : files[index + delta]
    if (next) onNavigate(next)
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') navigate(-1)
      if (e.key === 'ArrowRight') navigate(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  function handleTouchStart(e: ReactTouchEvent) {
    const t = e.touches[0]
    touchStart.current = { x: t.clientX, y: t.clientY, target: e.target as HTMLElement }
  }

  function handleTouchEnd(e: ReactTouchEvent) {
    const start = touchStart.current
    touchStart.current = null
    if (!start) return
    const t = e.changedTouches[0]
    const dx = t.clientX - start.x
    const dy = t.clientY - start.y

    if (dy >= SWIPE_CLOSE && Math.abs(dy) > Math.abs(dx) * 1.5) {
      onClose()
      return
    }

    const onVideo = !!start.target.closest('video')

    if (Math.abs(dx) >= SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy) * 1.5) {
      navigate(dx < 0 ? 1 : -1)
    } else if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
      if (onVideo) {
        const now = Date.now()
        if (lastVideoTap.current !== null && now - lastVideoTap.current <= DOUBLE_TAP_MS) {
          lastVideoTap.current = null
          setChrome(c => !c)
          suppressVideoTap.current = true
        } else {
          lastVideoTap.current = now
        }
      } else if (!start.target.closest('button, a')) {
        setChrome(c => !c)
        suppressClick.current = true
      }
    }
  }

  function handleRootClick() {
    if (suppressClick.current) {
      suppressClick.current = false
      return
    }
    setChrome(c => !c)
  }

  return (
    <div
      className={`lightbox${chrome ? ' chrome' : ''}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={handleRootClick}
    >
      <div className='lightbox-top' onClick={e => e.stopPropagation()}>
        <button className='btn glass circle sc' type='button' onClick={onClose} title='Chiudi (Esc)'>
          <XIcon size={24} weight='regular' />
        </button>
      </div>

      <div className='lightbox-body'>
        {file.type === 'image' && url ? (
          <img src={url} alt={file.name} draggable={false} />
        ) : file.type === 'video' && url ? (
          <video
            src={url}
            controls
            autoPlay
            playsInline
            onClick={e => {
              if (suppressVideoTap.current) {
                e.preventDefault()
                suppressVideoTap.current = false
              }
              e.stopPropagation()
            }}
          />
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