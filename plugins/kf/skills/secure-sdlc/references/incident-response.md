# Incident Response Playbooks

Three playbooks for the most common credential exposure scenarios in this stack.
Each playbook has three time-boxed phases. Start the clock when the exposure is confirmed.

---

## Playbook 1: AWS Credential Compromise

### Immediate actions (< 5 min)

1. Open the AWS IAM console and deactivate the exposed access key:
   `IAM → Users → <user> → Security credentials → Deactivate`
2. Revoke any active AWS SSO sessions for the affected profile:
   `AWS SSO portal → Active sessions → Revoke`
3. If the key was used in CI, remove or disable the GitHub Actions secret immediately:
   `GitHub → Settings → Secrets → Delete <AWS_*>`

### Short-term actions (< 1 hr)

1. Rotate the AWS profile locally:
   ```bash
   aws iam create-access-key --user-name <user>
   # Update ~/.aws/credentials with the new key
   aws iam delete-access-key --access-key-id <old-key-id> --user-name <user>
   ```
2. Verify the old key is no longer usable:
   ```bash
   AWS_ACCESS_KEY_ID=<old-key> AWS_SECRET_ACCESS_KEY=<old-secret> \
     aws sts get-caller-identity
   # Expected: error — credentials are invalid
   ```
3. Verify the new key works:
   ```bash
   aws sts get-caller-identity
   # Expected: returns your account ID and user ARN
   ```
4. Update `.env` with the new key values; re-source before continuing work
5. If CI was affected, add the new key as a GitHub Actions secret and re-run the failed workflow

### Follow-up (< 24 hr)

- Review CloudTrail for any API calls made with the compromised key during the exposure window
- File a beads incident issue:
  ```bash
  bd create \
    --title="[incident] AWS credential compromised — exposure window <date range>" \
    --description="Key: <last 4 chars only>
Exposure window: <start> to <revocation time>
CloudTrail review: <findings>
Root cause: <how it was exposed>" \
    --type=bug \
    --priority=0
  ```
- If CloudTrail shows unauthorized usage, escalate to the AWS account owner

---

## Playbook 2: Figma Token Exposure

### Immediate actions (< 5 min)

1. Revoke the exposed personal access token:
   Go to https://www.figma.com/settings → Personal access tokens → Revoke the token
2. Confirm revocation: any Figma API call using the old token should return 403

### Short-term actions (< 1 hr)

1. Create a new token at https://www.figma.com/settings → Personal access tokens → Create new token
2. Update `.env.local`:
   ```bash
   FIGMA_API_TOKEN=<new-token>
   ```
3. Re-source and verify:
   ```bash
   source .env.local
   curl -s -H "X-Figma-Token: $FIGMA_API_TOKEN" \
     "https://api.figma.com/v1/me" | jq '.email'
   ```
4. Update `.claude/settings.local.json` if the token was written there by `setup.sh`
5. Check any CI/CD secrets that stored the old token

### Follow-up (< 24 hr)

- Figma does not provide a comprehensive API audit log for PATs; note the exposure window
  in the incident issue and monitor for unexpected file access
- File a beads incident issue with the same format as Playbook 1

---

## Playbook 3: Secret in Git History

### Immediate actions (< 5 min)

1. Treat the secret as compromised — rotate it immediately using the relevant playbook above
   before attempting to clean the history
2. Notify all active collaborators on the branch to not push or pull until the purge is complete
3. Do not merge any PRs that include the commit containing the secret

### Short-term actions (< 1 hr)

1. Identify the commit and file containing the secret:
   ```bash
   git log --all --oneline | head -20
   git show <commit-sha>:<path/to/file>
   ```
2. Install `git-filter-repo` if not present:
   ```bash
   brew install git-filter-repo
   ```
3. Purge the secret from all history:
   ```bash
   git filter-repo --path <path/to/file> --invert-paths
   # Or to replace just the value:
   git filter-repo --replace-text <(echo '<secret-value>==>REDACTED')
   ```
4. Force-push all affected branches:
   ```bash
   git push origin --force --all
   git push origin --force --tags
   ```
5. Instruct all collaborators to re-clone or reset their local copies:
   ```bash
   # Each collaborator runs:
   git fetch origin
   git reset --hard origin/<branch>
   ```

### Follow-up (< 24 hr)

- Verify the secret no longer appears in any branch or tag:
  ```bash
  git log --all --oneline --source -- <path/to/file>
  git grep '<secret-value>' $(git rev-list --all)
  ```
- File a beads incident issue:
  ```bash
  bd create \
    --title="[incident] Secret exposed in git history" \
    --description="File: <path>
Commit: <sha>
Exposure window: <date range>
Secret rotated: yes
History purged: yes
Collaborators notified: yes/no" \
    --type=bug \
    --priority=0
  ```
- Review whether `.gitignore` needs updating to prevent recurrence
- Consider adding a pre-commit hook or CI check that scans for credential patterns
