# ObsidianKit

[![CI](https://github.com/amandeavor/ObsidianKit/actions/workflows/ci.yml/badge.svg)](https://github.com/amandeavor/ObsidianKit/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Release](https://img.shields.io/github/v/release/amandeavor/ObsidianKit?display_name=tag)](https://github.com/amandeavor/ObsidianKit/releases)
[![Contributions welcome](https://img.shields.io/badge/contributions-welcome-blue.svg)](CONTRIBUTING.md)

ObsidianKit is a privacy-first, browser-native toolbox for PDF, image, media, calculator, and utility workflows.

Core principles:

- Local-first file processing where possible.
- Fast route-level loading with lazy tool modules.
- SEO-ready static route generation for categories, tools, and blog content.
- Explicit user consent gating for analytics and ads.

Use the deployed toolbox at [obsidiankit.me](https://obsidiankit.me).

## Project status

ObsidianKit is under active development. The public API and individual tool behavior may evolve before 1.0, but user data should remain local unless a tool explicitly describes an external request.

See the [changelog](CHANGELOG.md) for release history and the [public issue tracker](https://github.com/amandeavor/ObsidianKit/issues) for planned work.

## Stack

- React 19 + TypeScript 6
- Vite 8 + Tailwind CSS 4
- React Router 7
- Zustand
- Tooling libraries: pdf-lib, pdfjs-dist, ffmpeg.wasm, tesseract.js, heic2any, mammoth, docx

## Development

Requirements:

- Node.js 20.19 or newer
- npm 10 or newer

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

## Contributing and maintenance

- [Contributing guide](CONTRIBUTING.md)
- [Governance and maintainer responsibilities](GOVERNANCE.md)
- [Security policy](SECURITY.md)
- [Code of conduct](CODE_OF_CONDUCT.md)
- [Release history](CHANGELOG.md)

Bug reports, tool proposals, accessibility improvements, compatibility fixes, and test coverage are welcome. Major architectural changes should begin with an issue so the approach can be agreed before implementation.

## License

ObsidianKit is available under the [MIT License](LICENSE).
