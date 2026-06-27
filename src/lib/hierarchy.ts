import { hierarchy as d3hierarchy } from 'd3-hierarchy'
import type { HierarchyNode } from 'd3-hierarchy'
import { LEVEL_ORDER } from '@/data/defineDomain'
import type { DataIndex, IndexedRole } from '@/types/runtime'
import type { Role, RoleId } from '@/types/taxonomy'
import type { NodeInfo, NodeInfoChild } from '@/types/ui'

export type HKind = 'root' | 'exec' | 'group' | 'domain' | 'role'

export interface HData {
  id: string
  /** Short label shown on the wheel/cell (e.g. 'CTO', 'Frontend'). */
  name: string
  /** Full Russian title for a position, e.g. 'Технический директор'. Execs only. */
  full?: string
  kind: HKind
  /** CSS custom-property name for the colour, e.g. '--accent-backend'. */
  accent: string
  /** Optional one-line description (departments / company root). */
  blurb?: string
  /** Present on role nodes — and on exec nodes that are embodied by a real role. */
  role?: IndexedRole
  children?: HData[]
}

/** A C-suite executive. Where a real role embodies the seat, `roleId` links it so a
 *  click opens that role's full card; otherwise the seat is a synthetic grouping node. */
export interface ExecDef {
  key: string
  /** Acronym shown on the ring, e.g. 'CTO'. */
  name: string
  /** Full Russian title (hover / centre / panel). */
  full: string
  accent: string
  /** Fully-qualified id of the role that embodies this seat (pulled out of its department). */
  roleId?: string
}

/** The C-suite, in wheel order. Each owns a slice of the org wheel below the CEO. */
export const EXECS: ExecDef[] = [
  { key: 'cto', name: 'CTO', full: 'Технический директор', accent: '--clevel-cto', roleId: 'management.cto' },
  { key: 'cdo', name: 'CDO', full: 'Директор по данным', accent: '--clevel-cdo' },
  { key: 'cpo', name: 'CPO', full: 'Директор по продукту', accent: '--clevel-cpo', roleId: 'product.cpo' },
  {
    key: 'ciso',
    name: 'CISO',
    full: 'Директор по информационной безопасности',
    accent: '--clevel-ciso',
    roleId: 'secgrc.ciso-rukovoditel-ib',
  },
  { key: 'cio', name: 'CIO', full: 'Директор по IT и операциям', accent: '--clevel-cio', roleId: 'management.cio' },
  { key: 'chro', name: 'CHRO', full: 'Директор по персоналу', accent: '--clevel-chro', roleId: 'hr.head-of-people' },
  { key: 'cfo', name: 'CFO', full: 'Финансовый директор', accent: '--clevel-cfo', roleId: 'finance.head-of-finops' },
]

/** Which executive owns each department (domain.id → exec key). `management` is special —
 *  its roles become the leadership ladder under the CTO, not a department. */
export const DOMAIN_CLEVEL: Record<string, string> = {
  // Технологии и инженерия
  frontend: 'cto',
  backend: 'cto',
  cms: 'cto',
  mobile: 'cto',
  gamedev: 'cto',
  embedded: 'cto',
  qa: 'cto',
  architecture: 'cto',
  devops: 'cto',
  niche: 'cto',
  // Данные и AI
  data: 'cdo',
  ml: 'cdo',
  // Продукт и дизайн
  product: 'cpo',
  design: 'cpo',
  // Безопасность
  secops: 'ciso',
  secgrc: 'ciso',
  // Внутренние IT и операции
  sysadmin: 'cio',
  support: 'cio',
  corp: 'cio',
  // Люди
  hr: 'chro',
  // Финансы
  finance: 'cfo',
}

/** The management department, recast as the engineering leadership ladder under the CTO.
 *  Roles are listed top→down so the chain reads VP → Head → … → Lead. `cto`/`cio` are
 *  excluded here — they sit one ring up as executive seats. */
interface MgmtGroup {
  id: string
  name: string
  blurb: string
  roleIds: string[]
}
const MGMT_GROUPS: MgmtGroup[] = [
  {
    id: 'group:eng-leadership',
    name: 'Инженерное руководство',
    blurb: 'Вертикаль управления разработкой: от VP и руководителей до тимлидов.',
    roleIds: [
      'management.vp-engineering',
      'management.head-of-engineering',
      'management.engineering-manager',
      'management.team-lead',
      'management.tech-lead',
    ],
  },
  {
    id: 'group:project-mgmt',
    name: 'Проектное управление',
    blurb: 'Поставка и координация: программы, проекты, Agile-процессы.',
    roleIds: [
      'management.program-manager',
      'management.delivery-manager',
      'management.project-manager',
      'management.scrum-master-agile-coach',
    ],
  },
]

const EXEC_ROLE_IDS = new Set(EXECS.map((e) => e.roleId).filter(Boolean) as string[])

/** Organisational rank — higher = closer to the top. Used to order roles within a
 *  department so leadership reads first and juniors last (the seniority ladder). */
export function roleRank(r: Role): number {
  const n = r.name.toLowerCase()
  let bonus = 0
  // NB: \b is ASCII-only in JS regex, so don't wrap Cyrillic alternatives in it.
  if (/cto|cio|cpo|cdo|ciso|cfo|chief|директор/.test(n)) bonus = 60
  else if (/\bvp\b|вице-?президент/.test(n)) bonus = 50
  else if (/head|руководител/.test(n)) bonus = 40
  else if (/principal|главный/.test(n)) bonus = 32
  else if (/lead|лид|architect|архитектор/.test(n)) bonus = 24
  else if (/manager|менеджер|owner|владелец|master|коуч|coach/.test(n)) bonus = 16
  const topLevel = r.levels.reduce((m, b) => Math.max(m, LEVEL_ORDER[b.level]), 0) // 0..3
  return bonus + topLevel
}

/** Build the org chart: CEO → C-suite → (leadership ladder | department) → role. */
export function buildHierarchyData(index: DataIndex): HData {
  const { domainById } = index

  function mkRole(id: string, accentOverride?: string): HData | null {
    const r = index.roleById.get(id as RoleId)
    if (!r) return null
    const accent = accentOverride ?? domainById.get(r.domainId)?.accent ?? '--accent-default'
    return { id: r.id, name: r.name, kind: 'role', accent, role: r }
  }

  // Leadership ladders under the CTO (the `management` department, recast).
  const mgmtGroupNodes: HData[] = MGMT_GROUPS.map((g) => ({
    id: g.id,
    name: g.name,
    kind: 'group' as const,
    accent: '--accent-management',
    blurb: g.blurb,
    children: g.roleIds.map((id) => mkRole(id, '--accent-management')).filter(Boolean) as HData[],
  })).filter((g) => g.children!.length)

  // Departments grouped by their executive owner, roles ordered by seniority.
  const deptByExec = new Map<string, HData[]>()
  for (const e of EXECS) deptByExec.set(e.key, [])
  deptByExec.get('cto')!.push(...mgmtGroupNodes)

  for (const d of index.domains) {
    if (d.id === 'management') continue // becomes the leadership ladders above
    const execKey = DOMAIN_CLEVEL[d.id] ?? 'cto'
    const roles = [...d.roles]
      .filter((r) => !EXEC_ROLE_IDS.has(r.id)) // the exec seat is shown one ring up, not here
      .sort((a, b) => roleRank(b) - roleRank(a) || a.name.localeCompare(b.name, 'ru'))
      .map((r) => mkRole(r.id)!)
    if (!roles.length) continue
    deptByExec.get(execKey)!.push({
      id: d.id,
      name: d.name,
      kind: 'domain',
      accent: d.accent,
      blurb: d.description,
      children: roles,
    })
  }

  // Executive seats below the CEO.
  const execNodes: HData[] = EXECS.map((e): HData => {
    const role = e.roleId ? index.roleById.get(e.roleId as RoleId) : undefined
    return {
      id: `exec:${e.key}`,
      name: e.name,
      full: e.full,
      kind: 'exec',
      accent: e.accent,
      role,
      children: deptByExec.get(e.key)!,
    }
  }).filter((e) => (e.children?.length ?? 0) > 0 || e.role != null)

  return {
    id: 'root',
    name: 'CEO',
    full: 'Генеральный директор',
    kind: 'root',
    accent: '--clevel-ceo',
    blurb: 'Организационная карта IT-компании: от CEO до специалистов.',
    children: execNodes,
  }
}

/** d3 hierarchy with value = number of subordinate roles (leaves count 1). */
export function buildHierarchy(index: DataIndex): HierarchyNode<HData> {
  return d3hierarchy(buildHierarchyData(index)).sum((d) => (d.kind === 'role' ? 1 : 0))
}

/** Human label for each node kind (panel subtitle fallback when there is no full title). */
export const KIND_LABEL: Record<HKind, string> = {
  root: 'Компания',
  exec: 'Руководитель',
  group: 'Команда управления',
  domain: 'Направление',
  role: 'Роль',
}

/** "в подчинении" — every position strictly below a node: leaf roles plus any embodied
 *  executive seats (so the CEO counts the C-suite too). Excludes the node itself. */
export function subordinateCount(n: HierarchyNode<HData>): number {
  let c = 0
  n.each((d) => {
    if (d !== n && d.data.role != null) c++
  })
  return c
}

/** Build a panel summary for a non-role org node: title, full title, count, child list. */
export function toNodeInfo(n: HierarchyNode<HData>): NodeInfo {
  const d = n.data
  const kind: NodeInfo['kind'] = d.kind === 'role' ? 'domain' : d.kind
  const children: NodeInfoChild[] = (n.children ?? []).map((c) => ({
    id: c.data.id,
    name: c.data.full ? `${c.data.name} · ${c.data.full}` : c.data.name,
    count: c.data.kind === 'role' ? undefined : subordinateCount(c),
    roleId: c.data.role?.id,
  }))
  return {
    id: d.id,
    kind,
    title: d.name,
    subtitle: d.full ?? KIND_LABEL[d.kind],
    blurb: d.blurb,
    accent: d.accent,
    count: subordinateCount(n),
    children,
  }
}
