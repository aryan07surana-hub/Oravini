import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const ctx = await browser.newContext();
const page = await ctx.newPage();

const errors = [];
page.on('pageerror', (err) => errors.push([err.message, err.stack?.slice(0, 1500)]));
page.on('console', (msg) => { if (msg.type() === 'error') console.log('CONSOLE_ERROR:', msg.text().slice(0, 500)); });

await page.goto('http://localhost:5050/login');
await page.fill('input[type="email"]', 'admin@brandverse.com');
await page.fill('input[type="password"]', 'Brandverse@2024');
await page.click('button[type="submit"]');
await page.waitForTimeout(2000);

await page.goto('http://localhost:5050/video-marketing');
await page.waitForTimeout(3000);

// Open create dialog
await page.evaluate(() => [...document.querySelectorAll('button')].find(b => b.innerText.includes('NEW EVENT'))?.click());
await page.waitForTimeout(1000);

// Fill in title
await page.fill('input[placeholder*="Scale Your Business"]', 'Test Webinar');
await page.waitForTimeout(500);

// Click create
await page.evaluate(() => [...document.querySelectorAll('button')].find(b => b.innerText.trim() === 'Create Webinar')?.click());
await page.waitForTimeout(2500);

// After creation, check page still works
console.log('After create — URL:', page.url());

// Click "STUDIO" or "GO LIVE" button on the new webinar
const buttons = await page.evaluate(() => [...document.querySelectorAll('button')].map(b => b.innerText.trim()));
console.log('Buttons present:', buttons.filter(b => b.length < 30 && b.length > 0).slice(0, 30));

// Try clicking GO LIVE
console.log('\nTrying GO LIVE...');
await page.evaluate(() => [...document.querySelectorAll('button')].find(b => b.innerText.trim() === 'GO LIVE')?.click());
await page.waitForTimeout(2000);

// Try STUDIO
console.log('\nTrying STUDIO...');
await page.evaluate(() => [...document.querySelectorAll('button')].find(b => b.innerText.trim() === 'STUDIO')?.click());
await page.waitForTimeout(3000);

console.log('After STUDIO — URL:', page.url());

console.log('\n=== ERRORS ===');
errors.forEach(([msg, stack]) => {
  console.log('ERROR:', msg);
  if (stack) console.log(stack);
});

await browser.close();
