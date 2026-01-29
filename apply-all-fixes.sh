#!/bin/bash

# Apply all TypeScript strict mode fixes systematically

cd /Users/macbook/JoonaPay/USDC-Wallet/usdc-wallet

echo "Applying TypeScript strict mode fixes..."
echo ""

# Step 1: Run fix scripts
echo "Step 1: Fixing DTO/Entity properties..."
node fix-dto-properties.js

echo ""
echo "Step 2: Fixing unused imports..."
node fix-unused-imports.js

echo ""
echo "Step 3: Fixing all remaining class properties..."
node proper-fix.js

echo ""
echo "Step 4: Applying manual fixes..."

# Note: These sed commands work on macOS (BSD sed)
# On Linux, you'd use: sed -i 's/...' (without the '')

# Fix configuration.ts - parseInt with undefined
sed -i '' "s/parseInt(process.env.PORT, 10) || 3000/parseInt(process.env.PORT || '3000', 10)/g" src/config/configuration.ts
sed -i '' "s/parseInt(process.env.DATABASE_PORT, 10) || 5432/parseInt(process.env.DATABASE_PORT || '5432', 10)/g" src/config/configuration.ts
sed -i '' "s/parseInt(process.env.REDIS_PORT, 10) || 6379/parseInt(process.env.REDIS_PORT || '6379', 10)/g" src/config/configuration.ts
sed -i '' "s/parseInt(process.env.REDIS_DB, 10) || 0/parseInt(process.env.REDIS_DB || '0', 10)/g" src/config/configuration.ts
sed -i '' "s/parseInt(process.env.OTP_EXPIRES_IN, 10) || 300/parseInt(process.env.OTP_EXPIRES_IN || '300', 10)/g" src/config/configuration.ts
sed -i '' "s/parseInt(process.env.OTP_LENGTH, 10) || 6/parseInt(process.env.OTP_LENGTH || '6', 10)/g" src/config/configuration.ts
sed -i '' "s/parseInt(process.env.OTP_MAX_ATTEMPTS, 10) || 3/parseInt(process.env.OTP_MAX_ATTEMPTS || '3', 10)/g" src/config/configuration.ts
sed -i '' "s/parseInt(process.env.RATE_LIMIT_TTL, 10) || 60/parseInt(process.env.RATE_LIMIT_TTL || '60', 10)/g" src/config/configuration.ts
sed -i '' "s/parseInt(process.env.RATE_LIMIT_MAX, 10) || 100/parseInt(process.env.RATE_LIMIT_MAX || '100', 10)/g" src/config/configuration.ts
sed -i '' "s/parseInt(process.env.KYC_AUTO_APPROVAL_THRESHOLD, 10) || 80/parseInt(process.env.KYC_AUTO_APPROVAL_THRESHOLD || '80', 10)/g" src/config/configuration.ts
sed -i '' "s/parseInt(process.env.KYC_AUTO_REJECT_THRESHOLD, 10) || 40/parseInt(process.env.KYC_AUTO_REJECT_THRESHOLD || '40', 10)/g" src/config/configuration.ts
sed -i '' "s/parseFloat(process.env.MIN_DEPOSIT_AMOUNT) || 500/parseFloat(process.env.MIN_DEPOSIT_AMOUNT || '500')/g" src/config/configuration.ts
sed -i '' "s/parseFloat(process.env.MAX_DEPOSIT_AMOUNT) || 1000000/parseFloat(process.env.MAX_DEPOSIT_AMOUNT || '1000000')/g" src/config/configuration.ts
sed -i '' "s/parseFloat(process.env.MIN_TRANSFER_AMOUNT) || 1/parseFloat(process.env.MIN_TRANSFER_AMOUNT || '1')/g" src/config/configuration.ts
sed -i '' "s/parseFloat(process.env.MAX_TRANSFER_AMOUNT) || 10000/parseFloat(process.env.MAX_TRANSFER_AMOUNT || '10000')/g" src/config/configuration.ts
sed -i '' "s/parseFloat(process.env.INTERNAL_TRANSFER_FEE_PERCENT) || 0/parseFloat(process.env.INTERNAL_TRANSFER_FEE_PERCENT || '0')/g" src/config/configuration.ts
sed -i '' "s/parseFloat(process.env.EXTERNAL_TRANSFER_FEE_PERCENT) || 0.5/parseFloat(process.env.EXTERNAL_TRANSFER_FEE_PERCENT || '0.5')/g" src/config/configuration.ts
sed -i '' "s/parseFloat(process.env.LARGE_TRANSACTION_THRESHOLD) || 1_000_000/parseFloat(process.env.LARGE_TRANSACTION_THRESHOLD || '1000000')/g" src/config/configuration.ts
sed -i '' "s/parseInt(process.env.REPORT_RETENTION_DAYS, 10) || 2555/parseInt(process.env.REPORT_RETENTION_DAYS || '2555', 10)/g" src/config/configuration.ts
sed -i '' "s/parseInt(process.env.AUTO_FLAG_VELOCITY_THRESHOLD, 10) || 5/parseInt(process.env.AUTO_FLAG_VELOCITY_THRESHOLD || '5', 10)/g" src/config/configuration.ts
sed -i '' "s/parseInt(process.env.STRUCTURING_TIME_WINDOW, 10) || 24/parseInt(process.env.STRUCTURING_TIME_WINDOW || '24', 10)/g" src/config/configuration.ts
sed -i '' "s/parseInt(process.env.SAR_AUTO_GENERATION_THRESHOLD, 10) || 85/parseInt(process.env.SAR_AUTO_GENERATION_THRESHOLD || '85', 10)/g" src/config/configuration.ts
sed -i '' "s/parseFloat(process.env.XOF_TO_USDC_RATE) || 600/parseFloat(process.env.XOF_TO_USDC_RATE || '600')/g" src/config/configuration.ts

echo "Fixed configuration.ts"

echo ""
echo "All fixes applied successfully!"
echo ""
echo "Now running build to check remaining errors..."
npm run build 2>&1 | grep "Found.*error" | tail -1
