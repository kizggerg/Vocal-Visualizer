---
name: sprint-plan
description: "Sprint planning workflow that reviews the backlog, selects stories, breaks them into tasks, and creates a sprint plan."
user-invocable: true
argument-hint: "[sprint goal or focus area]"
---

## Sprint Planning

You are facilitating sprint planning for: **$ARGUMENTS**

Use the **scrum-master** agent to orchestrate this process:

### Step 1: Backlog Review
- Read the current backlog from `docs/product/backlog.md`
- Read any existing sprint plans in `docs/sprints/`
- Identify completed vs remaining work

### Step 2: Clarify Requirements
Use the **product-owner** agent to:
- Clarify or refine any ambiguous stories
- Prioritize the backlog for this sprint
- Ensure acceptance criteria are complete

### Step 3: Technical Assessment
Use the **architect** agent to:
- Assess technical feasibility of candidate stories
- Identify technical dependencies or prerequisites
- Estimate relative complexity

### Step 4: Sprint Plan
Use the **scrum-master** agent to:
- Select stories for the sprint based on priority and capacity
- Break stories into implementation tasks
- Map dependencies between tasks
- Assign tasks to appropriate roles (frontend, backend, devops, etc.)
- Save the sprint plan to `docs/sprints/`

Present the final sprint plan with stories, tasks, dependencies, and the sprint goal.
