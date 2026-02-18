const fs = require('fs');
const path = require('path');
const rmdir = require('rimraf');

const SRC_PATH = path.join(__dirname, '..', 'src');
const DIST_PATH = path.join(__dirname, '..', 'dist');
const ICONS_DIR_SRC = path.join(SRC_PATH, 'monochrome');
const COLOR_ICONS_DIR_SRC = path.join(SRC_PATH, 'color');
const FILE_POSTFIX = /(_24px)?\.svg/;
const ATTRS_TO_CLEAN = ['fill'];


const camelize = (str) => {
  return str
    .replace(/\s(.)/g, (s) => s.toUpperCase())
    .replace(/\s/g, '')
    .replace(/^(.)/, (s) => s.toLowerCase());
};

const cleanSvgTags = (content) => {
  const str = content.toString();
  const svgExp = /(\<svg[^>]*\>)|(\<\/svg\>)|\n/g;
  const result = str.replace(svgExp, '').trim();
  return result;
};

const prepaceContent = (path) => `<svg xmlns="http://www.w3.org/2000/svg">${path}</svg>`;

const getExpByAttrName = (attrName) => {
  const expBase = '=".*?"\s?';
  return new RegExp(attrName + expBase, 'gm');
};

const cleanAttrs = (str, attrNames) => {
  let result = str;
  attrNames.forEach((attr) => {
    const exp = getExpByAttrName(attr);
    result = result.replace(exp, '');
  });
  return result;
};


const checkCyrilicChars = (str) => {
  if (/[а-яА-ЯЁё]/.test(str)) {
    throw new Error(`String "${str}" contains wrong characters!`);
  }
};

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const cleanDist = () => {
  if (fs.existsSync(DIST_PATH)) {
    rmdir.sync(DIST_PATH);
  }
  ensureDir(DIST_PATH);
};

const buildMonochromeIcons = () => {
  const timeStart = Date.now();
  let iconsCount = 0;
  const iconsNames = {};

  const monochromeDist = path.join(DIST_PATH, 'monochrome');
  ensureDir(monochromeDist);

  const srcDirList = fs.readdirSync(ICONS_DIR_SRC);

  if (!srcDirList?.length) {
    console.warn('Monochrome source folder is empty');
    return;
  }

  srcDirList.forEach((childDir) => {
    checkCyrilicChars(childDir);
    const stat = fs.statSync(path.join(ICONS_DIR_SRC, childDir));

    if (!stat.isDirectory()) {
      return;
    }

    const icons = fs.readdirSync(path.join(ICONS_DIR_SRC, childDir));
    if (!icons?.length) {
      return;
    }

    const categoryName = childDir.toLowerCase().replace(/_|\s/, '-');
    const categoryDist = path.join(monochromeDist, categoryName);
    ensureDir(categoryDist);
    icons.forEach((icon, i) => {
      if (/^\..+/.test(icon)) {
        return;
      }

      checkCyrilicChars(icon);
      const rawIconContent = fs.readFileSync(path.join(ICONS_DIR_SRC, childDir, icon));
      const iconName = icon.toLowerCase().replace(FILE_POSTFIX, '').replace(/_|\s/g, '-');

      if (iconsNames[iconName]) {
        throw new Error(
          `Icon with name ${iconName} in category ${categoryName} already exists in ${iconsNames[iconName]}, icon name must be unique!`,
        );
      }

      const svgPath = cleanSvgTags(rawIconContent);
      const svgContent = prepaceContent(svgPath);

      const cleanSvg = cleanAttrs(svgContent, ATTRS_TO_CLEAN);
      fs.writeFileSync(path.join(categoryDist, iconName + '.svg'), cleanSvg);

      iconsNames[iconName] = categoryName;
      ++iconsCount;
    });

  });

  console.log('\x1b[32m', `Converted ${iconsCount} monochrome icons in ${Date.now() - timeStart} ms.`);
  return iconsNames;
};

const prepareMonochromeIconsConsts = () => {
  const timeStart = Date.now();
  let iconsCount = 0;

  const monochromeDist = path.join(DIST_PATH, 'monochrome');

  const categoryFoldersList = fs.readdirSync(monochromeDist);

  if (!categoryFoldersList?.length) {
    console.warn('Monochrome dist folder is empty');
    return;
  }

  let libraryContent = '';
  const categoriesList = [];

  categoryFoldersList.forEach((categoryName) => {
    const stat = fs.statSync(path.join(monochromeDist, categoryName));

    if (!stat.isDirectory()) {
      return;
    }

    const icons = fs.readdirSync(path.join(monochromeDist, categoryName));
    if (!icons?.length) {
      return;
    }

    const categoryVarName = camelize(categoryName.toLowerCase().replace(/-|_|\s/, ' ') + 'Icons');

    libraryContent += `import { ${categoryVarName} } from './${categoryName}';\n`;
    categoriesList.push(categoryVarName);
    let iconsExport = '';
    let categoryContent = `export const ${categoryVarName} = {\n  name: '${categoryName}',\n  shapes: {\n`;

    icons.forEach((iconFileName, i) => {
      if (/^\..+/.test(iconFileName)) {
        return;
      }

      checkCyrilicChars(iconFileName);

      const rawIconContent = fs.readFileSync(path.join(monochromeDist, categoryName, iconFileName));
      const iconName = iconFileName.toLowerCase().replace(FILE_POSTFIX, '');
      const iconVarName = camelize(
        'icon ' + iconName.replace(/-|_|\s/g, ' '),
      );
      const svgPath = cleanSvgTags(rawIconContent);
      const cleanPaths = cleanAttrs(svgPath, ATTRS_TO_CLEAN);

      iconsExport +=
        `export const ${iconVarName} = \`${cleanPaths}\`;\n`;
      categoryContent += `    '${iconName}': ${iconVarName},\n`;

      ++iconsCount;
    });
    categoryContent += '  }\n};\n';

    fs.writeFileSync(
      path.join(monochromeDist, categoryName, 'index.js'),
      `${iconsExport}\n${categoryContent}`,
    );

    const typesContent = iconsExport
      .split('\n')
      .filter(line => line.trim())
      .map(line => line.replace(/export const (\w+) = `.+`;/, 'export declare const $1: string;'))
      .join('\n') + `\n\nexport declare const ${categoryVarName}: {\n  name: string;\n  shapes: {\n    [key: string]: string;\n  };\n};\n`;

    fs.writeFileSync(
      path.join(monochromeDist, categoryName, 'index.d.ts'),
      typesContent,
    );
  });

  libraryContent += `\nexport const icons = [ ${categoriesList.join(', ')} ];\n`;
  fs.writeFileSync(path.join(monochromeDist, 'index.js'), libraryContent);

  const rootDtsContent = `export declare const icons: readonly Array<{ name: string; shapes: { [key: string]: string } }>;`
  fs.writeFileSync(path.join(monochromeDist, 'index.d.ts'), rootDtsContent);

  console.log('\x1b[32m', `Consts prepared for ${iconsCount} monochrome icons in ${Date.now() - timeStart} ms.`);
}

const buildColorIcons = () => {
  const colorDist = path.join(DIST_PATH, 'color');
  ensureDir(colorDist);

  const icons = fs.readdirSync(COLOR_ICONS_DIR_SRC);
  if (!icons?.length) {
    console.warn('Color source folder is empty');
    return [];
  }

  console.log('\x1b[32m', `Found ${icons.length} color icons.`);
  const iconNames = [];

  icons.forEach((icon) => {
    if (/^\..+/.test(icon)) {
      return;
    }

    checkCyrilicChars(icon);
    const iconContent = fs.readFileSync(path.join(COLOR_ICONS_DIR_SRC, icon));
    const iconName = icon.toLowerCase().replace(FILE_POSTFIX, '').replace(/_|\s/gi, '-');

    iconNames.push(iconName);
    fs.writeFileSync(path.join(colorDist, `${iconName}.svg`), iconContent);
  });

  console.log('\x1b[32m', `Finished generating ${iconNames.length} color icons.`);
  return iconNames;
};

const generateIndexFiles = (monochromeMap, colorList) => {
  const iconNames = Object.keys(monochromeMap);
  const colorIcons = colorList.map(name => `${name}.svg`);

  const jsContent = `/** AUTO-GENERATED FILE - DO NOT EDIT **/
export const CATEGORY_BY_ICON_NAME = ${JSON.stringify(monochromeMap, null, 4)};

export const MONOCHROME_ICON_NAMES = ${JSON.stringify(iconNames, null, 4)};

export const COLOR_ICONS_LIST = ${JSON.stringify(colorIcons, null, 4)};
`;

  const typesContent = `/** AUTO-GENERATED FILE - DO NOT EDIT **/

export declare const CATEGORY_BY_ICON_NAME: {
${iconNames.map(name => `    readonly "${name}": "${monochromeMap[name]}";`).join('\n')}
};

export declare const MONOCHROME_ICON_NAMES: readonly string[];

export declare const COLOR_ICONS_LIST: readonly string[];

export type MonochromeIconName = keyof typeof CATEGORY_BY_ICON_NAME;
export type ColorIconName = typeof COLOR_ICONS_LIST[number];
`;

  fs.writeFileSync(path.join(DIST_PATH, 'index.js'), jsContent);
  fs.writeFileSync(path.join(DIST_PATH, 'index.d.ts'), typesContent);

  console.log('\x1b[32m', 'Generated index files.');
};

const build = () => {
  console.log('\x1b[36m', 'Starting build...\n');

  cleanDist();
  const monochromeMap = buildMonochromeIcons();
  prepareMonochromeIconsConsts();
  const colorList = buildColorIcons();
  generateIndexFiles(monochromeMap, colorList);

  console.log('\n\x1b[36m', 'Build completed successfully!');
};

module.exports = {
  build,
  buildMonochromeIcons,
  prepareMonochromeIconsConsts,
  buildColorIcons,
};
