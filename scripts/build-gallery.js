const fs = require('fs');
const path = require('path');

const DIST_PATH = path.join(__dirname, '..', 'dist');
const GALLERY_PATH = path.join(__dirname, '..', 'gallery');

function getMonochromeIcons() {
  const monochromePath = path.join(DIST_PATH, 'monochrome');
  const categories = fs.readdirSync(monochromePath).filter(f =>
    fs.statSync(path.join(monochromePath, f)).isDirectory()
  );

  const icons = {};
  categories.forEach(category => {
    const categoryPath = path.join(monochromePath, category);
    const files = fs.readdirSync(categoryPath).filter(f => f.endsWith('.svg'));

    files.forEach(file => {
      const name = file.replace('.svg', '');
      icons[name] = category;
    });
  });

  return icons;
}

function getColorIcons() {
  const colorPath = path.join(DIST_PATH, 'color');
  const files = fs.readdirSync(colorPath).filter(f => f.endsWith('.svg'));
  return files;
}

function generateGalleryData() {
  const monochromeIcons = getMonochromeIcons();
  const colorIcons = getColorIcons();

  // Create JavaScript file for gallery
  const jsContent = `// Auto-generated gallery data
const iconsData = {
    CATEGORY_BY_ICON_NAME: ${JSON.stringify(monochromeIcons, null, 4)},
    COLOR_ICONS_LIST: ${JSON.stringify(colorIcons, null, 4)}
};
`;

  fs.writeFileSync(path.join(GALLERY_PATH, 'icons-data.js'), jsContent);
  console.log('✓ Generated gallery data');
}

function copyDistToGallery() {
  const targetPath = path.join(GALLERY_PATH, 'dist');

  if (fs.existsSync(targetPath)) {
    fs.rmSync(targetPath, { recursive: true });
  }

  fs.cpSync(DIST_PATH, targetPath, { recursive: true });
  console.log('✓ Copied dist to gallery');
}

function buildGallery() {
  console.log('Building gallery...\n');
  generateGalleryData();
  copyDistToGallery();
  console.log('\n✓ Gallery build complete');
}

module.exports = { buildGallery };

if (require.main === module) {
  buildGallery();
}
