# Governance

ObsidianKit uses a maintainer-led, contribution-friendly governance model.

## Current maintainer

- Aman Awasthi ([@amandeavor](https://github.com/amandeavor)) — primary maintainer

The primary maintainer is responsible for roadmap decisions, issue triage, pull-request review, releases, dependency updates, security response, deployment integrity, and community conduct.

## Decision making

Routine bug fixes, tests, documentation, and compatible tool improvements are decided through issue and pull-request discussion. Decisions should prefer:

1. User privacy and local-first processing.
2. Correctness and recoverability.
3. Accessibility and browser compatibility.
4. Maintainable implementation and testability.
5. Performance and bundle discipline.

Changes that affect privacy guarantees, licensing, governance, security boundaries, or the public architecture require explicit maintainer approval and a documented rationale.

When reasonable contributors disagree, the maintainer will summarize the competing concerns and record the final decision in the relevant issue or pull request.

## Becoming a maintainer

Maintainer access is earned through sustained, constructive participation. Signals include:

- Multiple substantive merged contributions.
- Helpful issue triage and review.
- Reliable follow-through on regressions.
- Respect for the privacy, accessibility, and compatibility requirements.
- Constructive participation under the code of conduct.

The primary maintainer may invite a contributor first as a triager or reviewer. Repository write access is granted only after trust is established and may be removed for inactivity, security risk, or conduct violations.

## Releases

Releases use semantic versioning where practical:

- Patch: compatible fixes and internal maintenance.
- Minor: new tools or meaningful compatible behavior.
- Major: intentional breaking changes or stable 1.0 guarantees.

Every release should have a tag, concise notes, completed CI, and an updated changelog. Security releases may use an abbreviated private process before coordinated disclosure.
