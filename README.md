# Evotor icons

Библиотека иконок для Evotor.

🔗 **Онлайн галерея:** [evotor.github.io/evo-icons](https://evotor.github.io/evo-icons)

## Установка

```bash
npm install @evotor-dev/evo-icons
```

## Использование

## Настройка assets в angular.json

```json
{
  "assets": [
    {
      "glob": "**/*",
      "input": "./node_modules/@evotor-dev/evo-icons/dist/monochrome",
      "output": "./assets/ui-kit/icons"
    },
    {
      "glob": "**/*",
      "input": "./node_modules/@evotor-dev/evo-icons/dist/color",
      "output": "./assets/ui-kit/color-icons"
    }
  ]
}
```

## Разработка

### Установка зависимостей

```bash
npm ci
```

### Добавление иконки

#### Монохромная иконка

1. Положите файл в `src/monochrome/<Категория>/<Name>.svg`.
Существующие категории: `Navigation`, `Category`, `Header`, `Objects`, `System`, `Info`, `Emotions`, `Side Menu`.
Новую категорию можно завести, просто создав папку.

2. Требования к SVG:
   - размер 24×24, `viewBox="0 0 24 24"`;
   - внутри только `<path>`: обёртка `<svg>` при сборке отбрасывается и генерируется заново;
   - атрибуты `fill` вырезаются автоматически, чтобы иконка красилась через `currentColor`, поэтому их можно оставить как есть.

3. Требования к имени файла:
   - только латиница, кириллица в имени файла или папки роняет сборку;
   - имя должно быть уникальным по всей библиотеке, а не только внутри своей категории, иначе сборка падает с ошибкой;
   - пробелы и `_` заменяются на `-`, имя приводится к нижнему регистру, суффикс `_24px` отбрасывается: `Alert Circle.svg` → `alert-circle`, `Chart_24px.svg` → `chart`.

#### Цветная иконка

Положите файл в `src/color/<Name>.svg`, плоско, без папок-категорий.
Обычный размер 48×48.
Содержимое копируется в `dist` как есть, цвета сохраняются.
Правила именования те же, что и для монохромных иконок.

#### Проверка и коммит

Соберите библиотеку локально, сборка проверяет дубликаты имён и кириллицу:

```bash
npm run build
npm run build:gallery
```

Галерею можно посмотреть, открыв `gallery/index.html` в браузере после `npm run build:gallery`.

Сообщение коммита оформляйте по Conventional Commits, версию по нему считает semantic-release:

### Сборка иконок

```bash
npm run build
```

### Сборка галереи

```bash
npm run build:gallery
```

### Публикация

Публикация не автоматическая: после мержа в `main` нужно вручную запустить workflow "🚀 Release" в GitHub Actions.
Он выполняет:

```bash
npm run release
```
