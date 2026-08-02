# Security policy

## Supported versions

ObsidianKit is currently pre-1.0. Security fixes are applied to the latest deployment and the default branch. Older commits and third-party mirrors are not supported.

## Reporting a vulnerability

Please report suspected vulnerabilities privately through [GitHub Security Advisories](https://github.com/amandeavor/ObsidianKit/security/advisories/new).

Include, when possible:

- The affected tool or route.
- Reproduction steps or a minimal proof of concept.
- The browser and operating system used.
- The expected impact.
- Any suggested mitigation.

Do not include real personal documents, credentials, or private data in a report. Use synthetic test files.

You should receive an acknowledgement within seven days. The maintainer will investigate, coordinate a fix and disclosure timeline, and credit reporters who want public acknowledgement.

## Security scope

Reports are especially useful when they involve:

- File contents leaving the browser unexpectedly.
- Cross-site scripting or unsafe rendered document content.
- Path, archive, or document parsing vulnerabilities.
- Exposure of analytics identifiers before consent.
- Insecure dependency behavior or compromised build artifacts.
- Bypasses of PDF protection or encryption expectations.

General bugs and feature requests belong in the public issue tracker.

## Dependency advisory triage

The maintainer records advisories that cannot be removed immediately, including applicability and compensating controls, in [`docs/security/dependency-advisories.md`](docs/security/dependency-advisories.md). An audit finding is not silently dismissed merely because the affected feature is not currently used.
