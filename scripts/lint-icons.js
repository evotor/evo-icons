const fs = require('fs');
const path = require('path');

const SRC_PATH = path.join(__dirname, '..', 'src');
const ICONS_DIR_SRC = path.join(SRC_PATH, 'monochrome');
const COLOR_ICONS_DIR_SRC = path.join(SRC_PATH, 'color');
const FILE_POSTFIX = /(_24px)?\.svg/;
const MONOCHROME_VIEW_BOX = '0 0 24 24';
const CYRILLIC = /[а-яА-ЯЁё]/;
const HIDDEN_FILE = /^\..+/;
const NUMBER = '[-+]?(?:\\d*\\.)?\\d+(?:[eE][-+]?\\d+)?';
// Только атрибуты transform и style: gradientTransform у градиента штатно содержит scale().
const TRANSFORM_ATTR = /\s(transform|style)="([^"]*)"/g;
const SCALE_FN = new RegExp(`scale\\(\\s*(${NUMBER})(?:[\\s,]+(${NUMBER}))?\\s*\\)`, 'g');
const MATRIX_FN = new RegExp(`matrix\\(\\s*(${NUMBER})[\\s,]+(${NUMBER})[\\s,]+(${NUMBER})[\\s,]+(${NUMBER})`, 'g');
const SCALE_TOLERANCE = 0.001;

const errors = [];

const report = (file, message) => errors.push(`${file}: ${message}`);

// Повторяет нормализацию из scripts/gulp-icons-build.js: имя в dist и есть публичный контракт пакета.
const normalizeIconName = (fileName) => fileName.toLowerCase().replace(FILE_POSTFIX, '').replace(/_|\s/g, '-');

const readSvg = (filePath) => fs.readFileSync(filePath, 'utf-8');

const getAttr = (svg, attrName) => {
  const match = svg.match(new RegExp(`<svg[^>]*\\s${attrName}="([^"]*)"`));
  return match ? match[1] : null;
};

const getTagNames = (svg) => {
  const inner = svg.replace(/<\/?svg[^>]*>/g, '');
  return [...new Set([...inner.matchAll(/<\s*([a-zA-Z:]+)/g)].map((match) => match[1]))];
};

// Отражение через scale(-1 1) размер не меняет, поэтому сравниваются модули коэффициентов.
const getScaleFactors = (transform) => {
  const factors = [];

  [...transform.matchAll(SCALE_FN)].forEach(([, sx, sy]) => {
    factors.push(Math.abs(Number(sx)), Math.abs(Number(sy ?? sx)));
  });

  // matrix(a b c d e f): длины первых двух столбцов и есть масштаб по осям, независимо от поворота.
  [...transform.matchAll(MATRIX_FN)].forEach(([, a, b, c, d]) => {
    factors.push(Math.hypot(Number(a), Number(b)), Math.hypot(Number(c), Number(d)));
  });

  return [...new Set(factors)].filter((factor) => Math.abs(factor - 1) > SCALE_TOLERANCE);
};

// Монохромные иконки сборка инлайнит в чужой документ и вырезает у них fill,
// цветные копирует в dist отдельными файлами как есть - отсюда разный набор правил.
const checkSvgContent = (svg, relPath, { inlined }) => {
  const tags = getTagNames(svg);

  if (!tags.length) {
    report(relPath, 'файл не содержит ни одного элемента внутри <svg>');
  }

  if (tags.includes('script')) {
    report(relPath, '<script> в иконке недопустим');
  }

  // Иконка в чужой сетке, подогнанная скейлом (так в v1.1.1 чинили Login из сетки 20), рендерится в нужный
  // размер, но её координаты уже не попадают на пиксели: обводка 2px становится 2.4px и иконка мылится.
  // Лечится только перерисовкой в целевой сетке, поэтому масштаб запрещён, а сдвиг и поворот - нет.
  [...svg.matchAll(TRANSFORM_ATTR)].forEach(([, attrName, transform]) => {
    const factors = getScaleFactors(transform);

    if (factors.length) {
      report(relPath, `${attrName}="${transform}" масштабирует геометрию в ${factors.join(' и ')} раза: иконку нужно экспортировать сразу в целевой сетке, скейлом размер не подгоняют - координаты уходят с пиксельной сетки и линии мылятся`);
    }
  });

  if (!inlined) {
    return;
  }

  if (tags.includes('style')) {
    report(relPath, '<style> при инлайне утекает на всю страницу');
  }

  // ATTRS_TO_CLEAN в сборке вычищает только fill, поэтому stroke остаётся жёстко заданным цветом.
  if (/\sstroke="(?!none")/.test(svg)) {
    report(relPath, 'атрибут stroke не вырезается сборкой, иконка не покрасится через currentColor');
  }

  const viewBox = getAttr(svg, 'viewBox');

  if (viewBox !== MONOCHROME_VIEW_BOX) {
    report(relPath, `viewBox="${viewBox}" вместо "${MONOCHROME_VIEW_BOX}": сборка выбрасывает обёртку <svg>, и иконка отрендерится не в размер соседних`);
  }

  ['width', 'height'].forEach((attrName) => {
    const value = getAttr(svg, attrName);

    if (value !== null && value !== '24') {
      report(relPath, `${attrName}="${value}" вместо "24"`);
    }
  });
};

const lintMonochrome = (usedIds) => {
  const iconsNames = {};
  const categoryNames = {};

  fs.readdirSync(ICONS_DIR_SRC).forEach((childDir) => {
    if (HIDDEN_FILE.test(childDir)) {
      return;
    }

    const categoryPath = path.join(ICONS_DIR_SRC, childDir);

    if (!fs.statSync(categoryPath).isDirectory()) {
      report(path.join('src/monochrome', childDir), 'монохромная иконка должна лежать в папке-категории, иначе сборка её молча пропустит');
      return;
    }

    if (CYRILLIC.test(childDir)) {
      report(path.join('src/monochrome', childDir), 'кириллица в имени категории роняет сборку');
    }

    const categoryName = childDir.toLowerCase().replace(/_|\s/, '-');

    if (categoryNames[categoryName]) {
      report(path.join('src/monochrome', childDir), `после нормализации совпадает с категорией ${categoryNames[categoryName]}`);
    }

    categoryNames[categoryName] = childDir;

    fs.readdirSync(categoryPath).forEach((icon) => {
      if (HIDDEN_FILE.test(icon)) {
        return;
      }

      const relPath = path.join('src/monochrome', childDir, icon);

      if (CYRILLIC.test(icon)) {
        report(relPath, 'кириллица в имени файла роняет сборку');
      }

      if (!icon.toLowerCase().endsWith('.svg')) {
        report(relPath, 'ожидается файл .svg');
        return;
      }

      const iconName = normalizeIconName(icon);

      if (iconsNames[iconName]) {
        report(relPath, `имя "${iconName}" уже занято иконкой ${iconsNames[iconName]}, имена уникальны по всей монохромной библиотеке`);
      }

      iconsNames[iconName] = relPath;

      const svg = readSvg(path.join(categoryPath, icon));
      checkSvgContent(svg, relPath, { inlined: true });
      collectIds(svg, relPath, usedIds);
    });
  });
};

// Монохромные иконки инлайнятся в одну страницу, поэтому одинаковый id в двух иконках ломает рендер обеих.
const collectIds = (svg, relPath, usedIds) => {
  [...new Set([...svg.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]))].forEach((id) => {
    if (usedIds[id]) {
      report(relPath, `id="${id}" уже используется в ${usedIds[id]}`);
    }

    usedIds[id] = relPath;
  });
};

const lintColor = () => {
  const iconsNames = {};

  fs.readdirSync(COLOR_ICONS_DIR_SRC).forEach((icon) => {
    if (HIDDEN_FILE.test(icon)) {
      return;
    }

    const relPath = path.join('src/color', icon);

    if (fs.statSync(path.join(COLOR_ICONS_DIR_SRC, icon)).isDirectory()) {
      report(relPath, 'цветные иконки лежат плоско в src/color, без папок-категорий');
      return;
    }

    if (CYRILLIC.test(icon)) {
      report(relPath, 'кириллица в имени файла роняет сборку');
    }

    if (!icon.toLowerCase().endsWith('.svg')) {
      report(relPath, 'ожидается файл .svg');
      return;
    }

    const iconName = normalizeIconName(icon);

    if (iconsNames[iconName]) {
      report(relPath, `имя "${iconName}" уже занято иконкой ${iconsNames[iconName]}`);
    }

    iconsNames[iconName] = relPath;

    checkSvgContent(readSvg(path.join(COLOR_ICONS_DIR_SRC, icon)), relPath, { inlined: false });
  });
};

const lint = () => {
  const usedIds = {};

  lintMonochrome(usedIds);
  lintColor();

  if (errors.length) {
    console.error('\x1b[31m', `Найдено проблем: ${errors.length}\n`);
    errors.forEach((error) => console.error(`  - ${error}`));
    console.error('');
    process.exit(1);
  }

  console.log('\x1b[32m', 'Иконки в порядке.');
};

lint();
