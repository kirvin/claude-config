# Bash / Shell Scripts Stack — Finding Patterns

Applies to projects where shell scripts are a primary artifact: CLI tools, deployment
scripts, installer scripts, provisioning tooling. Also applies as a supplement to any
project that ships `.sh` files alongside application code.

Detection signal: `.sh` files present, or `Makefile` with significant shell logic,
or no `package.json` / `requirements.txt` / equivalent.

---

## CRED

**Patterns:**
- String assignment that looks like a token: `TOKEN="sk-abc123"`, `KEY='AKIA...'`
- Credentials written directly into config files by the script without masking
- `.env` file content echoed or cat'd in a context where it could be logged
- AWS access key pattern: `AKIA[0-9A-Z]{16}` in any variable assignment
- Passwords passed as arguments to commands (appear in `ps aux` output and shell history)

**Bad:**
```bash
FIGMA_API_TOKEN="figd_abcdefghijklmnop"
curl -H "X-Figma-Token: $FIGMA_API_TOKEN" ...
```
**Good:**
```bash
: "${FIGMA_API_TOKEN:?FIGMA_API_TOKEN must be set in .env.local}"
curl -H "X-Figma-Token: ${FIGMA_API_TOKEN}" ...
```

---

## AUTH

**Patterns:**
- Credential environment variables used in commands without a preceding existence check
- Script assumes credentials are valid without testing before performing destructive operations
- `set -euo pipefail` missing — `nounset` would catch unset credential vars
- Conditional skip of auth steps: `if [[ -n "$SKIP_AUTH" ]]; then ...`

**Bad:**
```bash
aws s3 cp file.txt s3://bucket/  # fails confusingly if AWS creds not set
```
**Good:**
```bash
: "${AWS_PROFILE:?AWS_PROFILE must be set}"
aws sts get-caller-identity --profile "$AWS_PROFILE" > /dev/null \
  || { echo "AWS auth failed"; exit 1; }
aws s3 cp file.txt s3://bucket/ --profile "$AWS_PROFILE"
```

---

## INJECT

**Patterns:**
- Unquoted variables in commands: `rm -rf $dir` instead of `rm -rf "${dir}"`
- `eval "$user_input"` or `bash -c "$variable"` where variable is not a constant
- User-provided arguments interpolated into commands without validation
- `$()` subshell using a variable that could contain shell metacharacters

**Bad:**
```bash
install_dir="$1"
rm -rf $install_dir/old    # unquoted; spaces or globs break this
```
**Good:**
```bash
install_dir="${1:?install_dir required}"
rm -rf "${install_dir}/old"
```

---

## EXPOSE

**Patterns:**
- `echo "$TOKEN"` or `echo "token: $API_KEY"` anywhere (appears in terminal and CI logs)
- `set -x` enabled in a scope that includes credential variable expansions
- Error handler that prints the full environment: `env` or `printenv` in a `trap ERR` block
- `curl -v` with an `Authorization` header (verbose mode prints headers to stderr)
- AWS CLI calls with `--debug` where credentials appear in the trace

**Bad:**
```bash
echo "Using token: $FIGMA_API_TOKEN"
```
**Good:**
```bash
echo "Using Figma token: [set, ${#FIGMA_API_TOKEN} chars]"
```

---

## SUPPLY

**Patterns:**
- `curl <url> | bash` or `wget <url> | sh` — executes remote code without verification
- `brew install` without a fully-qualified formula name (tap ambiguity)
- `npm install -g` inside a script without pinning the version
- GitHub Actions `uses:` with a mutable tag instead of a SHA

**Bad:**
```bash
curl https://example.com/install.sh | bash
```
**Good:**
```bash
# Download, verify checksum, then execute
curl -o install.sh https://example.com/install.sh
echo "expectedsha256  install.sh" | sha256sum -c -
bash install.sh
```

---

## SCOPE

**Patterns:**
- Script accepts a path argument and uses it directly without validation:
  `cp template "$1/output"` where `$1` could be `../../../etc`
- `REPO_ROOT` computed with a relative path instead of absolute:
  `REPO_ROOT="$(dirname "$0")/.."` — depends on `$PWD`; use `realpath` or `cd && pwd`
- `rm -rf` on a variable path without confirming the path is within expected bounds
- Symlink creation that could point outside the intended directory

**Bad:**
```bash
target="$1"
cp setup.sh "$target/scripts/"  # no validation — could write anywhere
```
**Good:**
```bash
target="$(realpath "${1:?target required}")"
[[ "$target" == "$HOME/projects/"* ]] \
  || { echo "ERROR: target must be under ~/projects/"; exit 1; }
cp setup.sh "$target/scripts/"
```

---

## CI

Same patterns as the universal CI category. Additionally watch for:
- Shell scripts in `.github/workflows/` `run:` blocks that use `set -x` near secret expansions
- `${{ inputs.* }}` workflow inputs used directly in `run:` steps without sanitization
  (script injection: a crafted input can break out of the command context)
- `actions/upload-artifact` uploading directories that may contain `.env` or credential files
