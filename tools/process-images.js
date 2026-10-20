// Crop/resize raw photos into site-ready assets. Usage: node tools/process-images.js
// Raw sources (assets/raw) are gitignored; processed outputs (assets/*.jpg) are committed.
const Jimp = require("jimp");
const path = require("path");

const raw = path.resolve(__dirname, "../assets/raw");
const out = path.resolve(__dirname, "../assets");

// [source, output, width, height, extra(img)=>void]
const jobs = [
  ["hero-a.jpg", "hero.jpg", 1160, 1160],              // circular hero medallion (G-Class)
  ["hero-b.jpg", "work-1.jpg", 900, 675],              // наши работы — спорткар
  ["work-interior.jpg", "work-2.jpg", 900, 675],       // детейлинг салона
  ["work-wheel.jpg", "work-3.jpg", 900, 675],          // диски / тюнинг
  ["work-wheel2.jpg", "work-4.jpg", 900, 675],         // центрлок GT3
  ["dirty-black.jpg", "ba-before-1.jpg", 840, 630],    // до — грязный кузов
  ["work-bw.jpg", "ba-after-1.jpg", 840, 630],         // после — зеркальный блеск
  ["dirty-suv.jpg", "ba-before-2.jpg", 840, 630],      // до — грязный внедорожник
  ["work-lexus.jpg", "ba-after-2.jpg", 840, 630],      // после — чистый глянец
  ["garage.jpg", "about.jpg", 1100, 760],              // мастерская
];

(async () => {
  for (const [src, dst, w, h, extra] of jobs) {
    const img = await Jimp.read(path.join(raw, src));
    img.cover(w, h);
    if (extra) extra(img);
    img.quality(82);
    await img.writeAsync(path.join(out, dst));
    console.log("->", dst, w + "x" + h);
  }
  console.log("done");
})().catch((e) => { console.error(e); process.exit(1); });
