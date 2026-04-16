---
paths:
  - "**/*"
---

# Verification

Before claiming work is complete, load `ce:verification-before-completion`. Always verify:
- `npm run lint` passes
- `npm run build` succeeds
- Tests pass for modified service
- Feature works end-to-end (gateway → subgraph → DB)

## Closing major beads issues

When closing a beads issue that involved non-trivial code changes, debugging, architecture
decisions, or new patterns — load the `task-completion` project skill instead of calling
`ce:verification-before-completion` directly. It wraps the verification gate and adds a
mini lessons-learned retro before `bd close`.

Skip the extended protocol for: dep bumps, one-line fixes, doc-only changes, orphan closes.
