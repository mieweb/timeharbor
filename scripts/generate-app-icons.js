/**
 * Generates Cordova app icon sizes from public/timeharbor-icon.png.
 * Run: node scripts/generate-app-icons.js
 * Requires: npm install --save-dev sharp
 */
const path = require('path');
const fs = require('fs');

const root = path.join(__dirname, '..');
const source = path.join(root, 'public', 'timeharbor-icon.png');
const outDir = path.join(root, 'resources', 'icons');

const sizes = [
  36, 48, 60, 72, 76, 96, 120, 144, 152, 180, 192
];

if (!fs.existsSync(source)) {
  console.error('Source icon not found:', source);
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });

let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.error('Run: npm install --save-dev sharp');
  process.exit(1);
}

(async () => {
  const pipeline = sharp(source);
  for (const size of sizes) {
    const outPath = path.join(outDir, `icon-${size}.png`);
    await pipeline
      .clone()
      .resize(size, size)
      .png()
      .toFile(outPath);
    console.log('Written', outPath);
  }
  console.log('Done. Icon set in resources/icons/');
})();
