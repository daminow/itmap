# Changelog / История изменений

Все значимые изменения проекта документируются в этом файле.
All notable changes to this project are documented in this file.

Формат основан на [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
проект придерживается [семантического версионирования](https://semver.org/lang/ru/) /
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added / Добавлено

- Community health файлы: шаблоны issue (bug, feature, data correction), шаблон pull request, Code of Conduct.
- Непрерывная интеграция (GitHub Actions): lint, typecheck, test, build.
- Автообновление зависимостей через Dependabot (npm и github-actions).
- Двуязычное руководство по развёртыванию (`docs/DEPLOYMENT.md`).

### Changed / Изменено

- Уточнено лицензирование: код под Apache-2.0, датасет (`src/data/`) под CC BY-SA 4.0.
- Наведён порядок в структуре репозитория для публичной публикации.

## [0.1.0]

Первый публичный релиз / Initial public release.

### Added / Добавлено

- Интерактивная карта IT-специальностей: 170 ролей в 22 доменах, организованных как оргчарт (корень → C-suite → домен → роль).
- Три вида: Круг (масштабируемый sunburst), Уровни (icicle), Список (доступное DOM-дерево).
- Фильтры по зарплате, опыту, стеку, уровню и типу роли.
- Мультивалютное отображение зарплат: ₽ / $ / €.
- Состояние приложения в URL: ссылками можно делиться и восстанавливать точный вид.
- Доступное дерево ролей для навигации с клавиатуры и скринридеров.
- Усиленный декодер состояния из URL и строгая политика безопасности контента (CSP).

[Unreleased]: https://github.com/daminow/itmap/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/daminow/itmap/releases/tag/v0.1.0
