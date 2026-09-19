import { useEffect, useState } from 'react'
import { db } from '../db'
import type { Ingredient } from '../lib/types'
import { motion } from 'framer-motion'
import { useSave } from '../context/SaveContext'

export default function Spesa() {
  const [items, setItems] = useState<Ingredient[]>([])
  const [selected, setSelected] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('spesa-selected')
    return saved ? new Set(JSON.parse(saved)) : new Set()
  })
  const { registerSave } = useSave()

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    localStorage.setItem('spesa-selected', JSON.stringify([...selected]))
  }, [selected])

  async function load() {
    const all = await db.ingredients.toArray()
    setItems(all.filter(i => !i.inCasa))
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAll() {
    setSelected(new Set(items.map(i => i.id)))
  }

  function deselectAll() {
    setSelected(new Set())
  }

  async function save() {
    for (const id of selected) {
      await db.ingredients.update(id, { inCasa: true, esauritoDa: null })
    }
    setSelected(new Set())
    localStorage.removeItem('spesa-selected')
    load()
  }

  useEffect(() => { registerSave(save) })

  return (
    <motion.section 
      className='page'
      style={{paddingBottom:100}}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 1 }}
      transition={{ duration: 0.2, ease: 'easeIn' }}
    >

      {items.length === 0 ? (
        <div style={{paddingTop:120,display:'flex',flexDirection:'column',gap:20,alignItems:'center'}}>
          <p className='page-title intel'>Niente da comprare</p>
        </div>
      ) : (
        <>
          <div className='page-section'>
            <div style={{display:'flex',gap:10}}>
              <button className='btn sm sc glass' style={{flex:1}} type="button" onClick={selectAll}>Seleziona tutto</button>
              <button className='btn sm sc glass' style={{flex:1}} type="button" onClick={deselectAll}>Annulla selezione</button>
            </div>
          </div>
          <div className='page-section' style={{flexDirection:'row'}}>
            <label className='page-title intel' style={{color: selected.size > 0 ? '#0088ff' : undefined}} htmlFor="">{selected.size} selezionati</label>
            <label className='page-title intel' style={{marginLeft:'auto'}} htmlFor="">Totali: {items.length}</label>
          </div>
          <div className='page-section grid'>
            {items.map(item => (
              <div className={`card glass spesa ${selected.has(item.id) ? 'selected' : null}`} key={item.id} onClick={() => toggleSelect(item.id)}>
                <label className='card-title intel'>{item.name}</label>
                <label className='card-subtitle accent' style={{height:10}}>{selected.has(item.id)&&'Selezionato'}</label>
              </div>
            ))}
          </div>
        </>
      )}
    </motion.section>
  )
}
