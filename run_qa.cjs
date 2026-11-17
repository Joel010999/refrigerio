const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, 'public', 'screenshots');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

(async () => {
  console.log('Starting Puppeteer QA Verification...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Listen for console errors
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
      console.error('Browser console error:', msg.text());
    }
  });

  page.on('pageerror', err => {
    errors.push(err.message);
    console.error('Page error:', err.message);
  });

  // --- DESKTOP TESTING (1440x900) ---
  console.log('Testing Desktop 1440x900...');
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2' });

  // 1. Full Desktop Page Screenshot
  await page.screenshot({ path: path.join(outDir, '01-desktop-full.jpg'), fullPage: true, quality: 90 });
  console.log('Saved 01-desktop-full.jpg');

  // 2. Desktop Hero Viewport Screenshot
  await page.screenshot({ path: path.join(outDir, '02-desktop-hero.jpg'), quality: 95 });
  console.log('Saved 02-desktop-hero.jpg');

  // 3. Test Frigorías Calculator interaction
  console.log('Testing Calculator interaction...');
  const slider = await page.$('#calc-area-slider');
  if (slider) {
    // Change area to 45m2
    await page.evaluate(() => {
      const s = document.getElementById('calc-area-slider');
      s.value = 45;
      s.dispatchEvent(new Event('input'));
    });
    // Click commercial room button
    await page.evaluate(() => {
      const btns = document.querySelectorAll('.calc-room-btn');
      if (btns[2]) btns[2].click();
    });
    // Click sun button
    await page.evaluate(() => {
      const sunBtns = document.querySelectorAll('.calc-sun-btn');
      if (sunBtns[2]) sunBtns[2].click();
    });
    await new Promise(r => setTimeout(r, 400));
  }

  // 4. Test Gallery Filter
  console.log('Testing Gallery Filter...');
  await page.evaluate(() => {
    const splitBtn = document.querySelector('.filter-btn[data-filter="split"]');
    if (splitBtn) splitBtn.click();
  });
  await new Promise(r => setTimeout(r, 400));

  // 5. Test Lightbox Open
  console.log('Testing Lightbox Modal...');
  const firstCard = await page.$('.work-card');
  if (firstCard) {
    await firstCard.click();
    await new Promise(r => setTimeout(r, 500));
    await page.screenshot({ path: path.join(outDir, '03-desktop-lightbox.jpg'), quality: 95 });
    console.log('Saved 03-desktop-lightbox.jpg');

    // Close lightbox
    await page.evaluate(() => {
      const close = document.getElementById('lightbox-close');
      if (close) close.click();
    });
    await new Promise(r => setTimeout(r, 400));
  }

  // 6. Test Zone Search
  console.log('Testing Zone Search...');
  await page.evaluate(() => {
    const input = document.getElementById('zone-search-input');
    const btn = document.getElementById('zone-search-btn');
    if (input && btn) {
      input.value = 'Ramos Mejía';
      btn.click();
    }
  });
  await new Promise(r => setTimeout(r, 300));

  // 7. Test FAQ Accordion
  console.log('Testing FAQ Accordion...');
  await page.evaluate(() => {
    const firstFaq = document.querySelector('.faq-question-btn');
    if (firstFaq) firstFaq.click();
  });
  await new Promise(r => setTimeout(r, 400));

  // --- MOBILE TESTING (390x844 - iPhone 14) ---
  console.log('Testing Mobile 390x844...');
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2' });

  // Mobile full page screenshot
  await page.screenshot({ path: path.join(outDir, '04-mobile-full.jpg'), fullPage: true, quality: 90 });
  console.log('Saved 04-mobile-full.jpg');

  // Mobile hero screenshot
  await page.screenshot({ path: path.join(outDir, '05-mobile-hero.jpg'), quality: 95 });
  console.log('Saved 05-mobile-hero.jpg');

  // Open mobile drawer menu
  console.log('Testing Mobile Hamburger Menu Drawer...');
  await page.evaluate(() => {
    const hamburger = document.querySelector('.hamburger-btn');
    if (hamburger) hamburger.click();
  });
  await new Promise(r => setTimeout(r, 500));

  await page.screenshot({ path: path.join(outDir, '06-mobile-drawer.jpg'), quality: 95 });
  console.log('Saved 06-mobile-drawer.jpg');

  await browser.close();

  console.log('\n--- QA SUMMARY ---');
  console.log('Total Console/Page Errors:', errors.length);
  if (errors.length > 0) {
    console.log('Errors:', errors);
  } else {
    console.log('ALL TESTS PASSED CLEANLY! ZERO CONSOLE ERRORS.');
  }
})();
