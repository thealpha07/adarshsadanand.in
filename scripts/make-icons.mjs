// Generates every site icon from one drawing, so the five sites can never drift apart.
// Mark: "Buta A", an A whose crossbar is the gold buta motif from the hero kurta.
// Each site keeps the same mark on its own colour (the design system's site colours).
//
//   node scripts/make-icons.mjs
//
// Writes apps/<app>/public/favicon.svg always, and apple-touch-icon.png (180 px) when
// playwright-core is installed (it renders the SVG in Chromium). Commit the results.
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const GOLD = "#e9c983";
const sites = {
  home: "#1e2a44",   // midnight
  blog: "#2343d1",   // cobalt (Thoughts)
  books: "#0c5e66",  // teal (Library)
  people: "#7b3f8c", // plum (People)
  vault: "#0b0f14",  // night (Vault: darkest, the private one)
};

const BUTA = "M15.6 27.2c-5.6 0-8.7-4.3-8.1-9.1.6-4.5 4.6-6.6 8.1-8.3 2.7-1.3 4-2.9 3.6-5.8 3.9 1.6 6.6 5.4 6.4 10.6-.3 7.5-4.4 12.6-10 12.6z";

/** The mark on a 32-unit grid. `radius` 7 for tabs; 0 for phones, which round corners themselves. */
function icon(bg, radius = 7) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">` +
    `<rect width="32" height="32" rx="${radius}" fill="${bg}"/>` +
    `<path d="M6.5 27 16 5l9.5 22" fill="none" stroke="#fff" stroke-width="3.2"/>` +
    `<g transform="translate(16 20.4) scale(.42) translate(-16 -15.4)">` +
    `<path d="${BUTA}" fill="${GOLD}"/><circle cx="15.2" cy="19.6" r="3.9" fill="${bg}"/><circle cx="15.2" cy="19.6" r="1.6" fill="${GOLD}"/>` +
    `</g></svg>\n`;
}

for (const [app, bg] of Object.entries(sites)) {
  mkdirSync(`apps/${app}/public`, { recursive: true });
  writeFileSync(`apps/${app}/public/favicon.svg`, icon(bg));
}
console.log("favicon.svg written for", Object.keys(sites).join(", "));

let chromium;
try { ({ chromium } = createRequire(import.meta.url)("playwright-core")); } catch { /* optional */ }
if (!chromium) {
  console.log("playwright-core not installed: skipped apple-touch-icon.png");
} else {
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await browser.newPage({ viewport: { width: 180, height: 180 } });
  for (const [app, bg] of Object.entries(sites)) {
    const svg = icon(bg, 0).replace("<svg ", '<svg width="180" height="180" ');
    await page.setContent(`<body style="margin:0">${svg}</body>`);
    await page.screenshot({ path: `apps/${app}/public/apple-touch-icon.png`, omitBackground: false });
  }
  await browser.close();
  console.log("apple-touch-icon.png written");
}
