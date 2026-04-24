# Security Sweep

Load `Skill(kf:security-sweep)` for retrospective security analysis of a branch or PR.

## Trigger phrases

- "Security sweep" / "Run a security sweep on this branch"
- "Check this PR for security issues"
- "Scan this branch / these changes for vulnerabilities"
- "Any security concerns in this code?"
- "Check for credentials / injection risks / exposed secrets"
- "Security audit before I merge"

## What the skill does

1. Enumerates changed files in the target branch or PR
2. Analyzes each for security findings across seven categories: CRED, AUTH, INJECT, EXPOSE, SUPPLY, SCOPE, CI
3. Triages each finding as P0, P1, or P2
4. Creates beads tasks for findings that need remediation
5. Outputs a structured sweep report

## When to use it

- Before merging any non-trivial PR (especially auth, APIs, CI changes)
- After a batch of dependency updates
- When onboarding a new external service integration
- As a periodic routine scan on the main branch

## Relationship to security-review

`security-review.md` triggers proactive review *during* development (before code is written).
`security-sweep.md` (this rule) triggers retrospective analysis *after* code is written.
Both complement each other — sweep catches what proactive review missed.
