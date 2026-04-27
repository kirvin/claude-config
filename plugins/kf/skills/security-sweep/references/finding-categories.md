# Finding Categories

Categories specific to what this toolkit produces: bash scripts, GitHub Actions workflows,
AWS SSO configuration, and Figma API integration.

For each category: description, what patterns to look for in a diff, bad vs good example.

---

## CRED — Hardcoded Credentials

**Description:** Credential values (API tokens, passwords, AWS keys) embedded directly
in source code, config files, or scripts rather than read from environment variables.

**Patterns to look for in a diff:**
- Assignment of a string that looks like a token: `TOKEN="sk-..."`, `KEY='AKIA...'`
- Base64-encoded credential: a long random string assigned to a variable
- `.env` file being added or modified with real values (not placeholders)
- AWS access key pattern: `AKIA[0-9A-Z]{16}`
- Figma token pattern: a string starting with `figd_` after `FIGMA_API_TOKEN=`

**Bad:**
```bash
FIGMA_API_TOKEN="figd_abcdefghijklmnop"
curl -H "X-Figma-Token: $FIGMA_API_TOKEN" ...
```

**Good:**
```bash
# In .env.local (not committed):
# FIGMA_API_TOKEN=your-token-here

# In script:
: "${FIGMA_API_TOKEN:?FIGMA_API_TOKEN must be set in .env.local}"
curl -H "X-Figma-Token: ${FIGMA_API_TOKEN}" ...
```

---

## AUTH — Missing Credential Validation

**Description:** Scripts or code that use credential environment variables without
first verifying they are set and non-empty, leading to silent failures or confusing errors.

**Patterns to look for in a diff:**
- `$TOKEN` or `$API_KEY` used in a curl/aws/gh command without a preceding check
- New script missing `set -euo pipefail` (nounset catches unset vars, but explicit checks
  are clearer)
- Credential used in a conditional path that could be silently skipped

**Bad:**
```bash
aws s3 cp file.txt s3://bucket/  # fails confusingly if AWS creds unset
```

**Good:**
```bash
: "${AWS_PROFILE:?AWS_PROFILE must be set}"
aws s3 cp file.txt s3://bucket/
```

---

## INJECT — Shell Injection

**Description:** Unquoted variables, use of `eval`, or user-controlled input passed
directly to shell commands, enabling command injection.

**Patterns to look for in a diff:**
- `eval "$something"` where `$something` is not a literal constant
- Unquoted `$variable` in a command that accepts filenames or paths
- User-provided input (function argument, env var, file content) interpolated
  directly into a `bash -c "..."` or similar
- `$()` subshell using a variable that could be attacker-controlled

**Bad:**
```bash
install_dir="$1"
rm -rf $install_dir/old  # unquoted — spaces or metacharacters break this
```

**Good:**
```bash
install_dir="$1"
rm -rf "${install_dir}/old"
```

---

## EXPOSE — Sensitive Data in Output

**Description:** Credential values, internal paths, account IDs, or stack traces
appearing in log output, error messages, or debug traces that could be captured
in CI logs or terminal history.

**Patterns to look for in a diff:**
- `echo "$TOKEN"` or `echo "token: $API_KEY"` in any context
- `set -x` enabled in a script that references credential variables
- Error handler that prints the full environment: `env` or `printenv` in an error trap
- AWS error responses printed without filtering account IDs or ARNs

**Bad:**
```bash
echo "Using token: $FIGMA_API_TOKEN"
curl -H "X-Figma-Token: $FIGMA_API_TOKEN" ...
```

**Good:**
```bash
echo "Using Figma token: [set, ${#FIGMA_API_TOKEN} chars]"
curl -H "X-Figma-Token: $FIGMA_API_TOKEN" ...
```

---

## SUPPLY — Supply Chain / Dependency Risks

**Description:** New external dependencies or GitHub Actions steps introduced without
provenance verification or version pinning, enabling supply chain attacks.

**Patterns to look for in a diff:**
- New `uses: owner/action@v1` (tag-based) instead of `uses: owner/action@<full-sha>`
- New `curl | bash` or `wget | sh` pattern
- New npm/pip/brew dependency added without a comment on why it's trusted
- A plugin install referencing a branch instead of a released version

**Bad:**
```yaml
- uses: actions/checkout@v4
```

**Good:**
```yaml
- uses: actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5  # v4
```

---

## SCOPE — Path and Filesystem Scope

**Description:** Scripts that write files outside their expected working directory,
or that accept user-provided paths without validation, enabling unintended writes
or path traversal.

**Patterns to look for in a diff:**
- `cp` or `mv` or `mkdir` using a variable path without validation
- Install script accepting a `--target` argument and using it directly without
  confirming it stays within expected bounds
- Symlink creation that could point outside the repo
- `REPO_ROOT` computed incorrectly (relative path instead of absolute)

**Bad:**
```bash
target="$1"
cp template.sh "$target/scripts/setup.sh"  # no validation of $target
```

**Good:**
```bash
target="$(realpath "$1")"
[[ "$target" == /Users/* ]] || { echo "ERROR: target must be under /Users/"; exit 1; }
cp template.sh "$target/scripts/setup.sh"
```

---

## CI — GitHub Actions Security

**Description:** Workflow changes that expand permissions, introduce
`pull_request_target` misuse, add broad `write` permissions, or expose secrets
to untrusted code paths.

**Patterns to look for in a diff:**
- New `pull_request_target` trigger (dangerous — runs with write access on PRs from forks)
- `permissions: write-all` or removal of a `permissions:` block that was previously scoping access
- New `secrets.*` reference in a context reachable by fork PRs
- `GITHUB_TOKEN` granted `write` permission to resources it didn't have before
- New workflow that runs on `push` to main with no branch protection check

**Bad:**
```yaml
on:
  pull_request_target:
    types: [opened]
permissions: write-all
```

**Good:**
```yaml
on:
  pull_request:
    types: [opened]
permissions:
  contents: read
  pull-requests: write
```
