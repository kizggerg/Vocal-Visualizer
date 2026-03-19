.PHONY: dev build test lint typecheck audit bundle-check ci \
       deploy-staging deploy-prod \
       infra-init-staging infra-init-prod \
       infra-plan-staging infra-plan-prod \
       infra-apply-staging infra-apply-prod

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

# --- Terraform (per-environment) ---

infra-init-staging:
	terraform -chdir=infra init -backend-config="key=staging/terraform.tfstate"

infra-init-prod:
	terraform -chdir=infra init -backend-config="key=prod/terraform.tfstate"

infra-plan-staging:
	terraform -chdir=infra plan -var-file=envs/staging.tfvars

infra-plan-prod:
	terraform -chdir=infra plan -var-file=envs/prod.tfvars

infra-apply-staging:
	terraform -chdir=infra apply -var-file=envs/staging.tfvars

infra-apply-prod:
	terraform -chdir=infra apply -var-file=envs/prod.tfvars

# --- App deploy (per-environment) ---

deploy-staging: build
	bash scripts/deploy.sh

deploy-prod: build
	bash scripts/deploy.sh
