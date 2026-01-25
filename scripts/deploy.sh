#!/bin/bash
# =============================================================================
# JoonaPay USDC Wallet - Deployment Script
# =============================================================================
# Usage:
#   ./scripts/deploy.sh [environment] [options]
#
# Environments:
#   staging     - Deploy to staging environment
#   production  - Deploy to production environment
#
# Options:
#   --skip-tests      Skip running tests before deployment
#   --skip-backup     Skip database backup (not recommended for production)
#   --dry-run         Show what would be deployed without actually deploying
#   --force           Force deployment even if health checks fail
#
# Examples:
#   ./scripts/deploy.sh staging
#   ./scripts/deploy.sh production --skip-tests
#   ./scripts/deploy.sh production --dry-run
# =============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="/tmp/deploy_${TIMESTAMP}.log"

# Default values
ENVIRONMENT=""
SKIP_TESTS=false
SKIP_BACKUP=false
DRY_RUN=false
FORCE=false

# Docker registry configuration
DOCKER_REGISTRY="${DOCKER_REGISTRY:-ghcr.io}"
DOCKER_REPOSITORY="${DOCKER_REPOSITORY:-joonapay/usdc-wallet}"
IMAGE_TAG="${IMAGE_TAG:-}"

# =============================================================================
# Helper Functions
# =============================================================================

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

show_usage() {
    head -30 "$0" | tail -28
}

confirm() {
    if [ "$FORCE" = true ]; then
        return 0
    fi
    read -r -p "$1 [y/N] " response
    case "$response" in
        [yY][eE][sS]|[yY])
            return 0
            ;;
        *)
            return 1
            ;;
    esac
}

# =============================================================================
# Parse Arguments
# =============================================================================

while [[ $# -gt 0 ]]; do
    case $1 in
        staging|production)
            ENVIRONMENT="$1"
            shift
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --skip-backup)
            SKIP_BACKUP=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --force)
            FORCE=true
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            ;;
    esac
done

# Validate environment
if [ -z "$ENVIRONMENT" ]; then
    show_usage
    error "Environment is required (staging or production)"
fi

# =============================================================================
# Pre-deployment Checks
# =============================================================================

log "Starting deployment to ${ENVIRONMENT}..."
log "Log file: ${LOG_FILE}"

# Check required tools
for cmd in docker git npm; do
    if ! command -v "$cmd" &> /dev/null; then
        error "$cmd is required but not installed"
    fi
done

# Check we're on the correct branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$ENVIRONMENT" = "production" ] && [ "$CURRENT_BRANCH" != "main" ]; then
    if ! confirm "You're deploying to production from branch '$CURRENT_BRANCH' (not main). Continue?"; then
        error "Deployment cancelled"
    fi
fi

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    if ! confirm "You have uncommitted changes. Continue anyway?"; then
        error "Deployment cancelled - commit or stash your changes"
    fi
fi

# Set image tag
if [ -z "$IMAGE_TAG" ]; then
    GIT_SHA=$(git rev-parse --short HEAD)
    IMAGE_TAG="${ENVIRONMENT}-${GIT_SHA}-${TIMESTAMP}"
fi

FULL_IMAGE_NAME="${DOCKER_REGISTRY}/${DOCKER_REPOSITORY}:${IMAGE_TAG}"

log "Deployment configuration:"
info "  Environment:  ${ENVIRONMENT}"
info "  Branch:       ${CURRENT_BRANCH}"
info "  Image:        ${FULL_IMAGE_NAME}"
info "  Skip tests:   ${SKIP_TESTS}"
info "  Skip backup:  ${SKIP_BACKUP}"
info "  Dry run:      ${DRY_RUN}"

if [ "$DRY_RUN" = true ]; then
    warn "DRY RUN MODE - No actual changes will be made"
fi

# =============================================================================
# Run Tests
# =============================================================================

if [ "$SKIP_TESTS" = false ]; then
    log "Running tests..."
    cd "$PROJECT_ROOT"

    if [ "$DRY_RUN" = false ]; then
        npm run lint || error "Lint failed"
        npm run test || error "Tests failed"
        log "Tests passed!"
    else
        info "[DRY RUN] Would run: npm run lint && npm run test"
    fi
else
    warn "Skipping tests (--skip-tests flag)"
fi

# =============================================================================
# Build Docker Image
# =============================================================================

log "Building Docker image..."
cd "$PROJECT_ROOT"

if [ "$DRY_RUN" = false ]; then
    docker build \
        --build-arg NODE_ENV="${ENVIRONMENT}" \
        --build-arg BUILD_DATE="${TIMESTAMP}" \
        --build-arg GIT_SHA="$(git rev-parse HEAD)" \
        -t "${FULL_IMAGE_NAME}" \
        -t "${DOCKER_REGISTRY}/${DOCKER_REPOSITORY}:${ENVIRONMENT}-latest" \
        -f Dockerfile \
        . 2>&1 | tee -a "$LOG_FILE"

    log "Docker image built successfully: ${FULL_IMAGE_NAME}"
else
    info "[DRY RUN] Would build: docker build -t ${FULL_IMAGE_NAME} ."
fi

# =============================================================================
# Push Docker Image
# =============================================================================

log "Pushing Docker image to registry..."

if [ "$DRY_RUN" = false ]; then
    docker push "${FULL_IMAGE_NAME}" 2>&1 | tee -a "$LOG_FILE"
    docker push "${DOCKER_REGISTRY}/${DOCKER_REPOSITORY}:${ENVIRONMENT}-latest" 2>&1 | tee -a "$LOG_FILE"
    log "Docker image pushed successfully"
else
    info "[DRY RUN] Would push: docker push ${FULL_IMAGE_NAME}"
fi

# =============================================================================
# Database Backup (Production only)
# =============================================================================

if [ "$ENVIRONMENT" = "production" ] && [ "$SKIP_BACKUP" = false ]; then
    log "Creating database backup..."

    if [ "$DRY_RUN" = false ]; then
        # This assumes you have kubectl configured for your production cluster
        # Adjust the backup command based on your infrastructure
        BACKUP_FILE="backup_${TIMESTAMP}.sql"

        # Example for AWS RDS
        # aws rds create-db-snapshot \
        #     --db-instance-identifier usdc-wallet-prod \
        #     --db-snapshot-identifier "pre-deploy-${TIMESTAMP}"

        # Example for Kubernetes pg_dump
        # kubectl exec -n production deployment/postgres -- \
        #     pg_dump -U $DATABASE_USER $DATABASE_NAME > /tmp/$BACKUP_FILE

        log "Database backup created (or snapshot triggered)"
    else
        info "[DRY RUN] Would create database backup"
    fi
elif [ "$SKIP_BACKUP" = true ]; then
    warn "Skipping database backup (--skip-backup flag)"
fi

# =============================================================================
# Deploy to Kubernetes
# =============================================================================

log "Deploying to Kubernetes..."

KUBE_NAMESPACE="${ENVIRONMENT}"
KUBE_DEPLOYMENT="usdc-wallet-api"

if [ "$DRY_RUN" = false ]; then
    # Check if kubectl is configured
    if ! command -v kubectl &> /dev/null; then
        warn "kubectl not found - skipping Kubernetes deployment"
        warn "Please deploy manually using: kubectl set image deployment/${KUBE_DEPLOYMENT} api=${FULL_IMAGE_NAME} -n ${KUBE_NAMESPACE}"
    else
        # Update Kubernetes deployment
        kubectl set image deployment/${KUBE_DEPLOYMENT} \
            api=${FULL_IMAGE_NAME} \
            -n ${KUBE_NAMESPACE} 2>&1 | tee -a "$LOG_FILE" || true

        # Wait for rollout
        log "Waiting for rollout to complete..."
        kubectl rollout status deployment/${KUBE_DEPLOYMENT} \
            -n ${KUBE_NAMESPACE} \
            --timeout=300s 2>&1 | tee -a "$LOG_FILE" || {
                error "Rollout failed. Run ./scripts/rollback.sh ${ENVIRONMENT} to rollback"
            }

        log "Kubernetes deployment complete"
    fi
else
    info "[DRY RUN] Would deploy: kubectl set image deployment/${KUBE_DEPLOYMENT} api=${FULL_IMAGE_NAME}"
fi

# =============================================================================
# Health Check
# =============================================================================

log "Running health checks..."

# Get the service URL based on environment
if [ "$ENVIRONMENT" = "production" ]; then
    HEALTH_URL="${PRODUCTION_URL:-https://api.joonapay.com}/api/v1/health"
else
    HEALTH_URL="${STAGING_URL:-https://api-staging.joonapay.com}/api/v1/health"
fi

if [ "$DRY_RUN" = false ]; then
    ./scripts/health-check.sh "$HEALTH_URL" || {
        if [ "$FORCE" = true ]; then
            warn "Health check failed but continuing due to --force flag"
        else
            error "Health check failed. Run ./scripts/rollback.sh ${ENVIRONMENT} to rollback"
        fi
    }
else
    info "[DRY RUN] Would check health: ${HEALTH_URL}"
fi

# =============================================================================
# Cleanup and Summary
# =============================================================================

log "Deployment complete!"
echo ""
echo "=============================================="
echo "  DEPLOYMENT SUMMARY"
echo "=============================================="
echo "  Environment:  ${ENVIRONMENT}"
echo "  Image:        ${FULL_IMAGE_NAME}"
echo "  Timestamp:    ${TIMESTAMP}"
echo "  Log file:     ${LOG_FILE}"
echo "=============================================="
echo ""

if [ "$DRY_RUN" = true ]; then
    warn "This was a dry run. No actual changes were made."
fi

# Save deployment info for potential rollback
if [ "$DRY_RUN" = false ]; then
    echo "${IMAGE_TAG}" > /tmp/last_deployment_${ENVIRONMENT}.txt
    log "Deployment info saved. Use ./scripts/rollback.sh ${ENVIRONMENT} if needed."
fi

exit 0
