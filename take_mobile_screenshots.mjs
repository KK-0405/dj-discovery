import puppeteer from 'puppeteer';
import { mkdirSync } from 'fs';

mkdirSync('screenshots/mobile', { recursive: true });

const BASE = 'https://ripplefm.vercel.app';

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
  timeout: 0,
});

// iPhone 14 Pro サイズ
const page = await browser.newPage();
await page.setViewport({ width: 393, height: 852, deviceScaleFactor: 3 });
await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1');

const wait = (ms) => new Promise(r => setTimeout(r, ms));

await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 30000 });
await wait(2000);

// ① メイン画面（初期状態）
await page.screenshot({ path: 'screenshots/mobile/01_main.png' });
console.log('01 main done');

// ② 左メニュードロワーを開く（ハンバーガーボタン = 左端のボタン）
await page.evaluate(() => {
  const btns = Array.from(document.querySelectorAll('button'));
  // ハンバーガーアイコンを持つボタン（左端）をクリック
  const menuBtn = btns.find(b => b.querySelector('svg line'));
  menuBtn?.click();
});
await wait(600);
await page.screenshot({ path: 'screenshots/mobile/02_left_drawer.png' });
console.log('02 left drawer done');

// ドロワーを閉じる（背景クリック）
await page.mouse.click(350, 400);
await wait(400);

// ③ 検索を開く（虫眼鏡ボタン）
const searchOpened = await page.evaluate(() => {
  const btns = Array.from(document.querySelectorAll('button'));
  // Try various ways to find search button
  const searchBtn = btns.find(b =>
    b.title === '検索' ||
    b.getAttribute('aria-label') === '検索' ||
    b.getAttribute('aria-label')?.includes('search') ||
    b.getAttribute('aria-label')?.includes('Search')
  );
  if (searchBtn) { searchBtn.click(); return true; }
  // fallback: click top-right area button (search icon usually top-right)
  const topBtns = btns.filter(b => {
    const r = b.getBoundingClientRect();
    return r.top < 70 && r.right > 300 && r.width > 0;
  });
  if (topBtns.length > 0) { topBtns[0].click(); return 'fallback'; }
  return false;
});
console.log('search open result:', searchOpened);
await wait(800);

// 検索ワードを入力
const inputHandle = await page.$('input[type="text"], input[type="search"], input:not([type])');
if (inputHandle) {
  const box = await inputHandle.boundingBox();
  if (box) {
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await wait(300);
    await page.keyboard.type('the weeknd', { delay: 60 });
  }
}
await wait(600);
// Submit search
await page.evaluate(() =>
  Array.from(document.querySelectorAll('button')).find(b => b.textContent?.trim() === '検索')?.click()
);
await wait(5000);
await page.screenshot({ path: 'screenshots/mobile/03_search.png' });
console.log('03 search done');

// ④ メインSeed に設定
await page.evaluate(() =>
  Array.from(document.querySelectorAll('button')).find(b => b.textContent?.trim() === 'メイン')?.click()
);
await wait(1500);

// 検索パネルを閉じる（「キャンセル」ボタンをクリック）
await page.evaluate(() =>
  Array.from(document.querySelectorAll('button')).find(b => b.textContent?.trim() === 'キャンセル')?.click()
);
await wait(1500);

// ⑤ 右パネル（Seed/Playlist）を開く — title="Seed / Playlist"
const panelClicked = await page.evaluate(() => {
  const btn = Array.from(document.querySelectorAll('button')).find(b =>
    b.getAttribute('title') === 'Seed / Playlist'
  );
  if (btn) { btn.click(); return true; }
  return false;
});
console.log('panel btn clicked:', panelClicked);
await wait(600);
await page.screenshot({ path: 'screenshots/mobile/04_right_panel.png' });
console.log('04 right panel done');

// パネルを閉じる
await page.mouse.click(50, 400);
await wait(400);

// ⑥ 類似曲を探索
let apiDone = false;
page.on('response', r => { if (r.url().includes('/api/similar')) apiDone = true; });
await page.evaluate(() =>
  Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('類似曲を探索'))?.click()
);
console.log('Exploring...');
for (let i = 0; i < 30; i++) {
  await wait(5000);
  if (apiDone) break;
  console.log(`  ${(i+1)*5}s...`);
}
await wait(8000);
await page.screenshot({ path: 'screenshots/mobile/05_similar.png' });
console.log('05 similar done');

// ⑦ 詳細パネルを開く
await page.evaluate(() => {
  const listBtns = Array.from(document.querySelectorAll('button')).filter(b => b.textContent?.trim() === 'リスト');
  if (listBtns.length > 0) {
    let el = listBtns[0].parentElement;
    for (let i = 0; i < 4; i++) el = el?.parentElement ?? el;
    el?.click();
  }
});
await wait(2000);
await page.screenshot({ path: 'screenshots/mobile/06_detail.png' });
console.log('06 detail done');

await browser.close();
console.log('\nAll done! → screenshots/mobile/');
