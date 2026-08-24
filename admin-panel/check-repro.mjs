import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 800 } });
const path = '/C:/Users/root/AppData/Local/Temp/claude/c--Users-root-Documents-Silknode---Support/1f085014-8194-4320-9bbc-3ce82db6e2c4/scratchpad/repro.html';
await page.goto('file://' + path);
const report = await page.evaluate(() => window.__report());
console.log(JSON.stringify(report, null, 2));
await browser.close();
