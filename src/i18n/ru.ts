// Single source of UI chrome strings (i18n-ready). Content (role/domain names,
// responsibilities, etc.) lives in the dataset, not here.

export const t = {
  app: { name: 'ITmap' },

  search: {
    placeholder: 'Найти специальность, стек, уровень…',
    dialogLabel: 'Поиск специальности',
    empty: 'Ничего не найдено',
    open: 'Открыть поиск',
  },

  views: {
    sunburst: 'Круг',
    icicle: 'Уровни',
    list: 'Список',
    group: 'Вид',
    hintMap: 'Семейства → домены → роли. Нажмите сектор, чтобы углубиться',
    hintList: 'Полный список специальностей',
  },

  filters: {
    button: 'Фильтры',
    level: 'Уровень',
    grade: 'Грейд',
    salary: 'Зарплата',
    experience: 'Опыт',
    experienceHint: 'Опыт работы, лет',
    stack: 'Стек',
    type: 'Тип',
    roleType: 'Тип роли',
    reset: 'Сбросить',
    shown: 'Показано',
    of: 'из',
  },

  panel: {
    choose: 'Выберите специальность',
    chooseHint: 'Кликните по карте, дереву слева или найдите через поиск (Cmd/Ctrl+K).',
    topDemand: 'Самые востребованные:',
    overview: 'Обзор',
    salaryByLevel: 'Зарплата по уровням',
    responsibilities: 'Обязанности',
    whatToLookFor: 'Кого искать (для найма)',
    stack: 'Стек и инструменты',
    specializations: 'Специализации',
    growth: 'Путь роста',
    adjacent: 'Смежные роли',
    close: 'Закрыть',
    levelCol: 'Уровень',
    expCol: 'Опыт',
    years: 'лет',
  },

  zero: {
    title: 'Ничего не найдено',
    sub: 'Фильтры слишком строгие. Попробуйте ослабить один из них:',
    resetAll: 'Сбросить всё',
  },

  coach: {
    step: (i: number, n: number) => `Шаг ${i} из ${n}`,
    steps: [
      'Внешнее кольцо — роли, среднее — домены, внутреннее — семейства. Нажмите сектор, чтобы углубиться, или крутите колесо для зума.',
      'Выберите роль — справа откроется детальная карточка. Фильтры сверху, поиск — Cmd/Ctrl+K, переключение видов — справа над картой.',
    ],
    skip: 'Понятно',
    next: 'Далее',
    start: 'Начать',
  },

  a11y: {
    tree: 'Дерево IT-специальностей',
    treeRail: 'Дерево специальностей',
    detail: 'Детали специальности',
    map: 'Карта специальностей',
    filters: 'Фильтры',
    viewGroup: 'Вид',
    marketSelect: 'Рынок зарплат',
    themeLight: 'Светлая тема',
    themeDark: 'Тёмная тема',
  },
} as const
