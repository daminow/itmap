import type { Demand, RoleType } from '@/types/taxonomy'

export const DEMAND_LABEL: Record<Demand, string> = {
  high: 'высокий спрос',
  medium: 'средний спрос',
  low: 'низкий спрос',
}

export const ROLE_TYPE_LABEL: Record<RoleType, string> = {
  engineering: 'Инженерия',
  data: 'Данные',
  ops: 'Эксплуатация',
  security: 'Безопасность',
  qa: 'Тестирование',
  design: 'Дизайн',
  product: 'Продукт',
  management: 'Менеджмент',
  research: 'Исследования',
  support: 'Поддержка',
}
