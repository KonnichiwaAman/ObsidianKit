# Contributing to ObsidianKit

Thank you for helping improve ObsidianKit. Contributions should preserve its local-first privacy model, keep tools accessible, and include evidence that the changed workflow works.

## Before starting

- Search existing issues and pull requests to avoid duplicate work.
- Use the bug, feature, or tool-proposal issue form when one fits.
- Discuss large features, new heavyweight dependencies, architectural changes, or changes to the privacy model before implementation.
- Review the [code of conduct](CODE_OF_CONDUCT.md) and [governance model](GOVERNANCE.md).

Small bug fixes with a clear reproduction may be opened directly as a pull request.

## Local setup

Requirements:

- Node.js 20.19 or newer
- npm 10 or newer

```bash
git clone https://github.com/amandeavor/ObsidianKit.git
cd ObsidianKit
npm ci
npm run dev
```

## Required checks

Run all checks before opening a pull request:

```bash
npm run lint
npm run test
npm run build
```

The build generates route and SEO artifacts. Include generated changes only when they are expected consequences of the contribution.

## Adding or changing a tool

New tools and route changes must keep these sources synchronized:

1. `src/data/tools.ts`
2. `src/tools/index.ts`
3. The implementation under `src/tools/`

The integrity suite verifies registry IDs, paths, categories, and public routes. Add focused tests for new reusable logic and describe any browser-only manual verification in the pull request.

Tool contributions must:

- Process user files locally whenever practical.
- Clearly disclose any network request before user data leaves the browser.
- Avoid silently uploading, retaining, or logging file contents.
- Support keyboard navigation and readable labels.
- Release object URLs, workers, and large buffers when no longer needed.
- Handle invalid or unsupported input without losing the user's original file.

## Pull requests

Keep each pull request focused on one coherent change. Include:

- The user-visible problem.
- The implementation and important tradeoffs.
- Exact validation commands and results.
- Screenshots for visible interface changes.
- A linked issue when one exists.

Maintainers may request changes for privacy, accessibility, bundle size, browser compatibility, or long-term supportability even when a change is technically correct.

## Commit and review expectations

- Write concise, imperative commit messages.
- Do not include unrelated formatting or dependency updates.
- Resolve review conversations after applying or discussing feedback.
- Be transparent about checks that could not run.
- Follow a target issue's scope; do not inflate contribution counts by splitting one fix into artificial pull requests.

## Reporting security issues

Do not open a public issue for a suspected vulnerability. Follow [SECURITY.md](SECURITY.md).
