# ESLint Configuration Guide

## Available Configurations

The backend has four ESLint configurations:

| File | Purpose | Strictness | Format | Use Case |
|------|---------|------------|--------|----------|
| `eslint.config.mjs` | Default config | Medium | Flat (ESLint 9) | Current development |
| `.eslintrc.strict-types.json` | Strict type checking | High | Legacy | Type-safe modules |
| `eslint.config.extended.mjs` | **Comprehensive strict rules** (RECOMMENDED) | Very High | Flat (ESLint 9) | Production-ready code |
| `eslint.config.extended.mjs` | Comprehensive strict rules | Very High | Legacy | For tools requiring legacy format |

## Quick Start

### Run with Extended Configuration

```bash
# Lint specific file
npx eslint src/modules/user/user.service.ts --config eslint.config.extended.mjs

# Lint entire module
npx eslint src/modules/user --config eslint.config.extended.mjs --fix

# Lint all source files
npx eslint src --config eslint.config.extended.mjs --fix

# With caching for speed
npx eslint src --config eslint.config.extended.mjs --fix --cache
```

### Update package.json

```json
{
  "scripts": {
    "lint": "eslint \"{src,apps,libs,test}/**/*.ts\" --fix",
    "lint:strict": "eslint \"{src,apps,libs,test}/**/*.ts\" --config eslint.config.extended.mjs --fix",
    "lint:check": "eslint \"{src,apps,libs,test}/**/*.ts\" --config eslint.config.extended.mjs --max-warnings 0"
  }
}
```

## Configuration Comparison

### eslint.config.mjs (Current)
**Pros:**
- Modern flat config format
- Fast to run
- Works with current codebase

**Cons:**
- Allows `any` types
- Many rules are warnings, not errors
- Minimal naming convention enforcement

**Key Rules:**
```javascript
'@typescript-eslint/no-explicit-any': 'off'  // ⚠️ Allows any
'@typescript-eslint/no-unused-vars': 'off'   // ⚠️ Doesn't catch unused vars
```

### eslint.config.extended.mjs (Recommended)
**Pros:**
- Comprehensive type safety
- NestJS best practices enforced
- Production-ready quality
- Detailed naming conventions
- Better error catching

**Cons:**
- Requires code updates to pass
- Slower linting (type-checked)
- May require gradual migration

**Key Rules:**
```json
"@typescript-eslint/no-explicit-any": "error"              // ✅ No any types
"@typescript-eslint/explicit-function-return-type": "error" // ✅ Return types required
"@typescript-eslint/naming-convention": "error"            // ✅ Consistent naming
"no-console": "error"                                       // ✅ Use Logger instead
"prefer-const": "error"                                     // ✅ Immutability
```

## Key Differences

### 1. Type Safety

#### Current Config (eslint.config.mjs)
```typescript
// ✅ This passes
function getUser(data: any) {
  return data.id;
}
```

#### Extended Config (eslint.config.extended.mjs)
```typescript
// ❌ This fails - no any types
function getUser(data: any) {
  return data.id;
}

// ✅ This passes
function getUser(data: { id: string }): string {
  return data.id;
}
```

### 2. Return Types

#### Current Config
```typescript
// ✅ This passes - return type inferred
async function findUser(id: string) {
  return await userRepository.findOne(id);
}
```

#### Extended Config
```typescript
// ❌ This fails - explicit return type required
async function findUser(id: string) {
  return await userRepository.findOne(id);
}

// ✅ This passes
async function findUser(id: string): Promise<User | null> {
  return await userRepository.findOne(id);
}
```

### 3. Console Statements

#### Current Config
```typescript
// ✅ This passes
@Injectable()
class UserService {
  createUser(data: CreateUserDto) {
    console.log('Creating user:', data);
    return this.userRepository.save(data);
  }
}
```

#### Extended Config
```typescript
// ❌ This fails - use Logger instead
@Injectable()
class UserService {
  createUser(data: CreateUserDto) {
    console.log('Creating user:', data);
    return this.userRepository.save(data);
  }
}

// ✅ This passes
@Injectable()
class UserService {
  private readonly logger = new Logger(UserService.name);

  createUser(data: CreateUserDto): Promise<User> {
    this.logger.log('Creating user', { email: data.email });
    return this.userRepository.save(data);
  }
}
```

### 4. Naming Conventions

#### Current Config
```typescript
// ✅ All of these pass
interface IUser { }        // I prefix allowed
enum status { }            // lowercase allowed
const Max_Retries = 3;     // Mixed case allowed
```

#### Extended Config
```typescript
// ❌ These fail
interface IUser { }        // No I prefix
enum status { }            // Must be PascalCase
const Max_Retries = 3;     // Must be UPPER_CASE or camelCase

// ✅ These pass
interface User { }
enum UserStatus { }
const MAX_RETRIES = 3;
const maxRetries = 3;
```

### 5. Unused Imports

#### Current Config
```typescript
// ⚠️ This gives a warning
import { Injectable, Logger } from '@nestjs/common';
import { User } from './user.entity';

@Injectable()
class UserService {
  // Logger and User never used
}
```

#### Extended Config
```typescript
// ❌ This fails - unused imports
import { Injectable, Logger } from '@nestjs/common';
import { User } from './user.entity';

@Injectable()
class UserService { }

// ✅ This passes
import { Injectable } from '@nestjs/common';

@Injectable()
class UserService { }
```

## Migration Strategy

### Phase 1: New Code Only
```json
// .vscode/settings.json
{
  "eslint.options": {
    "overrideConfigFile": "eslint.config.extended.mjs"
  }
}
```

All new code will follow strict rules automatically.

### Phase 2: Module by Module

```bash
# 1. Pick a small module
npx eslint src/modules/health --config eslint.config.extended.mjs --fix

# 2. Review changes
git diff src/modules/health

# 3. Fix remaining issues manually
# 4. Commit
git add src/modules/health
git commit -m "Migrate health module to strict ESLint"

# 5. Repeat for next module
```

### Phase 3: Entire Codebase

Once most modules are migrated:

```bash
# Update package.json
{
  "scripts": {
    "lint": "eslint \"{src,apps,libs,test}/**/*.ts\" --config eslint.config.extended.mjs --fix"
  }
}

# Delete old config (optional)
rm eslint.config.mjs
```

## Quick Fixes

### Fix 1: Add Return Types

```bash
# VSCode tip: Hover over function to see inferred type
# Then copy-paste the type

// Before:
async function getUser(id: string) { }

// Hover shows: Promise<User | null>
// After:
async function getUser(id: string): Promise<User | null> { }
```

### Fix 2: Replace Any Types

```bash
# Find all any types
grep -rn ": any" src/

# Replace with specific types or unknown
// Before:
function process(data: any): any { }

// After:
function process(data: unknown): ProcessedData { }
```

### Fix 3: Remove Console Statements

```bash
# Find all console usage
grep -rn "console\." src/

# Replace with Logger
// Before:
console.log('User created');

// After:
private readonly logger = new Logger(ClassName.name);
this.logger.log('User created');
```

### Fix 4: Fix Naming

```bash
# Find interfaces with I prefix
grep -rn "interface I" src/

# Remove I prefix
// Before:
interface IUser { }

// After:
interface User { }
```

### Fix 5: Use Const

```bash
# Auto-fixed by --fix flag
npx eslint src --config eslint.config.extended.mjs --fix

// Before:
let user = await findOne(id);
return user;

// After:
const user = await findOne(id);
return user;
```

## NestJS-Specific Rules

### Class Suffix Requirements

```typescript
// ❌ These fail
class User { }               // No suffix
class UserHandler { }        // Wrong suffix

// ✅ These pass
class UserService { }
class UserController { }
class UserGuard { }
class UserInterceptor { }
class UserPipe { }
class UserFilter { }
class UserDto { }
class UserEntity { }
class UserRepository { }
class UserFactory { }
class UserStrategy { }
class UserModule { }
class UserMiddleware { }
class UserGateway { }
class UserResolver { }
class UserCommand { }
class UserQuery { }
class UserHandler { }        // For CQRS
class UserEvent { }
class UserSaga { }
```

### Accessibility Modifiers

```typescript
// ❌ This fails - no accessibility modifier
@Injectable()
class UserService {
  userRepository: Repository<User>;

  getUser(id: string): Promise<User> { }
}

// ✅ This passes
@Injectable()
class UserService {
  private readonly userRepository: Repository<User>;

  public async getUser(id: string): Promise<User> { }
}
```

### Constructor Parameter Properties

```typescript
// ⚠️ This works but not preferred
@Injectable()
class UserService {
  private userRepository: Repository<User>;

  constructor(userRepository: Repository<User>) {
    this.userRepository = userRepository;
  }
}

// ✅ Preferred - parameter property
@Injectable()
class UserService {
  constructor(
    private readonly userRepository: Repository<User>,
  ) {}
}
```

## File-Specific Overrides

The extended config has special rules for different file types:

### Test Files (`*.spec.ts`)
- Type safety relaxed
- Console allowed
- Empty functions allowed

```typescript
// ✅ This passes in test files
describe('UserService', () => {
  it('should create user', async () => {
    console.log('Testing user creation');
    const mockRepo: any = { save: jest.fn() };
  });
});
```

### DTOs (`*.dto.ts`)
- No explicit return types needed
- No public modifiers required

```typescript
// ✅ This passes in DTOs
export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  name: string;
}
```

### Entities (`*.entity.ts`)
- No public modifiers required

```typescript
// ✅ This passes in entities
@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  email: string;
}
```

### Migrations (`*.migration.ts`)
- Console allowed
- Any type allowed (warning)
- No naming conventions

```typescript
// ✅ This passes in migrations
export class CreateUserTable1234567890 implements MigrationInterface {
  async up(queryRunner: any) {
    console.log('Running migration');
    // ...
  }
}
```

## Performance Tips

### Use Cache

```bash
# First run: slow (type checking)
npx eslint src --config eslint.config.extended.mjs

# Subsequent runs: fast (cached)
npx eslint src --config eslint.config.extended.mjs --cache
```

### Lint Specific Directories

```bash
# Only lint what changed
npx eslint src/modules/user --config eslint.config.extended.mjs
```

### Use in CI/CD

```yaml
# .github/workflows/lint.yml
name: Lint

on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run lint:check
```

## VSCode Integration

### settings.json

```json
{
  // Use extended config
  "eslint.options": {
    "overrideConfigFile": "eslint.config.extended.mjs"
  },

  // Auto-fix on save
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },

  // Show ESLint status
  "eslint.alwaysShowStatus": true,

  // Format with Prettier, lint with ESLint
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

### extensions.json

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode"
  ]
}
```

## Benefits

### Type Safety
- Catch errors at compile time
- Better IDE autocomplete
- Safer refactoring

### Code Quality
- Consistent patterns
- Easier to read and understand
- Fewer bugs

### Team Productivity
- Clear conventions
- Less code review friction
- Faster onboarding

### Maintainability
- Self-documenting code
- Easier to modify
- Better long-term stability

## Common Questions

### Q: Do I need to use the extended config?
**A:** Not immediately, but it's recommended for production code. Start with new modules.

### Q: Can I use both configs?
**A:** Yes, use `eslint.config.mjs` for legacy code and `eslint.config.extended.mjs` for new code.

### Q: What if a rule is too strict?
**A:** Disable for specific lines with comments, or request config update if consistently problematic.

### Q: How do I disable a rule?
**A:** Use `// eslint-disable-next-line rule-name` or update the config file.

### Q: Will this slow down development?
**A:** Initial migration takes time, but long-term benefits outweigh the cost. Use cache to speed up linting.

## Resources

- [Full Documentation](./.eslintrc.extended.md)
- [TypeScript ESLint](https://typescript-eslint.io/)
- [NestJS Best Practices](https://docs.nestjs.com/)
- [ESLint Rules Reference](https://eslint.org/docs/rules/)

## Support

For questions or issues:
1. Check the [full documentation](./.eslintrc.extended.md)
2. Review [TypeScript ESLint docs](https://typescript-eslint.io/)
3. Ask in team Slack channel
4. Create an issue for config updates
