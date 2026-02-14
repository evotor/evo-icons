const fs = require('fs');
const path = require('path');
const rmdir = require('rimraf');

const SRC_PATH = path.join(__dirname, '..', 'src');
const DIST_PATH = path.join(__dirname, '..', 'dist');
const ICONS_DIR_SRC = path.join(SRC_PATH, 'monochrome');
const COLOR_ICONS_DIR_SRC = path.join(SRC_PATH, 'color');
const FILE_POSTFIX = /(_24px)?\.svg/;
const ATTRS_TO_CLEAN = ['fill'];

const prepaceContent = (content) => {
    const str = content.toString();
    const svgExp = /(\<svg\s.*\>)|(\<\/svg>)|\n/g;
    return `<svg xmlns="http://www.w3.org/2000/svg">${str.replace(svgExp, '').trim()}</svg>`;
};

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

        icons.forEach((icon) => {
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

            const svgContent = prepaceContent(rawIconContent);
            const cleanPaths = cleanAttrs(svgContent, ATTRS_TO_CLEAN);
            fs.writeFileSync(path.join(categoryDist, iconName + '.svg'), cleanPaths);
            iconsNames[iconName] = categoryName;
            ++iconsCount;
        });
    });

    console.log('\x1b[32m', `Converted ${iconsCount} monochrome icons in ${Date.now() - timeStart} ms.`);
    return iconsNames;
};

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
    // Generate JS/TS files with constants
    const indexContent = `/** AUTO-GENERATED FILE - DO NOT EDIT **/
export const CATEGORY_BY_ICON_NAME = ${JSON.stringify(monochromeMap, null, 4)} as const;

export const MONOCHROME_ICON_NAMES = Object.keys(CATEGORY_BY_ICON_NAME) as Array<keyof typeof CATEGORY_BY_ICON_NAME>;

export const COLOR_ICONS_LIST = ${JSON.stringify(colorList.map(name => `${name}.svg`), null, 4)} as const;

export type MonochromeIconName = keyof typeof CATEGORY_BY_ICON_NAME;
export type ColorIconName = typeof COLOR_ICONS_LIST[number];
`;

    fs.writeFileSync(path.join(DIST_PATH, 'index.js'), indexContent.replace(/ as const/g, '').replace(/: keyof typeof CATEGORY_BY_ICON_NAME/g, ''));
    fs.writeFileSync(path.join(DIST_PATH, 'index.d.ts'), indexContent);
    
    console.log('\x1b[32m', 'Generated index files.');
};

const build = () => {
    console.log('\x1b[36m', 'Starting build...\n');
    
    cleanDist();
    const monochromeMap = buildMonochromeIcons();
    const colorList = buildColorIcons();
    generateIndexFiles(monochromeMap, colorList);
    
    console.log('\n\x1b[36m', 'Build completed successfully!');
};

module.exports = {
    build,
    buildMonochromeIcons,
    buildColorIcons,
};
