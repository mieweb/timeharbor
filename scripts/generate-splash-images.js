/**
 * Generates Cordova splash screen sizes from public/timeharbor-icon.png.
 * Run: node scripts/generate-splash-images.js
 * Requires: npm install --save-dev sharp
 */
const path = require('path');
const fs = require('fs');

const root = path.join(__dirname, '..');
const source = path.join(root, 'public', 'timeharbor-icon.png');
const outDir = path.join(root, 'resources', 'splash');

const sizes = [
  { name: 'iphone', w: 320, h: 480 },
  { name: 'iphone_2x', w: 640, h: 960 },
  { name: 'iphone5', w: 640, h: 1136 },
  { name: 'iphone6', w: 750, h: 1334 },
  { name: 'iphone6p', w: 1242, h: 2208 },
  { name: 'ipad', w: 768, h: 1024 },
  { name: 'ipad_2x', w: 1536, h: 2048 },
  { name: 'android_mdpi', w: 320, h: 480 },
  { name: 'android_hdpi', w: 480, h: 800 },
  { name: 'android_xhdpi', w: 720, h: 1280 },
  { name: 'android_xxhdpi', w: 960, h: 1600 },
  { name: 'android_xxxhdpi', w: 1280, h: 1920 }
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

const background = { r: 15, g: 23, b: 42, alpha: 1 }; // slate-900

(async () => {
  const icon = await sharp(source).png().toBuffer();

  for (const size of sizes) {
    const iconSize = Math.round(Math.min(size.w, size.h) * 0.28);
    const overlay = await sharp(icon)
      .resize(iconSize, iconSize)
      .toBuffer();

    const outPath = path.join(outDir, `${size.name}.png`);

    await sharp({
      create: {
        width: size.w,
        height: size.h,
        channels: 4,
        background
      }
    })
      .composite([
        {
          input: overlay,
          left: Math.round((size.w - iconSize) / 2),
          top: Math.round((size.h - iconSize) / 2)
        }
      ])
      .png()
      .toFile(outPath);

    console.log('Written', outPath);
  }

  console.log('Done. Splash set in resources/splash/');
})();
