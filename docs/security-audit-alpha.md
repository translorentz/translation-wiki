# Security Audit Report - Agent Alpha

**Audit Date:** 2026-01-24
**Auditor:** Claude Agent (Alpha)
**Repository:** https://github.com/translorentz/translation-wiki.git
**Severity:** CRITICAL

---

## Executive Summary

This audit identified **multiple critical security vulnerabilities** in the translation-wiki repository. API keys and database credentials have been exposed in the git history and are **still present in currently tracked files**. The repository is public on GitHub, meaning these secrets are accessible to anyone.

### Exposed Credentials Summary

| Secret Type | Status |
|-------------|--------|
| DeepSeek API Key | EXPOSED - ROTATED |
| Neon Database Password | EXPOSED - ROTATED |
| Gemini API Key | EXPOSED - REVOKED |
| AUTH_SECRET | EXPOSED - ROTATED |

---

## Detailed Findings

### Finding 1: API Keys in Currently Tracked Files

**Severity:** CRITICAL
**Status:** ACTIVE - Secrets are STILL in the repository

The following files contain hardcoded secrets and are currently tracked by git:

#### File: `/scripts/run-kaitser-translation.sh`
```bash
export DATABASE_URL='postgresql://neondb_owner:***REMOVED***@REDACTED_DB_HOST/neondb?sslmode=require&channel_binding=require'
export DEEPSEEK_API_KEY='***REMOVED***'
```

#### File: `/scripts/run-seed.sh`
```bash
export DATABASE_URL='postgresql://neondb_owner:***REMOVED***@REDACTED_DB_HOST/neondb?sslmode=require&channel_binding=require'
```

#### File: `/docs/armenian-kaitser-processing.md`
Contains the full DeepSeek API key and DATABASE_URL with password in documentation text at lines 145-147.

---

### Finding 2: Swap File Committed to Git History

**Severity:** CRITICAL
**Status:** In git history (removed in commit fb04631)

A vim swap file (`.env.local.swp`) was committed to the repository, containing:

```
DEEPSEEK_API_KEY=***REMOVED***
GEMINI_API_KEY=***REMOVED***
DATABASE_URL='postgresql://neondb_owner:***REMOVED***@REDACTED_DB_HOST/neondb?sslmode=require&channel_binding=require'
AUTH_URL=http://localhost:3000
AUTH_SECRET=***REMOVED***
```

**Note:** The swap file still exists on disk at `.env.local.swp` but is now gitignored.

---

### Finding 3: Commits Containing Secrets

The following commits contain exposed secrets:

| Commit Hash | Date | Description | Secrets Exposed |
|-------------|------|-------------|-----------------|
| `9dc4d1a` | 2026-01-24 04:28:28 | Add processed data for 30+ texts | DATABASE_URL with password in run-seed.sh |
| `3399101` | 2026-01-24 21:01:09 | Add Armenian language support | DeepSeek API key, DATABASE_URL in run-kaitser-translation.sh and docs |
| `0e5f5b1` | 2026-01-24 21:06:47 | Fix language labels | .env.local.swp added (ALL secrets) |
| `fb04631` | 2026-01-24 21:06:54 | Remove swap file from tracking | Swap file removed but secrets remain in other files |

---

### Finding 4: Full Database Connection String Exposed

**Severity:** CRITICAL

The complete Neon PostgreSQL connection string is exposed:
```
postgresql://neondb_owner:***REMOVED***@REDACTED_DB_HOST/neondb?sslmode=require&channel_binding=require
```

This provides:
- Database username: `neondb_owner`
- Database password: `***REMOVED***`
- Database host: `REDACTED_DB_HOST`
- Database name: `neondb`

An attacker could use this to:
- Read all data in the database
- Modify or delete data
- Extract user information
- Inject malicious content

---

## Impact Assessment

### Immediate Risks

1. **Database Compromise:** Full read/write access to production database
2. **API Abuse:** DeepSeek API key can be used to make requests billed to the owner
3. **Session Hijacking:** AUTH_SECRET exposure could allow forging session tokens
4. **Historical Access:** All secrets remain accessible via git history even after deletion

### Services Affected

| Service | Credential Type | Risk Level |
|---------|-----------------|------------|
| Neon PostgreSQL | Database URL + Password | CRITICAL |
| DeepSeek AI | API Key | HIGH |
| Gemini AI | API Key | HIGH (reportedly revoked) |
| NextAuth | AUTH_SECRET | HIGH |

---

## Recommendations

### IMMEDIATE ACTIONS (Do within 1 hour)

1. **Rotate ALL exposed credentials:**
   - [ ] Regenerate Neon database password
   - [ ] Regenerate DeepSeek API key
   - [ ] Regenerate AUTH_SECRET
   - [ ] Verify Gemini API key is revoked

2. **Remove secrets from tracked files:**
   ```bash
   # Delete files containing secrets
   git rm scripts/run-kaitser-translation.sh
   git rm scripts/run-seed.sh

   # Edit docs/armenian-kaitser-processing.md to remove credentials
   ```

3. **Update shell scripts to load from .env.local:**
   - Rewrite scripts to use `source .env.local` or `export $(grep -v '^#' .env.local | xargs)`
   - See `/scripts/run-translate-shisan-jing.sh` for a good example

### SHORT-TERM ACTIONS (Do within 24 hours)

4. **Rewrite git history to remove secrets:**
   ```bash
   # Use BFG Repo-Cleaner or git filter-repo
   bfg --delete-files .env.local.swp
   bfg --replace-text passwords.txt  # File containing secrets to scrub
   git push --force
   ```

5. **Enable branch protection:**
   - Require pull request reviews
   - Enable secret scanning alerts on GitHub
   - Add pre-commit hooks to detect secrets

6. **Audit database for unauthorized access:**
   - Check Neon console for unusual queries
   - Review connection logs for unknown IPs
   - Check for any data modifications

### LONG-TERM ACTIONS

7. **Implement secrets management:**
   - Use environment variables from CI/CD (Vercel env vars)
   - Never commit secrets to any file
   - Consider using a secrets manager (e.g., Doppler, 1Password CLI)

8. **Add automated secret scanning:**
   ```bash
   # Add to pre-commit hook
   git secrets --install
   git secrets --register-aws
   ```

9. **Training and documentation:**
   - Document the incident in project files (DONE - see commit 9a987a3)
   - Establish clear guidelines for handling credentials

---

## Files Requiring Immediate Attention

| File | Action Required |
|------|-----------------|
| `/scripts/run-kaitser-translation.sh` | DELETE or rewrite to load from .env.local |
| `/scripts/run-seed.sh` | DELETE or rewrite to load from .env.local |
| `/docs/armenian-kaitser-processing.md` | EDIT to remove credentials (lines 145-147) |
| `/.env.local.swp` | DELETE from disk (already gitignored) |

---

## Audit Methodology

This audit used the following techniques:

1. **Git history search:** `git log --all -S "<pattern>"` to find commits introducing/removing secrets
2. **Current file search:** `git ls-files | xargs grep` to find secrets in tracked files
3. **Binary file analysis:** `strings` command on swap file to extract readable content
4. **Pattern matching:** Regex for API key formats (`sk-`, `REDACTED_GEMINI_PREFIX`, `npg_`)

---

## Confidence Level

**HIGH CONFIDENCE** - This audit thoroughly examined:
- [x] All 45 commits in git history
- [x] All currently tracked files
- [x] Binary files (swap files)
- [x] Shell scripts for hardcoded credentials
- [x] Documentation files for exposed secrets
- [x] Git history for environment files

**Note:** This audit did not examine:
- Deployment logs on Vercel
- Browser history or local caches
- Third-party service logs

---

## Conclusion

This repository has experienced a **serious security breach**. Multiple API keys and the production database credentials have been exposed in a public GitHub repository. While a security warning commit (9a987a3) was made acknowledging the swap file incident, **secrets remain in currently tracked files** that were not addressed.

The most urgent action is to:
1. Rotate all credentials immediately
2. Remove the three files still containing hardcoded secrets
3. Consider using BFG Repo-Cleaner to scrub git history

---

*Report generated by Security Audit Agent Alpha*
*Audit completed: 2026-01-24*
