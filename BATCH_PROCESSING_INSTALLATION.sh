#!/bin/bash

# Batch Processing Module Installation Script
# JoonaPay USDC Wallet

set -e

echo "========================================="
echo "Batch Processing Module Installation"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: package.json not found. Please run this script from the usdc-wallet directory.${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 1: Installing dependencies...${NC}"
npm install @nestjs/bull bull
npm install --save-dev @types/bull
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

echo -e "${YELLOW}Step 2: Checking Redis connection...${NC}"
REDIS_HOST=${REDIS_HOST:-localhost}
REDIS_PORT=${REDIS_PORT:-6379}

if command -v redis-cli &> /dev/null; then
    if redis-cli -h $REDIS_HOST -p $REDIS_PORT ping &> /dev/null; then
        echo -e "${GREEN}✓ Redis is running at $REDIS_HOST:$REDIS_PORT${NC}"
    else
        echo -e "${YELLOW}⚠ Redis not responding. Starting Redis with Docker...${NC}"
        docker run -d --name joonapay-redis -p 6379:6379 redis:7-alpine || true
        sleep 2
        if redis-cli -h $REDIS_HOST -p $REDIS_PORT ping &> /dev/null; then
            echo -e "${GREEN}✓ Redis started successfully${NC}"
        else
            echo -e "${RED}✗ Failed to start Redis. Please start Redis manually.${NC}"
            echo -e "${YELLOW}  Run: docker run -d --name joonapay-redis -p 6379:6379 redis:7-alpine${NC}"
        fi
    fi
else
    echo -e "${YELLOW}⚠ redis-cli not found. Please ensure Redis is installed and running.${NC}"
fi
echo ""

echo -e "${YELLOW}Step 3: Checking environment variables...${NC}"
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠ .env file not found. Creating from template...${NC}"
    cat >> .env << EOF

# Redis Configuration (Batch Processing)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
EOF
    echo -e "${GREEN}✓ .env updated with Redis configuration${NC}"
else
    if grep -q "REDIS_HOST" .env; then
        echo -e "${GREEN}✓ Redis configuration found in .env${NC}"
    else
        echo -e "${YELLOW}⚠ Adding Redis configuration to .env...${NC}"
        cat >> .env << EOF

# Redis Configuration (Batch Processing)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
EOF
        echo -e "${GREEN}✓ .env updated${NC}"
    fi
fi
echo ""

echo -e "${YELLOW}Step 4: Checking database migration...${NC}"
MIGRATION_FILE="src/database/migrations/1700000000000-CreateBatchJobsTable.ts"
if [ -f "$MIGRATION_FILE" ]; then
    echo -e "${GREEN}✓ Migration file exists${NC}"
    echo -e "${YELLOW}  To run migration: npm run migration:run${NC}"
else
    echo -e "${RED}✗ Migration file not found at $MIGRATION_FILE${NC}"
fi
echo ""

echo -e "${YELLOW}Step 5: Verifying module files...${NC}"
MODULE_DIR="src/modules/batch-processing"
if [ -d "$MODULE_DIR" ]; then
    FILE_COUNT=$(find $MODULE_DIR -type f | wc -l | tr -d ' ')
    echo -e "${GREEN}✓ Module directory exists with $FILE_COUNT files${NC}"

    # Check key files
    KEY_FILES=(
        "batch-processing.module.ts"
        "application/controllers/batch-job.controller.ts"
        "application/services/batch-job.service.ts"
        "domain/entities/batch-job.entity.ts"
        "infrastructure/queues/batch-queue.service.ts"
    )

    for file in "${KEY_FILES[@]}"; do
        if [ -f "$MODULE_DIR/$file" ]; then
            echo -e "  ${GREEN}✓${NC} $file"
        else
            echo -e "  ${RED}✗${NC} $file ${RED}(missing)${NC}"
        fi
    done
else
    echo -e "${RED}✗ Module directory not found at $MODULE_DIR${NC}"
    exit 1
fi
echo ""

echo -e "${YELLOW}Step 6: Checking app.module.ts configuration...${NC}"
if grep -q "BullModule" src/app.module.ts; then
    echo -e "${GREEN}✓ BullModule already registered in app.module.ts${NC}"
else
    echo -e "${YELLOW}⚠ BullModule not found in app.module.ts${NC}"
    echo -e "${YELLOW}  Please add the following to src/app.module.ts:${NC}"
    echo ""
    echo -e "${YELLOW}  import { BullModule } from '@nestjs/bull';${NC}"
    echo -e "${YELLOW}  import { BatchProcessingModule } from './modules/batch-processing/batch-processing.module';${NC}"
    echo ""
    echo -e "${YELLOW}  Then add to imports array:${NC}"
    echo ""
    echo -e "${YELLOW}  BullModule.forRootAsync({${NC}"
    echo -e "${YELLOW}    imports: [ConfigModule],${NC}"
    echo -e "${YELLOW}    inject: [ConfigService],${NC}"
    echo -e "${YELLOW}    useFactory: (configService: ConfigService) => ({${NC}"
    echo -e "${YELLOW}      redis: {${NC}"
    echo -e "${YELLOW}        host: configService.get<string>('redis.host'),${NC}"
    echo -e "${YELLOW}        port: configService.get<number>('redis.port'),${NC}"
    echo -e "${YELLOW}        password: configService.get<string>('redis.password'),${NC}"
    echo -e "${YELLOW}        db: configService.get<number>('redis.db'),${NC}"
    echo -e "${YELLOW}      },${NC}"
    echo -e "${YELLOW}    }),${NC}"
    echo -e "${YELLOW}  }),${NC}"
    echo -e "${YELLOW}  BatchProcessingModule,${NC}"
    echo ""
fi

if grep -q "BatchProcessingModule" src/app.module.ts; then
    echo -e "${GREEN}✓ BatchProcessingModule already registered in app.module.ts${NC}"
else
    echo -e "${YELLOW}⚠ BatchProcessingModule not registered in app.module.ts${NC}"
    echo -e "${YELLOW}  Please add BatchProcessingModule to the imports array${NC}"
fi
echo ""

echo "========================================="
echo -e "${GREEN}Installation Summary${NC}"
echo "========================================="
echo ""
echo -e "Module Location: ${YELLOW}src/modules/batch-processing/${NC}"
echo -e "Documentation:"
echo -e "  - Setup Guide:   ${YELLOW}src/modules/batch-processing/SETUP.md${NC}"
echo -e "  - README:        ${YELLOW}src/modules/batch-processing/README.md${NC}"
echo -e "  - Examples:      ${YELLOW}src/modules/batch-processing/EXAMPLES.md${NC}"
echo -e "  - File Index:    ${YELLOW}src/modules/batch-processing/INDEX.md${NC}"
echo ""
echo -e "${GREEN}Next Steps:${NC}"
echo -e "  1. Update src/app.module.ts with BullModule configuration (if not done)"
echo -e "  2. Update src/config/configuration.ts with Redis config (if not done)"
echo -e "  3. Run database migration: ${YELLOW}npm run migration:run${NC}"
echo -e "  4. Start the application: ${YELLOW}npm run start:dev${NC}"
echo -e "  5. Test the endpoints: ${YELLOW}curl http://localhost:3000/batch-jobs/metrics${NC}"
echo ""
echo -e "${GREEN}Installation complete!${NC}"
echo ""
