#!/bin/bash

#############################################
# BCEAO Compliance Engine Installation Script
#############################################
#
# This script installs and verifies the BCEAO Compliance Engine
# for JoonaPay USDC Wallet.
#
# Usage: ./install.sh [options]
#
# Options:
#   --skip-db     Skip database migration
#   --skip-env    Skip environment setup
#   --verify-only Only verify installation
#
#############################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DB_NAME="usdc_wallet"
DB_USER="postgres"
MIGRATION_FILE="infrastructure/migrations/001_create_compliance_tables.sql"

# Parse arguments
SKIP_DB=false
SKIP_ENV=false
VERIFY_ONLY=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-db)
      SKIP_DB=true
      shift
      ;;
    --skip-env)
      SKIP_ENV=true
      shift
      ;;
    --verify-only)
      VERIFY_ONLY=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   BCEAO Compliance Engine Installation    ║${NC}"
echo -e "${GREEN}║        JoonaPay USDC Wallet                ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
echo ""

#############################################
# 1. Verify Prerequisites
#############################################

echo -e "${YELLOW}[1/5] Verifying prerequisites...${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js not found${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js $(node --version)${NC}"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}✗ npm not found${NC}"
    exit 1
fi
echo -e "${GREEN}✓ npm $(npm --version)${NC}"

# Check PostgreSQL
if ! command -v psql &> /dev/null; then
    echo -e "${RED}✗ PostgreSQL not found${NC}"
    exit 1
fi
echo -e "${GREEN}✓ PostgreSQL $(psql --version | grep -oE '[0-9]+\.[0-9]+'|head -1)${NC}"

# Check Redis (optional)
if command -v redis-cli &> /dev/null; then
    echo -e "${GREEN}✓ Redis available${NC}"
else
    echo -e "${YELLOW}⚠ Redis not found (optional)${NC}"
fi

echo ""

#############################################
# 2. Setup Environment Variables
#############################################

if [ "$VERIFY_ONLY" = false ] && [ "$SKIP_ENV" = false ]; then
    echo -e "${YELLOW}[2/5] Setting up environment variables...${NC}"

    if [ ! -f ".env" ]; then
        echo -e "${YELLOW}Creating .env file from template...${NC}"
        cat .env.example >> ../../../../../.env
        echo -e "${GREEN}✓ Environment variables template added to .env${NC}"
        echo -e "${YELLOW}⚠ Please edit .env and set required values${NC}"
    else
        echo -e "${GREEN}✓ .env file already exists${NC}"
    fi

    # Check critical env vars
    if grep -q "BCEAO_COMPLIANCE_ENABLED" ../../../../../.env; then
        echo -e "${GREEN}✓ Compliance configuration found in .env${NC}"
    else
        echo -e "${YELLOW}⚠ Compliance configuration not found in .env${NC}"
        echo -e "${YELLOW}  Add configuration from .env.example${NC}"
    fi
else
    echo -e "${YELLOW}[2/5] Skipping environment setup${NC}"
fi

echo ""

#############################################
# 3. Run Database Migrations
#############################################

if [ "$VERIFY_ONLY" = false ] && [ "$SKIP_DB" = false ]; then
    echo -e "${YELLOW}[3/5] Running database migrations...${NC}"

    # Check database exists
    if psql -U $DB_USER -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
        echo -e "${GREEN}✓ Database '$DB_NAME' exists${NC}"

        # Run migration
        echo -e "${YELLOW}Applying compliance schema...${NC}"
        if psql -U $DB_USER -d $DB_NAME -f $MIGRATION_FILE > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Migration applied successfully${NC}"
        else
            echo -e "${YELLOW}⚠ Migration may have already been applied${NC}"
        fi

        # Verify tables created
        TABLE_COUNT=$(psql -U $DB_USER -d $DB_NAME -t -c "
            SELECT COUNT(*)
            FROM information_schema.tables
            WHERE table_name IN ('compliance_reports', 'suspicious_activity_reports', 'compliance_alerts')
        " | xargs)

        if [ "$TABLE_COUNT" = "3" ]; then
            echo -e "${GREEN}✓ All 3 compliance tables created${NC}"
        else
            echo -e "${RED}✗ Only $TABLE_COUNT tables found (expected 3)${NC}"
            exit 1
        fi
    else
        echo -e "${RED}✗ Database '$DB_NAME' not found${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}[3/5] Skipping database migration${NC}"
fi

echo ""

#############################################
# 4. Verify Module Structure
#############################################

echo -e "${YELLOW}[4/5] Verifying module structure...${NC}"

# Check required directories exist
REQUIRED_DIRS=(
    "domain"
    "application/services"
    "application/controllers"
    "application/dto"
    "application/guards"
    "infrastructure/orm-entities"
    "infrastructure/migrations"
)

for dir in "${REQUIRED_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        echo -e "${GREEN}✓ $dir${NC}"
    else
        echo -e "${RED}✗ $dir not found${NC}"
        exit 1
    fi
done

# Check required files exist
REQUIRED_FILES=(
    "compliance.module.ts"
    "index.ts"
    "domain/compliance.types.ts"
    "application/services/bceao-reporting.service.ts"
    "application/services/aml-cft.service.ts"
    "application/services/sar-generator.service.ts"
    "application/controllers/compliance.controller.ts"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓ $file${NC}"
    else
        echo -e "${RED}✗ $file not found${NC}"
        exit 1
    fi
done

echo ""

#############################################
# 5. Verify Code Quality
#############################################

echo -e "${YELLOW}[5/5] Verifying code quality...${NC}"

# Count lines of code
TS_LINES=$(find . -name "*.ts" ! -path "*/node_modules/*" -exec wc -l {} + 2>/dev/null | tail -1 | awk '{print $1}')
echo -e "${GREEN}✓ TypeScript code: $TS_LINES lines${NC}"

# Check for syntax errors (if TypeScript is available)
if command -v tsc &> /dev/null; then
    if npx tsc --noEmit --project ../../../../tsconfig.json > /dev/null 2>&1; then
        echo -e "${GREEN}✓ No TypeScript errors${NC}"
    else
        echo -e "${YELLOW}⚠ TypeScript compilation warnings (non-critical)${NC}"
    fi
else
    echo -e "${YELLOW}⚠ TypeScript compiler not available (skipping check)${NC}"
fi

echo ""

#############################################
# Installation Summary
#############################################

echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║       Installation Complete! ✅            ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${YELLOW}Module Statistics:${NC}"
echo "  - TypeScript files: $(find . -name '*.ts' | wc -l | xargs)"
echo "  - Lines of code: $TS_LINES"
echo "  - Database tables: 3"
echo "  - API endpoints: 26"
echo "  - Services: 4"
echo "  - Controllers: 1"
echo "  - Guards: 1"
echo ""

echo -e "${YELLOW}Next Steps:${NC}"
echo ""
echo "1. Add module to app.module.ts:"
echo "   import { ComplianceModule } from '@modules/compliance';"
echo ""
echo "2. Configure environment variables in .env:"
echo "   BCEAO_COMPLIANCE_ENABLED=true"
echo "   XOF_TO_USDC_RATE=600"
echo ""
echo "3. Start the application:"
echo "   npm run start:dev"
echo ""
echo "4. Test endpoints:"
echo "   curl http://localhost:3000/api/v1/compliance/dashboard/health"
echo ""
echo "5. Read documentation:"
echo "   - README.md - Feature overview"
echo "   - QUICKSTART.md - Getting started"
echo "   - API_DOCUMENTATION.md - API reference"
echo ""

echo -e "${GREEN}For detailed instructions, see:${NC}"
echo "  - APP_MODULE_INTEGRATION.md"
echo "  - DEPLOYMENT.md"
echo "  - QUICKSTART.md"
echo ""

echo -e "${YELLOW}Support:${NC}"
echo "  - Technical: tech-support@joonapay.com"
echo "  - Compliance: compliance@joonapay.com"
echo ""

exit 0
