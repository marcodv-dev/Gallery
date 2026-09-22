import type { ChangeEvent } from 'react'
import { FilePlusIcon, FolderPlusIcon, FolderNotchPlusIcon, MagnifyingGlassIcon } from '@phosphor-icons/react'

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
  onNewFolder: () => void
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
  onNewFolder
}: ToolbarProps) {
  return (
    <div className='vault-toolbar'>
      <div className='vault-toolbar-row'>
        <label className='btn accent md sc vault-upload'>
          <FilePlusIcon size={20} weight='regular' />
          <span>File</span>
          <input
            type='file'
            multiple
            onChange={onUploadFiles}
          />
        </label>

        <label className='btn accent md sc vault-upload'>
          <FolderPlusIcon size={20} weight='regular' />
          <span>Cartella</span>
          <input
            type='file'
            multiple
            onChange={onUploadFolder}
            {...({ webkitdirectory: '', directory: '' } as Record<string, string>)}
          />
        </label>

        <button className='btn glass sm sc circle' type='button' onClick={onNewFolder} title='Nuova cartella'>
          <FolderNotchPlusIcon size={20} weight='regular' />
        </button>
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
          style={{flex:0.35}}
          value={typeFilter}
          onChange={e => onTypeFilter(e.target.value)}
          aria-label='Filtra per tipo'
        >
          <option value='all'>Tutti</option>
          <option value='image'>Foto</option>
          <option value='video'>Video</option>
          <option value='document'>Documenti</option>
          <option value='other'>Altri</option>
        </select>
      
      </div>
      <div className='vault-toolbar-row vault-toolbar-controls'>

        <div className='vault-select'>
          <select
            
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
        </div>

        <div className='cols-picker'>
          {[2, 3, 4, 6].map(cols => (
            <button
              key={cols}
              className={`cols-picker-btn ${gridCols === cols ? ' active' : ''}`}
              type='button'
              onClick={() => onGridCols(cols)}
            >
              {cols}
            </button>
          ))}
        </div>
      
      </div>
    </div>
  )
}
