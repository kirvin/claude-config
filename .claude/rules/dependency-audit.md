# Dependency Audit

Verify dependency integrity before adding packages, pinning actions, or deploying.

## GitHub Actions — SHA pinning

All workflow `uses:` references must be pinned to full commit SHAs, never mutable tags.

```bash
# Resolve the commit SHA for a tag
gh api /repos/<owner>/<action>/git/refs/tags/<tag> --jq '.object.sha'
```

A workflow with `uses: actions/checkout@v4` (tag, not SHA) must be updated before merge.
Always leave the human-readable tag in a comment: `# v4`.

See `docs/ci-security.md` for the full resolution procedure and Dependabot setup.

## npm — evaluating new packages

Before adding a dependency:

```bash
npm info <package>              # maintainer, repo URL, publish history
npm info <package> repository.url
npm audit                       # known CVEs in current tree
```

Avoid packages with:
- No repository URL, or private/unknown maintainer
- Suspicious version history (sudden large jump, dormant then active)
- Low download counts relative to what the package claims to do

For packages with native binaries (esbuild, rollup, sharp, @swc/\*, canvas), list all
platform variants explicitly in `optionalDependencies` — see `.claude/rules/npm.md`.

## Brewfile — formula provenance

All Homebrew formulae must use fully-qualified names:

```ruby
brew "hashicorp/tap/terraform"   # good — explicit tap
cask "some-cask"                  # good — cask qualifier
"some-formula"                    # bad — ambiguous, may resolve differently per machine
```

Before adding a new formula, verify it comes from the official Homebrew tap or a known
trusted tap. Tap names are not verified by Homebrew — anyone can publish a tap.

## When you find a vulnerability

File a beads issue immediately, before merging the change that introduced it:

```bash
bd create \
  --title="[Security] Dependency risk: <package>" \
  --description="Finding: <CVE or description>
Source: <how found>
Affected version: <version>" \
  --type=bug \
  --priority=1
```

Do not merge a PR that introduces a known vulnerability.
