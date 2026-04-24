# Threat Modeling

New integrations and features that handle credentials, user data, or external services
require a STRIDE threat model pass before implementation begins.

## When to threat model

| Situation | Required |
|-----------|----------|
| New external service integration | Yes — before writing any code |
| New auth or permission system | Yes — before writing any code |
| New data ingestion or storage path | Yes — before writing any code |
| Significant change to existing auth | Yes |
| Adding a new API endpoint with user input | Yes |
| Minor bug fix, UI tweak, doc change | No |

## Where it fits in spec-first

Threat modeling is a bridge between the requirements layer and the EARS/ADR layers.
Threats become EARS invariants ("the system SHALL NOT…"); mitigations become ADR decisions.

```
docs/requirements.md    ← what the feature does
  ↓
threat model pass       ← what could go wrong
  ↓
docs/ears/*.md          ← invariants that prevent each threat
  ↓
docs/adr/*.md           ← technology decisions that implement each mitigation
```

## How to run a STRIDE pass

Load `Skill(kf:secure-sdlc)` — it includes a STRIDE template pre-adapted for this stack.

For each component in scope, evaluate:

| Category | Question |
|----------|----------|
| **S**poofing | Can an attacker impersonate a user, service, or system component? |
| **T**ampering | Can an attacker modify data in transit or at rest? |
| **R**epudiation | Can a user deny performing an action with no audit trail to refute it? |
| **I**nformation Disclosure | Can an attacker access data they shouldn't? |
| **D**enial of Service | Can an attacker make the system unavailable? |
| **E**levation of Privilege | Can a low-privilege user gain higher access? |

## Output requirements

Save the threat model output in `docs/ears/<feature>-threats.md`. Minimum content:

1. Threat list — STRIDE category, attack vector, likelihood (HIGH/MEDIUM/LOW)
2. One EARS `SHALL NOT` invariant per HIGH-likelihood threat
3. An ADR for every mitigation that involves a technology or architecture choice

## Escalation

If a HIGH-likelihood threat has no viable mitigation within the current scope, surface it
as an open question in the requirements doc and create a beads issue before proceeding.
Do not silently accept an unmitigated HIGH threat.
