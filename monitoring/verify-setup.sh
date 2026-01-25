#!/bin/bash

# USDC Wallet Monitoring Setup Verification Script
# This script verifies that the monitoring stack is properly configured

echo "============================================"
echo "USDC Wallet - Monitoring Setup Verification"
echo "============================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker is running
echo "Checking Docker..."
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}✗ Docker is not running${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker is running${NC}"

# Check if application is running
echo ""
echo "Checking USDC Wallet application..."
if curl -s http://localhost:3000/api/v1/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Application is running${NC}"
else
    echo -e "${YELLOW}⚠ Application is not running on port 3000${NC}"
fi

# Check metrics endpoint
echo ""
echo "Checking metrics endpoint..."
if curl -s http://localhost:3000/metrics | grep -q "usdc_wallet"; then
    echo -e "${GREEN}✓ Metrics endpoint is working${NC}"
else
    echo -e "${RED}✗ Metrics endpoint not accessible${NC}"
fi

# Check if monitoring stack is running
echo ""
echo "Checking monitoring services..."

services=("usdc-wallet-prometheus" "usdc-wallet-grafana" "usdc-wallet-redis-exporter" "usdc-wallet-postgres-exporter" "usdc-wallet-node-exporter")

for service in "${services[@]}"; do
    if docker ps | grep -q "$service"; then
        echo -e "${GREEN}✓ $service is running${NC}"
    else
        echo -e "${RED}✗ $service is not running${NC}"
    fi
done

# Check Prometheus targets
echo ""
echo "Checking Prometheus targets..."
if curl -s http://localhost:9090/api/v1/targets | grep -q "usdc-wallet-api"; then
    echo -e "${GREEN}✓ Prometheus is configured${NC}"
else
    echo -e "${YELLOW}⚠ Prometheus may not be scraping application${NC}"
fi

# Check Grafana
echo ""
echo "Checking Grafana..."
if curl -s http://localhost:3001/api/health | grep -q "ok"; then
    echo -e "${GREEN}✓ Grafana is accessible${NC}"
else
    echo -e "${RED}✗ Grafana is not accessible${NC}"
fi

# Summary
echo ""
echo "============================================"
echo "Verification Complete"
echo "============================================"
echo ""
echo "Access URLs:"
echo "- Application: http://localhost:3000/api/v1/health"
echo "- Metrics: http://localhost:3000/metrics"
echo "- Prometheus: http://localhost:9090"
echo "- Grafana: http://localhost:3001 (admin/admin)"
echo ""
echo "Next steps:"
echo "1. Open Grafana and view the USDC Wallet dashboard"
echo "2. Generate some traffic to see metrics update"
echo "3. Review alert rules in Prometheus"
echo "4. Customize dashboard panels as needed"
echo ""
