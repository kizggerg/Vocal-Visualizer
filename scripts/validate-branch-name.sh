#!/usr/bin/env bash
# Validates branch names against the project's branching convention.
# Usage: ./scripts/validate-branch-name.sh [branch-name]
# If no argument, validates the current branch.

BRANCH="${1:-$(git rev-parse --abbrev-ref HEAD)}"

# main is always valid
if [ "$BRANCH" = "main" ]; then
  exit 0
fi

PATTERN="^(feat|fix|chore|docs|infra|test|spike)/[a-z0-9][a-z0-9-]*$"

if [[ "$BRANCH" =~ $PATTERN ]]; then
  exit 0
else
  echo "ERROR: Branch name '$BRANCH' does not match the required pattern."
  echo ""
  echo "Expected format: <type>/<short-description>"
  echo "  Types: feat, fix, chore, docs, infra, test, spike"
  echo "  Description: lowercase, hyphens only, 2-4 words"
  echo ""
  echo "Examples:"
  echo "  feat/pitch-contour-visualization"
  echo "  fix/audio-upload-validation"
  echo "  infra/ci-pipeline-setup"
  exit 1
fi
