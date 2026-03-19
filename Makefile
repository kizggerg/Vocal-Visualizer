.PHONY: dev build test lint typecheck audit bundle-check ci deploy infra-plan infra-apply

dev:
	npx vite

build:
	npx vite build

test:
	npx vitest run

lint:
	npx biome check src/

typecheck:
	npx tsc --noEmit

audit:
	npm audit --omit=dev --audit-level=high

bundle-check: build
	bash scripts/check-bundle-size.sh

ci: lint typecheck test build bundle-check audit
	@echo "All CI checks passed."

deploy: build
	bash scripts/deploy.sh

infra-plan:
	terraform -chdir=infra plan

infra-apply:
	terraform -chdir=infra apply
