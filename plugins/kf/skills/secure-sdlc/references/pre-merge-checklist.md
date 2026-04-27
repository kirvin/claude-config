# Pre-Merge Security Checklist

Run these checks before closing any security-sensitive beads issue. All automated
checks must pass; human-review items require explicit sign-off.

---

## Automated checks

Run each command and confirm zero matches / zero hits.

```bash
# Check for hardcoded credentials in staged changes
git diff HEAD | grep -iE '(api_key|token|secret|password|credential)\s*=\s*["\x27][^"\x27$]'

# Check for .env accidentally staged
git diff --staged --name-only | grep -E '^\.env$'

# Check no sensitive paths in new files
git diff --staged --name-only
```

Expected results:
- First command: no output (zero matches)
- Second command: no output (.env not staged)
- Third command: review each listed file — none should be a credentials file or contain token values

---

## Human-review items

These cannot be automated; review each one manually before closing the issue.

- [ ] Error messages reviewed — no credential values, internal file paths, or stack traces
  are exposed in any output the user or CI logs would capture
- [ ] No sensitive data in debug output — `set -x` traces, `echo` statements, or log lines
  do not include token values, account IDs, or AWS ARNs
- [ ] External service calls use env vars sourced from `.env` or `.env.local`, not hardcoded
  values — check every place a token or key is referenced in changed files
- [ ] All new GitHub Actions steps are SHA-pinned — `uses: actions/checkout@v4` is not
  acceptable; `uses: actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5  # v4` is
- [ ] New shell scripts use `set -euo pipefail` and handle credential validation before use
- [ ] Temporary files that hold credentials are cleaned up with `trap` on EXIT

---

## When a check fails

If any automated check produces output:

1. Do NOT close the beads issue
2. Fix the finding (remove hardcoded value, rotate the exposed credential if needed)
3. Re-run the full checklist from the top
4. Only close after a clean run

If a credential value was exposed (even briefly), treat it as compromised and rotate
it immediately using the relevant playbook in `incident-response.md`.
