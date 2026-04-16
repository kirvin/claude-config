---
name: task-completion
description: Task close protocol for beads issues. Extends ce:verification-before-completion with a lessons-learned mini-retro. Use when closing any major beads issue (feature, bug, task with non-trivial code changes).
---

# Task Completion Protocol

Load `ce:verification-before-completion` first for the core verification gate (tests pass,
build succeeds, linter clean, feature works end-to-end).

This skill adds a **lessons-learned mini-retro** that runs after verification passes and
before `bd close`.

## When to run the full protocol

Run this (not just verification) when closing beads issues that involved:
- Non-trivial code changes (more than a few lines)
- Debugging sessions or multiple approaches tried
- Architecture decisions
- New patterns established

Skip the retro (run verification only) for:
- Dependency upgrades with no behavior change
- One-line / cosmetic fixes
- Pure documentation updates
- Closing orphan or duplicate issues

## Mini-retro protocol

After `ce:verification-before-completion` passes, apply the `ce:post-mortem` root-cause
methodology in abbreviated form:

1. **Identify friction points** — where did execution detour, backtrack, or require correction?
   Include navigation friction: did you use an Explore agent or run multiple searches to find
   relevant files? If so, what doc pointer would have sent you there directly? Delegated
   discovery still counts as friction — it just happened out of sight.
2. **Push to systemic causes** — for each friction point, ask "What would have prevented this?"
   Don't stop at "I should have checked X." Push to: missing doc, wrong skill guidance,
   undiscoverable convention, architectural confusion, test gap.
3. **Load the relevant `ce:post-mortem` reference** for any finding worth capturing:

   | Friction type | Load |
   |---------------|------|
   | Wrong files, bad assumptions, unclear conventions | `references/dx-friction.md` |
   | Docs / READMEs were wrong or incomplete | `references/documentation-gaps.md` |
   | Code was hard to find or understand | `references/architecture-clarity.md` |
   | Bug root cause points to a process gap | `references/bug-prevention.md` |
   | Code works but diverges from best practice | `references/anti-patterns.md` |
   | Skills, hooks, or `.claude/` configs need updating | `references/tooling-improvements.md` |

4. **Also note what worked well** — patterns or approaches worth codifying.

### Capture format

Write a compact block (2–5 bullets total — not every category needs content):

```
## Lessons Learned
- What worked: [approach or tool worth repeating]
- Hard: [friction point → systemic cause]
- Gap: [what was missing and where it should live]
```

### Append to the issue before closing

```bash
bd update <id> --notes "## Lessons Learned
- What worked: ...
- Hard: ...
- Gap: ..."
```

### File improvement issues for findings

For each finding, choose an action type from `ce:post-mortem`:
- Documentation update → fix the specific doc
- Skill/config update → modify the skill or rule
- New skill/hook → create it
- Architecture improvement → file a refactor issue
- Test addition → file a test issue
- Codify a win → write a rule or skill section

For actions that require a follow-up issue (not an immediate fix):

```bash
bd create \
  --title="[Improvement] <short description>" \
  --description="Root cause: <systemic issue>. Action: <specific change with file path>." \
  --type=task \
  --priority=3
```

One improvement issue per distinct finding. Don't batch unrelated gaps.

## Checklist

```
[ ] ce:verification-before-completion passed (tests, build, lint, e2e)
[ ] Mini-retro written and appended via bd update --notes
[ ] Improvement issues filed for any findings that need follow-up
[ ] bd close <id> called
```
