import { act, renderHook } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { useUrlSync } from './useUrlSync'
import { useITmapStore } from '@/store/useITmapStore'
import { getIndex } from '@/data/index'

const initial = useITmapStore.getState()
afterEach(() => {
  useITmapStore.setState(initial, true)
  window.history.replaceState(null, '', '/')
  vi.restoreAllMocks()
})

it('restores selection from a shared link and handles back without creating history', () => {
  const role = getIndex().flatRoles[0]
  window.history.replaceState(null, '', `/?sel=${encodeURIComponent(role.id)}`)
  const { unmount } = renderHook(useUrlSync)
  expect(useITmapStore.getState().selectedRoleId).toBe(role.id)
  expect(useITmapStore.getState().zoom).toEqual({ kind: 'domain', id: role.domainId })
  const push = vi.spyOn(window.history, 'pushState')
  act(() => {
    window.history.replaceState(null, '', '/')
    window.dispatchEvent(new PopStateEvent('popstate'))
  })
  expect(useITmapStore.getState().selectedRoleId).toBeNull()
  expect(useITmapStore.getState().zoom).toEqual({ kind: 'overview' })
  expect(push).not.toHaveBeenCalled()
  unmount()
})

it('pushes role navigation and replaces filter changes', () => {
  window.history.replaceState(null, '', '/')
  const { unmount } = renderHook(useUrlSync)
  const push = vi.spyOn(window.history, 'pushState')
  const replace = vi.spyOn(window.history, 'replaceState')
  act(() => useITmapStore.getState().selectRole(getIndex().flatRoles[0].id))
  expect(push).toHaveBeenCalledTimes(1)
  act(() => useITmapStore.getState().setSearch('Python'))
  expect(push).toHaveBeenCalledTimes(1)
  expect(replace).toHaveBeenCalledTimes(1)
  expect(new URLSearchParams(window.location.search).get('q')).toBe('Python')
  unmount()
})
