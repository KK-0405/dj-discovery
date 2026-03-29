import puppeteer from 'puppeteer';
import path from 'path';

const BASE = 'https://ripplefm.vercel.app';
const wait = ms => new Promise(r => setTimeout(r, ms));

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'], timeout: 0 });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 30000 });
await page.evaluate(() => localStorage.setItem('dj_sidebar_v1', '0'));
await page.reload({ waitUntil: 'networkidle2' });
await wait(2000);

// 検索
const input = await page.$('input');
const box = await input.boundingBox();
await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
await input.type('billie jean', { delay: 60 });
await wait(600);
await page.evaluate(() =>
  Array.from(document.querySelectorAll('button')).find(b => b.textContent?.trim() === '検索')?.click()
);
await wait(4000);

// メインSeedに設定
await page.evaluate(() =>
  Array.from(document.querySelectorAll('button')).find(b => b.textContent?.trim() === 'メイン')?.click()
);
await wait(2000);

// 類似曲探索
let apiDone = false;
page.on('response', r => { if (r.url().includes('/api/similar')) apiDone = true; });
await page.evaluate(() =>
  Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('類似曲を探索'))?.click()
);
for (let i = 0; i < 30; i++) {
  await wait(3000);
  if (apiDone) { console.log(`API done at ${(i+1)*3}s`); break; }
}
await wait(8000);
console.log('Similar results loaded');

// 類似曲の一覧から2番目の曲をクリック（AIの選択理由が含まれるはず）
const trackClicked = await page.evaluate(() => {
  // 類似曲リスト内のトラック行を探す（「リスト」ボタンがある行）
  const listBtns = Array.from(document.querySelectorAll('button'))
    .filter(b => b.textContent?.trim() === 'リスト');

  if (listBtns.length === 0) {
    console.log('No list buttons found');
    return false;
  }

  // 2番目のトラック行をクリック
  const btn = listBtns[1] || listBtns[0];
  let container = btn;
  for (let i = 0; i < 8; i++) {
    container = container.parentElement;
    if (!container) break;
    if (container.getBoundingClientRect().width > 500) break;
  }
  const rect = container.getBoundingClientRect();
  return { x: rect.left + 80, y: rect.top + rect.height / 2, text: container.innerText?.slice(0, 50) };
});

console.log('Track to click:', trackClicked);

if (trackClicked && trackClicked.x) {
  await page.mouse.click(trackClicked.x, trackClicked.y);
  await wait(2500);
}

// AIの選択理由があるか確認
const pageState = await page.evaluate(() => {
  const body = document.body.innerText;
  return {
    hasBPM: body.includes('BPM'),
    hasReason: body.includes('理由') || body.includes('選ばれ') || body.includes('なぜ'),
    hasEnergy: body.includes('%'),
    snippet: body.slice(0, 300),
  };
});
console.log('Page state:', pageState);

await page.screenshot({ path: 'screenshots/similar_detail.png' });
console.log('Saved: screenshots/similar_detail.png');

await browser.close();
