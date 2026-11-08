.PHONY: dev dev-down prod-up prod-down backup lint typecheck

dev:
	docker compose -f docker-compose.dev.yml up --build

dev-down:
	docker compose -f docker-compose.dev.yml down

prod-up:
	docker compose -f docker-compose.prod.yml up -d --wait

prod-down:
	docker compose -f docker-compose.prod.yml down

backup:
	bash scripts/backup.sh

lint:
	pnpm lint

typecheck:
	pnpm typecheck
