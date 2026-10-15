import fs from 'fs';
import path from 'path';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { LandingPage } from '../src/app/pages/LandingPage';
import { ServicesPage } from '../src/app/pages/ServicesPage';
import { SolutionsPage } from '../src/app/pages/SolutionsPage';
import { ResourcesPage } from '../src/app/pages/ResourcesPage';
import { CompanyPage } from '../src/app/pages/CompanyPage';
import { ContactPage } from '../src/app/pages/ContactPage';
import { ChangelogPage } from '../src/app/pages/ChangelogPage';
import { StatusPage } from '../src/app/pages/StatusPage';
import { DocumentationPage } from '../src/app/pages/DocumentationPage';
import { SamplePackagePage } from '../src/app/pages/resources/SamplePackagePage';
import { SourcePdfPage } from '../src/app/pages/resources/SourcePdfPage';
import { PUBLIC_SEO, SITE_URL, DEFAULT_IMAGE } from '../src/app/components/SeoManager';
import { AuthProvider } from '../src/contexts/AuthContext';
import { ThemeContext } from '../src/contexts/ThemeContext';

const routeComponentMap: Record<string, React.ComponentType> = {
  '/': LandingPage,
  '/services': ServicesPage,
  '/solutions': SolutionsPage,
  '/resources': ResourcesPage,
  '/company': CompanyPage,
  '/contact': ContactPage,
  '/changelog': ChangelogPage,
  '/status': StatusPage,
  '/documentation': DocumentationPage,
  '/resources/sample-package': SamplePackagePage,
  '/resources/source-pdf': SourcePdfPage,
};

function renderComponent(Component: React.ComponentType, routePath: string): string {
  return renderToString(
    React.createElement(
      ThemeContext.Provider,
      { value: { isDark: false, toggleTheme: () => {} } },
      React.createElement(
        AuthProvider,
        null,
        React.createElement(
          MemoryRouter,
          { initialEntries: [routePath] },
          React.createElement(Component)
        )
      )
    )
  );
}

function replaceMeta(html: string, attr: 'name' | 'property', key: string, content: string): string {
  const regex = new RegExp(`<meta[\\s\\S]*?${attr}=["']${key}["'][\\s\\S]*?>`, 'i');
  const replacement = `<meta ${attr}="${key}" content="${content.replace(/"/g, '&quot;')}" />`;
  if (regex.test(html)) {
    return html.replace(regex, replacement);
  }
  return html.replace('</head>', `    ${replacement}\n  </head>`);
}

function prerender() {
  const distDir = path.resolve(process.cwd(), 'dist');
  const templatePath = path.join(distDir, 'index.html');

  if (!fs.existsSync(templatePath)) {
    console.error('dist/index.html not found! Run vite build first.');
    process.exit(1);
  }

  const rawTemplate = fs.readFileSync(templatePath, 'utf8');

  console.log('--- Starting Prerender for Public Routes ---');

  for (const [route, Component] of Object.entries(routeComponentMap)) {
    const config = PUBLIC_SEO[route];
    if (!config) continue;

    console.log(`Prerendering ${route}...`);
    const htmlContent = renderComponent(Component, route);

    const canonicalUrl = `${SITE_URL}${config.canonical || route}`;
    const structuredDataTag = config.structuredData
      ? `\n    <script type="application/ld+json" data-seo-jsonld="true">${JSON.stringify(config.structuredData)}</script>`
      : '';

    // Inject route metadata into template
    let pageHtml = rawTemplate
      // Title
      .replace(/<title>[\s\S]*?<\/title>/i, `<title>${config.title}</title>`)
      // Canonical
      .replace(/<link[\s\S]*?rel=["']canonical["'][\s\S]*?>/i, `<link rel="canonical" href="${canonicalUrl}" />`)
      // Inject JSON-LD before </head>
      .replace('</head>', `${structuredDataTag}\n  </head>`)
      // Inject rendered HTML into #root
      .replace('<div id="root"></div>', `<div id="root">${htmlContent}</div>`);

    pageHtml = replaceMeta(pageHtml, 'name', 'title', config.title);
    pageHtml = replaceMeta(pageHtml, 'name', 'description', config.description);
    pageHtml = replaceMeta(pageHtml, 'property', 'og:title', config.title);
    pageHtml = replaceMeta(pageHtml, 'property', 'og:description', config.description);
    pageHtml = replaceMeta(pageHtml, 'property', 'og:url', canonicalUrl);
    pageHtml = replaceMeta(pageHtml, 'property', 'og:image', DEFAULT_IMAGE);
    pageHtml = replaceMeta(pageHtml, 'name', 'twitter:title', config.title);
    pageHtml = replaceMeta(pageHtml, 'name', 'twitter:description', config.description);
    pageHtml = replaceMeta(pageHtml, 'name', 'twitter:url', canonicalUrl);
    pageHtml = replaceMeta(pageHtml, 'name', 'twitter:image', DEFAULT_IMAGE);

    const outDir = route === '/' ? distDir : path.join(distDir, route.slice(1));
    fs.mkdirSync(outDir, { recursive: true });
    const outFile = path.join(outDir, 'index.html');
    fs.writeFileSync(outFile, pageHtml, 'utf8');
    console.log(`✓ Wrote ${path.relative(distDir, outFile)} (${pageHtml.length} bytes, H1: ${htmlContent.includes('<h1')})`);
  }

  // Generate 404.html
  console.log('Generating dist/404.html...');
  const notFoundMarkup = `
    <main class="grid min-h-screen place-items-center bg-background px-6 text-center text-foreground">
      <div>
        <h1 class="text-3xl font-semibold">Page not found</h1>
        <p class="mt-3 text-muted-foreground">The requested page does not exist.</p>
        <a class="mt-6 inline-block text-primary underline" href="/">Return to Husimi</a>
      </div>
    </main>
  `;
  let notFoundHtml = rawTemplate
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>Page Not Found | Husimi</title>`)
    .replace('<div id="root"></div>', `<div id="root">${notFoundMarkup}</div>`);
  notFoundHtml = replaceMeta(notFoundHtml, 'name', 'robots', 'noindex, nofollow');
  fs.writeFileSync(path.join(distDir, '404.html'), notFoundHtml, 'utf8');
  console.log('✓ Wrote 404.html');

  console.log('--- Prerender Complete Successfully ---');
}

prerender();
