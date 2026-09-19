import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../db'
import type { MealTemplate, Occurrence, Ingredient, MealTipo } from '../lib/types'
import { getNextMeals, expandOccurrences, todayStr } from '../lib/nextMeal'
import { isFinitoForMeal } from '../lib/stock'
import { AnimatePresence, motion } from 'framer-motion'
import { CaretDoubleDownIcon } from "@phosphor-icons/react";

function tipoLabel(tipo: MealTipo): string {
  if (tipo === 'merenda1' || tipo === 'merenda2') return 'MERENDA'
  return tipo.toUpperCase()
}

export default function Oggi() {
  const navigate = useNavigate()
  const [templates, setTemplates] = useState<MealTemplate[]>([])
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [loaded, setLoaded] = useState(false)
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set())
  const today = todayStr()

  useEffect(() => {
    async function load() {
      const t = await db.mealTemplates.toArray()
      const i = await db.ingredients.toArray()
      const done = await db.occurrences.where('status').equals('done').toArray()
      setTemplates(t)
      setIngredients(i)
      setCompletedIds(new Set(done.map(o => o.id)))
      setLoaded(true)
    }
    load()
  }, [])

  const { next, laterToday } = getNextMeals(templates, completedIds)
  const allExpanded = expandOccurrences(templates)
  const todayOccurrences = allExpanded.filter(o => o.date === today)
  const completedToday = todayOccurrences.filter(o => completedIds.has(o.id) || o.status === 'done')
  const nextTemplate = next ? templates.find(t => t.id === next.id.replace(/_\d{4}-\d{2}-\d{2}$/, '')) : null

  if (loaded && templates.length === 0) {
    return (
      <motion.section 
        className='page empty'
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 1 }}
        transition={{ duration: 0.2, ease: 'easeIn' }}
      >
        <div style={{display:'flex',flexDirection:'column',width:'50%',color:'#F3F0E7'}}>
          <img src="/logo-cicardia.svg" alt="" />
          <label className='title-empty-page'>cicardia</label>
        </div>
        <p className='p-empty-page intel'>Nessun pasto in programma</p>
        <p className='p-empty-page intel'>Crea la tua dieta</p>
        <CaretDoubleDownIcon className='goDietaArrow' size={60} weight="regular" />
      </motion.section>
    )
  }

  if (!next && laterToday.length === 0) {
    return (
      <motion.section 
        className='page empty'
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 1 }}
        transition={{ duration: 0.2, ease: 'easeIn' }}
      >
        {todayOccurrences.length==0&&<p className='page-title intel'>Nessun pasto oggi</p>}
        {todayOccurrences.length!=0&&<><p className='page-title intel'>Pasti finiti</p>
        <p className='page-title intel'>Completati oggi {completedToday.length}/{todayOccurrences.length}</p></>}
      </motion.section>
    )
  }

  return (
    <motion.section 
      className='page today'
      style={{paddingBottom:100}}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 1 }}
      transition={{ duration: 0.2, ease: 'easeIn' }}
    >
      {next && (
        <div className='page-section'>
          <h3 className='page-title intel'>Corrente</h3>
          <AnimatePresence mode="wait">
            <div 
              className='card glass'
              key={next.id}
              onClick={() => navigate(`/pasti/${next.id.replace(/_\d{4}-\d{2}-\d{2}$/, '')}`)}
            >
              <h4 className='card-title intel'>{nextTemplate?.title || next.tipo}</h4>
              <label className='card-subtitle intel' htmlFor="" style={{marginBottom:10}}>{tipoLabel(next.tipo)}</label>
              {nextTemplate && nextTemplate.ingredientIds
                .map(iid => {
                  const ing = ingredients.find(i => i.id === iid)
                  if (!ing) return null
                  const finito = isFinitoForMeal(ing.inCasa, ing.esauritoDa, next.date, next.tipo)
                  return (
                    <div className={`page-alimento ${finito?'finito':null}`} key={iid}>
                      <label className='page-alimento-title' htmlFor="">{ing.name}</label>
                      <button className={`btn glass md sc alim ${finito?'finito':null}`} onClick={(e) => {
                        e.stopPropagation()
                        handleToggle(ing.id, next)
                      }}>
                        {!finito && <span>Presente</span>}
                        {finito && <span>Finito</span>}
                      </button>
                    </div>
                  )
                })
              }
              <button className='btn accent lg sc' style={{width:'100%',marginTop:20}} type="button" onClick={(e) => {
                        e.stopPropagation()
                        handleComplete(next)
                      }}>
                Completato
              </button>
            </div>
          </AnimatePresence>
        </div>
      )}

      {laterToday.length > 0 && (
        <div className='page-section'>
          <h3 className='page-title intel'>Prossimo</h3>
          {laterToday.map(o => {
            const tpl = templates.find(t => t.id === o.id.replace(/_\d{4}-\d{2}-\d{2}$/, ''))
            return (
              <div className='card glass' key={o.id} onClick={() => navigate(`/pasti/${o.id.replace(/_\d{4}-\d{2}-\d{2}$/, '')}`)}>
                <h2 className='card-title intel'>{tpl?.title || o.tipo}</h2>
                <span className='card-subtitle intel'>{tipoLabel(o.tipo)}</span>
              </div>
            )
          })}
        </div>
      )}
    </motion.section>
  )

  async function handleToggle(ingredientId: string, occurrence: Occurrence) {
    const ing = await db.ingredients.get(ingredientId)
    if (!ing) return

    if (ing.inCasa) {
      await db.ingredients.update(ingredientId, {
        inCasa: false,
        esauritoDa: { date: occurrence.date, tipo: occurrence.tipo, occurrenceId: occurrence.id },
      })
    } else {
      await db.ingredients.update(ingredientId, {
        inCasa: true,
        esauritoDa: null,
      })
    }

    const updated = await db.ingredients.toArray()
    setIngredients(updated)
  }

  async function handleComplete(occurrence: Occurrence) {
    await db.occurrences.put({ ...occurrence, status: 'done' })
    setCompletedIds(prev => new Set([...prev, occurrence.id]))
  }
}
