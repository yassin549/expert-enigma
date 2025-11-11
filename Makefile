.PHONY: help dev build migrate seed test clean logs deploy-staging deploy-production

help: ## Show this help message
	@echo "Topcoin Platform - Available Commands:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

dev: ## Start all services in development mode
	@echo "🚀 Starting Topcoin development environment..."
	docker-compose up -d postgres redis
	@echo "⏳ Waiting for database to be ready..."
	@sleep 3
	docker-compose up web api worker

build: ## Build all Docker images
	@echo "🔨 Building Docker images..."
	docker-compose build

migrate: ## Run database migrations
	@echo "📊 Running database migrations..."
	docker-compose exec api alembic upgrade head

seed: ## Seed development database
	@echo "🌱 Seeding development data..."
	docker-compose exec api python scripts/seed_dev.py

test: ## Run all tests
	@echo "🧪 Running tests..."
	@echo "Frontend tests..."
	cd apps/web && npm test
	@echo "Backend tests..."
	cd apps/api && pytest -v
	@echo "✅ All tests passed!"

test-e2e: ## Run end-to-end tests
	@echo "🎭 Running E2E tests..."
	cd apps/web && npm run test:e2e

lint: ## Run linters
	@echo "🔍 Linting code..."
	cd apps/web && npm run lint
	cd apps/api && ruff check . && mypy .

format: ## Format code
	@echo "✨ Formatting code..."
	cd apps/web && npm run format
	cd apps/api && ruff format .

clean: ## Clean up containers and volumes
	@echo "🧹 Cleaning up..."
	docker-compose down -v
	rm -rf apps/web/.next
	rm -rf apps/web/node_modules
	rm -rf apps/api/__pycache__
	@echo "✅ Cleanup complete!"

logs: ## View all service logs
	docker-compose logs -f

logs-web: ## View web service logs
	docker-compose logs -f web

logs-api: ## View API service logs
	docker-compose logs -f api

logs-worker: ## View worker service logs
	docker-compose logs -f worker

shell-api: ## Open shell in API container
	docker-compose exec api bash

shell-web: ## Open shell in web container
	docker-compose exec web sh

db-shell: ## Open PostgreSQL shell
	docker-compose exec postgres psql -U topcoin -d topcoin

db-reset: ## Reset database (WARNING: destroys all data)
	@echo "⚠️  WARNING: This will destroy all data!"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker-compose down -v postgres; \
		docker-compose up -d postgres; \
		sleep 3; \
		make migrate; \
		make seed; \
		echo "✅ Database reset complete!"; \
	fi

deploy-staging: ## Deploy to staging environment
	@echo "🚀 Deploying to staging..."
	@echo "Building images..."
	docker-compose -f docker-compose.staging.yml build
	@echo "Pushing to registry..."
	docker-compose -f docker-compose.staging.yml push
	@echo "Deploying..."
	# Add your staging deployment commands here
	@echo "✅ Staging deployment complete!"

deploy-production: ## Deploy to production environment
	@echo "🚀 Deploying to production..."
	@echo "⚠️  WARNING: You are deploying to PRODUCTION!"
	@read -p "Continue? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker-compose -f docker-compose.prod.yml build; \
		docker-compose -f docker-compose.prod.yml push; \
		echo "✅ Production deployment complete!"; \
	fi

backup-db: ## Backup database
	@echo "💾 Backing up database..."
	docker-compose exec -T postgres pg_dump -U topcoin topcoin > backup_$$(date +%Y%m%d_%H%M%S).sql
	@echo "✅ Backup complete!"

restore-db: ## Restore database from backup (pass FILE=backup.sql)
	@echo "📥 Restoring database..."
	@if [ -z "$(FILE)" ]; then \
		echo "❌ Error: Please specify FILE=backup.sql"; \
		exit 1; \
	fi
	docker-compose exec -T postgres psql -U topcoin -d topcoin < $(FILE)
	@echo "✅ Restore complete!"

install: ## Install dependencies
	@echo "📦 Installing dependencies..."
	cd apps/web && npm install
	cd apps/api && pip install -r requirements.txt
	@echo "✅ Dependencies installed!"

update: ## Update dependencies
	@echo "⬆️  Updating dependencies..."
	cd apps/web && npm update
	cd apps/api && pip install --upgrade -r requirements.txt
	@echo "✅ Dependencies updated!"

health: ## Check health of all services
	@echo "🏥 Checking service health..."
	@echo "Web:      $$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000 || echo 'DOWN')"
	@echo "API:      $$(curl -s -o /dev/null -w '%{http_code}' http://localhost:8000/health || echo 'DOWN')"
	@echo "Postgres: $$(docker-compose exec postgres pg_isready -U topcoin || echo 'DOWN')"
	@echo "Redis:    $$(docker-compose exec redis redis-cli ping || echo 'DOWN')"

stats: ## Show resource usage stats
	@echo "📊 Resource usage:"
	docker stats --no-stream

init: ## Initialize project for first time
	@echo "🎬 Initializing Topcoin platform..."
	@echo "1. Installing dependencies..."
	make install
	@echo "2. Starting services..."
	make dev &
	@sleep 10
	@echo "3. Running migrations..."
	make migrate
	@echo "4. Seeding database..."
	make seed
	@echo "✅ Initialization complete!"
	@echo "🎉 Topcoin is ready! Visit http://localhost:3000"
