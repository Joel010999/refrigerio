const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, 'public', 'screenshots');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 400;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 120);
    });
  });
  // Wait for all lazy images and reveal transitions to complete
  await page.evaluate(async () => {
    const imgs = Array.from(document.querySelectorAll('img')).filter(img => img.id !== 'lightbox-img');
    await Promise.all(imgs.map(img => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return new Promise(res => {
        img.addEventListener('load', res, { once: true });
        img.addEventListener('error', res, { once: true });
        setTimeout(res, 3000);
      });
    }));
  });
  await new Promise(r => setTimeout(r, 900));
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise(r => setTimeout(r, 400));
}

(async () => {
  console.log('Starting Puppeteer QA Verification...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

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

  // Scroll through entire page so lazy images and motion-reveal trigger
  await autoScroll(page);

  // Check all images loaded cleanly
  const imgReport = await page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll('img')).filter(img => img.id !== 'lightbox-img');
    const broken = imgs.filter(img => !img.complete || img.naturalWidth === 0).map(img => img.src);
    return { total: imgs.length, broken };
  });
  console.log(`Images checked: ${imgReport.total}, broken: ${imgReport.broken.length}`);
  if (imgReport.broken.length) console.error('Broken images:', imgReport.broken);

  // Check horizontal overflow
  const overflowDesktop = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  console.log('Desktop horizontal overflow:', overflowDesktop);

  // 1. Desktop Hero Viewport Screenshot
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise(r => setTimeout(r, 300));
  await page.screenshot({ path: path.join(outDir, '02-desktop-hero.jpg'), quality: 95 });
  console.log('Saved 02-desktop-hero.jpg');

  // 2. Services Section Screenshot
  const servicesEl = await page.$('#servicios');
  if (servicesEl) {
    await servicesEl.screenshot({ path: path.join(outDir, 'preview-services-editorial.jpg'), quality: 92 });
    console.log('Saved preview-services-editorial.jpg');
  }

  // 3. Gallery Section Screenshot
  const galleryEl = await page.$('#proyectos');
  if (galleryEl) {
    await galleryEl.screenshot({ path: path.join(outDir, 'preview-gallery-editorial.jpg'), quality: 92 });
    console.log('Saved preview-gallery-editorial.jpg');
  }

  // 4. Full Desktop Page Screenshot
  await page.screenshot({ path: path.join(outDir, '01-desktop-full.jpg'), fullPage: true, quality: 88 });
  console.log('Saved 01-desktop-full.jpg');

  // 5. Test Calculator interaction
  console.log('Testing Calculator interaction...');
  await page.evaluate(() => {
    const s = document.getElementById('calc-area-slider');
    if (s) {
      s.value = 45;
      s.dispatchEvent(new Event('input'));
    }
    const btns = document.querySelectorAll('.calc-room-btn');
    if (btns[2]) btns[2].click();
    const sunBtns = document.querySelectorAll('.calc-sun-btn');
    if (sunBtns[2]) sunBtns[2].click();
  });
  await new Promise(r => setTimeout(r, 300));

  // 6. Test Gallery Filter & Lightbox
  console.log('Testing Gallery Filter & Lightbox...');
  await page.evaluate(() => {
    const serviceBtn = document.querySelector('.filter-pill[data-filter="service"]');
    if (serviceBtn) serviceBtn.click();
    const allBtn = document.querySelector('.filter-pill[data-filter="all"]');
    if (allBtn) allBtn.click();
  });
  await new Promise(r => setTimeout(r, 400));

  const firstCard = await page.$('.gallery-card-item');
  if (firstCard) {
    await firstCard.click();
    await new Promise(r => setTimeout(r, 500));
    await page.screenshot({ path: path.join(outDir, '03-desktop-lightbox.jpg'), quality: 95 });
    console.log('Saved 03-desktop-lightbox.jpg');
    await page.evaluate(() => document.getElementById('lightbox-close')?.click());
    await new Promise(r => setTimeout(r, 300));
  }

  // --- MOBILE TESTING (390x844) ---
  console.log('Testing Mobile 390x844...');
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2' });
  await autoScroll(page);

  const overflowMobile = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  console.log('Mobile horizontal overflow:', overflowMobile);

  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise(r => setTimeout(r, 300));
  await page.screenshot({ path: path.join(outDir, '05-mobile-hero.jpg'), quality: 95 });
  console.log('Saved 05-mobile-hero.jpg');

  await page.screenshot({ path: path.join(outDir, '04-mobile-full.jpg'), fullPage: true, quality: 88 });
  console.log('Saved 04-mobile-full.jpg');

  await page.evaluate(() => document.querySelector('.hamburger-btn')?.click());
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(outDir, '06-mobile-drawer.jpg'), quality: 95 });
  console.log('Saved 06-mobile-drawer.jpg');

  await browser.close();

  console.log('\n--- QA SUMMARY ---');
  console.log('Total Console/Page Errors:', errors.length);
  console.log('Broken Images:', imgReport.broken.length);
  console.log('Desktop Overflow:', overflowDesktop, '| Mobile Overflow:', overflowMobile);
})();
