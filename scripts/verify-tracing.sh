#!/bin/bash

# Tracing Setup Verification Script
# Verifies that distributed tracing is properly configured

set -e

echo "=================================================="
echo "JoonaPay USDC Wallet - Tracing Verification"
echo "=================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Track overall status
ALL_CHECKS_PASSED=true

# Helper functions
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
    ALL_CHECKS_PASSED=false
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# 1. Check if Jaeger is running
echo "1. Checking Jaeger status..."
if curl -s http://localhost:14269/ > /dev/null 2>&1; then
    print_success "Jaeger is running on localhost:14269"

    # Check UI
    if curl -s http://localhost:16686/ > /dev/null 2>&1; then
        print_success "Jaeger UI is accessible at http://localhost:16686"
    else
        print_error "Jaeger UI is not accessible at http://localhost:16686"
    fi

    # Check OTLP receiver
    if nc -z localhost 4318 2>/dev/null; then
        print_success "OTLP HTTP receiver is listening on port 4318"
    else
        print_error "OTLP HTTP receiver is not listening on port 4318"
    fi
else
    print_error "Jaeger is not running"
    print_info "Start Jaeger with: cd infrastructure/monitoring && docker-compose -f docker-compose.jaeger.yml up -d"
fi

echo ""

# 2. Check environment variables
echo "2. Checking environment configuration..."

check_env_var() {
    local var_name=$1
    local expected_value=$2
    local current_value=$(grep "^${var_name}=" .env 2>/dev/null | cut -d'=' -f2)

    if [ -z "$current_value" ]; then
        print_warning "${var_name} is not set in .env file"
        print_info "Default value will be used from configuration.ts"
    else
        if [ -n "$expected_value" ] && [ "$current_value" != "$expected_value" ]; then
            print_warning "${var_name}=${current_value} (expected: ${expected_value})"
        else
            print_success "${var_name}=${current_value}"
        fi
    fi
}

check_env_var "TRACING_ENABLED" "true"
check_env_var "TRACING_SERVICE_NAME" "usdc-wallet-api"
check_env_var "JAEGER_ENDPOINT" "http://localhost:4318/v1/traces"
check_env_var "TRACING_SAMPLE_RATE" "1.0"

echo ""

# 3. Check if tracing module files exist
echo "3. Checking tracing module files..."

check_file() {
    local file_path=$1
    if [ -f "$file_path" ]; then
        print_success "$(basename $file_path) exists"
    else
        print_error "$(basename $file_path) is missing at $file_path"
    fi
}

check_file "src/modules/tracing/tracing.module.ts"
check_file "src/modules/tracing/tracing.service.ts"
check_file "src/modules/tracing/tracing.interceptor.ts"
check_file "src/modules/tracing/http-client.wrapper.ts"
check_file "src/modules/tracing/index.ts"

echo ""

# 4. Check if TracingModule is imported in app.module.ts
echo "4. Checking app.module.ts integration..."

if grep -q "TracingModule" src/app.module.ts; then
    print_success "TracingModule is imported in app.module.ts"

    # Check if it's in the imports array
    if grep -A100 "imports: \[" src/app.module.ts | grep -q "TracingModule"; then
        print_success "TracingModule is registered in imports array"
    else
        print_error "TracingModule is not in the imports array"
    fi
else
    print_error "TracingModule is not imported in app.module.ts"
fi

echo ""

# 5. Check OpenTelemetry dependencies
echo "5. Checking OpenTelemetry dependencies..."

check_dependency() {
    local dep_name=$1
    if grep -q "\"$dep_name\"" package.json; then
        local version=$(grep "\"$dep_name\"" package.json | cut -d'"' -f4)
        print_success "$dep_name: $version"
    else
        print_error "$dep_name is not installed"
    fi
}

check_dependency "@opentelemetry/api"
check_dependency "@opentelemetry/sdk-node"
check_dependency "@opentelemetry/auto-instrumentations-node"
check_dependency "@opentelemetry/exporter-trace-otlp-http"

echo ""

# 6. Check if node_modules are installed
echo "6. Checking node_modules..."

if [ -d "node_modules/@opentelemetry" ]; then
    print_success "OpenTelemetry packages are installed"
else
    print_error "OpenTelemetry packages are not installed"
    print_info "Run: npm install"
fi

echo ""

# 7. Test application startup (optional)
echo "7. Application startup test..."

if [ "$1" == "--skip-app-test" ]; then
    print_info "Skipping application startup test (--skip-app-test flag)"
else
    print_info "This will be checked when you start the application"
    print_info "Look for: [TracingService] Distributed tracing initialized successfully"
fi

echo ""

# 8. Docker Compose configuration
echo "8. Checking Docker Compose configuration..."

if [ -f "../../infrastructure/monitoring/docker-compose.jaeger.yml" ]; then
    print_success "docker-compose.jaeger.yml exists"

    # Check if OTLP is enabled
    if grep -q "COLLECTOR_OTLP_ENABLED.*true" ../../infrastructure/monitoring/docker-compose.jaeger.yml; then
        print_success "OTLP collector is enabled in docker-compose"
    else
        print_error "OTLP collector is not enabled in docker-compose"
    fi
else
    print_error "docker-compose.jaeger.yml not found"
fi

echo ""

# Summary
echo "=================================================="
echo "Verification Summary"
echo "=================================================="

if [ "$ALL_CHECKS_PASSED" = true ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Start Jaeger (if not running):"
    echo "   cd ../../infrastructure/monitoring"
    echo "   docker-compose -f docker-compose.jaeger.yml up -d"
    echo ""
    echo "2. Start your application:"
    echo "   npm run start:dev"
    echo ""
    echo "3. View traces in Jaeger UI:"
    echo "   http://localhost:16686"
else
    echo -e "${RED}✗ Some checks failed${NC}"
    echo ""
    echo "Please review the errors above and fix them."
fi

echo ""
