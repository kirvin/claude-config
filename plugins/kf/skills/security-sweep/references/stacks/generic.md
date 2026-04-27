# Generic Stack — Finding Patterns

Fallback patterns for projects where no specific stack file applies, or as a
supplement when the stack is partially identified.

Apply these patterns to any language or framework. Use your understanding of the
specific language encountered to identify analogous constructs.

---

## CRED

**Look for:**
- Assignment of a long random string to a variable that isn't read from config or env
- Config files committed with non-placeholder values (look for `!= "example"`, `!= "changeme"`)
- `.env` or secrets files that appear in git-tracked paths
- Credential values in comments ("old key: abc123", "# TODO: remove this")

**Signal:** Any literal value that looks like a token, key, or password assigned in source code.

---

## AUTH

**Look for:**
- Functions/routes/handlers with no visible auth check before accessing protected data
- Auth checks that only apply to some code paths (happy path protected, error path not)
- Permission decisions made based on data supplied by the caller without server-side verification
- Commented-out auth middleware ("temporarily disabled")

**Signal:** Protected operations reachable without passing through an identity or permission gate.

---

## INJECT

**Look for:**
- String concatenation or interpolation used to build a query, command, or expression
  that will be executed or interpreted
- `eval`, `exec`, `compile`, or equivalent dynamic execution with non-literal input
- Deserialization of untrusted data into objects (pickle, YAML.load without safe, JSON.parse on
  attacker-controlled input fed to unsafe sinks)
- Template rendering with unsanitized variables

**Signal:** The gap between where input enters and where it's interpreted narrows to zero.

---

## EXPOSE

**Look for:**
- Debug/verbose logging enabled in code paths that run in production
- Error handlers that return raw exception objects, stack traces, or internal paths to the caller
- Logging statements that include request bodies, headers, or response data without filtering
- API responses that include more fields than the client needs (over-fetching sensitive fields)

**Signal:** A caller (user, logs, external service) receives information that maps the internals.

---

## SUPPLY

**Look for:**
- Dependencies pinned to a mutable ref (branch name, `latest`, floating semver range `^` or `~`)
- Packages or scripts fetched at runtime via `curl | sh`, `wget | bash`, or equivalent
- Dependencies with no version lock file committed (no `package-lock.json`, `Pipfile.lock`, etc.)
- Build steps that pull from a registry or CDN without checksum verification

**Signal:** An external party could change what code runs without changing this repo.

---

## SCOPE

**Look for:**
- Filesystem operations (read, write, delete) using paths derived from user input without validation
- Network calls to destinations derived from user input (SSRF)
- Process execution with arguments or environment inherited from user input
- IAM roles, API tokens, or OAuth scopes with permissions not traceable to a declared need
- Operations that cross trust boundaries (reading from one tenant's data store for another)

**Signal:** The component can reach or affect something beyond its declared purpose.

---

## CI

**Look for:**
- Workflow triggers that run on PRs from forks with access to repository secrets
- Missing or overly broad `permissions:` declarations
- `run:` steps that print, echo, or log secret values (including via debug flags)
- Actions referenced by mutable tags rather than commit SHAs
- Workflow inputs used directly in shell commands without sanitization

**Signal:** A pull request or workflow trigger gives an untrusted actor execution or secret access.
