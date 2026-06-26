import { useEffect, useState } from 'react'
import { t } from '@/i18n/ru'

const KEY = 'itmap.coachmark.dismissed'

const STEPS = t.coach.steps

function readDismissed(): boolean {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export function Coachmark() {
  const [step, setStep] = useState(0)
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!readDismissed()) setShow(true)
  }, [])

  function dismiss() {
    setShow(false)
    try {
      localStorage.setItem(KEY, '1')
    } catch {
      // storage blocked (private mode) — graceful: just hide for this session
    }
  }

  useEffect(() => {
    if (!show) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') dismiss()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [show])

  if (!show) return null

  return (
    <div className="coachmark" role="dialog" aria-label="Подсказка">
      <p className="coachmark__step">{t.coach.step(step + 1, STEPS.length)}</p>
      <p className="coachmark__text">{STEPS[step]}</p>
      <div className="coachmark__actions">
        <button type="button" className="coachmark__skip" onClick={dismiss}>
          {t.coach.skip}
        </button>
        {step < STEPS.length - 1 ? (
          <button type="button" className="coachmark__next" onClick={() => setStep((s) => s + 1)}>
            {t.coach.next}
          </button>
        ) : (
          <button type="button" className="coachmark__next" onClick={dismiss}>
            {t.coach.start}
          </button>
        )}
      </div>
    </div>
  )
}
