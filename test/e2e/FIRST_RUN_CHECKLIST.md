# E2E Tests - First Run Checklist

Follow this checklist to run the E2E tests for the first time.

## Prerequisites

### 1. Docker
- [ ] Docker Desktop is installed
- [ ] Docker daemon is running
- [ ] You have sufficient Docker resources (4GB RAM, 2 CPUs minimum)

```bash
# Check Docker is running
docker --version
docker ps
```

### 2. Node.js
- [ ] Node.js 18+ is installed
- [ ] npm or yarn is available

```bash
# Check Node version
node --version  # Should be 18+
npm --version
```

### 3. Dependencies
- [ ] All npm dependencies are installed

```bash
cd /Users/macbook/JoonaPay/USDC-Wallet/usdc-wallet
npm install
```

## First-Time Setup

### Step 1: Verify Database Migrations
```bash
# Check migrations exist
npm run migration:show

# If needed, generate migrations
# npm run migration:generate -- src/database/migrations/InitialSetup
```

### Step 2: Pull Required Docker Images
```bash
# This will save time during first test run
docker pull postgres:15-alpine
docker pull redis:7-alpine
```

### Step 3: Verify Test Configuration
- [ ] Check `test/jest-e2e.json` exists
- [ ] Check `test/jest.setup.ts` exists
- [ ] Check test helpers are in place

```bash
ls -la test/e2e/helpers/
# Should show:
# - test-user.helper.ts
# - test-data.helper.ts
# - mock-providers.helper.ts
```

## Running Tests

### Run Single Test Suite First
Start with a single test suite to verify setup:

```bash
# Run user journey tests (recommended for first run)
npm run test:e2e:user-journey
```

**Expected Output**:
```
Starting PostgreSQL container...
Starting Redis container...
Creating NestJS application...
Running database migrations...
E2E setup complete

 PASS  test/e2e/user-journey.e2e-spec.ts
  User Journey E2E Tests
    Complete User Onboarding Journey
      ✓ should register a new user with phone number
      ✓ should verify OTP and create user account
      ...

Test Suites: 1 passed, 1 total
Tests:       25 passed, 25 total
```

### Run All Test Suites
If first suite passes, run all tests:

```bash
npm run test:e2e
```

### Run with Coverage
```bash
npm run test:e2e:cov
```

## Troubleshooting First Run

### Issue: Container Startup Timeout

**Error**: `TimeoutError: Container startup timed out after 120000ms`

**Solution**:
```bash
# Clean Docker
docker system prune -a

# Pull images manually
docker pull postgres:15-alpine
docker pull redis:7-alpine

# Increase Docker resources in Docker Desktop settings
```

### Issue: Port Already in Use

**Error**: `Error: Port 5432 is already in use`

**Solution**:
```bash
# Find and stop conflicting containers
docker ps
docker stop <container-id>

# Testcontainers should use random ports automatically
```

### Issue: Migration Errors

**Error**: `QueryFailedError: relation "users" does not exist`

**Solution**:
```bash
# Check migrations
npm run migration:show

# Run migrations manually
npm run migration:run

# Or clean database and re-run
docker volume prune
```

### Issue: Module Not Found

**Error**: `Cannot find module 'testcontainers'`

**Solution**:
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Or install missing packages
npm install --save-dev testcontainers @testcontainers/postgresql nock
```

### Issue: Tests Hanging

**Symptoms**: Tests start but never complete

**Solution**:
```bash
# Check if containers are running
docker ps

# Check container logs
docker logs <container-id>

# Force stop and restart
docker stop $(docker ps -aq)
npm run test:e2e
```

### Issue: Memory Errors

**Error**: `JavaScript heap out of memory`

**Solution**:
```bash
# Increase Node memory
NODE_OPTIONS=--max_old_space_size=4096 npm run test:e2e

# Or add to package.json scripts
```

## Verification Checklist

After successful first run:

- [ ] All test suites pass
- [ ] Containers start and stop properly
- [ ] Database migrations run successfully
- [ ] No hanging processes
- [ ] Coverage report generated (if using coverage)
- [ ] No Docker errors in logs

## Expected Results

### Timing
- Container startup: 10-30 seconds
- Database migrations: 1-5 seconds
- User journey tests: 30-60 seconds
- Full test suite: 2-5 minutes

### Coverage
- Target: > 70% coverage
- Generated in: `coverage-e2e/` directory

### Artifacts
After running tests, you should have:
```
coverage-e2e/
├── lcov.info
├── coverage-summary.txt
└── html/
    └── index.html
```

## Next Steps

After successful first run:

1. **Review Test Results**
   ```bash
   # View coverage report
   open coverage-e2e/html/index.html
   ```

2. **Run Tests in Watch Mode**
   ```bash
   npm run test:e2e:watch
   ```

3. **Run Specific Tests**
   ```bash
   # Run only security tests
   npm run test:e2e:security

   # Run only performance tests
   npm run test:e2e:performance
   ```

4. **Review Documentation**
   - Read `test/e2e/README.md`
   - Review `test/e2e/E2E_TESTING_GUIDE.md`
   - Check example tests

5. **Verify CI/CD**
   - Push to branch
   - Check GitHub Actions runs
   - Review CI test results

## Common Commands Reference

```bash
# Full test suite
npm run test:e2e

# Specific suite
npm run test:e2e:user-journey
npm run test:e2e:security
npm run test:e2e:performance

# With coverage
npm run test:e2e:cov

# Watch mode
npm run test:e2e:watch

# Single test
npm run test:e2e -- -t "should register a new user"

# Debug mode
node --inspect-brk node_modules/.bin/jest --config ./test/jest-e2e.json --runInBand
```

## Environment Variables

Optional environment variables for testing:

```bash
# Enable debug logging
LOG_LEVEL=debug npm run test:e2e

# Increase test timeout
JEST_TIMEOUT=60000 npm run test:e2e

# Keep containers running (for debugging)
TESTCONTAINERS_RYUK_DISABLED=true npm run test:e2e
```

## Success Indicators

✅ **First run successful if**:
1. All test suites pass
2. No timeout errors
3. Containers start and stop cleanly
4. Coverage report generated
5. No Docker errors
6. Tests complete in < 5 minutes

## Getting Help

If you encounter issues:

1. **Check Logs**
   ```bash
   docker logs <container-id>
   ```

2. **Check Docker**
   ```bash
   docker ps
   docker system info
   ```

3. **Check Test Output**
   - Review error messages
   - Check stack traces
   - Look for timeouts

4. **Review Documentation**
   - `test/e2e/README.md`
   - `test/e2e/E2E_TESTING_GUIDE.md`
   - This checklist

5. **Ask for Help**
   - Create GitHub issue
   - Ask team in Slack
   - Check existing issues

## Post-First-Run

Once tests run successfully:

- [ ] Commit test results to ensure baseline
- [ ] Document any local configuration needed
- [ ] Share results with team
- [ ] Set up pre-commit hooks (optional)
- [ ] Configure IDE for test debugging
- [ ] Review and understand test coverage

---

**Last Updated**: January 2026
**Version**: 1.0.0

Good luck with your first test run! 🚀
