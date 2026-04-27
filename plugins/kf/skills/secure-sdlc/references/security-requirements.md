# Security Requirements Checklist

Use this checklist when writing specs that touch external services, authentication,
or sensitive data. Requirements are expressed as EARS invariants:
`WHILE <condition>, THE SYSTEM SHALL <behavior>`.

---

## 1. Authentication requirements

- [ ] WHILE a credential (API token, AWS key, session token) is present in the environment,
  THE SYSTEM SHALL validate it is non-empty and structurally plausible before use.

- [ ] WHILE a credential is missing or expired, THE SYSTEM SHALL fail immediately with an
  actionable error message identifying which credential is missing and where to set it,
  rather than proceeding and failing silently later.

- [ ] WHILE executing any operation that uses a credential, THE SYSTEM SHALL NOT include
  the credential value in any log output, error message, or debug trace.

- [ ] WHILE a credential needs to be rotated, THE SYSTEM SHALL accept the new value via
  environment variable only, requiring no code change and no re-deployment.

---

## 2. Authorization requirements

- [ ] WHILE an IAM role or service account is created or updated, THE SYSTEM SHALL scope
  its permissions to the minimum required for its declared function (least-privilege).

- [ ] WHILE executing cross-service operations, THE SYSTEM SHALL NOT share credentials
  across AWS accounts or Figma teams unless explicitly documented and approved.

- [ ] WHILE requesting scopes for an external API token (Figma, GitHub),
  THE SYSTEM SHALL request only the minimum scopes required by the feature being built.

---

## 3. Data handling requirements

- [ ] WHILE writing any file to a git-tracked directory, THE SYSTEM SHALL NOT include
  PII, credential values, API tokens, or session tokens in the file content.

- [ ] WHILE returning an error response from any operation, THE SYSTEM SHALL NOT expose
  internal file paths, token values, account IDs, or stack trace details to the caller.

- [ ] WHILE a temporary file containing credential data is created, THE SYSTEM SHALL
  delete it in a `trap` or `finally` block so it is removed even on failure.

---

## 4. Audit and logging requirements

- [ ] WHILE making a call to any external API (AWS Bedrock, Figma, GitHub),
  THE SYSTEM SHALL log the call (endpoint, timestamp, status) without logging
  credential values or full response bodies containing sensitive data.

- [ ] WHILE a credential validation or authentication step fails, THE SYSTEM SHALL log
  the failure (which credential, which service, when) to support incident investigation.

- [ ] WHILE an install or setup script modifies files on disk, THE SYSTEM SHALL log
  each file path written, overwritten, or skipped so the operator can audit changes.

---

## 5. Failure mode requirements

- [ ] WHILE an external service (AWS, Figma, GitHub, beads) is unavailable,
  THE SYSTEM SHALL fail gracefully with an actionable error message identifying the
  service and a suggested remediation step, rather than hanging or crashing silently.

- [ ] WHILE a multi-step operation fails partway through, THE SYSTEM SHALL NOT leave
  partial state (half-written files, partially created issues, incomplete installs)
  that would require manual cleanup to resolve.

- [ ] WHILE a transient error (rate limit, network timeout, 5xx response) is received
  from an external service, THE SYSTEM SHALL retry with exponential backoff (base 1s,
  max 3 attempts) before surfacing the failure to the caller.
