---
name: security-sweep
description: Retrospective security analysis of a PR or branch. Detects the project stack, loads matching finding patterns, scans changed files across seven categories, triages by severity, and creates beads tasks for remediation. Use after code is written to catch what proactive review missed.
---

# Security Sweep

Retrospective security analysis of a PR or branch. Run after code is written — this
complements the proactive design-time review in `kf:secure-sdlc`.

## Step 1 — Detect stack and load patterns

Probe the project to identify which stack files to load:

```bash
# Run these in parallel
ls package.json 2>/dev/null && cat package.json | grep -E '"react-native"|"expo"'
ls requirements.txt pyproject.toml setup.py Pipfile 2>/dev/null | head -1
ls go.mod 2>/dev/null
ls Gemfile 2>/dev/null
find . -name "*.sh" -not -path "./.git/*" | wc -l
```

| Signal | Stack file(s) to load |
|--------|----------------------|
| `package.json` + `react-native` or `expo` dep | `stacks/react-native.md` + `stacks/node-typescript.md` |
| `package.json` (no React Native) | `stacks/node-typescript.md` |
| `requirements.txt` / `pyproject.toml` / `setup.py` | `stacks/python.md` |
| `go.mod` | `stacks/generic.md` (no Go-specific file yet) |
| `Gemfile` | `stacks/generic.md` (no Ruby-specific file yet) |
| Significant `.sh` files (≥ 3) | `stacks/bash-scripts.md` |
| No match | `stacks/generic.md` |

Multiple files can apply — load all that match. A Python service with deployment
scripts loads both `stacks/python.md` and `stacks/bash-scripts.md`.

Always load `references/finding-categories.md` first for the universal category framework.

## Step 2 — Establish scope

Identify what to scan:

```bash
# Changed files in a PR branch vs main
git diff --name-only main...HEAD

# Changed files in a specific commit range
git diff --name-only <base>..<head>
```

If the user names a PR number: `gh pr diff <n> --name-only`

## Step 3 — Scan by category

Using the loaded stack pattern file(s), scan each changed file for findings across
the seven categories: CRED, AUTH, INJECT, EXPOSE, SUPPLY, SCOPE, CI.

For each finding, note:
- File and line number
- Category
- Brief description of the risk
- Suggested remediation (reference the specific stack pattern where applicable)

## Step 4 — Triage findings

Load `references/triage-guide.md` for full P0/P1/P2 criteria.

Quick reference:
- **P0** — Exploitable now, data loss or account takeover possible → block merge, fix immediately
- **P1** — Significant risk, exploitable under realistic conditions → fix before merge
- **P2** — Defense-in-depth gap, low likelihood → file a task, can merge

## Step 5 — Create beads tasks

For P0 and P1 findings, create a task before reporting:

```bash
bd create \
  --title="[Security][<CATEGORY>] <brief description>" \
  --description="File: <path>:<line>
Finding: <description>
Risk: <what an attacker could do>
Fix: <remediation steps>" \
  --type=bug \
  --priority=<0 for P0, 1 for P1, 2 for P2>
```

## Step 6 — Output sweep report

```markdown
## Security Sweep — <branch or PR> — <date>

**Stack detected:** <node-typescript | python | react-native | bash-scripts | generic>
**Scope:** <N> files changed

### Findings

#### [P0] CRED — <file>:<line>
<description and remediation>
Beads: <id>

#### [P1] AUTH — <file>:<line>
...

### Summary
<N> findings: <P0 count> critical, <P1 count> high, <P2 count> low
<Merge recommendation: block / fix before merge / safe to merge with tasks filed>
```

## No findings

If no findings are identified, output:

```
Security sweep complete — no findings in <N> changed files.
Stack: <detected stack(s)>
Safe to merge from a security standpoint.
```

## Adding stack support

If the project uses a stack with no matching file (Go, Ruby, Rust, etc.):
1. Load `stacks/generic.md` for this sweep
2. File a beads improvement issue to add a dedicated stack file:
   ```bash
   bd create \
     --title="[Improvement] Add <stack> stack file for security-sweep" \
     --description="security-sweep/references/stacks/<stack>.md needed. Generic patterns used in the interim." \
     --type=task --priority=3
   ```
