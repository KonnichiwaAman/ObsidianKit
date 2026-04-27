---
name: website-audit
description: "Run a full website audit covering code quality, performance, security, SEO, loading states, optimization, tool logic and backend assumptions, and mobile UX."
argument-hint: "Scope or focus areas (pages, tool IDs, risks, constraints)"
agent: "agent"
---
Perform a deep technical audit of this website codebase.

Audit goals:
- Code quality and maintainability
- Runtime performance and bundle health
- Security risks in client logic, dependencies, and data handling
- SEO and crawlability
- Loading states, error states, and resilience
- Optimization opportunities (rendering, network, caching, assets)
- Tool logic correctness and backend or API integration assumptions
- Mobile responsiveness, touch usability, and viewport behavior

How to work:
1. Use workspace evidence first (files, configs, components, hooks, utilities, scripts).
2. Run lightweight verification commands when useful (build, lint, tests) and report exactly what ran.
3. Prioritize concrete defects and regressions over style opinions.
4. Cite exact evidence with file paths and line numbers for each finding.
5. If a requested area is not present (for example no backend service), state that clearly and audit the nearest equivalent (API clients, edge functions, or client-side logic).

Output format:
1. Findings ordered by severity: Critical, High, Medium, Low.
- For each finding include: area, problem, why it matters, evidence, recommended fix, and verification step.
2. Scorecard with 0-10 scores for each audit goal.
3. Top 10 quick wins ranked by impact.
4. 30, 60, and 90 day optimization roadmap.
5. Open questions and assumptions.

Quality bar:
- Be specific, actionable, and implementation-oriented.
- Avoid generic advice without code evidence.
- Keep the report concise but complete.

Use any user-provided arguments as scope and priority overrides. If no arguments are provided, audit the whole website.
