# Security Review

Load the right security skill at the right moment during development.

## When to load which skill

| Situation | Load |
|-----------|------|
| Designing a feature with external integrations | `Skill(kf:secure-sdlc)` |
| Adding or modifying auth / authorization logic | `Skill(kf:secure-sdlc)` |
| Pre-merge review on security-sensitive changes | `Skill(kf:secure-sdlc)` |
| Responding to a reported security issue | `Skill(kf:secure-sdlc)` |
| Adding or modifying a GitHub Actions workflow | `Skill(ce:managing-pipelines)` |
| Reviewing CI/CD pipeline configuration | `Skill(ce:managing-pipelines)` |
| Retrospective scan of a branch or PR | `Skill(kf:security-sweep)` |

## What counts as security-sensitive

- Authentication and session management
- Authorization and permission checks
- External API integrations (credential handling, token storage)
- File uploads or user-provided content processed server-side
- Database queries with any user input
- CI/CD pipeline changes
- Dependency additions or updates

## Minimum review bar

For any change touching the above, at least one must be true before merge:

- `kf:secure-sdlc` pre-merge checklist was run, **or**
- A human reviewer with security context approved the change

Passing tests alone does not satisfy the security review requirement.
