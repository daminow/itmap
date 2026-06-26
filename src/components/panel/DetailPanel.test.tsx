import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { DetailPanel } from '@/components/panel/DetailPanel'
import { useITmapStore } from '@/store/useITmapStore'
import { getIndex } from '@/data/index'

beforeEach(() => {
  useITmapStore.getState().selectRole(null)
})

describe('DetailPanel', () => {
  it('shows the empty prompt when nothing is selected', () => {
    render(<DetailPanel />)
    expect(screen.getByText('Выберите специальность')).toBeInTheDocument()
  })

  it('renders the selected role with a salary table', () => {
    const role = getIndex().flatRoles[0]
    render(<DetailPanel />)
    act(() => {
      useITmapStore.getState().selectRole(role.id)
    })
    expect(screen.getByRole('heading', { name: role.name, level: 2 })).toBeInTheDocument()
    expect(screen.getByText('Зарплата по уровням')).toBeInTheDocument()
    expect(screen.getByText('Обязанности')).toBeInTheDocument()
  })
})
