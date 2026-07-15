# Security Scanning

Automated security checks run on every push/PR to `main` and weekly on Monday.

## Workflows

| Workflow | Tool | What it checks | Failure threshold |
|----------|------|----------------|-------------------|
| Secret Scanning | [gitleaks](https://github.com/gitleaks/gitleaks) | Hardcoded secrets, API keys, tokens | Any secret found |
| Dependency Audit | `pnpm audit` | Known vulnerabilities in dependencies | moderate+ severity |
| CodeQL Analysis | GitHub CodeQL | Code vulnerabilities (injection, auth, etc.) | Any alert |

## Handling Findings

### Secret Scanning (gitleaks)

**If a secret is detected:**
1. **Do NOT merge the PR.** The secret is real and must be rotated.
2. Rotate the leaked credential immediately (provider dashboard).
3. Add the old secret to `.gitignore` or remove from history:
   ```bash
   # Remove from git history (requires force push)
   git filter-branch --force --index-filter \
     'git rm --cached --ignore-unmatch <file-with-secret>' \
     --prune-empty --tag-name-filter cat -- --all
   ```
4. Commit the fix (remove the secret from source) and push.
5. Re-run the security scan to confirm clean.

**False positive?** Add a gitleaks allowlist comment:
```typescript
// gitleaks:allow
const API_KEY = process.env.API_KEY; // env var reference, not hardcoded
```

### Dependency Audit

**If vulnerabilities are found:**
1. Check severity — `pnpm audit` fails on moderate+ by default.
2. For `high`/`critical`: fix immediately by upgrading the affected package.
   ```bash
   pnpm update <package-name>
   ```
3. For `moderate` with no fix available: document in PR description and create
   a follow-up issue. If the vulnerability is not in a financial path, it can
   be deferred.
4. Never ignore `critical` vulnerabilities — they block merge.

**Note:** The npm audit API is being retired (HTTP 410). If `pnpm audit` fails
with `ERR_PNPM_AUDIT_BAD_RESPONSE`, this is an upstream issue, not a real
vulnerability. The step is configured with `continue-on-error: true` until
the endpoint stabilizes. Track: https://github.com/pnpm/pnpm/issues

### CodeQL Analysis

**If alerts are found:**
1. Review the alert in the **Security** tab of the GitHub repo.
2. Check if the alert is in a live code path or dead code.
3. For live paths: fix the vulnerability (usually injection, prototype pollution, etc.).
4. For false positives: dismiss with a reason in the GitHub Security tab.
5. CodeQL alerts are informational — they don't block merge, but should be
   tracked and resolved.

## Workflow Permissions

All workflows use minimum permissions:
- `contents: read` — read-only access to repository contents
- `security-events: write` — only on CodeQL to upload SARIF results

No workflow has `contents: write`, `actions: write`, or `packages: write`
unless explicitly justified and documented.

## Lockfile Policy

- `pnpm-lock.yaml` **must** be committed and up to date.
- All `pnpm install` commands in CI use `--frozen-lockfile`.
- PRs that modify `package.json` without updating the lockfile will fail CI.
- The lockfile is the single source of truth for dependency versions.

## Environment Secrets

- **Never** print, log, or echo environment secrets in CI steps.
- Use `echo "::add-mask::$SECRET"` before using a secret in a command.
- Secret values are automatically masked in GitHub Actions logs, but
  additional masking prevents leakage in scripts and error messages.
