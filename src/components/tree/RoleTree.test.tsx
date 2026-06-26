import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RoleTree } from '@/components/tree/RoleTree'
import { useITmapStore } from '@/store/useITmapStore'

beforeEach(() => {
  const s = useITmapStore.getState()
  s.clearFilters()
  s.selectRole(null)
  s.drillTo({ kind: 'overview' })
})

describe('RoleTree', () => {
  it('renders an accessible tree of all domains', () => {
    render(<RoleTree />)
    expect(screen.getByRole('tree', { name: /дерево/i })).toBeInTheDocument()
    const items = screen.getAllByRole('treeitem')
    expect(items.length).toBeGreaterThanOrEqual(20)
  })

  it('shows known domain names', () => {
    render(<RoleTree />)
    expect(screen.getByText('Backend')).toBeInTheDocument()
    expect(screen.getByText('Frontend и веб')).toBeInTheDocument()
  })
})
