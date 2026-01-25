# =============================================================================
# JoonaPay USDC Wallet API - Makefile
# =============================================================================
# Common commands for development, testing, and deployment
#
# Usage:
#   make help           - Show all available commands
#   make dev            - Start development environment
#   make test           - Run tests
#   make build          - Build the application
#   make deploy-staging - Deploy to staging
# =============================================================================

.PHONY: help dev start stop logs test build docker-build docker-push deploy-staging deploy-production health rollback clean

# Default target
.DEFAULT_GOAL := help

# Variables
DOCKER_REGISTRY ?= ghcr.io
DOCKER_REPOSITORY ?= joonapay/usdc-wallet
VERSION ?= $(shell node -p "require('./package.json').version")
GIT_SHA ?= $(shell git rev-parse --short HEAD)
IMAGE_TAG ?= $(VERSION)-$(GIT_SHA)
FULL_IMAGE ?= $(DOCKER_REGISTRY)/$(DOCKER_REPOSITORY):$(IMAGE_TAG)

# Colors for output
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[1;33m
NC := \033[0m

# =============================================================================
# Help
# =============================================================================

help: ## Show this help message
	@echo ""
	@echo "$(BLUE)JoonaPay USDC Wallet API$(NC)"
	@echo ""
	@echo "$(GREEN)Available commands:$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-20s$(NC) %s\n", $$1, $$2}'
	@echo ""

# =============================================================================
# Development
# =============================================================================

install: ## Install dependencies
	npm ci

dev: ## Start development environment with hot-reload
	docker-compose up -d postgres redis
	npm run start:dev

start: ## Start all services with docker-compose
	docker-compose up -d

stop: ## Stop all docker-compose services
	docker-compose down

restart: stop start ## Restart all services

logs: ## Show logs from all services
	docker-compose logs -f

logs-api: ## Show logs from API service only
	docker-compose logs -f api

shell: ## Open shell in API container
	docker-compose exec api sh

db-shell: ## Open PostgreSQL shell
	docker-compose exec postgres psql -U postgres -d usdc_wallet

redis-cli: ## Open Redis CLI
	docker-compose exec redis redis-cli

# =============================================================================
# Database
# =============================================================================

db-migrate: ## Run database migrations
	npm run migration:run

db-migrate-generate: ## Generate a new migration
	@read -p "Migration name: " name; \
	npm run migration:generate -- src/database/migrations/$$name

db-migrate-revert: ## Revert last migration
	npm run migration:revert

db-seed: ## Seed database with test data
	npm run seed

# =============================================================================
# Testing
# =============================================================================

test: ## Run unit tests
	npm run test

test-watch: ## Run tests in watch mode
	npm run test:watch

test-cov: ## Run tests with coverage
	npm run test:cov

test-e2e: ## Run end-to-end tests
	npm run test:e2e

lint: ## Run linter
	npm run lint

lint-fix: ## Run linter and fix issues
	npm run lint -- --fix

format: ## Format code with Prettier
	npm run format

type-check: ## Run TypeScript type checking
	npx tsc --noEmit

# =============================================================================
# Build
# =============================================================================

build: ## Build the application
	npm run build

build-clean: clean build ## Clean and build

docker-build: ## Build Docker image
	docker build -t $(FULL_IMAGE) -t $(DOCKER_REGISTRY)/$(DOCKER_REPOSITORY):latest .

docker-push: ## Push Docker image to registry
	docker push $(FULL_IMAGE)
	docker push $(DOCKER_REGISTRY)/$(DOCKER_REPOSITORY):latest

docker-run: ## Run Docker image locally
	docker run --rm -p 3000:3000 --env-file .env $(FULL_IMAGE)

# =============================================================================
# Deployment
# =============================================================================

deploy-staging: ## Deploy to staging environment
	./scripts/deploy.sh staging

deploy-production: ## Deploy to production environment
	./scripts/deploy.sh production

deploy-dry-run: ## Dry run deployment
	./scripts/deploy.sh staging --dry-run

health: ## Check health of local service
	./scripts/health-check.sh http://localhost:3000/api/v1/health

health-staging: ## Check health of staging service
	./scripts/health-check.sh https://api-staging.joonapay.com/api/v1/health

health-production: ## Check health of production service
	./scripts/health-check.sh https://api.joonapay.com/api/v1/health

rollback-staging: ## Rollback staging deployment
	./scripts/rollback.sh staging

rollback-production: ## Rollback production deployment
	./scripts/rollback.sh production

# =============================================================================
# Kubernetes
# =============================================================================

k8s-apply-staging: ## Apply Kubernetes manifests to staging
	kubectl apply -f k8s/ -n staging

k8s-apply-production: ## Apply Kubernetes manifests to production
	kubectl apply -f k8s/ -n production

k8s-status-staging: ## Show Kubernetes status for staging
	kubectl get pods,svc,ingress -n staging -l app=usdc-wallet-api

k8s-status-production: ## Show Kubernetes status for production
	kubectl get pods,svc,ingress -n production -l app=usdc-wallet-api

k8s-logs-staging: ## Show Kubernetes logs for staging
	kubectl logs -f -l app=usdc-wallet-api -n staging

k8s-logs-production: ## Show Kubernetes logs for production
	kubectl logs -f -l app=usdc-wallet-api -n production

# =============================================================================
# Utilities
# =============================================================================

clean: ## Clean build artifacts
	rm -rf dist coverage node_modules/.cache

clean-all: clean ## Clean everything including node_modules
	rm -rf node_modules

generate-secrets: ## Generate random secrets for environment
	@echo "JWT_SECRET=$$(openssl rand -base64 48)"
	@echo "JWT_REFRESH_SECRET=$$(openssl rand -base64 48)"
	@echo "DATABASE_PASSWORD=$$(openssl rand -base64 24)"
	@echo "REDIS_PASSWORD=$$(openssl rand -base64 24)"

check-env: ## Check if required environment variables are set
	@echo "Checking environment variables..."
	@test -n "$(DATABASE_HOST)" || (echo "DATABASE_HOST is not set" && exit 1)
	@test -n "$(JWT_SECRET)" || (echo "JWT_SECRET is not set" && exit 1)
	@echo "All required environment variables are set"

version: ## Show version information
	@echo "Version: $(VERSION)"
	@echo "Git SHA: $(GIT_SHA)"
	@echo "Image:   $(FULL_IMAGE)"

# =============================================================================
# CI/CD Helpers
# =============================================================================

ci-test: install lint type-check test ## Run all CI checks

ci-build: ci-test build docker-build ## Run CI build pipeline

ci-deploy: ci-build docker-push deploy-staging health-staging ## Full CI/CD pipeline to staging
