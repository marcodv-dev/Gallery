import { useState, type FormEvent } from 'react'
import { XIcon } from '@phosphor-icons/react'

interface FolderDialogProps {
  kind: 'create' | 'rename' | 'delete'
  folderName?: string
  fileCount?: number
  onConfirm: (value?: string) => void
  onCancel: () => void
}

export default function FolderDialog({ kind, folderName, fileCount, onConfirm, onCancel }: FolderDialogProps) {
  const [value, setValue] = useState(kind === 'rename' ? folderName ?? '' : '')
  const isInput = kind !== 'delete'

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (value.trim()) onConfirm(value.trim())
  }

  return (
    <div className='fmodal' onClick={onCancel}>
      <div className='fmodal-card' onClick={e => e.stopPropagation()}>
        <div className='fmodal-head'>
          <h3 className='intel'>
            {kind === 'create' ? 'Nuova cartella' : kind === 'rename' ? 'Rinomina cartella' : 'Elimina cartella'}
          </h3>
          <button className='btn glass sm circle sc' type='button' onClick={onCancel} title='Annulla'>
            <XIcon size={18} weight='regular' />
          </button>
        </div>

        {isInput ? (
          <form onSubmit={handleSubmit}>
            <input
              className='search fmodal-input'
              autoFocus
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder='Nome cartella'
            />
            <div className='fmodal-actions'>
              <button type='button' className='btn glass md sc' onClick={onCancel}>
                Annulla
              </button>
              <button type='submit' className='btn accent md sc' disabled={!value.trim()}>
                Conferma
              </button>
            </div>
          </form>
        ) : (
          <>
            <p className='fmodal-text'>
              Eliminare la cartella <b>"{folderName}"</b> e i {fileCount ?? 0} elementi al suo interno?
            </p>
            <div className='fmodal-actions'>
              <button className='btn glass md sc' type='button' onClick={onCancel}>
                Annulla
              </button>
              <button className='btn danger md sc' type='button' onClick={() => onConfirm()}>
                Elimina
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}