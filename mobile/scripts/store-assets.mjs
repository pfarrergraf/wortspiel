import { chromium } from "../../frontend/node_modules/@playwright/test/index.mjs";
import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = new URL("../../", import.meta.url);
const assets = new URL("docs/play-store/assets/", root);
await mkdir(assets, { recursive: true });
await copyFile(new URL("frontend/public/icon-512.png", root), new URL("icon-512.png", assets));
const browser = await chromium.launch({ channel: process.env.CI ? undefined : "chrome", headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1024, height: 500 }, deviceScaleFactor: 1 });
  await page.goto(new URL("docs/play-store/feature-graphic.html", root).href);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: fileURLToPath(new URL("feature-graphic.png", assets)) });
  const svg = await readFile(new URL("frontend/public/icon.svg", root), "utf8");
  for (const [density, size] of [["mdpi", 48], ["hdpi", 72], ["xhdpi", 96], ["xxhdpi", 144], ["xxxhdpi", 192]]) {
    const base64 = await page.evaluate(async ({ svg, size }) => {
      const image = new Image();
      image.src = "data:image/svg+xml;base64," + btoa(svg);
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = size;
      const context = canvas.getContext("2d");
      context.fillStyle = "#faf7ef"; context.fillRect(0, 0, size, size);
      context.drawImage(image, 0, 0, size, size);
      return canvas.toDataURL("image/png").split(",")[1];
    }, { svg, size });
    for (const name of ["ic_launcher.png", "ic_launcher_round.png"])
      await writeFile(new URL(`mobile/android/app/src/main/res/mipmap-${density}/${name}`, root), Buffer.from(base64, "base64"));
  }
} finally { await browser.close(); }
console.log("Store icon 512×512, feature graphic 1024×500 and Android launcher icons generated from repository artwork.");
