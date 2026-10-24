import type { DomainId, Role } from '@/types/taxonomy'

function slug(value: string): string {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(value)) throw new Error(`Invalid catalogue slug: ${value}`)
  return value
}

export function domainPath(id: DomainId | string): string {
  return `directions/${slug(id)}/`
}

export function rolePath(role: Pick<Role, 'id' | 'domainId'>): string {
  const prefix = `${role.domainId}.`
  if (!role.id.startsWith(prefix)) throw new Error('Role does not belong to its domain')
  return `professions/${slug(role.domainId)}/${slug(role.id.slice(prefix.length))}/`
}

export function mapLink(base: string, role?: Pick<Role, 'id'>): string {
  return role ? `${base}?sel=${encodeURIComponent(role.id)}` : base
}
