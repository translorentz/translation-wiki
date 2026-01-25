# Security Audit Report - Agent Gamma

**Date:** 2026-01-24
**Repository:** https://github.com/translorentz/translation-wiki
**Auditor:** Claude Security Agent Gamma
**Severity:** CRITICAL

---

## Executive Summary

This audit reveals a **critical security breach** with multiple API keys and database credentials publicly exposed on the GitHub repository. The exposure is not limited to git history - credentials are currently accessible on the `main` branch in multiple files. Immediate remediation is required.

---

## 1. Summary of Public Exposure

### Exposed Secrets (Currently Accessible)

| Secret Type | Value (Redacted for Report) | Exposure Location |
|-------------|----------------------------|-------------------|
| DeepSeek API Key | `***REMOVED***` | Multiple files |
| Neon Database URL | `postgresql://neondb_owner:***REMOVED***@REDACTED_HOST...` | Multiple files |
| Gemini API Key | `***REMOVED***` | Swap file in history |
| Auth Secret | `***REMOVED***` | Swap file in history |

### Severity: CRITICAL

All of these secrets are publicly accessible via GitHub's raw URLs and API endpoints.

---

## 2. Detailed Exposure Analysis

### 2.1 Files Currently on `main` Branch with Hardcoded Secrets

#### `/scripts/run-kaitser-translation.sh`
```bash
export DATABASE_URL='postgresql://neondb_owner:***REMOVED***@REDACTED_DB_HOST/neondb?sslmode=require&channel_binding=require'
export DEEPSEEK_API_KEY='***REMOVED***'
```
**Raw URL:** https://raw.githubusercontent.com/translorentz/translation-wiki/main/scripts/run-kaitser-translation.sh

#### `/scripts/run-seed.sh`
```bash
export DATABASE_URL='postgresql://neondb_owner:***REMOVED***@REDACTED_DB_HOST/neondb?sslmode=require&channel_binding=require'
```
**Raw URL:** https://raw.githubusercontent.com/translorentz/translation-wiki/main/scripts/run-seed.sh

#### `/docs/armenian-kaitser-processing.md`
Contains hardcoded credentials in documentation:
```
DATABASE_URL='postgresql://neondb_owner:***REMOVED***@...'
DEEPSEEK_API_KEY='***REMOVED***'
```
**Raw URL:** https://raw.githubusercontent.com/translorentz/translation-wiki/main/docs/armenian-kaitser-processing.md

### 2.2 Swap File Exposure in Git History

#### Commit `0e5f5b1875436db6dd21e2f84ce136c515a0d68e`

A vim swap file (`.env.local.swp`) was committed containing:

- DeepSeek API Key
- Gemini API Key
- Neon Database URL (production)
- Auth Secret
- Local Database URL

**Still Accessible Via:**
- GitHub API: `https://api.github.com/repos/translorentz/translation-wiki/contents/.env.local.swp?ref=0e5f5b1875436db6dd21e2f84ce136c515a0d68e`
- Raw URL: `https://raw.githubusercontent.com/translorentz/translation-wiki/0e5f5b1875436db6dd21e2f84ce136c515a0d68e/.env.local.swp`

The file was removed in commit `fb04631` but the historical commit is permanently accessible.

### 2.3 Attack Vector Summary

An attacker can:
1. **Access the production database** using the exposed Neon credentials
2. **Make API calls** using the DeepSeek and Gemini API keys (incurring costs)
3. **Forge authentication tokens** using the exposed AUTH_SECRET
4. **Read/modify/delete all data** in the PostgreSQL database

---

## 3. .gitignore Assessment

### Current .gitignore Coverage

```gitignore
# Editor swap/backup files -- CRITICAL: NEVER COMMIT THESE
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

### Assessment: PARTIALLY ADEQUATE

The `.gitignore` correctly excludes:
- Swap files (`*.swp`, `*.swo`, `*.swn`)
- Environment files (`.env.local`, `.env*.local`, `.env.production`)
- Backup files

### Critical Gap: Shell Scripts and Documentation

The `.gitignore` does NOT prevent:
- Hardcoded secrets in `.sh` files
- Hardcoded secrets in `.md` documentation
- Hardcoded secrets in any committed code

**Recommendation:** Never hardcode secrets in any file. The `.gitignore` cannot protect against secrets in tracked files.

---

## 4. Code Patterns Analysis

### Environment Variable Usage (Proper Pattern)

The codebase correctly uses `process.env.*` for secrets in most places:

```typescript
// src/server/translation/client.ts
const apiKey = process.env.DEEPSEEK_API_KEY;

// src/server/db/index.ts
const connectionString = process.env.DATABASE_URL!;
```

### Problematic Patterns Found

1. **Shell scripts with hardcoded exports:**
   - `scripts/run-kaitser-translation.sh`
   - `scripts/run-seed.sh`

2. **Documentation with real credentials:**
   - `docs/armenian-kaitser-processing.md`

3. **Scripts reading from .env.local correctly (good pattern):**
   - `scripts/run-translate-marcianus.sh` (reads from .env.local)
   - `scripts/run-translate-shisan-jing.sh` (reads from .env.local)

---

## 5. Immediate Remediation Required

### PRIORITY 1: Rotate All Exposed Secrets (Do Immediately)

1. **DeepSeek API Key:** Regenerate at https://platform.deepseek.com
2. **Gemini API Key:** Regenerate at https://aistudio.google.com
3. **Neon Database Password:** Reset via Neon Console or CLI
4. **Auth Secret:** Generate new secret: `openssl rand -base64 32`

### PRIORITY 2: Remove Hardcoded Secrets from Repository

Remove or sanitize these files:
- `scripts/run-kaitser-translation.sh`
- `scripts/run-seed.sh`
- `docs/armenian-kaitser-processing.md`

Replace hardcoded values with environment variable references:
```bash
# Good pattern
source .env.local
# or
export $(grep -v '^#' .env.local | xargs)
```

### PRIORITY 3: Consider Git History Cleanup

Options for removing secrets from history:
1. **BFG Repo-Cleaner:** `bfg --delete-files .env.local.swp`
2. **git filter-repo:** More thorough but requires rewriting history
3. **GitHub Support:** Request assistance for sensitive data removal

**Warning:** History rewriting affects all collaborators and forks.

### PRIORITY 4: Add Pre-commit Hooks

Install a secret scanning pre-commit hook:

```bash
# Install gitleaks or similar
brew install gitleaks

# Add to .pre-commit-config.yaml
repos:
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.18.0
    hooks:
      - id: gitleaks
```

---

## 6. Recommended .gitignore Additions

```gitignore
# Additional sensitive patterns
*.key
*.pem
*.p12
*.pfx
credentials*
*secret*
*password*
*.credentials
.secrets
secrets/

# Shell history
.bash_history
.zsh_history
```

---

## 7. Verification Checklist

After remediation, verify:

- [ ] All exposed API keys have been rotated
- [ ] Database password has been changed
- [ ] Auth secret has been regenerated
- [ ] Vercel environment variables updated with new secrets
- [ ] Shell scripts no longer contain hardcoded credentials
- [ ] Documentation sanitized
- [ ] Pre-commit hooks installed and tested
- [ ] Team notified of credential rotation

---

## 8. Appendix: Evidence

### Swap File Content (Decoded from Base64)

```
DEEPSEEK_API_KEY=***REMOVED***
GEMINI_API_KEY=***REMOVED***
DATABASE_URL='postgresql://neondb_owner:***REMOVED***@REDACTED_DB_HOST/neondb?sslmode=require&channel_binding=require'
AUTH_URL=http://localhost:3000
AUTH_SECRET=***REMOVED***
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/translation_wiki
```

### Commit History

```
fb04631 Remove swap file from tracking
0e5f5b1 Fix language labels to display in English and fix Armenian character issues (ADDED .env.local.swp)
```

### GitHub API Access Proof

```bash
curl -s "https://api.github.com/repos/translorentz/translation-wiki/contents/.env.local.swp?ref=0e5f5b1875436db6dd21e2f84ce136c515a0d68e"
# Returns file with base64-encoded secrets
```

---

## 9. Conclusion

This repository has a **critical security vulnerability** with production credentials publicly exposed. The exposure exists both in current files on the `main` branch and in git history.

**Immediate action required:**
1. Rotate all exposed secrets NOW
2. Remove hardcoded credentials from tracked files
3. Update Vercel with new credentials
4. Consider git history cleanup for compliance

The `.gitignore` configuration is adequate for preventing future swap file commits, but it cannot protect against intentionally committed files containing secrets. Developer education and pre-commit hooks are essential preventive measures.

---

*Report generated by Security Audit Agent Gamma*
*Classification: CONFIDENTIAL - Contains Credential Information*
