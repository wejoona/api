# JoonaPay Postman Collection - File Index

Quick reference guide to all files in the Postman collection directory.

---

## 📦 Collection Files

### JoonaPay_API.postman_collection.json
**Size**: 48 KB | **Type**: Postman Collection v2.1

Main collection file with 70+ API endpoints organized into 12 categories.

**Features**:
- Auto-save access/refresh tokens
- Auto-refresh expired tokens
- Pre-request scripts for authentication
- Test scripts for response validation
- Idempotency key generation
- West African test data

**Import**: Drag into Postman or `File > Import`

---

## 🌍 Environment Files

### JoonaPay_Local.postman_environment.json
**Size**: 1.8 KB | **Environment**: Local Development

**Base URL**: `http://localhost:3000`
**Test Data**:
- Phone: `+2250701234567`
- OTP: `123456` (hardcoded)
- PIN: `1234`

**Use**: Local backend development and testing

---

### JoonaPay_Staging.postman_environment.json
**Size**: 1.7 KB | **Environment**: Staging

**Base URL**: `https://api-staging.joonapay.com`
**Test Data**:
- Phone: `+2250707777777`
- OTP: Via SMS (check Twilio logs)

**Use**: Integration testing before production

---

### JoonaPay_Production.postman_environment.json
**Size**: 1.4 KB | **Environment**: Production

**Base URL**: `https://api.joonapay.com`
**⚠️ WARNING**: Real money, real users

**Use**: Production smoke testing only (with caution)

---

## 📚 Documentation Files

### README.md
**Size**: 7.9 KB | **Read First**

Quick start guide covering:
- Import instructions (drag & drop)
- Environment setup
- 5-minute getting started
- Collection overview (70+ endpoints)
- Common workflows
- Running tests
- Troubleshooting

**Best For**: First-time users, quick reference

---

### POSTMAN_GUIDE.md
**Size**: 14 KB | **Complete Guide**

Comprehensive documentation covering:
- Import collection & environments
- Authentication flow (register, OTP, login, refresh)
- Common workflows (deposit, transfer, bill pay, merchant pay)
- Running tests (Postman GUI & Collection Runner)
- Newman CLI usage
- CI/CD integration (GitHub Actions, GitLab CI)
- Troubleshooting guide
- West African test data
- Rate limits & best practices

**Best For**: Detailed workflow understanding, CI/CD setup

---

### QUICK_REFERENCE.md
**Size**: 8.5 KB | **Cheat Sheet**

One-page API reference card with:
- All 70+ endpoints with examples
- Request/response formats
- Required headers
- Response status codes
- Rate limits
- Environment variables
- Common flows (onboarding, deposit, transfer, etc.)

**Best For**: Quick lookup during development

---

### CHANGELOG.md
**Size**: 6.6 KB | **Version History**

Documents all changes to the collection:
- Version 1.0.0 (2026-01-29) - Initial release
- All endpoints added
- Features implemented
- Upcoming features

**Best For**: Tracking collection updates

---

### SUMMARY.md
**Size**: 14 KB | **Complete Overview**

High-level summary of entire collection:
- Deliverables breakdown
- API coverage statistics
- Environment comparison
- Quick start (5 min)
- Documentation structure
- Test data reference
- Common issues & solutions
- Metrics & next steps

**Best For**: Project managers, stakeholders

---

### INDEX.md
**This File** | **File Reference**

Quick reference guide to all files in this directory.

---

## 🔧 Script Files

### run-tests.sh
**Size**: 6.7 KB | **Executable Script**

Newman test runner with CLI interface.

**Usage**:
```bash
# Run all tests on local
./run-tests.sh

# Run on staging with HTML report
./run-tests.sh --env staging --reporters cli,htmlextra

# Run specific folder
./run-tests.sh --folder "Authentication"

# Run with delay (rate limiting)
./run-tests.sh --delay 500 --output ./reports
```

**Options**:
- `-e, --env` - Environment (local, staging, production)
- `-f, --folder` - Specific folder to test
- `-d, --delay` - Delay between requests (ms)
- `-r, --reporters` - Comma-separated reporters
- `-o, --output` - Output directory
- `-h, --help` - Show help

**Best For**: Command-line testing, automation

---

### package.json
**Size**: 2.5 KB | **npm Configuration**

npm package file with predefined test scripts.

**Installation**:
```bash
npm install
```

**Scripts**:
```bash
npm test              # Run all tests (local)
npm run test:local    # Local environment
npm run test:staging  # Staging environment
npm run test:auth     # Authentication tests only
npm run test:wallet   # Wallet tests only
npm run report        # Generate HTML report
npm run ci            # CI mode (JUnit output)
```

**Best For**: Quick testing with npm commands

---

## ⚙️ CI/CD Examples

### .github-workflows-example.yml
**Size**: 4.5 KB | **GitHub Actions**

Example GitHub Actions workflow.

**Features**:
- Health check job (fast fail)
- Matrix strategy for parallel testing
- HTML report generation
- JUnit test results
- Slack notifications

**Setup**:
```bash
cp .github-workflows-example.yml ../.github/workflows/api-tests.yml
```

**Best For**: GitHub repositories

---

### .gitlab-ci-example.yml
**Size**: 5.1 KB | **GitLab CI**

Example GitLab CI/CD pipeline.

**Features**:
- Multi-stage pipeline (health, test, report)
- Parallel test jobs
- JUnit XML reports
- HTML report artifacts
- GitLab Pages deployment
- Scheduled nightly tests

**Setup**:
```bash
# Copy content to .gitlab-ci.yml
# Or merge with existing pipeline
```

**Best For**: GitLab repositories

---

## 🚫 .gitignore
**Size**: 231 B | **Git Ignore Rules**

Excludes from version control:
- Test results (`test-results/`, `*.html`, `*.xml`)
- Node modules (`node_modules/`)
- OS files (`.DS_Store`, `Thumbs.db`)
- Editor files (`.vscode/`, `.idea/`)
- Logs (`*.log`)

---

## 📂 Directory Structure

```
postman/
│
├── 📦 Collection
│   └── JoonaPay_API.postman_collection.json
│
├── 🌍 Environments
│   ├── JoonaPay_Local.postman_environment.json
│   ├── JoonaPay_Staging.postman_environment.json
│   └── JoonaPay_Production.postman_environment.json
│
├── 📚 Documentation
│   ├── README.md              ← Start here
│   ├── POSTMAN_GUIDE.md       ← Complete guide
│   ├── QUICK_REFERENCE.md     ← Cheat sheet
│   ├── CHANGELOG.md           ← Version history
│   ├── SUMMARY.md             ← Overview
│   └── INDEX.md               ← This file
│
├── 🔧 Scripts
│   ├── run-tests.sh           ← Newman runner
│   └── package.json           ← npm scripts
│
├── ⚙️ CI/CD Examples
│   ├── .github-workflows-example.yml
│   └── .gitlab-ci-example.yml
│
└── 🚫 .gitignore
```

---

## 🎯 Which File Should I Read?

### I want to...

**Get started quickly**
→ Read `README.md` (5 min)

**Understand all workflows**
→ Read `POSTMAN_GUIDE.md` (15 min)

**Look up specific endpoint**
→ Read `QUICK_REFERENCE.md` (reference)

**Set up CI/CD**
→ Read `POSTMAN_GUIDE.md` (CI/CD section) + Examples

**Run tests from command line**
→ Use `run-tests.sh --help` or `package.json` scripts

**See what changed**
→ Read `CHANGELOG.md`

**Get high-level overview**
→ Read `SUMMARY.md`

---

## 📊 File Statistics

```
Total Files:     14
Total Size:      ~120 KB
Documentation:   60+ KB (50% of total)
Collection:      48 KB (40% of total)
Environments:    5 KB (4% of total)
Scripts/Config:  15 KB (12% of total)
```

---

## 🔗 Related Files (Outside This Directory)

### Backend Controllers
```
/usdc-wallet/src/modules/*/application/controllers/*.controller.ts
```

### Backend API Docs
```
http://localhost:3000/docs (Swagger UI)
```

### Mobile App
```
/mobile/lib/features/*/views/*.dart
```

---

## 📞 Support

**Questions?**
- Slack: `#joonapay-api`
- Email: `dev@joonapay.com`

**Issues?**
- Check `POSTMAN_GUIDE.md` → Troubleshooting section
- Check `QUICK_REFERENCE.md` → Common Issues

**Updates?**
- Check `CHANGELOG.md` for latest version
- Export updated collection from Postman

---

**Last Updated**: January 29, 2026
**Version**: 1.0.0
