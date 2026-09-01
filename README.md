<div align="center">

# ObsidianKit

**Privacy-first, browser-native toolbox for document, image, media, and calculation workflows.**

[**Explore Live App at obsidiankit.me →**](https://obsidiankit.me)

[![Live Deployment](https://img.shields.io/badge/website-obsidiankit.me-000000?style=flat&logo=safari&logoColor=white)](https://obsidiankit.me)
[![React 19](https://img.shields.io/badge/React-19.0-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript 6](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite 8](https://img.shields.io/badge/Vite-8.0-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS 4](https://img.shields.io/badge/Tailwind-4.0-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![CI Status](https://img.shields.io/github/actions/workflow/status/amandeavor/ObsidianKit/ci.yml?branch=main&label=CI)](https://github.com/amandeavor/ObsidianKit/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

<p align="center">
  <a href="#quickstart">Quickstart</a> •
  <a href="#tool-catalog">Tool Catalog</a> •
  <a href="#privacy-architecture">Privacy Architecture</a> •
  <a href="#quality-pipeline">Quality Pipeline</a> •
  <a href="#contributing">Contributing</a>
</p>

</div>

---

`ObsidianKit` is an open-source, privacy-first web platform containing **88+ browser-native utilities**. Rather than uploading your private documents, receipts, or photos to remote third-party cloud servers, ObsidianKit executes operations directly inside your browser via WebAssembly, Web Workers, and client-side JavaScript.

---

## Tool Catalog

```
                    ┌──────────────────────────────────────────────┐
                    │            ObsidianKit Tool Suite            │
                    └──────────────────────┬───────────────────────┘
                                           │
         ┌──────────────────┬──────────────┴─────┬──────────────────┐
         ▼                  ▼                    ▼                  ▼
  ┌──────────────┐   ┌──────────────┐     ┌──────────────┐   ┌──────────────┐
  │  PDF Suite   │   │  Image Lab   │     │ Media Studio │   │ Calculators  │
  │ Merge, OCR,  │   │ Compress, BG │     │ Audio/Video  │   │  Financial,  │
  │ Compress, PW │   │ Remove, HEIC │     │ Transcode,   │   │ Health, Math │
  │    Unlock    │   │  Convert, EXIF│    │ Trim, GIF    │   │    Units     │
  └──────────────┘   └──────────────┘     └──────────────┘   └──────────────┘
```

| Category | Highlights & Included Tools |
| :--- | :--- |
| **PDF Tools** | Merge PDF, Compress PDF, PDF to Word, OCR Extraction, Rotate Pages, Unlock/Protect Password, Page Numbering, Metadata Editor. |
| **Image Lab** | Client-side Background Removal (ONNX WebGPU), HEIC to JPG, WebP Converter, Image Resizer, Lossless Compressor, EXIF Metadata Stripper. |
| **Media Studio** | Video to GIF converter, Video Trimmer, Audio Transcoder, Video Frame Extractor (powered by `ffmpeg.wasm`). |
| **Developer Utilities** | JSON Formatter, Base64 Encoder/Decoder, URL Encoder, Regex Tester, QR Code Generator, Password Generator & Entropy Meter. |
| **Calculators** | Compound Interest, Loan Amortization, Salary Take-Home, Currency Exchange, Unit & Linear Conversion, Scientific Math. |

---

## Privacy Architecture

1. **Zero Server Uploads**: File operations (PDF manipulation, image transcoding, OCR scanning) execute entirely on your machine.
2. **Local Machine Sandbox**: Sensitive passports, IDs, and financial statements never leave your browser context.
3. **No Tracking By Default**: Analytics and external scripts are disabled until explicit user consent is granted.

---

## Quickstart

### Prerequisites
- Node.js `20.19+`
- npm `10+`

### Local Development Setup

```bash
# Clone the repository
git clone https://github.com/amandeavor/ObsidianKit.git
cd ObsidianKit

# Install dependencies
npm install

# Start development server
npm run dev
```

---

## Quality Pipeline

ObsidianKit enforces strict automated quality gates on every commit and pull request:

```bash
# Run ESLint across codebase
npm run lint

# Run route and metadata integrity tests (validates 88 routes)
npm test

# Production build: route prerendering + SEO injection + bundle budget checks
npm run build

# Interactive bundle size visualization
npm run build:analyze
```

---

## Adding a New Tool

1. Create your component under `src/tools/<category>/<YourTool>.tsx`.
2. Register tool metadata in `src/data/tools.ts`.
3. Register the lazy import in `src/tools/index.ts`.
4. Validate the full suite: `npm test && npm run build`.

---

## Community & Governance

- [Contributing Guide](CONTRIBUTING.md)
- [Project Roadmap](ROADMAP.md)
- [Support Guidelines](SUPPORT.md)
- [Security Policy](SECURITY.md)
- [Governance Model](GOVERNANCE.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Changelog](CHANGELOG.md)

---

## License

This project is licensed under the [MIT License](LICENSE).
