import type { ChangeEvent } from 'react'
import {
  UploadSimpleIcon,
  FolderPlusIcon,
  MagnifyingGlassIcon,
  FingerprintIcon,
  LockIcon
} from '@phosphor-icons/react'

interface ToolbarProps {
  searchQuery: string
  onSearch: (value: string) => void
  typeFilter: string
  onTypeFilter: (value: string) => void
  sortBy: string
  onSortBy: (value: string) => void
  gridCols: number
  onGridCols: (value: number) => void
  onUploadFiles: (e: ChangeEvent<HTMLInputElement>) => void
  onUploadFolder: (e: ChangeEvent<HTMLInputElement>) => void
  faceIdSupported: boolean
  faceIdEnabled: boolean
  onToggleFaceId: () => void
  onLock: () => void
}

export default function Toolbar({
  searchQuery,
  onSearch,
  typeFilter,
  onTypeFilter,
  sortBy,
  onSortBy,
  gridCols,
  onGridCols,
  onUploadFiles,
  onUploadFolder,
  faceIdSupported,
  faceIdEnabled,
  onToggleFaceId,
  onLock
}: ToolbarProps) {
  return (
    <div className='vault-toolbar'>
      <div className='vault-toolbar-row'>
        <label className='btn accent md sc vault-upload'>
          <UploadSimpleIcon size={20} weight='regular' />
          <span>Aggiungi File</span>
          <input
            type='file'
            multiple
            onChange={onUploadFiles}
          />
        </label>

        <label className='btn glass md sc vault-upload'>
          <FolderPlusIcon size={20} weight='regular' />
          <span>Cartella</span>
          <input
            type='file'
            multiple
            onChange={onUploadFolder}
            {...({ webkitdirectory: '', directory: '' } as Record<string, string>)}
          />
        </label>
      </div>

      <div className='vault-toolbar-row vault-toolbar-controls'>
        <div className='page-input vault-search'>
          <MagnifyingGlassIcon size={20} weight='regular' />
          <input
            className='search'
            type='text'
            placeholder='Cerca file...'
            value={searchQuery}
            onChange={e => onSearch(e.target.value)}
          />
        </div>

        <select
          className='vault-select'
          value={typeFilter}
          onChange={e => onTypeFilter(e.target.value)}
          aria-label='Filtra per tipo'
        >
          <option value='all'>Tutti i Tipi</option>
          <option value='image'>Solo Foto</option>
          <option value='video'>Solo Video</option>
          <option value='document'>Documenti</option>
          <option value='other'>Altri</option>
        </select>

        <select
          className='vault-select'
          value={sortBy}
          onChange={e => onSortBy(e.target.value)}
          aria-label='Ordina'
        >
          <option value='date-desc'>Più Recenti</option>
          <option value='date-asc'>Meno Recenti</option>
          <option value='name-asc'>Nome (A-Z)</option>
          <option value='name-desc'>Nome (Z-A)</option>
          <option value='size-desc'>Dimensione (Grandi)</option>
          <option value='size-asc'>Dimensione (Piccoli)</option>
        </select>

        <div className='cols-picker'>
          {[2, 3, 4, 6].map(cols => (
            <button
              key={cols}
              className={`cols-picker-btn intel${gridCols === cols ? ' active' : ''}`}
              type='button'
              onClick={() => onGridCols(cols)}
            >
              {cols}
            </button>
          ))}
        </div>

        {faceIdSupported && (
          <button
            className={`btn ${faceIdEnabled ? 'accent' : 'glass'} md sc`}
            type='button'
            onClick={onToggleFaceId}
            title={faceIdEnabled ? 'Disattiva Face ID' : 'Attiva Face ID'}
          >
            <FingerprintIcon size={20} weight='regular' />
          </button>
        )}

        <button className='btn danger md sc' type='button' onClick={onLock}>
          <LockIcon size={20} weight='regular' />
          <span>Chiudi Vault</span>
        </button>
      </div>
    </div>
  )
}
