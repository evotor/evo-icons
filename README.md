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
      "output": "./assets/ui-kit/color"
    }
  ]
}
```

## Разработка

### Установка зависимостей

```bash
npm ci
```

### Сборка иконок

```bash
npm run build
```

### Сборка галереи

```bash
npm run build:gallery
```

### Публикация

```bash
npm run release
```
