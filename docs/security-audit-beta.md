# Security Audit Report - Agent Beta

**Repository:** https://github.com/translorentz/translation-wiki.git
**Audit Date:** 2026-01-24
**Auditor:** Security Agent Beta
**Severity:** CRITICAL

---

## Executive Summary

This audit identified **multiple critical security vulnerabilities** in the git history and current codebase. Sensitive credentials including API keys and database connection strings were committed to the public repository and **remain accessible in git history**. Additionally, **shell scripts with hardcoded credentials still exist in the current HEAD**.

### Secrets Exposed

| Secret Type | Status |
|-------------|--------|
| DeepSeek API Key | EXPOSED - ROTATED |
| Gemini API Key | EXPOSED - REVOKED |
| Neon Database Password | EXPOSED - ROTATED |
| Neon Database Host | EXPOSED (infrastructure detail) |
| Auth Secret | EXPOSED - ROTATED |

---

## Timeline of Security Incidents

### Incident 1: Swap File Committed (2026-01-24 21:06:47 PST)

**Commit:** `0e5f5b1875436db6dd21e2f84ce136c515a0d68e`
**Author:** Bryan Cheong
**Message:** "Fix language labels to display in English and fix Armenian character issues"

A vim swap file (`.env.local.swp`) containing the full contents of `.env.local` was accidentally committed. The swap file contained:

```
# REDACTED - Full credentials were exposed
DEEPSEEK_API_KEY=***REMOVED***
GEMINI_API_KEY=***REMOVED***
DATABASE_URL='postgresql://neondb_owner:***REMOVED***@REDACTED_HOST'
AUTH_URL=http://localhost:3000
AUTH_SECRET=***REMOVED***
```

### Incident 2: Shell Scripts with Hardcoded Credentials (2026-01-24 04:28:28 PST)

**Commit:** `9dc4d1ab72472c6e1e80bd89a9f4804efc89d864`
**Message:** "Add processed data for 30+ texts and all processing/translation infrastructure"

Shell script `scripts/run-seed.sh` committed with hardcoded DATABASE_URL:

```bash
export DATABASE_URL='postgresql://neondb_owner:***REMOVED***@REDACTED_HOST...'
```

### Incident 3: Additional Shell Script with Both Credentials (2026-01-24 21:01:09 PST)

**Commit:** `33991014f76b4a235307ad2ab62cfc048b17d9bc`
**Message:** "Add Armenian language support (6 texts) and reorganize Featured Texts display"

Shell script `scripts/run-kaitser-translation.sh` committed with BOTH database URL and API key:

```bash
export DATABASE_URL='postgresql://neondb_owner:***REMOVED***@...'
export DEEPSEEK_API_KEY='***REMOVED***'
```

### Incident 4: Swap File Removed (2026-01-24 21:06:54 PST)

**Commit:** `fb04631716f04f47bcc20b71169901a5bd5daa3e`
**Message:** "Remove swap file from tracking"

The `.env.local.swp` file was removed, but the data remains in git history.

### Incident 5: Security Warning Added (2026-01-24 23:14:40 PST)

**Commit:** `9a987a39b311ff111ad48b6c4211ba732bf333b0`
**Message:** "SECURITY: Add critical warnings after .env.local.swp incident"

The `.gitignore` was updated to prevent future swap file commits, but **the shell scripts with hardcoded credentials were not addressed**.

---

## Current State Analysis

### Files Currently Containing Secrets (HEAD)

| File | Secrets Present |
|------|-----------------|
| `scripts/run-kaitser-translation.sh` | DATABASE_URL, DEEPSEEK_API_KEY |
| `scripts/run-seed.sh` | DATABASE_URL |

### Files Safe (No Hardcoded Secrets)

| File | Method |
|------|--------|
| `scripts/run-translate-marcianus.sh` | Reads from `.env.local` |
| `scripts/run-translate-shisan-jing.sh` | Reads from `.env.local` |

### Git History Contains

All of the above secrets are permanently accessible via:
- `git show 0e5f5b1:.env.local.swp | strings`
- `git show 9dc4d1a:scripts/run-seed.sh`
- `git show 3399101:scripts/run-kaitser-translation.sh`

---

## Detailed Findings

### Finding 1: Full .env.local Contents in Git History

**Severity:** CRITICAL
**Location:** Commit `0e5f5b1875436db6dd21e2f84ce136c515a0d68e`

The vim swap file contained the complete `.env.local` file including:
- DeepSeek API key (production)
- Gemini API key (now revoked per incident notes)
- Neon PostgreSQL connection string with username/password
- Auth secret for NextAuth.js sessions

**Verification Command:**
```bash
git show 0e5f5b1:.env.local.swp | strings -n 10
```

### Finding 2: Hardcoded Credentials in Active Scripts

**Severity:** CRITICAL
**Location:** `scripts/run-kaitser-translation.sh`, `scripts/run-seed.sh`

These scripts contain plaintext credentials and are currently tracked in the repository:

**scripts/run-kaitser-translation.sh (lines 5-6):**
```bash
export DATABASE_URL='postgresql://neondb_owner:***REMOVED***@REDACTED_DB_HOST/neondb?sslmode=require&channel_binding=require'
export DEEPSEEK_API_KEY='***REMOVED***'
```

**scripts/run-seed.sh (line 5):**
```bash
export DATABASE_URL='postgresql://neondb_owner:***REMOVED***@REDACTED_DB_HOST/neondb?sslmode=require&channel_binding=require'
```

### Finding 3: Database Connection String Exposes Infrastructure

**Severity:** HIGH

The exposed connection string reveals:
- **Database provider:** Neon
- **Region:** us-east-1 (AWS)
- **Endpoint:** `REDACTED_HOST`
- **Database name:** neondb
- **Username:** neondb_owner
- **Password:** `***REMOVED***`

This allows direct database access to anyone who retrieves it from git history.

### Finding 4: Incomplete Remediation

**Severity:** HIGH

The security commit `9a987a3` added `.gitignore` rules for swap files but did not:
1. Remove hardcoded credentials from shell scripts
2. Rewrite git history to purge exposed secrets
3. Rotate all compromised credentials

---

## Recommendations

### Immediate Actions (CRITICAL)

1. **Rotate ALL Compromised Credentials:**
   - DeepSeek API key: Generate new key, revoke `***REMOVED***`
   - Neon database: Reset password for `neondb_owner` role
   - Auth secret: Generate new AUTH_SECRET and update Vercel environment
   - Gemini API key: Already revoked per incident notes (verify)

2. **Remove Hardcoded Credentials from Scripts:**
   - Edit `scripts/run-kaitser-translation.sh` to read from `.env.local`
   - Edit `scripts/run-seed.sh` to read from `.env.local`

3. **Purge Git History (Optional but Recommended):**
   Use `git filter-repo` or BFG Repo-Cleaner to remove sensitive files from history:
   ```bash
   # Using BFG Repo-Cleaner
   bfg --delete-files '*.swp' --delete-files 'run-kaitser-translation.sh' --delete-files 'run-seed.sh'
   git reflog expire --expire=now --all
   git gc --prune=now --aggressive
   git push --force
   ```

   **Warning:** Force-pushing rewrites history and affects all collaborators.

### Preventive Measures

1. **Pre-commit Hook:**
   Add a pre-commit hook to scan for secrets:
   ```bash
   # .git/hooks/pre-commit
   if git diff --cached --name-only | xargs grep -l -E "(sk-[a-f0-9]{32}|REDACTED_GEMINI_PREFIX|npg_)" 2>/dev/null; then
     echo "ERROR: Potential secrets detected in staged files"
     exit 1
   fi
   ```

2. **Use Environment Variable Loading:**
   All scripts should load from `.env.local`:
   ```bash
   set -a
   source .env.local
   set +a
   ```

3. **Add Secret Scanning:**
   - Enable GitHub secret scanning (Settings > Code security and analysis)
   - Consider tools like `gitleaks`, `truffleHog`, or `detect-secrets`

4. **Update .gitignore:**
   Already updated to include `*.swp` patterns. Consider adding:
   ```
   # Shell scripts that might contain credentials
   scripts/run-*.sh
   !scripts/run-*.sh.example
   ```

---

## Verification Commands

To verify the presence of secrets in git history:

```bash
# Check swap file contents
git show 0e5f5b1:.env.local.swp | strings | grep -E "(KEY|URL|SECRET)"

# Search for API key pattern in all commits
git log -p --all -S "sk-[REDACTED]" -- . | head -50

# Search for database password in all commits
git log -p --all -S "***REMOVED***" -- . | head -50

# List all commits that touched sensitive files
git log --all --oneline -- "*.env*" "*.swp" "*.sh"
```

---

## Compliance Notes

- **PCI DSS:** Credentials in version control violate PCI DSS requirement 6.5.8
- **SOC 2:** Secret exposure indicates inadequate access controls (CC6.1)
- **GDPR:** If database contains EU user data, this may constitute a notifiable breach

---

## Conclusion

This repository has experienced multiple security incidents involving credential exposure. While some remediation has occurred (swap file removal, .gitignore updates), **critical issues remain**:

1. Two shell scripts in the current HEAD contain hardcoded credentials
2. All secrets remain accessible in git history
3. No credential rotation has been confirmed

**Risk Level: CRITICAL**

Until the hardcoded credentials are removed, secrets rotated, and optionally git history purged, the database and API services remain at risk of unauthorized access.

---

*Report generated by Security Agent Beta*
*Audit methodology: Git history analysis, pattern matching, file content review*
