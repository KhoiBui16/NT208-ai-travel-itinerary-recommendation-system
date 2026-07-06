#!/bin/bash
# rebuild-after-merge.sh
# Script to rebuild Docker containers after merging PRs
# Run this after merging PRs to main to ensure containers use latest code and config

set -e  # Exit on error

echo "=========================================="
echo "🔄 REBUILD DOCKER CONTAINERS AFTER MERGE"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Stop all containers
echo "🛑 Step 1: Stopping all containers..."
docker-compose down
echo ""

# Step 2: Pull latest code
echo "📥 Step 2: Pulling latest code from main..."
git pull origin main
echo ""

# Step 3: Check if on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo -e "${RED}❌ ERROR: Not on main branch. Current: $CURRENT_BRANCH${NC}"
    echo "Please switch to main branch first: git checkout main"
    exit 1
fi
echo -e "${GREEN}✅ On main branch: $CURRENT_BRANCH${NC}"
echo ""

# Step 4: Rebuild images (no cache to ensure fresh build)
echo "🔨 Step 3: Rebuilding Docker images (no cache)..."
docker-compose build --no-cache api
echo ""

# Step 5: Start containers with new config
echo "🚀 Step 4: Starting containers with new configuration..."
docker-compose up -d
echo ""

# Step 6: Wait for containers to be healthy
echo "⏳ Step 5: Waiting for containers to be healthy..."
sleep 10

# Step 7: Verify Redis config
echo ""
echo "🔍 Step 6: Verifying Redis configuration..."
REDIS_MAXMEMORY=$(docker exec nt208-ai-travel-itinerary-recommendation-system-redis-1 redis-cli CONFIG GET maxmemory | tail -1)
REDIS_POLICY=$(docker exec nt208-ai-travel-itinerary-recommendation-system-redis-1 redis-cli CONFIG GET maxmemory-policy | tail -1)

if [ "$REDIS_MAXMEMORY" = "134217728" ]; then
    echo -e "${GREEN}✅ Redis maxmemory: 128mb (correct)${NC}"
else
    echo -e "${RED}❌ Redis maxmemory: $REDIS_MAXMEMORY (expected 134217728)${NC}"
fi

if [ "$REDIS_POLICY" = "allkeys-lru" ]; then
    echo -e "${GREEN}✅ Redis eviction policy: allkeys-lru (correct)${NC}"
else
    echo -e "${RED}❌ Redis eviction policy: $REDIS_POLICY (expected allkeys-lru)${NC}"
fi
echo ""

# Step 8: Verify API health
echo "🏥 Step 7: Verifying API health..."
sleep 5  # Give API time to start
HEALTH_RESPONSE=$(curl -s http://localhost:8000/api/v1/health 2>/dev/null || echo "failed")
if echo "$HEALTH_RESPONSE" | grep -q "healthy"; then
    echo -e "${GREEN}✅ API health check: PASSED${NC}"
else
    echo -e "${YELLOW}⚠️  API health check: FAILED or not ready yet${NC}"
    echo "Response: $HEALTH_RESPONSE"
fi
echo ""

# Step 9: Verify database migrations
echo "🗄️  Step 8: Verifying database migrations..."
MIGRATION_OUTPUT=$(docker exec nt208-ai-travel-itinerary-recommendation-system-api-1 uv run alembic current 2>/dev/null || echo "failed")
if echo "$MIGRATION_OUTPUT" | grep -q "20260609_0007"; then
    echo -e "${GREEN}✅ Database migrations: Up to date (20260609_0007)${NC}"
else
    echo -e "${YELLOW}⚠️  Database migrations: May need upgrade${NC}"
    echo "Current: $MIGRATION_OUTPUT"
    echo ""
    echo "Running migrations manually..."
    docker exec nt208-ai-travel-itinerary-recommendation-system-api-1 uv run alembic upgrade head
fi
echo ""

# Step 10: Show container status
echo "📊 Step 9: Container status..."
docker-compose ps
echo ""

# Step 11: Show resource usage
echo "📈 Step 10: Resource usage..."
docker stats --no-stream nt208-ai-travel-itinerary-recommendation-system-api-1 \
                    nt208-ai-travel-itinerary-recommendation-system-db-1 \
                    nt208-ai-travel-itinerary-recommendation-system-redis-1
echo ""

echo "=========================================="
echo -e "${GREEN}✅ REBUILD COMPLETE!${NC}"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Test the application in browser"
echo "2. Run backend tests: cd Backend && uv run pytest tests/unit/ -v"
echo "3. Run frontend tests: cd Frontend && npm run test:e2e"
echo "4. Monitor logs: docker-compose logs -f api"
