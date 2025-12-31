# Security Guidelines

## 🔒 Preventing Sensitive Data Exposure

### Never Commit These Files:
- `.env` - Contains actual secrets (already in `.gitignore`)
- `*.pem` - Private keys
- `credentials.json` - Service account credentials
- Any file with actual API keys, passwords, or tokens

### Always Use These Patterns:

#### ✅ DO:
```bash
# Use environment variables
const apiKey = process.env.LLAMA_CLOUD_API_KEY;

# Use Amplify secrets
npx ampx sandbox secret set LLAMA_CLOUD_API_KEY

# Document with placeholders
LLAMA_CLOUD_API_KEY=llx-YOUR_API_KEY_HERE
```

#### ❌ DON'T:
```bash
# Never hardcode credentials
const apiKey = 'llx-ziMIFusg0zGaAgLrHP786hEO7o79CUifcOBLDT2HLHNpU8sK';

# Never commit real values in docs
LLAMA_CLOUD_API_KEY=llx-actual-key-here
```

## 🛡️ Security Checklist

Before committing:
- [ ] Search for patterns: `llx-`, `sk-`, `Bearer `, actual UUIDs
- [ ] Check documentation files for real values
- [ ] Verify `.env` is in `.gitignore`
- [ ] Use `.env.example` with placeholders only
- [ ] Review `git diff` before pushing

## 🚨 If You Accidentally Commit Secrets:

1. **Immediately revoke the exposed credential** in the service dashboard
2. **Generate a new secret**
3. **Update your local `.env` file**
4. **Remove from git history:**
   ```bash
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch PATH/TO/FILE" \
     --prune-empty --tag-name-filter cat -- --all
   ```
5. **Force push** (if safe to do so):
   ```bash
   git push origin --force --all
   ```

## 🔍 Automated Security Scanning

This repository uses:
- **GitHub Secret Scanning** - Automatic detection of known secret patterns
- **TruffleHog** - Additional secret scanning in CI/CD
- **Dependabot** - Security updates for dependencies

## 📝 Sensitive Information Examples

Watch for these patterns:
- API Keys: `llx-`, `sk-`, `pk-`, `api_key_`
- Tokens: `Bearer `, `token=`, `access_token=`
- Passwords: `password=`, `passwd=`
- UUIDs: `737861a7-2a27-4f08-92ff-c3fbea1239bd`
- AWS Keys: `AKIA`, `aws_secret_access_key`
- Private Keys: `-----BEGIN PRIVATE KEY-----`

## 🎯 Safe Patterns for Documentation

Use these placeholder formats:
- `YOUR_API_KEY_HERE`
- `YOUR_SECRET_HERE`
- `llx-...` (truncated)
- `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` (UUID format)
- `AKIA...` (truncated AWS key)
