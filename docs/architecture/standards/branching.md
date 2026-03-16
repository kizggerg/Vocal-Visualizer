# Branching Strategy

## Model: Trunk-Based Development

`main` is the trunk. All work happens on short-lived feature branches that merge back via squash merge.

## Branch Naming Convention

```
<type>/<short-description>
```

### Types

| Type | Use |
|------|-----|
| `feat/` | New feature or capability |
| `fix/` | Bug fix |
| `chore/` | Maintenance, refactoring, dependency updates |
| `docs/` | Documentation only |
| `infra/` | Infrastructure, CI/CD, DevOps |
| `test/` | Test additions or changes only |
| `spike/` | Research or experimental exploration |

### Rules

- Lowercase only, hyphens for word separation: `feat/pitch-contour-upload`
- Keep descriptions short (2-4 words): `fix/audio-parse-error`
- No nested slashes beyond the type prefix
- No personal names or ticket numbers in branch names (the commit messages reference stories)

### Examples

```
feat/pitch-contour-visualization
fix/audio-upload-validation
chore/update-dependencies
docs/api-documentation
infra/ci-pipeline-setup
test/pitch-analysis-unit-tests
spike/audio-processing-libraries
```

## Commit Convention

[Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

Examples:
```
feat(audio): add pitch extraction from uploaded recordings
fix(visualization): correct Y-axis note label alignment
chore(deps): update audio processing library to v2.1
docs(api): add endpoint documentation for /upload
infra(ci): add security scanning step to pipeline
test(pitch): add unit tests for frequency-to-note conversion
```

## Merge Strategy

- **Squash merge to main** — one clean commit per feature branch
- Branch is deleted after merge
- CI must pass before merge is allowed
- At least one reviewer must approve (Code Reviewer or Security Engineer)

## Multi-Agent Branching

When multiple agents work in parallel (e.g., Phase 4: Frontend + Backend + DevOps):
- Each agent works on a **separate branch** from main
- Branch names reflect the agent's domain: `feat/pitch-contour-frontend`, `feat/pitch-contour-api`
- Agents merge sequentially (first-ready merges first, others rebase on updated main)
- If branches touch the same files, the scrum master coordinates merge order
