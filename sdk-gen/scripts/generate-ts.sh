#!/bin/bash

################################################################################
# Generate TypeScript SDK Script
#
# Generates TypeScript/Axios SDK from OpenAPI specification
# Output: output/typescript/
################################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SDK_ROOT="$(dirname "$SCRIPT_DIR")"
OUTPUT_DIR="$SDK_ROOT/output/typescript"
CONFIG_FILE="$SDK_ROOT/configs/typescript.yaml"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}TypeScript SDK Generator${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Clean previous output
if [ -d "$OUTPUT_DIR" ]; then
    echo -e "${YELLOW}Cleaning previous output...${NC}"
    rm -rf "$OUTPUT_DIR"
fi

# Create output directory
mkdir -p "$OUTPUT_DIR"

echo -e "${YELLOW}Generating TypeScript SDK...${NC}"
echo ""

# Generate SDK using OpenAPI Generator
npx @openapitools/openapi-generator-cli generate \
    -i http://localhost:3000/docs-json \
    -g typescript-axios \
    -o "$OUTPUT_DIR" \
    -c "$CONFIG_FILE" \
    --additional-properties=npmName=@joonapay/sdk,npmVersion=1.0.0,supportsES6=true,withInterfaces=true,useSingleRequestParameter=false,withSeparateModelsAndApi=true

echo ""
echo -e "${GREEN}✓ TypeScript SDK generated${NC}"
echo ""

# Post-generation steps
echo -e "${YELLOW}Running post-generation steps...${NC}"

# Create package.json if not exists
cat > "$OUTPUT_DIR/package.json" <<EOF
{
  "name": "@joonapay/sdk",
  "version": "1.0.0",
  "description": "JoonaPay USDC Wallet API Client for TypeScript/JavaScript",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "prepublishOnly": "npm run build",
    "test": "jest"
  },
  "keywords": [
    "joonapay",
    "usdc",
    "wallet",
    "api",
    "sdk",
    "remittance",
    "stablecoin"
  ],
  "author": "JoonaPay Engineering Team",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/joonapay/usdc-wallet"
  },
  "dependencies": {
    "axios": "^1.6.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  },
  "files": [
    "dist",
    "README.md"
  ]
}
EOF

# Create tsconfig.json if not exists
cat > "$OUTPUT_DIR/tsconfig.json" <<EOF
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "node",
    "resolveJsonModule": true
  },
  "include": ["./**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
EOF

# Create .npmignore
cat > "$OUTPUT_DIR/.npmignore" <<EOF
*.ts
!*.d.ts
tsconfig.json
.openapi-generator/
.openapi-generator-ignore
EOF

# Create enhanced README
cat > "$OUTPUT_DIR/README.md" <<EOF
# JoonaPay TypeScript SDK

TypeScript/JavaScript client library for the JoonaPay USDC Wallet API.

## Installation

\`\`\`bash
npm install @joonapay/sdk
# or
yarn add @joonapay/sdk
\`\`\`

## Quick Start

\`\`\`typescript
import { Configuration, AuthApi, WalletApi } from '@joonapay/sdk';

// Configure the API client
const config = new Configuration({
  basePath: 'https://api.joonapay.com/api/v1',
  accessToken: 'your-jwt-token', // Optional for authenticated endpoints
});

// Initialize API instances
const authApi = new AuthApi(config);
const walletApi = new WalletApi(config);

// Example: Login
const loginResponse = await authApi.login({
  phoneNumber: '+2250701234567',
});

// Example: Get wallet balance
const balance = await walletApi.getWalletBalance();
console.log(\`Balance: \${balance.data.balance} USD\`);
\`\`\`

## Authentication

Most endpoints require authentication via JWT Bearer token:

\`\`\`typescript
// 1. Register or login
const { data } = await authApi.login({
  phoneNumber: '+2250701234567',
});

// 2. Verify OTP
const verifyResponse = await authApi.verifyOtp({
  phoneNumber: '+2250701234567',
  otp: '123456',
});

const { accessToken, refreshToken } = verifyResponse.data;

// 3. Use access token for subsequent requests
const config = new Configuration({
  basePath: 'https://api.joonapay.com/api/v1',
  accessToken: accessToken,
});

const walletApi = new WalletApi(config);
\`\`\`

## Available APIs

- \`AuthApi\` - Authentication and user registration
- \`UserApi\` - User profile management
- \`WalletApi\` - Wallet operations
- \`TransfersApi\` - Internal and external transfers
- \`TransactionsApi\` - Transaction history
- \`BeneficiariesApi\` - Saved beneficiaries
- \`KycApi\` - KYC verification
- \`SessionsApi\` - Session management
- \`DevicesApi\` - Device management
- \`FeatureFlagsApi\` - Feature flags
- \`BillPaymentsApi\` - Bill payments
- \`MerchantsApi\` - Merchant operations
- \`PaymentLinksApi\` - Payment links
- \`HealthApi\` - Health checks

## Error Handling

\`\`\`typescript
import { AxiosError } from 'axios';

try {
  const balance = await walletApi.getWalletBalance();
} catch (error) {
  if (error instanceof AxiosError) {
    console.error('API Error:', error.response?.data);
    console.error('Status:', error.response?.status);
  } else {
    console.error('Unexpected error:', error);
  }
}
\`\`\`

## Request Interceptors

\`\`\`typescript
import axios from 'axios';

// Add request interceptor for custom headers
axios.interceptors.request.use((config) => {
  config.headers['X-Request-ID'] = generateRequestId();
  config.headers['X-Idempotency-Key'] = generateIdempotencyKey();
  return config;
});

// Add response interceptor for logging
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);
\`\`\`

## TypeScript Support

Full TypeScript support with auto-generated interfaces:

\`\`\`typescript
import { User, Wallet, Transaction } from '@joonapay/sdk';

const user: User = {
  id: '123',
  phoneNumber: '+2250701234567',
  // ... type-safe properties
};
\`\`\`

## Documentation

- [API Documentation](https://docs.joonapay.com)
- [OpenAPI Spec](https://api.joonapay.com/docs)

## Support

Email: support@joonapay.com

## License

MIT
EOF

echo -e "${GREEN}✓ Post-generation steps completed${NC}"
echo ""

# Display summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}TypeScript SDK Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "Output: ${GREEN}$OUTPUT_DIR${NC}"
echo -e "Package: ${GREEN}@joonapay/sdk${NC}"
echo -e "Version: ${GREEN}1.0.0${NC}"
echo ""
echo "Next steps:"
echo "  1. cd $OUTPUT_DIR"
echo "  2. npm install"
echo "  3. npm run build"
echo "  4. npm publish --access public"
echo ""
