#!/bin/bash

# Database Migration Rollback Script
# Usage: ./execute-rollback.sh <migration-name> [--dry-run] [--force]
#
# Examples:
#   ./execute-rollback.sh 1743000000000-CreateSlaConfigurationsTable
#   ./execute-rollback.sh 1743000000000-CreateSlaConfigurationsTable --dry-run
#   ./execute-rollback.sh 1743000000000-CreateSlaConfigurationsTable --force

set -e

# Configuration - Override with environment variables
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-joonapay}"
DB_USER="${DB_USER:-postgres}"
ROLLBACK_DIR="$(dirname "$0")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Parse arguments
MIGRATION_NAME=""
DRY_RUN=false
FORCE=false

for arg in "$@"; do
    case $arg in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --force)
            FORCE=true
            shift
            ;;
        *)
            if [ -z "$MIGRATION_NAME" ]; then
                MIGRATION_NAME="$arg"
            fi
            shift
            ;;
    esac
done

# Validate arguments
if [ -z "$MIGRATION_NAME" ]; then
    echo -e "${RED}Error: Migration name required${NC}"
    echo "Usage: $0 <migration-name> [--dry-run] [--force]"
    echo ""
    echo "Available rollbacks:"
    ls -1 "$ROLLBACK_DIR"/*.rollback.sql 2>/dev/null | xargs -n1 basename | sed 's/.rollback.sql//'
    exit 1
fi

# Find rollback file
ROLLBACK_FILE="$ROLLBACK_DIR/$MIGRATION_NAME.rollback.sql"

if [ ! -f "$ROLLBACK_FILE" ]; then
    echo -e "${RED}Error: Rollback file not found: $ROLLBACK_FILE${NC}"
    echo ""
    echo "Available rollbacks:"
    ls -1 "$ROLLBACK_DIR"/*.rollback.sql 2>/dev/null | xargs -n1 basename | sed 's/.rollback.sql//'
    exit 1
fi

echo "========================================"
echo "Database Migration Rollback"
echo "========================================"
echo "Migration: $MIGRATION_NAME"
echo "Database:  $DB_NAME@$DB_HOST:$DB_PORT"
echo "Dry Run:   $DRY_RUN"
echo "Force:     $FORCE"
echo "========================================"
echo ""

# Show rollback file contents
echo -e "${YELLOW}Rollback script content:${NC}"
echo "----------------------------------------"
head -20 "$ROLLBACK_FILE"
echo "..."
echo "----------------------------------------"
echo ""

# Confirmation
if [ "$DRY_RUN" = false ] && [ "$FORCE" = false ]; then
    echo -e "${YELLOW}WARNING: This will modify the database and may result in data loss.${NC}"
    read -p "Are you sure you want to proceed? (yes/no): " CONFIRM
    if [ "$CONFIRM" != "yes" ]; then
        echo "Rollback cancelled."
        exit 0
    fi
fi

# Execute rollback
if [ "$DRY_RUN" = true ]; then
    echo -e "${GREEN}Dry run mode - no changes will be made${NC}"
    echo ""
    echo "Would execute:"
    echo "psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f $ROLLBACK_FILE"
else
    echo -e "${YELLOW}Executing rollback...${NC}"
    echo ""

    # Create backup point
    BACKUP_NAME="pre_rollback_${MIGRATION_NAME}_$(date +%Y%m%d_%H%M%S)"
    echo "Creating backup point: $BACKUP_NAME"

    # Execute the rollback
    if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$ROLLBACK_FILE"; then
        echo ""
        echo -e "${GREEN}Rollback completed successfully!${NC}"

        # Update TypeORM migrations table
        echo ""
        echo "Removing migration record from TypeORM..."
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c \
            "DELETE FROM migrations WHERE name LIKE '%$MIGRATION_NAME%';" 2>/dev/null || true

        echo -e "${GREEN}Done.${NC}"
    else
        echo ""
        echo -e "${RED}Rollback failed! Please check the output above for errors.${NC}"
        exit 1
    fi
fi
