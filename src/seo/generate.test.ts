import { expect, it } from 'vitest'
import { extractAssets } from './generate'

it('preserves complete Vite script tags and all preload and stylesheet links', () => {
  const script = '<script type="module" crossorigin src="/itmap/assets/index.js"></script>'
  const preload = '<link rel="modulepreload" crossorigin href="/itmap/assets/react.js">'
  const css = '<link rel="stylesheet" href="/itmap/assets/index.css">'
  expect(extractAssets(`<head>${script}${preload}${css}</head>`)).toBe([script, preload, css].join('\n'))
})
