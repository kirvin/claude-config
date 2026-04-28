# release-please Automation Implementation Plan

> **Status:** APPROVED

## Specification

**Problem:** Plugin version bumps are done manually via `make plugin-release version=x.y.z`, which edits `plugins/kf/.claude-plugin/plugin.json` and pushes directly. There is no automated changelog generation, no mapping of conventional commit prefixes to version bump types, and no GitHub release tags.

**Goal:** Merging to `main` with a `feat:` commit triggers a minor-version release PR automatically; `fix:` triggers a patch PR; `feat!:` or `BREAKING CHANGE:` triggers a major PR. The PR bumps `plugins/kf/.claude-plugin/plugin.json` and generates `plugins/kf/CHANGELOG.md`. Merging the release PR tags the commit and publishes a GitHub release. `make plugin-release` is retained but version-bump logic is removed — it becomes a skill-sync-only command.

**Scope:**
- In: `release-please-config.json`, `.release-please-manifest.json`, `.github/workflows/release-please.yml`, Makefile simplification
- Out: publishing to any package registry, changing conventional commit tooling, modifying existing CI workflows

**Success Criteria:**
- [ ] Pushing a `feat:` commit to main creates a release PR that bumps the minor version in `plugin.json`
- [ ] Merging the release PR creates a GitHub release tag and populates `plugins/kf/CHANGELOG.md`
- [ ] `make plugin-release` runs without error and still syncs skills; it no longer bumps the version
- [ ] GH Actions workflow is SHA-pinned

**Open question (non-blocking):** Does `main` have branch protection requiring a human review on PRs? If yes, release-please's release PRs will stall because `GITHUB_TOKEN` cannot self-approve. Check `gh api repos/kirvin/agent-dev-harness/branches/main --jq '.protection'` after implementing and adjust if needed.

**Security note:** Per `threat-modeling.md`, adding a GitHub Actions workflow that writes to repo contents requires a STRIDE pass. The new workflow grants `contents: write` + `pull-requests: write` — broader than the existing read-only CI posture. Accept this consciously: release-please cannot function without these permissions, and the action is SHA-pinned to reduce supply-chain risk. Document in the PR.

---

## Tasks

### Task 1: Add release-please config and manifest

**Context:** `plugins/kf/.claude-plugin/plugin.json`

**Steps:**

1. [ ] Create `release-please-config.json` at repo root. Use `.` as the package path so ALL conventional commits trigger version consideration (not just commits touching `plugins/kf/`):
   ```json
   {
     "$schema": "https://raw.githubusercontent.com/googleapis/release-please/main/schemas/config.json",
     "release-type": "simple",
     "packages": {
       ".": {
         "changelog-path": "plugins/kf/CHANGELOG.md",
         "extra-files": [
           {
             "type": "json",
             "path": "plugins/kf/.claude-plugin/plugin.json",
             "jsonpath": "$.version"
           }
         ]
       }
     }
   }
   ```
2. [ ] Create `.release-please-manifest.json` at repo root seeded with current version:
   ```json
   { ".": "1.4.4" }
   ```

**Verify:** Both files parse as valid JSON:
```bash
node -e "JSON.parse(require('fs').readFileSync('release-please-config.json','utf8')); JSON.parse(require('fs').readFileSync('.release-please-manifest.json','utf8')); console.log('ok')"
```

---

### Task 2: Add GitHub Actions workflow (SHA-pinned)

**Context:** `.github/workflows/`

**Steps:**

1. [ ] Create `.github/workflows/release-please.yml`:
   ```yaml
   name: Release Please

   on:
     push:
       branches: [main]

   permissions:
     contents: write
     pull-requests: write

   jobs:
     release-please:
       runs-on: ubuntu-latest
       steps:
         - uses: googleapis/release-please-action@8b8fd2cc23b2e18957157a9d923d75aa0c6f6ad5  # v4
           with:
             config-file: release-please-config.json
             manifest-file: .release-please-manifest.json
   ```

**Verify:** YAML parses without error:
```bash
python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/release-please.yml')); print('ok')"
```

---

### Task 3: Simplify make plugin-release to remove version bumping

**Context:** `Makefile`, `scripts/generate-plugin-skills.js`

**Steps:**

1. [ ] Remove the `version=` branch and `--bump` flag from the `plugin-release` Makefile target. The target should only sync skills and commit+push the `plugins/kf/` changes. Release-please owns all version bumps.
   New target (simplified):
   ```makefile
   plugin-release: ## Sync skills into plugins/kf/ and commit (release-please handles version bumps)
   	node scripts/generate-plugin-skills.js
   	git add plugins/kf/
   	git diff --cached --quiet || git commit -m "chore: sync plugin skills\n\nCo-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
   	git push
   ```
2. [ ] Verify `generate-plugin-skills.js` does not have any remaining call path that gets invoked from `make plugin-release` that would still bump the version. The `--bump` flag path should no longer be reachable from `make`.

**Verify:**
```bash
make help  # plugin-release still appears
make plugin-release --dry-run 2>&1 || true  # no errors about missing version=
```

---

## Review notes

Devils-advocate review caught three issues incorporated above:
- **Path scoping:** original plan used `plugins/kf` as package path; switched to `.` so all conventional commits (not just those touching that directory) trigger release-please.
- **Manifest conflict:** original plan preserved `make plugin-release` with version-bump capability; this creates divergence between `plugin.json` and `.release-please-manifest.json`. Fixed by stripping version-bump logic from Makefile entirely.
- **CHANGELOG bootstrap:** original plan created a hand-written bootstrap entry that would conflict with release-please's generated header. Removed; release-please will generate `CHANGELOG.md` on first successful run.
