import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { db } from '../db'
import type { Ingredient, MealTemplate } from '../lib/types'
import { CheckIcon, MagnifyingGlassIcon, XIcon } from '@phosphor-icons/react'
import { motion } from 'framer-motion'

type Filter = 'all' | 'casa' | 'finiti'

export default function Dispensa() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [affectedTemplates, setAffectedTemplates] = useState<MealTemplate[]>([])
  const [usedIds, setUsedIds] = useState<Set<string>>(new Set())
  const [onlyDieta, setOnlyDieta] = useState(false)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const templates = await db.mealTemplates.toArray()
    setUsedIds(new Set(templates.filter(t => t.attivo).flatMap(t => t.ingredientIds)))
    const all = await db.ingredients.toArray()
    setIngredients(all)
  }

  const filtered = ingredients
    .filter(i => {
      if (filter === 'casa') return i.inCasa
      if (filter === 'finiti') return !i.inCasa
      return true
    })
    .filter(i => !onlyDieta || usedIds.has(i.id))
    .filter(i => i.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name))

  async function toggleIngredient(id: string) {
    const ing = await db.ingredients.get(id)
    if (!ing) return
    await db.ingredients.update(id, {
      inCasa: !ing.inCasa,
      esauritoDa: ing.inCasa ? { date: new Date().toISOString().slice(0, 10), tipo: 'pranzo', occurrenceId: '' } : null,
    })
    load()
  }

  async function requestRemoveIngredient(id: string) {
    const templates = await db.mealTemplates.toArray()
    const affected = templates.filter(t =>
      t.ingredientIds.length === 1 && t.ingredientIds[0] === id
    )
    if (affected.length === 0) {
      await db.ingredients.delete(id)
      load()
      return
    }
    setAffectedTemplates(affected)
    setConfirmId(id)
  }

  async function removeIngredient(id: string) {
    for (const t of affectedTemplates) {
      await db.mealTemplates.delete(t.id)
    }
    await db.ingredients.delete(id)
    setConfirmId(null)
    setAffectedTemplates([])
    load()
  }

  return (
    <motion.section 
      className='page'
      style={{paddingBottom:100}}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 1 }}
      transition={{ duration: 0.2, ease: 'easeIn' }}
    >
      <div className='page-section'>
        <div className='page-input'>
          <MagnifyingGlassIcon size={20} weight="regular" />
          <input
            className='search'
            type="text"
            placeholder="Cerca alimenti..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div style={{display:'flex',gap:5,alignItems:'center'}}>
          <button className={`btn sm ${filter==='all'?'accent':'glass'}`} style={{flex:1}} type="button" onClick={() => setFilter('all')}>Tutti</button>
          <button className={`btn sm ${filter==='casa'?'accent':'glass'}`} style={{flex:1}} type="button" onClick={() => setFilter('casa')}>Presente</button>
          <button className={`btn sm ${filter==='finiti'?'accent':'glass'}`} style={{flex:1}} type="button" onClick={() => setFilter('finiti')}>Finiti</button>
          <button className={`btn sm ${onlyDieta?'accent':'glass'}`} style={{flex:1}} type="button" onClick={() => setOnlyDieta(!onlyDieta)}>Nella dieta</button>
        </div>
      </div>
      <div className='page-alimenti'>
        {filtered.map(i => (
          <div className={`page-alimento ${!i.inCasa ? 'finito' : null}`}  style={{justifyContent:'start',gap:5}} key={i.id}>
            <span className='page-alimento-title disp'>
              <span>{i.name}</span>
              {usedIds.has(i.id) && <CheckIcon style={{textTransform:'none',margin:'auto 0',fontSize:20}} className='' color='#22c55e' size={20} weight="regular"/>}</span>
            
            <button className={`btn glass md sc alim ${!i.inCasa ? 'finito' : null}`}  style={{marginLeft:'auto'}} type="button" onClick={() => toggleIngredient(i.id)}>
              {i.inCasa ? 'Presente' : 'Finito'}
            </button>
            <button className='btn glass sm circle alim' type="button" onClick={() => requestRemoveIngredient(i.id)}><XIcon className='' size={20} weight="regular"/></button>
          </div>
        ))}
      </div>
      {filtered.length === 0 && <p className='p-empty-page intel' style={{textAlign:'center'}}>Nessun alimento</p>}

      {confirmId && createPortal(
        <div className='modal-overlay' onClick={() => setConfirmId(null)}>
          <div className='modal' onClick={e => e.stopPropagation()}>
            <h3 className='card-title'>Conferma</h3>
            <p className='modal-text'>
              Eliminando questo alimento elimineresti anche questi pasti:
            </p>
            <p className='modal-text' style={{textTransform:'capitalize',fontWeight:600}}>
              {affectedTemplates.map(t => t.title || t.tipo).join(', ')}
            </p>
            <p className='modal-text'>Sei sicuro?</p>
            <div className='modal-actions'>
              <button className='btn glass md' type="button" onClick={() => setConfirmId(null)}>Annulla</button>
              <button className='btn accent md' type="button" onClick={() => removeIngredient(confirmId)}>Conferma</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </motion.section>
  )
}
