#!/bin/bash

# Fix build errors systematically
# This script addresses the most common TypeScript errors

echo "Fixing build errors..."

# 1. Fix unused parameter warnings by removing underscore prefix where used
find src -name "*.ts" -type f -exec sed -i '' 's/private readonly _configService: ConfigService/private readonly configService: ConfigService/g' {} +
find src -name "*.ts" -type f -exec sed -i '' 's/private readonly _cacheManager: Cache/private readonly cacheManager: Cache/g' {} +

# 2. Fix lastWarmTime access issues
sed -i '' "s/this\.cacheWarmingService\['lastWarmTime'\]/this.cacheWarmingService['_lastWarmTime']/g" src/modules/cache-warming/application/controllers/cache-warming.controller.ts
sed -i '' 's/this\.lastWarmTime =/this\._lastWarmTime =/g' src/modules/cache-warming/application/services/cache-warming.service.ts

# 3. Move user entity to correct path
mkdir -p src/modules/user/domain/entities
cp src/modules/user/application/domain/entities/user.entity.ts src/modules/user/domain/entities/user.entity.ts

echo "Basic fixes applied. Running build to check remaining errors..."
