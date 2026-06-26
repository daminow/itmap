import { useEffect, useState } from 'react'
import * as Slider from '@radix-ui/react-slider'
import type { Range } from '@/types/taxonomy'

interface RangeSliderProps {
  bounds: Range
  value: Range | null
  step?: number
  ariaLabel: string
  /** Formats a value for display + aria-valuetext (e.g. money or "N лет"). */
  format: (n: number) => string
  onChange: (r: Range | null) => void
}

/** Dual-thumb slider (visual) + paired numeric inputs (precise accessible entry). */
export function RangeSlider({ bounds, value, step = 1, ariaLabel, format, onChange }: RangeSliderProps) {
  const current: Range = value ?? bounds
  const [lo, setLo] = useState(String(current[0]))
  const [hi, setHi] = useState(String(current[1]))

  useEffect(() => {
    const c = value ?? bounds
    setLo(String(c[0]))
    setHi(String(c[1]))
  }, [value, bounds])

  function clamp(n: number) {
    return Math.min(Math.max(n, bounds[0]), bounds[1])
  }

  function commitInputs(nlo: string, nhi: string) {
    let a = nlo === '' ? bounds[0] : Number(nlo)
    let b = nhi === '' ? bounds[1] : Number(nhi)
    if (!Number.isFinite(a)) a = bounds[0]
    if (!Number.isFinite(b)) b = bounds[1]
    a = clamp(a)
    b = clamp(b)
    if (a > b) [a, b] = [b, a]
    onChange([a, b])
  }

  return (
    <div className="rng">
      <Slider.Root
        className="rng__root"
        value={current}
        min={bounds[0]}
        max={bounds[1]}
        step={step}
        minStepsBetweenThumbs={1}
        aria-label={ariaLabel}
        onValueChange={([a, b]) => onChange([a, b])}
      >
        <Slider.Track className="rng__track">
          <Slider.Range className="rng__range" />
        </Slider.Track>
        <Slider.Thumb className="rng__thumb" aria-label={`${ariaLabel}: минимум`} aria-valuetext={format(current[0])} />
        <Slider.Thumb className="rng__thumb" aria-label={`${ariaLabel}: максимум`} aria-valuetext={format(current[1])} />
      </Slider.Root>

      <div className="rng__inputs">
        <label className="rng__field">
          <span>от</span>
          <input
            type="number"
            inputMode="numeric"
            step={step}
            min={bounds[0]}
            max={bounds[1]}
            value={lo}
            aria-label={`${ariaLabel}: минимум, число`}
            onChange={(e) => setLo(e.target.value)}
            onBlur={() => commitInputs(lo, hi)}
          />
        </label>
        <label className="rng__field">
          <span>до</span>
          <input
            type="number"
            inputMode="numeric"
            step={step}
            min={bounds[0]}
            max={bounds[1]}
            value={hi}
            aria-label={`${ariaLabel}: максимум, число`}
            onChange={(e) => setHi(e.target.value)}
            onBlur={() => commitInputs(lo, hi)}
          />
        </label>
        {value && (
          <button type="button" className="rng__clear" onClick={() => onChange(null)}>
            сбросить
          </button>
        )}
      </div>
    </div>
  )
}
