/**
 * Post-build pre-rendering script.
 * Uses Playwright to render the landing page and inject the HTML into dist/index.html
 * so that search engines see real content instead of an empty <div id="root">.
 */
import { chromium } from '@playwright/test';
import { createServer } from 'vite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, '..', 'dist');

async function prerender() {
  // 1. Start a local preview server from the dist folder
  const server = await createServer({
    root: DIST,
    server: { port: 4567, strictPort: true },
    logLevel: 'silent',
  });
  await server.listen();
  console.log('[prerender] Preview server started on :4567');

  // 2. Launch headless browser
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // 3. Navigate to landing page and wait for content to render
  await page.goto('http://localhost:4567/', { waitUntil: 'networkidle' });
  // Wait a bit for typing animation to complete so full H1 text is in DOM
  await page.waitForTimeout(3000);

  // 4. Extract the rendered HTML inside #root
  const rootHTML = await page.evaluate(() => {
    return document.getElementById('root')?.innerHTML ?? '';
  });

  await browser.close();
  await server.close();
  console.log(`[prerender] Captured ${(rootHTML.length / 1024).toFixed(1)}KB of rendered HTML`);

  // 5. Inject the rendered HTML into dist/index.html
  const indexPath = path.join(DIST, 'index.html');
  let html = fs.readFileSync(indexPath, 'utf-8');
  html = html.replace(
    '<div id="root"></div>',
    `<div id="root">${rootHTML}</div>`
  );
  fs.writeFileSync(indexPath, html, 'utf-8');
  console.log('[prerender] Wrote pre-rendered index.html');

  // 6. Also write to 404.html so GitHub Pages SPA fallback has the same content
  const fourOhFourPath = path.join(DIST, '404.html');
  if (fs.existsSync(fourOhFourPath)) {
    // Keep the 404.html redirect script but don't need prerendered content there
    console.log('[prerender] Skipped 404.html (redirect-only)');
  }
}

prerender().catch((err) => {
  console.error('[prerender] Failed:', err);
  process.exit(1);
});
