# ADR-002: Infrastructure Constraints & Platform Decisions

## Status: Accepted

## Context

Before the team begins work, we need to establish the infrastructure and platform constraints that inform all downstream decisions.

## Decisions

### Cloud Provider: AWS
- All cloud infrastructure will be built on AWS
- Select AWS-native serverless services where possible (Lambda, API Gateway, S3, DynamoDB/Aurora Serverless, CloudFront)
- Use services that scale to zero or have minimal idle cost

### Cost Ceiling: $100/month production, ~$0 idle
- The application must cost no more than $100/month to operate in production
- When not in use, costs should approach $0
- Early prototype serves <10 users — do not over-provision
- Prefer pay-per-request pricing models over provisioned capacity

### Platform: Web (responsive, tablet-friendly)
- Build as a web application
- Design must be responsive and work well on tablets
- Mobile-specific design is out of scope for now
- Architecture and design must not preclude future mobile support (e.g., clean API separation)

### CI/CD: GitHub Actions with local developer experience
- Use GitHub Actions for CI/CD pipelines
- Ensure pipelines can be run/tested locally (e.g., act, Makefile, or script equivalents)
- Pipeline stages: lint → type-check → test → security scan → build → deploy → verify

## Consequences

- Technology selections are constrained to the AWS ecosystem
- Serverless-first architecture (Lambda + API Gateway, or containers on Fargate/App Runner with scale-to-zero)
- Frontend hosting via S3 + CloudFront (near-zero cost for static assets)
- Database must support serverless pricing (DynamoDB, Aurora Serverless, or S3 for simple storage)
- All infrastructure must be expressible as IaC (CDK, Terraform, or SAM)
- Multi-environment deployment (staging + production) with pipeline-driven Terraform — see ADR-005
