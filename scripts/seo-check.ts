import fs from 'fs';
import path from 'path';
import { PUBLIC_SEO, SITE_URL } from '../src/app/components/SeoManager';

let failedChecks = 0;
let passedChecks = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passedChecks++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failedChecks++;
  }
}

async function runSeoChecks() {
  console.log('====================================================');
  console.log('       HUSIMI TECHNICAL SEO VERIFICATION SUITE       ');
  console.log('====================================================\n');

  // --- 1. SITEMAP.XML VERIFICATION ---
  console.log('[1] Verifying public/sitemap.xml...');
  const sitemapPath = path.resolve(process.cwd(), 'public/sitemap.xml');
  assert(fs.existsSync(sitemapPath), 'public/sitemap.xml exists');
  const sitemapXml = fs.readFileSync(sitemapPath, 'utf8');

  // Parse locs
  const locMatches = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  assert(locMatches.length > 0, `Sitemap contains ${locMatches.length} URLs`);

  const seenUrls = new Set<string>();
  for (const loc of locMatches) {
    assert(loc.startsWith('https://husimisolutions.com'), `URL uses canonical origin: ${loc}`);
    if (loc !== 'https://husimisolutions.com/') {
      assert(!loc.endsWith('/'), `No trailing slash on subpage: ${loc}`);
    }
    assert(!loc.includes('/pricing'), `Ghost route /pricing is NOT in sitemap: ${loc}`);
    assert(!loc.includes('/workspace'), `Private route /workspace is NOT in sitemap: ${loc}`);
    assert(!loc.includes('/auth'), `Private route /auth is NOT in sitemap: ${loc}`);
    assert(!loc.includes('/ocr'), `Private route /ocr is NOT in sitemap: ${loc}`);
    assert(!seenUrls.has(loc), `No duplicate URLs in sitemap: ${loc}`);
    seenUrls.add(loc);
  }

  // --- 2. ROBOTS.TXT VERIFICATION ---
  console.log('\n[2] Verifying public/robots.txt...');
  const robotsPath = path.resolve(process.cwd(), 'public/robots.txt');
  assert(fs.existsSync(robotsPath), 'public/robots.txt exists');
  const robotsTxt = fs.readFileSync(robotsPath, 'utf8');
  assert(robotsTxt.includes('Allow: /'), 'Allows root crawling');
  assert(robotsTxt.includes('Disallow: /workspace'), 'Disallows /workspace');
  assert(robotsTxt.includes('Disallow: /auth/'), 'Disallows /auth/');
  assert(robotsTxt.includes('Disallow: /ocr'), 'Disallows /ocr');
  assert(robotsTxt.includes('Sitemap: https://husimisolutions.com/sitemap.xml'), 'References production sitemap URL');

  // --- 3. METADATA & STRUCTURED DATA COHERENCE ---
  console.log('\n[3] Verifying Metadata & JSON-LD in PUBLIC_SEO...');
  const titles = new Set<string>();
  const descriptions = new Set<string>();

  for (const [route, config] of Object.entries(PUBLIC_SEO)) {
    assert(config.title.length >= 25 && config.title.length <= 75, `Title length (${config.title.length} chars) optimal for ${route}: "${config.title}"`);
    assert(config.title.includes('Husimi'), `Title incorporates brand for ${route}`);
    assert(!titles.has(config.title), `Title is unique for ${route}`);
    titles.add(config.title);

    assert(config.description.length >= 80 && config.description.length <= 200, `Description length (${config.description.length} chars) optimal for ${route}`);
    assert(!descriptions.has(config.description), `Description is unique for ${route}`);
    descriptions.add(config.description);

    assert(config.canonical ? config.canonical.startsWith('/') : false, `Valid relative canonical target for ${route}`);

    if (config.structuredData) {
      try {
        const str = JSON.stringify(config.structuredData);
        assert(str.length > 20, `Structured data valid JSON for ${route}`);
      } catch {
        assert(false, `Structured data failed to serialize for ${route}`);
      }
    }
  }

  // --- 4. PRERENDERED HTML ARTIFACTS VERIFICATION ---
  console.log('\n[4] Verifying Prerendered Static HTML Files in dist/...');
  const distDir = path.resolve(process.cwd(), 'dist');
  assert(fs.existsSync(distDir), 'dist/ directory exists');

  for (const loc of locMatches) {
    const urlObj = new URL(loc);
    const pathname = urlObj.pathname;
    const targetFile = pathname === '/'
      ? path.join(distDir, 'index.html')
      : path.join(distDir, pathname.slice(1), 'index.html');

    assert(fs.existsSync(targetFile), `Prerendered file exists: ${path.relative(distDir, targetFile)}`);
    if (fs.existsSync(targetFile)) {
      const html = fs.readFileSync(targetFile, 'utf8');
      assert(html.length > 5000, `File has substantial prerendered content (${html.length} bytes): ${pathname}`);
      assert(html.includes('<h1'), `File contains rendered <h1> tag: ${pathname}`);
      assert(html.includes('<title>'), `File contains <title>: ${pathname}`);
      assert(html.includes('rel="canonical"'), `File contains canonical link: ${pathname}`);
      assert(html.includes('name="description"'), `File contains meta description: ${pathname}`);
      assert(!html.includes('<div id="root"></div>'), `Root is NOT empty (contains SSR/prerendered DOM): ${pathname}`);
    }
  }

  // Verify 404.html
  const notFoundPath = path.join(distDir, '404.html');
  assert(fs.existsSync(notFoundPath), 'dist/404.html exists');
  if (fs.existsSync(notFoundPath)) {
    const notFoundHtml = fs.readFileSync(notFoundPath, 'utf8');
    assert(notFoundHtml.includes('noindex'), '404.html contains noindex directive');
    assert(notFoundHtml.includes('Page not found'), '404.html contains user-friendly error message');
  }

  // --- 5. INTERNAL LINK GRAPH INTEGRITY ---
  console.log('\n[5] Verifying Internal Link Graph in dist/index.html...');
  const homeHtml = fs.readFileSync(path.join(distDir, 'index.html'), 'utf8');
  const hrefMatches = [...homeHtml.matchAll(/<a\s+[^>]*href="(\/[^"#?]*)"/g)].map(m => m[1]);
  assert(hrefMatches.length > 0, `Homepage contains ${hrefMatches.length} internal navigation links`);
  for (const href of hrefMatches) {
    if (href === '/' || href.startsWith('/#') || href.includes('.')) continue;
    assert(PUBLIC_SEO[href] !== undefined, `Internal link resolves to known indexable route: ${href}`);
  }

  console.log('\n====================================================');
  console.log(`TOTAL CHECKS: ${passedChecks + failedChecks} | PASSED: ${passedChecks} | FAILED: ${failedChecks}`);
  console.log('====================================================\n');

  if (failedChecks > 0) {
    process.exit(1);
  }
}

runSeoChecks().catch(err => {
  console.error('Fatal error in SEO checks:', err);
  process.exit(1);
});
