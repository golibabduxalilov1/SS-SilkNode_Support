import { chromium } from 'playwright';
import path from 'path';

const file = 'file://' + path.resolve('scroll-test.html').replace(/\\/g, '/');
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 800 } });
await page.setViewportSize({ width: 1400, height: 800 });
await page.goto(file);
await page.waitForTimeout(200);

const wrap = await page.$('.table-wrap--split');
const body = await page.$('.table-body-scroll');

const info = await page.evaluate(() => {
  const wrap = document.querySelector('.table-wrap--split');
  const bodyScroll = document.querySelector('.table-body-scroll');
  const content = document.querySelector('.app-content--table-scroll');
  const cs = (el) => el ? getComputedStyle(el) : null;
  return {
    contentHeight: content?.getBoundingClientRect().height,
    contentOverflow: cs(content)?.overflow,
    wrapHeight: wrap?.getBoundingClientRect().height,
    wrapOverflow: cs(wrap)?.overflow,
    bodyScrollHeight: bodyScroll?.scrollHeight,
    bodyClientHeight: bodyScroll?.clientHeight,
    bodyOverflowY: cs(bodyScroll)?.overflowY,
    hasVerticalScroll: bodyScroll ? bodyScroll.scrollHeight > bodyScroll.clientHeight : null,
  };
});
console.log(JSON.stringify(info, null, 2));

await page.screenshot({ path: 'scroll-test.png' });
await browser.close();
