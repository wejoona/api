# ESLint Configurations Overview

This document explains all available ESLint configurations in the backend and when to use each one.

## Configuration Files

### 1. `eslint.config.mjs` (Current Default)

**Format:** ESLint 9 Flat Config
**Strictness:** Medium
**Status:** Active

#### What it does:
- Basic TypeScript linting with warnings
- Allows `any` types (rule is disabled)
- Most type-safety rules are warnings, not errors
- Removes unused imports
- Integrates with Prettier

#### When to use:
- Default for all current development
- Legacy code that isn't ready for strict rules
- Quick prototyping

#### Usage:
```bash
npm run lint
# or
npx eslint src --fix
```

---

### 2. `eslint.config.extended.mjs` (RECOMMENDED for New Code)

**Format:** ESLint 9 Flat Config
**Strictness:** Very High
**Status:** New - Recommended for production code

#### What it does:
- **No `any` types** - Enforces explicit typing (error)
- **Explicit function return types** - Required for all functions (error)
- **Strict naming conventions** - NestJS patterns enforced
- **No console statements** - Use Logger instead (error)
- **Prefer const** - Immutability enforced (error)
- **Strict null/undefined checks** - Explicit handling required
- **NestJS-specific patterns** - Class suffixes, accessibility modifiers
- **File-specific overrides** - Relaxed rules for tests, DTOs, entities, migrations

#### When to use:
- New modules and features
- Production-ready code
- Type-safe critical paths
- Public APIs
- Code that requires maximum reliability

#### Usage:
```bash
# Lint with strict rules
npx eslint src --config eslint.config.extended.mjs --fix

# Add to package.json
{
  "scripts": {
    "lint:strict": "eslint src --config eslint.config.extended.mjs --fix",
    "lint:check": "eslint src --config eslint.config.extended.mjs --max-warnings 0"
  }
}
```

---

### 3. `.eslintrc.extended.json` (Legacy Format)

**Format:** Legacy ESLintRC
**Strictness:** Very High
**Status:** Provided for compatibility

#### What it does:
- Same rules as `eslint.config.extended.mjs`
- Legacy JSON format for older tools/IDEs

#### When to use:
- When your IDE doesn't support flat config yet
- When integrating with older tooling
- **Note:** ESLint 9 may require `ESLINT_USE_FLAT_CONFIG=false` environment variable

#### Usage:
```bash
# May require ESLINT_USE_FLAT_CONFIG=false
ESLINT_USE_FLAT_CONFIG=false npx eslint src --config .eslintrc.extended.json --fix
```

---

### 4. `.eslintrc.strict-types.json` (Legacy Strict Types)

**Format:** Legacy ESLintRC
**Strictness:** High
**Status:** Legacy - use `eslint.config.extended.mjs` instead

#### What it does:
- Strict type checking
- Explicit return types
- Naming conventions
- Similar to extended config but older version

#### When to use:
- Legacy code already using this config
- **Recommendation:** Migrate to `eslint.config.extended.mjs`

---

## Quick Comparison

| Feature | Default | Extended (NEW) | Strict Types | Legacy Extended |
|---------|---------|----------------|--------------|-----------------|
| Format | Flat | Flat | ESLintRC | ESLintRC |
| ESLint 9 Native | Yes | Yes | No | No |
| No `any` | Warning | **Error** | Error | Error |
| Return Types | Optional | **Required** | Warn | Required |
| Console Allowed | Warn | **No** | N/A | No |
| Naming Convention | Basic | **NestJS-specific** | Strict | NestJS-specific |
| Prefer Const | Optional | **Enforced** | N/A | Enforced |
| File Overrides | Basic | **Comprehensive** | Some | Comprehensive |
| Performance | Fast | Medium | Medium | Medium |

## Migration Path

### Step 1: Start with New Code
```bash
# For new modules, use extended config from the start
npx eslint src/modules/new-feature --config eslint.config.extended.mjs --fix
```

### Step 2: Migrate Module by Module
```bash
# Pick a small, stable module
npx eslint src/modules/health --config eslint.config.extended.mjs --fix

# Review changes
git diff src/modules/health

# Fix any remaining issues
# Commit when clean
```

### Step 3: Update Default (When Ready)
```bash
# In package.json, change default lint command
{
  "scripts": {
    "lint": "eslint src --config eslint.config.extended.mjs --fix"
  }
}

# Optionally rename files
mv eslint.config.mjs eslint.config.legacy.mjs
mv eslint.config.extended.mjs eslint.config.mjs
```

## Rule Highlights

### Extended Config Only

#### 1. No Any Types
```typescript
// ❌ Default config: Passes with warning
function process(data: any): any { }

// ✅ Extended config: Must be explicit
function process(data: ProcessInput): ProcessResult { }
function process(data: unknown): ProcessResult { }
```

#### 2. Explicit Return Types
```typescript
// ❌ Default config: Passes
async function getUser(id: string) {
  return await this.userRepository.findOne(id);
}

// ✅ Extended config: Must specify return type
async function getUser(id: string): Promise<User | null> {
  return await this.userRepository.findOne(id);
}
```

#### 3. No Console
```typescript
// ❌ Default config: Passes with warning
@Injectable()
class UserService {
  createUser(data: CreateUserDto) {
    console.log('Creating user:', data);
  }
}

// ✅ Extended config: Use Logger
@Injectable()
class UserService {
  private readonly logger = new Logger(UserService.name);

  createUser(data: CreateUserDto): Promise<User> {
    this.logger.log('Creating user', { email: data.email });
  }
}
```

#### 4. NestJS Class Suffixes
```typescript
// ❌ Extended config: Fails
class UserHandler { }  // Wrong suffix

// ✅ Extended config: Passes
class UserService { }
class UserController { }
class UserGuard { }
```

#### 5. Prefer Const
```typescript
// ❌ Extended config: Fails if not reassigned
let user = await this.findUser(id);
return user;

// ✅ Extended config: Use const
const user = await this.findUser(id);
return user;
```

#### 6. Strict Boolean Expressions
```typescript
// ❌ Extended config: Fails
function check(user: User | null) {
  if (user) { }  // Implicit truthiness
}

// ✅ Extended config: Explicit null check
function check(user: User | null): boolean {
  if (user !== null) { }
  return user !== null;
}
```

## File-Specific Overrides (Extended Config)

### Test Files (`*.spec.ts`, `*.test.ts`)
- `any` allowed (warning)
- No return types required
- Console allowed
- Empty functions allowed

### DTOs (`*.dto.ts`)
- No return types required
- No public modifiers required

### Entities (`*.entity.ts`)
- No public modifiers required

### Migrations (`*.migration.ts`)
- `any` allowed (warning)
- Console allowed
- No naming conventions

### Config Files
- `any` allowed (warning)
- Console allowed
- `require` allowed

### Main/Bootstrap
- Console allowed (log, error, warn only)

## Performance Considerations

### Extended Config is Slower
- Type-checking adds overhead
- Use `--cache` flag to speed up subsequent runs
- Consider linting only changed files in development

```bash
# Fast: Only lint changed files
git diff --name-only --diff-filter=d | grep -E '\\.ts$' | xargs npx eslint --config eslint.config.extended.mjs --cache

# Fast: Use cache
npx eslint src --config eslint.config.extended.mjs --cache

# CI: No cache, strict
npx eslint src --config eslint.config.extended.mjs --max-warnings 0
```

## IDE Integration

### VSCode

#### Use Extended Config
`.vscode/settings.json`:
```json
{
  "eslint.options": {
    "overrideConfigFile": "eslint.config.extended.mjs"
  },
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "eslint.alwaysShowStatus": true
}
```

#### Switch Between Configs
Create multiple settings files:
- `.vscode/settings.default.json` - Use default config
- `.vscode/settings.strict.json` - Use extended config

Copy the one you want to `.vscode/settings.json`

## CI/CD Integration

### GitHub Actions
```yaml
name: Lint

on: [push, pull_request]

jobs:
  lint-default:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run lint

  lint-strict:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - name: Lint new code with strict rules
        run: |
          # Only lint files changed in this PR
          git diff --name-only origin/main | grep -E '\\.ts$' | xargs npx eslint --config eslint.config.extended.mjs --max-warnings 0
```

## Common Issues

### Issue: "Config not found"
**Solution:** Use absolute or relative path to config file
```bash
npx eslint src --config ./eslint.config.extended.mjs
```

### Issue: "Too many errors"
**Solution:** Migrate gradually, start with one module
```bash
npx eslint src/modules/health --config eslint.config.extended.mjs
```

### Issue: "Linting is slow"
**Solution:** Use cache and projectService
```bash
npx eslint src --config eslint.config.extended.mjs --cache
```

### Issue: "Rule not found"
**Solution:** Ensure all dependencies are installed
```bash
npm install
```

## Recommendations

### For New Projects
Use `eslint.config.extended.mjs` from day 1.

### For Existing Projects
1. Week 1: Add extended config, test on one module
2. Week 2-4: Migrate critical modules
3. Week 5+: Migrate remaining modules
4. Month 2: Switch default to extended config

### For Teams
- Use default config for rapid prototyping
- Use extended config for production code
- Require extended config for all PRs to main branch
- Allow default config for feature branches

## Support & Documentation

- [Full Extended Config Documentation](./.eslintrc.extended.md)
- [Quick Guide](./ESLINT-GUIDE.md)
- [TypeScript ESLint](https://typescript-eslint.io/)
- [NestJS Best Practices](https://docs.nestjs.com/)

## Summary

| Config | Use For |
|--------|---------|
| `eslint.config.mjs` | Current development, legacy code |
| `eslint.config.extended.mjs` | **New code, production, critical paths** |
| `.eslintrc.extended.json` | IDE/tool compatibility |
| `.eslintrc.strict-types.json` | Legacy - migrate away |

**Recommendation:** Start using `eslint.config.extended.mjs` for all new code today.
