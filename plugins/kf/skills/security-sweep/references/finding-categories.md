# Finding Categories

Seven universal categories used in every security sweep, regardless of stack.
This file defines what each category means. Stack-specific detection patterns
and examples live in `stacks/`.

---

## How to use this file

1. Load this file to understand the category framework
2. Detect the project stack (see `security-sweep/SKILL.md` Step 1)
3. Load the matching file from `stacks/` for patterns and examples
4. If no stack file matches, load `stacks/generic.md`

Multiple stack files may apply — a project can be Python + bash deployment scripts,
or a Node.js service with React Native client. Load all that match.

---

## CRED — Credential Exposure

Credential values (API tokens, passwords, private keys, database connection strings)
present in source code, config files, logs, or output where they could be read
by an unauthorized party.

**Core question:** Is a secret value present anywhere it shouldn't be?

---

## AUTH — Authentication / Authorization

Missing, bypassable, or incorrectly implemented checks that allow unauthenticated
or unauthorized access to protected resources or operations.

**Core question:** Can a caller access something they shouldn't without proper verification?

---

## INJECT — Injection

User-supplied or externally-controlled input passed unsanitized into an interpreted
context: SQL queries, shell commands, template engines, HTML, eval, deserialization.

**Core question:** Can an attacker control execution by crafting malicious input?

---

## EXPOSE — Information Disclosure

Sensitive data (credentials, PII, internal paths, stack traces, system details)
returned to callers or written to logs where it shouldn't be accessible.

**Core question:** Does output reveal information that helps an attacker or violates privacy?

---

## SUPPLY — Supply Chain

Unverified, mutable, or potentially malicious external dependencies: packages,
container images, GitHub Actions, scripts fetched at runtime.

**Core question:** Could a dependency be compromised or swapped without detection?

---

## SCOPE — Excessive Privilege / Boundary Violation

Permissions, roles, or access scopes broader than needed; or operations that
cross expected boundaries (filesystem paths, network, process, API scopes).

**Core question:** Does this component have more access than it actually needs?

---

## CI — CI/CD Pipeline

GitHub Actions workflow configuration that exposes secrets, uses unsafe triggers,
lacks minimum permission declarations, or allows untrusted code to run with
elevated access.

**Core question:** Can a bad actor abuse the CI pipeline to exfiltrate secrets or
execute arbitrary code?
