#!/bin/bash
# =============================================================================
# JoonaPay USDC Wallet - Rollback Script
# =============================================================================
# Usage:
#   ./scripts/rollback.sh [environment] [options]
#
# Environments:
#   staging     - Rollback staging environment
#   production  - Rollback production environment
#
# Options:
#   --to-tag TAG    Rollback to specific image tag
#   --to-revision N Rollback to specific Kubernetes revision
#   --dry-run       Show what would be rolled back without executing
#   --force         Skip confirmation prompts
#
# Examples:
#   ./scripts/rollback.sh staging
#   ./scripts/rollback.sh production --to-tag production-abc123-20240115
#   ./scripts/rollback.sh production --to-revision 5
#   ./scripts/rollback.sh production --dry-run
# =============================================================================

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="/tmp/rollback_${TIMESTAMP}.log"

# Default values
ENVIRONMENT=""
TARGET_TAG=""
TARGET_REVISION=""
DRY_RUN=false
FORCE=false

# Docker registry configuration
DOCKER_REGISTRY="${DOCKER_REGISTRY:-ghcr.io}"
DOCKER_REPOSITORY="${DOCKER_REPOSITORY:-joonapay/usdc-wallet}"

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
    head -28 "$0" | tail -26
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
        --to-tag)
            TARGET_TAG="$2"
            shift 2
            ;;
        --to-revision)
            TARGET_REVISION="$2"
            shift 2
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
# Pre-rollback Checks
# =============================================================================

log "Preparing rollback for ${ENVIRONMENT}..."
log "Log file: ${LOG_FILE}"

# Extra confirmation for production
if [ "$ENVIRONMENT" = "production" ]; then
    warn "You are about to rollback PRODUCTION!"
    if ! confirm "Are you absolutely sure you want to proceed?"; then
        error "Rollback cancelled"
    fi
fi

KUBE_NAMESPACE="${ENVIRONMENT}"
KUBE_DEPLOYMENT="usdc-wallet-api"

# =============================================================================
# Determine Rollback Target
# =============================================================================

if [ -n "$TARGET_TAG" ]; then
    # Rollback to specific image tag
    ROLLBACK_TYPE="tag"
    ROLLBACK_TARGET="${DOCKER_REGISTRY}/${DOCKER_REPOSITORY}:${TARGET_TAG}"
    log "Rolling back to image tag: ${TARGET_TAG}"

elif [ -n "$TARGET_REVISION" ]; then
    # Rollback to specific Kubernetes revision
    ROLLBACK_TYPE="revision"
    ROLLBACK_TARGET="$TARGET_REVISION"
    log "Rolling back to Kubernetes revision: ${TARGET_REVISION}"

else
    # Rollback to previous deployment
    ROLLBACK_TYPE="previous"
    log "Rolling back to previous deployment"

    # Try to find the last deployment tag
    LAST_DEPLOY_FILE="/tmp/last_deployment_${ENVIRONMENT}.txt"
    if [ -f "$LAST_DEPLOY_FILE" ]; then
        LAST_TAG=$(cat "$LAST_DEPLOY_FILE")
        info "Last deployment tag: ${LAST_TAG}"
    fi
fi

# =============================================================================
# Show Current State
# =============================================================================

if command -v kubectl &> /dev/null; then
    log "Current deployment state:"

    if [ "$DRY_RUN" = false ]; then
        kubectl get deployment ${KUBE_DEPLOYMENT} -n ${KUBE_NAMESPACE} -o wide 2>/dev/null || true
        echo ""

        # Show recent revisions
        log "Recent deployment history:"
        kubectl rollout history deployment/${KUBE_DEPLOYMENT} -n ${KUBE_NAMESPACE} 2>/dev/null | tail -10 || true
        echo ""
    else
        info "[DRY RUN] Would show: kubectl get deployment ${KUBE_DEPLOYMENT} -n ${KUBE_NAMESPACE}"
    fi
fi

# =============================================================================
# Execute Rollback
# =============================================================================

log "Executing rollback..."

if [ "$DRY_RUN" = true ]; then
    warn "DRY RUN MODE - No actual changes will be made"
fi

case "$ROLLBACK_TYPE" in
    tag)
        if [ "$DRY_RUN" = false ]; then
            if command -v kubectl &> /dev/null; then
                kubectl set image deployment/${KUBE_DEPLOYMENT} \
                    api=${ROLLBACK_TARGET} \
                    -n ${KUBE_NAMESPACE} 2>&1 | tee -a "$LOG_FILE"
            else
                warn "kubectl not found - manual rollback required"
                info "Run: kubectl set image deployment/${KUBE_DEPLOYMENT} api=${ROLLBACK_TARGET} -n ${KUBE_NAMESPACE}"
            fi
        else
            info "[DRY RUN] Would run: kubectl set image deployment/${KUBE_DEPLOYMENT} api=${ROLLBACK_TARGET}"
        fi
        ;;

    revision)
        if [ "$DRY_RUN" = false ]; then
            if command -v kubectl &> /dev/null; then
                kubectl rollout undo deployment/${KUBE_DEPLOYMENT} \
                    -n ${KUBE_NAMESPACE} \
                    --to-revision=${TARGET_REVISION} 2>&1 | tee -a "$LOG_FILE"
            else
                warn "kubectl not found - manual rollback required"
                info "Run: kubectl rollout undo deployment/${KUBE_DEPLOYMENT} -n ${KUBE_NAMESPACE} --to-revision=${TARGET_REVISION}"
            fi
        else
            info "[DRY RUN] Would run: kubectl rollout undo deployment/${KUBE_DEPLOYMENT} --to-revision=${TARGET_REVISION}"
        fi
        ;;

    previous)
        if [ "$DRY_RUN" = false ]; then
            if command -v kubectl &> /dev/null; then
                kubectl rollout undo deployment/${KUBE_DEPLOYMENT} \
                    -n ${KUBE_NAMESPACE} 2>&1 | tee -a "$LOG_FILE"
            else
                warn "kubectl not found - manual rollback required"
                info "Run: kubectl rollout undo deployment/${KUBE_DEPLOYMENT} -n ${KUBE_NAMESPACE}"
            fi
        else
            info "[DRY RUN] Would run: kubectl rollout undo deployment/${KUBE_DEPLOYMENT}"
        fi
        ;;
esac

# =============================================================================
# Wait for Rollback to Complete
# =============================================================================

if [ "$DRY_RUN" = false ] && command -v kubectl &> /dev/null; then
    log "Waiting for rollback to complete..."

    kubectl rollout status deployment/${KUBE_DEPLOYMENT} \
        -n ${KUBE_NAMESPACE} \
        --timeout=300s 2>&1 | tee -a "$LOG_FILE" || {
            error "Rollback failed to complete within timeout"
        }

    log "Rollback completed successfully"
fi

# =============================================================================
# Health Check
# =============================================================================

log "Running post-rollback health check..."

# Get the service URL based on environment
if [ "$ENVIRONMENT" = "production" ]; then
    HEALTH_URL="${PRODUCTION_URL:-https://api.joonapay.com}/api/v1/health"
else
    HEALTH_URL="${STAGING_URL:-https://api-staging.joonapay.com}/api/v1/health"
fi

if [ "$DRY_RUN" = false ]; then
    # Give the service time to start
    sleep 10

    if ./scripts/health-check.sh "$HEALTH_URL" --retries 10 --interval 5; then
        log "Health check passed after rollback"
    else
        error "Health check failed after rollback - MANUAL INTERVENTION REQUIRED"
    fi
else
    info "[DRY RUN] Would check health: ${HEALTH_URL}"
fi

# =============================================================================
# Summary
# =============================================================================

log "Rollback complete!"
echo ""
echo "=============================================="
echo "  ROLLBACK SUMMARY"
echo "=============================================="
echo "  Environment:   ${ENVIRONMENT}"
echo "  Rollback type: ${ROLLBACK_TYPE}"
if [ -n "$TARGET_TAG" ]; then
    echo "  Target tag:    ${TARGET_TAG}"
fi
if [ -n "$TARGET_REVISION" ]; then
    echo "  Target rev:    ${TARGET_REVISION}"
fi
echo "  Timestamp:     ${TIMESTAMP}"
echo "  Log file:      ${LOG_FILE}"
echo "=============================================="
echo ""

if [ "$DRY_RUN" = true ]; then
    warn "This was a dry run. No actual changes were made."
fi

# Show current state after rollback
if [ "$DRY_RUN" = false ] && command -v kubectl &> /dev/null; then
    log "Current deployment state after rollback:"
    kubectl get deployment ${KUBE_DEPLOYMENT} -n ${KUBE_NAMESPACE} -o wide 2>/dev/null || true
fi

exit 0
