import type { Domain } from '@/types/taxonomy'
import { frontend } from '@/data/domains/frontend'
import { backend } from '@/data/domains/backend'
import { cms } from '@/data/domains/cms'
import { mobile } from '@/data/domains/mobile'
import { gamedev } from '@/data/domains/gamedev'
import { embedded } from '@/data/domains/embedded'
import { devops } from '@/data/domains/devops'
import { sysadmin } from '@/data/domains/sysadmin'
import { secops } from '@/data/domains/secops'
import { secgrc } from '@/data/domains/secgrc'
import { data } from '@/data/domains/data'
import { ml } from '@/data/domains/ml'
import { qa } from '@/data/domains/qa'
import { design } from '@/data/domains/design'
import { management } from '@/data/domains/management'
import { product } from '@/data/domains/product'
import { architecture } from '@/data/domains/architecture'
import { corp } from '@/data/domains/corp'
import { support } from '@/data/domains/support'
import { niche } from '@/data/domains/niche'

/** Overview-ring family order (color grouping). Domains render in this order. */
export const FAMILY_ORDER = [
  'Разработка',
  'Инфраструктура и эксплуатация',
  'Безопасность',
  'Данные и AI',
  'Качество и дизайн',
  'Управление, продукт, архитектура',
  'Корпоративные, поддержка, нишевые',
] as const

export const domains: Domain[] = [
  frontend,
  backend,
  cms,
  mobile,
  gamedev,
  embedded,
  devops,
  sysadmin,
  secops,
  secgrc,
  data,
  ml,
  qa,
  design,
  management,
  product,
  architecture,
  corp,
  support,
  niche,
]
