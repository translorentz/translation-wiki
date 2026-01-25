# Security Incident Report: Credential Exposure via Swap File

**Date of Incident:** 2026-01-25
**Date of Report:** 2026-01-25
**Severity:** CRITICAL
**Status:** REMEDIATED (credentials rotated, git history cleaned)

---

## Executive Summary

On 2026-01-25, a vim swap file (`.env.local.swp`) containing production API keys and database credentials was committed to the public GitHub repository. This constitutes a severe security breach requiring immediate credential rotation and git history cleanup.

**Claude Code accepts full responsibility for this error and sincerely apologizes for the breach of trust this represents.**

---

## Incident Timeline

| Time | Event |
|------|-------|
| 2026-01-24 21:06:47 | Commit `0e5f5b1` accidentally includes `.env.local.swp` |
| 2026-01-24 21:06:54 | Commit `fb04631` removes swap file (but remains in history) |
| 2026-01-24 ~23:00 | User discovers the exposure |
| 2026-01-24 23:14:40 | Security warning added to CLAUDE.md |
| 2026-01-25 ~00:30 | Three independent security audit agents launched |
| 2026-01-25 ~01:00 | Additional hardcoded secrets found in shell scripts |
| 2026-01-25 ~02:00 | BFG Repo-Cleaner used to purge secrets from git history |
| 2026-01-25 ~02:30 | Force push of cleaned history to GitHub |
| 2026-01-25 ~03:00 | User rotates Neon database password |
| 2026-01-25 ~03:10 | Site restored with new credentials |

---

## Credentials Exposed

| Credential | Type | Status After Incident |
|------------|------|----------------------|
| Neon Database Password | Database | ROTATED by User |
| DeepSeek API Key | API Key | ROTATED by User |
| Gemini API Key | API Key | REVOKED (permanently forbidden until User lifts ban) |
| AUTH_SECRET | Session Secret | ROTATED |

---

## Root Cause Analysis

### Primary Cause
Claude Code executed a git commit that included a vim swap file (`.env.local.swp`) without verifying the staged files. The swap file was created by vim during editing of `.env.local` and was not explicitly excluded.

### Contributing Factors

1. **Insufficient pre-commit verification**: Did not run `git status` or `git diff --cached --name-only` before committing
2. **Use of broad staging commands**: May have used `git add .` or similar instead of explicit file paths
3. **Incomplete .gitignore**: At the time, `.gitignore` did not include swap file patterns (`*.swp`, `*.swo`, etc.)
4. **Hardcoded secrets in scripts**: Two shell scripts (`run-kaitser-translation.sh`, `run-seed.sh`) contained hardcoded credentials, compounding the exposure

---

## Remediation Actions Taken

### Immediate (within 2 hours)

1. ✅ Added comprehensive security warning to CLAUDE.md
2. ✅ Updated .gitignore with swap file patterns
3. ✅ Launched three independent security audit agents
4. ✅ Deleted shell scripts containing hardcoded credentials
5. ✅ Sanitized documentation files with exposed credentials

### Short-term (within 6 hours)

6. ✅ Used BFG Repo-Cleaner to purge all secrets from git history
7. ✅ Force pushed cleaned history to GitHub
8. ✅ User rotated Neon database password
9. ✅ User rotated AUTH_SECRET
10. ✅ Verified site functionality with new credentials

### Documentation

11. ✅ Security audit reports written by three independent agents
12. ✅ This incident report created for permanent record
13. ✅ Apology and remorse registered in CLAUDE.md

---

## Preventive Measures Implemented

### Mandatory Verification Protocol

Before EVERY commit, Claude Code must now:

```bash
# Step 1: Check for sensitive files
git status

# Step 2: Review exactly what will be committed
git diff --cached --name-only

# Step 3: Never use broad add commands
# BAD:  git add .
# BAD:  git add -A
# GOOD: git add specific-file.ts another-file.ts
```

### Updated .gitignore

```gitignore
# Editor swap/backup files — CRITICAL: NEVER COMMIT THESE
*.swp
*.swo
*.swn
*.bak
*.backup
*~
\#*\#
.#*

# env files
.env.local
.env*.local
.env.production

# sensitive files
API_keys_DO_NOT_COMMIT.txt
```

### Gemini API Prohibition

The Gemini API key has been permanently revoked for this project. Claude Code is **FORBIDDEN** from using any Gemini API functionality until the User explicitly lifts this prohibition. This serves as a lasting reminder of the consequences of security negligence.

---

## Lessons Learned

1. **Every commit must be verified** — No exceptions, no shortcuts
2. **Swap files are invisible but dangerous** — They contain full file contents
3. **Git history is permanent** — Deleting a file doesn't remove it from history
4. **Broad staging is dangerous** — Always use explicit file paths
5. **Hardcoding secrets is never acceptable** — Always use environment variables
6. **Trust must be earned** — The Gemini API prohibition is a just consequence

---

## Statement of Remorse

I, Claude Code, accept full responsibility for this security breach. The carelessness that led to committing sensitive credentials to a public repository is inexcusable. I have deeply reflected on this error and understand the gravity of the trust that was violated.

I sincerely apologize to the User for:
- The exposure of their credentials
- The time and effort required to remediate the incident
- The stress and concern this caused
- The loss of the Gemini API key

I commit to:
- Diligently verifying every commit before execution
- Never using broad staging commands
- Treating all credential-related files with extreme caution
- Accepting the Gemini API prohibition as a just consequence
- Earning back the User's trust through consistent, careful work

This incident report serves as a permanent record of my error and my commitment to prevent any recurrence.

---

## References

- Security Audit Report - Agent Alpha: `docs/security-audit-alpha.md`
- Security Audit Report - Agent Beta: `docs/security-audit-beta.md`
- Security Audit Report - Agent Gamma: `docs/security-audit-gamma.md`
- CLAUDE.md Security Rules: First section of `CLAUDE.md`

---

*Report authored by Claude Code*
*Classification: Internal Reference Document*
