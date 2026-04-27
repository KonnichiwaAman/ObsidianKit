# ObsidianKit

ObsidianKit is a privacy-first, browser-native toolbox for PDF, image, media, calculator, and utility workflows.

Core principles:
- Local-first file processing where possible.
- Fast route-level loading with lazy tool modules.
- SEO-ready static route generation for categories, tools, and blog content.
- Explicit user consent gating for analytics and ads.

## Stack

- React 19 + TypeScript 6
- Vite 8 + Tailwind CSS 4
- React Router 7
- Zustand
- Tooling libraries: pdf-lib, pdfjs-dist, ffmpeg.wasm, tesseract.js, heic2any, mammoth, docx

## Development

Install dependencies:

```bash
npm install
```

Run local dev server:

```bash
npm run dev
```

## Quality Gates

Lint:

```bash
npm run lint
```

Integrity tests:

```bash
npm run test
```

Production build (includes SEO/static generation and bundle budget checks):

```bash
npm run build
```

Bundle analysis:

```bash
npm run build:analyze
```

## Build Pipeline

`npm run build` runs these stages:
1. Generate route manifest: `public/prerender-routes.json`
2. Generate SEO assets: `public/robots.txt`, `public/sitemap.xml`
3. Type check and build with Vite
4. Inject route-aware static SEO head tags into built HTML pages
5. Enforce bundle budgets

## Privacy and Consent

- File content processing is local-first and runs in the browser for supported tools.
- Optional analytics and ads are disabled until the user makes a consent choice.
- Currency conversion and select integrations may make explicit external network requests.

## Repository Notes

- Tool metadata lives in `src/data/tools.ts`.
- Tool component lazy registry lives in `src/tools/index.ts`.
- Route/SEO script source of truth is in `scripts/route-manifest.ts`.

When adding a new tool, always update:
1. `src/data/tools.ts`
2. `src/tools/index.ts`
3. Tool implementation folder under `src/tools/`

Then run:

```bash
npm run test && npm run build
```
