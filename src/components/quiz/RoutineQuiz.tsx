'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Loader2, Sparkles } from 'lucide-react'
import ProductGrid from '@/components/products/ProductGrid'
import type { Product } from '@/lib/types'
import { formatRWF } from '@/lib/format'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { getQuizStep, type QuizAnswers } from '@/lib/quiz-logic'
import IconButton from '@/components/a11y/IconButton'

interface RecommendedBundle {
  id: string
  name: string
  nameRw?: string | null
  slug: string
  bundlePrice: number
  normalTotal: number
  savings: number
  savingsPercent: number
  isInStock: boolean
  products: Array<{ id: string }>
}

interface Recommendations {
  products: Product[]
  bundles: RecommendedBundle[]
  sensitivityNotice?: boolean
}

const CACHE_TTL_MS = 10 * 60 * 1000
const SESSION_KEY = 'fcs_quiz_session'

function getSessionId() {
  try {
    const existing = sessionStorage.getItem(SESSION_KEY)
    if (existing) return existing
    const created = crypto.randomUUID()
    sessionStorage.setItem(SESSION_KEY, created)
    return created
  } catch {
    return undefined
  }
}

export default function RoutineQuiz() {
  const { t, language } = useLanguage()
  const [stepNumber, setStepNumber] = useState(1)
  const [answers, setAnswers] = useState<Partial<QuizAnswers>>({})
  const [phase, setPhase] = useState<'questions' | 'loading' | 'results'>('questions')
  const [recommendations, setRecommendations] = useState<Recommendations | null>(null)
  const [error, setError] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const step = useMemo(() => getQuizStep(stepNumber, answers), [answers, stepNumber])
  const progress = Math.round(((stepNumber - 1) / 6) * 100)

  useEffect(() => () => abortRef.current?.abort(), [])

  const fetchRecommendations = useCallback(async (completeAnswers: QuizAnswers) => {
    setPhase('loading')
    setError(false)
    const cacheKey = `fcs_quiz_recommendations_${language}_${JSON.stringify(completeAnswers)}`
    try {
      const cachedValue = sessionStorage.getItem(cacheKey)
      if (cachedValue) {
        const cached = JSON.parse(cachedValue) as { timestamp: number; data: Recommendations }
        if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
          setRecommendations(cached.data)
          setPhase('results')
          return
        }
        sessionStorage.removeItem(cacheKey)
      }
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      const response = await fetch('/api/quiz/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({ ...completeAnswers, language: language === 'rw' ? 'rw' : 'en', sessionId: getSessionId() }),
      })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error()
      const data = result.data as Recommendations
      setRecommendations(data)
      sessionStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data }))
      setPhase('results')
    } catch {
      setError(true)
      setPhase('results')
    }
  }, [language])

  const choose = (value: string) => {
    const next = { ...answers, [step.id]: value }
    setAnswers(next)
    if (stepNumber < 6) {
      setStepNumber((current) => current + 1)
      return
    }
    void fetchRecommendations(next as QuizAnswers)
  }

  const back = () => {
    if (stepNumber <= 1) return
    setStepNumber((current) => current - 1)
  }

  const restart = () => {
    setAnswers({})
    setStepNumber(1)
    setRecommendations(null)
    setError(false)
    setPhase('questions')
  }

  return (
    <main className="min-h-[calc(100dvh-4rem)] bg-gradient-to-b from-rose-50 to-white px-4 py-6">
      <div className="mx-auto max-w-2xl">
        {phase === 'questions' && <section aria-labelledby="quiz-question">
          <div className="mb-6 flex items-center gap-3">
            {stepNumber > 1 && <IconButton label={t('common.back')} icon={<ArrowLeft className="h-5 w-5" />} onClick={back} size="lg" className="bg-white shadow-sm" />}
            <div className="flex-1"><p className="mb-2 text-xs font-bold text-gray-500">{t('quiz.step', { step: stepNumber, total: 6 })}</p><div className="h-2 overflow-hidden rounded-full bg-gray-200"><div className="h-full rounded-full bg-[#B76E79] transition-[width] duration-300" style={{ width: `${progress}%` }} /></div></div>
          </div>
          <div className="mb-6"><span className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-[#B76E79] text-white"><Sparkles className="h-5 w-5" /></span><h1 id="quiz-question" className="text-2xl font-black text-gray-900 sm:text-3xl">{t(step.questionKey)}</h1>{step.subtitleKey && <p className="mt-2 text-sm leading-6 text-gray-500">{t(step.subtitleKey)}</p>}</div>
          <div className="space-y-3">{step.options.map((option) => <button key={option.value} type="button" onClick={() => choose(option.value)} className="flex min-h-[72px] w-full items-center gap-4 rounded-2xl border-2 border-gray-100 bg-white p-4 text-left shadow-sm transition-all hover:border-[#B76E79] active:scale-[0.98]"><span className="text-3xl" aria-hidden="true">{option.icon}</span><span className="flex-1 text-base font-bold text-gray-900">{t(option.labelKey)}</span><ArrowRight className="h-5 w-5 text-gray-300" /></button>)}</div>
        </section>}

        {phase === 'loading' && <section className="flex min-h-[60vh] flex-col items-center justify-center text-center"><span className="grid h-20 w-20 place-items-center rounded-full bg-rose-100"><Sparkles className="h-9 w-9 animate-pulse text-[#B76E79]" /></span><h1 className="mt-5 text-xl font-black text-gray-900">{t('quiz.loading')}</h1><p className="mt-2 text-sm text-gray-500">{t('quiz.loading_subtitle')}</p><Loader2 className="mt-6 h-6 w-6 animate-spin text-[#B76E79]" /></section>}

        {phase === 'results' && <section>
          <div className="mb-7 text-center"><span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-rose-100"><Sparkles className="h-7 w-7 text-[#B76E79]" /></span><h1 className="mt-4 text-2xl font-black text-gray-900">{t('quiz.results_title')}</h1><p className="mt-2 text-sm text-gray-500">{t('quiz.results_subtitle')}</p></div>
          {error ? <div className="rounded-2xl bg-red-50 p-6 text-center"><p className="text-sm font-semibold text-red-700">{t('errors.load_failed')}</p><button type="button" onClick={restart} className="mt-4 min-h-12 rounded-xl bg-gray-900 px-5 font-bold text-white">{t('quiz.retry')}</button></div> : <>
            {recommendations?.sensitivityNotice && <p className="mb-5 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">{t('quiz.sensitivity_notice')}</p>}
            {recommendations?.bundles && recommendations.bundles.length > 0 && <section className="mb-8"><h2 className="mb-4 text-lg font-black text-gray-900">{t('quiz.recommended_bundles')}</h2><div className="scrollbar-hide flex snap-x gap-3 overflow-x-auto pb-2">{recommendations.bundles.map((bundle) => { const name = language === 'rw' && bundle.nameRw ? bundle.nameRw : bundle.name; return <article key={bundle.id} className="w-[82vw] max-w-sm flex-none snap-start rounded-2xl border border-rose-100 bg-white p-4"><h3 className="font-bold text-gray-900">{name}</h3><p className="mt-2 text-sm text-gray-500">{bundle.products.length} · {formatRWF(bundle.normalTotal)}</p><p className="mt-2 text-lg font-black text-[#B76E79]">{formatRWF(bundle.bundlePrice)}</p>{bundle.savings > 0 && <p className="text-sm font-bold text-emerald-700">{formatRWF(bundle.savings)}</p>}</article>})}</div></section>}
            {recommendations?.products && recommendations.products.length > 0 ? <section><h2 className="mb-4 text-lg font-black text-gray-900">{t('quiz.recommended_products')}</h2><ProductGrid products={recommendations.products} /></section> : <div className="rounded-2xl bg-gray-50 p-7 text-center"><p className="font-bold text-gray-800">{t('quiz.no_results')}</p><p className="mt-2 text-sm text-gray-500">{t('quiz.no_results_hint')}</p></div>}
          </>}
          <div className="mt-7 flex flex-col gap-3"><Link href="/products" className="flex min-h-12 items-center justify-center rounded-xl bg-[#B76E79] px-5 font-bold text-white">{t('quiz.view_all')}</Link><button type="button" onClick={restart} className="min-h-12 rounded-xl border-2 border-gray-200 font-bold text-gray-700">{t('quiz.restart')}</button></div>
        </section>}
      </div>
    </main>
  )
}
