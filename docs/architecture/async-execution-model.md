# Async Execution Model: Overnight Autonomous Agent Workflow

## Overview

This document defines how Claude Cloud Agents progress through the SDLC autonomously, pausing only at human-in-the-loop checkpoints, and how sessions resume after the human acts.

The core idea: **agents run until they hit a human gate, record their state, notify the human, and stop.** A new session reads that state and picks up exactly where the last one left off.

---

## 1. Phase Classification: Autonomous vs. Human-Blocked

Based on `docs/architecture/sdlc.md`, phases fall into two categories:

### Autonomous Phases (agent can complete without human)

| Phase | Gate | Why Autonomous |
|-------|------|----------------|
| Phase 1: Requirements | Gate 1 (agent review) | Agent-to-agent review only |
| Phase 2: Design & Architecture | Gate 2 (agent review) | Agent-to-agent review only |
| Phase 3: Test Planning | Gate 3 | Explicitly marked "no human checkpoint" |
| Phase 4: Implementation | Gate 4 (self-check) | Mechanical verification (tests pass, linter clean) |
| Phase 5: Review | Gate 5 | Agent-to-agent code + security review |
| Phase 6: Validation | Gate 6 (agent review) | Agent-to-agent validation |
| Phase 7: Documentation | Gate 7 | Explicitly marked "no human checkpoint" |
| Phase 8: Deploy | — | Agent executes, human notified |

### Human Checkpoints (agent MUST stop and wait)

| Checkpoint | After Phase | What the Human Decides |
|------------|-------------|----------------------|
| HC-1 | Phase 1 (Requirements) + Gate 1 | Is this the right thing to build? |
| HC-2 | Phase 2 (Design & Architecture) + Gate 2 | Are these the right technical choices? |
| HC-3 | Phase 6 (Validation) + Gate 6 | Does this work? Ready to ship? |

---

## 2. Overnight Batch Workflow

### What a single overnight session can accomplish

**Scenario A: Starting from scratch (feature assigned, no work done)**

```
Session starts
  → Phase 1: Requirements          [20 min]
  → Gate 1: Agent reviews           [10 min]
  → STOP at HC-1                    ← writes gate file, creates GitHub Issue
```

**Maximum autonomous output before first human gate:** Requirements + agent reviews. The agent cannot proceed to design without human approval.

**Scenario B: Human approved HC-1 before the session**

```
Session starts, reads state: HC-1 APPROVED
  → Phase 2: Design & Architecture  [30 min]
  → Gate 2: Agent reviews           [15 min]
  → STOP at HC-2                    ← writes gate file, creates GitHub Issue
```

**Scenario C: Human approved HC-2 before the session**

This is the big overnight run. Everything from test planning through validation is autonomous:

```
Session starts, reads state: HC-2 APPROVED
  → Phase 3: Test Planning           [15 min]
  → Gate 3: Agent reviews            [10 min]
  → Phase 4: Implementation          [60-120 min]
  → Gate 4: Self-check               [5 min]
  → Phase 5: Code + Security Review  [20 min]
  → Fix review findings, re-review   [20-40 min loop]
  → Phase 6: Validation              [15 min]
  → Gate 6: Agent reviews            [10 min]
  → STOP at HC-3                     ← writes gate file, creates GitHub Issue + PR
```

**Maximum autonomous output:** Test plan, full implementation, code review, security review, fix cycles, validation, and all artifacts. This is the highest-value overnight run.

**Scenario D: Human approved HC-3 before the session**

```
Session starts, reads state: HC-3 APPROVED
  → Phase 7: Documentation           [15 min]
  → Gate 7: Agent reviews            [10 min]
  → Phase 8: Deploy                  [10 min]
  → DONE                             ← creates GitHub Issue: "Feature deployed"
```

### The ideal two-night workflow

```
Night 1:  Requirements → Gate 1 → STOP (HC-1)
Morning:  Human approves HC-1 + HC-2 pre-approval (if confident)
          OR Human approves HC-1 only
Night 2a: Design → Gate 2 → STOP (HC-2)
Morning:  Human approves HC-2
Night 2b: Test Planning → Implementation → Review → Validation → STOP (HC-3)
Morning:  Human approves HC-3
Night 3:  Documentation → Deploy → DONE
```

With pre-approval, the fastest path is:

```
Night 1:  Requirements → HC-1 STOP
Morning:  Approve HC-1
Night 2:  Design → HC-2 STOP
Morning:  Approve HC-2
Night 3:  Phases 3-6 → HC-3 STOP   ← This is the big productive night
Morning:  Approve HC-3
Night 4:  Docs + Deploy → DONE
```

---

## 3. Gate Artifacts as State Machine

### 3.1 State file: `docs/gates/CURRENT_STATE.md`

This is the single source of truth for "where are we?"

```markdown
# Current SDLC State

## Active Work
- **Sprint:** 1
- **Story:** US-001 (Audio visualization feature)
- **Current Phase:** BLOCKED_AT_HC2
- **Last Completed Phase:** Phase 2 (Design & Architecture)
- **Last Completed Gate:** Gate 2 (agent review passed)
- **Blocked On:** Human Checkpoint 2 — awaiting human approval of technical choices
- **Notification:** GitHub Issue #14
- **Last Updated:** 2026-03-16T02:34:00Z
- **Last Agent Session:** session-2026-03-16-001

## Phase History
| Phase | Status | Gate Status | Completed At | Agent Session |
|-------|--------|-------------|--------------|---------------|
| Phase 1: Requirements | DONE | Gate 1: APPROVED | 2026-03-15T03:12:00Z | session-2026-03-15-001 |
| Phase 2: Design & Architecture | DONE | Gate 2: APPROVED | 2026-03-16T02:30:00Z | session-2026-03-16-001 |
| HC-1 | APPROVED | — | 2026-03-15T09:00:00Z | human |
| HC-2 | PENDING | — | — | — |
| Phase 3: Test Planning | NOT_STARTED | — | — | — |
| Phase 4: Implementation | NOT_STARTED | — | — | — |
| Phase 5: Review | NOT_STARTED | — | — | — |
| Phase 6: Validation | NOT_STARTED | — | — | — |
| HC-3 | NOT_STARTED | — | — | — |
| Phase 7: Documentation | NOT_STARTED | — | — | — |
| Phase 8: Deploy | NOT_STARTED | — | — | — |
```

### 3.2 Valid states for `Current Phase`

```
PHASE_1_REQUIREMENTS
GATE_1_REVIEW
BLOCKED_AT_HC1          ← agent stops here
PHASE_2_DESIGN
GATE_2_REVIEW
BLOCKED_AT_HC2          ← agent stops here
PHASE_3_TEST_PLANNING
GATE_3_REVIEW
PHASE_4_IMPLEMENTATION
GATE_4_SELF_CHECK
PHASE_5_REVIEW
GATE_5_RESOLUTION       ← review fix loop
PHASE_6_VALIDATION
GATE_6_REVIEW
BLOCKED_AT_HC3          ← agent stops here
PHASE_7_DOCUMENTATION
GATE_7_REVIEW
PHASE_8_DEPLOY
DONE
```

### 3.3 How an agent reads state

At the start of every session, the agent:

1. Reads `docs/gates/CURRENT_STATE.md`
2. Checks `Current Phase` field
3. If `BLOCKED_AT_HC*` — checks whether the human has approved by reading the corresponding gate file:
   - `docs/gates/sprint-N-gate-1-requirements.md` → look for `**Approved By:** human`
   - `docs/gates/sprint-N-gate-2-architecture.md` → look for `**Approved By:** human`
   - `docs/gates/sprint-N-gate-6-validation.md` → look for `**Approved By:** human`
4. If human has approved, advances `Current Phase` to the next phase and continues
5. If human has NOT approved, the agent stops immediately (work is already done, just waiting)

### 3.4 How an agent records completion

After completing a phase and its gate:

1. Creates/updates the gate file using `GATE_TEMPLATE.md` format:
   - File: `docs/gates/sprint-N-gate-M-name.md`
   - Sets `**Status:** APPROVED` (or `REJECTED` with notes)
   - Lists all reviewer verdicts
2. Updates `docs/gates/CURRENT_STATE.md`:
   - Advances `Current Phase` to the next state
   - Updates the phase history table
   - Sets `Last Updated` timestamp
3. Commits the gate file and state file together (atomic state transition)

### 3.5 How an agent knows to stop

The agent checks after every phase transition:

```
if Current Phase is BLOCKED_AT_HC1, BLOCKED_AT_HC2, or BLOCKED_AT_HC3:
    1. Write the gate file with Status: PENDING, Approved By: (awaiting human)
    2. Update CURRENT_STATE.md with blocked status
    3. Commit all work to the feature branch
    4. Push the branch
    5. Create notification (see Section 4)
    6. STOP — do not proceed
```

### 3.6 How a returning session picks up

```
1. Read docs/gates/CURRENT_STATE.md
2. Switch:
   case BLOCKED_AT_HC*:
     → Check if human approved (grep gate file for "Approved By: human")
     → If yes: advance to next phase, continue
     → If no: print "Still blocked on HC-N, nothing to do" and exit
   case PHASE_*:
     → Something interrupted mid-phase (crash/timeout)
     → Read the session log (docs/sprints/status/session-*.md)
     → Assess what was partially done
     → Resume or restart the phase
   case DONE:
     → Nothing to do
```

---

## 4. Notification Mechanism

Use a **layered approach**: GitHub Issue (primary) + status file (fallback).

### 4.1 At Human Checkpoints: GitHub Issue

When the agent reaches a human checkpoint, it creates a GitHub Issue:

```bash
gh issue create \
  --title "HC-2 Review Required: Sprint 1 — Audio Visualization Design & Architecture" \
  --label "human-checkpoint,blocked" \
  --body "$(cat <<'EOF'
## Human Checkpoint 2: Design & Architecture Approval

**Sprint:** 1
**Story:** US-001 (Audio visualization feature)
**Phase Completed:** Design & Architecture
**Gate Status:** Agent reviews passed

### What needs your review

1. **Technology selections** — see `docs/architecture/decisions/ADR-002-*.md`
2. **Service interface contracts** — see `docs/architecture/`
3. **UI/UX direction** — see `docs/design/`
4. **Threat model** — see `docs/security/`

### Agent review summary

| Reviewer | Verdict | Key Notes |
|----------|---------|-----------|
| designer | APPROVED | Design feasible within architecture |
| architect | APPROVED | Design implementable |
| security-engineer | APPROVED | Threat model mitigations addressed |
| qa-engineer | APPROVED | Artifacts testable |

### How to approve

Edit `docs/gates/sprint-1-gate-2-architecture.md`:
- Set `**Status:** APPROVED`
- Set `**Approved By:** human`
- Add any conditions under `## Human Decision`

Then update `docs/gates/CURRENT_STATE.md`:
- Set `Current Phase` to `PHASE_3_TEST_PLANNING`

Commit and push. The next agent session will pick up automatically.

### How to reject / request changes

Edit the gate file:
- Set `**Status:** CHANGES_REQUESTED`
- Add feedback under `## Human Decision`

The next agent session will read the feedback and revise.
EOF
)"
```

### 4.2 At HC-3 (Validation): GitHub Issue + Pull Request

HC-3 is special because there is working code to review. The agent:

1. Creates a PR from the feature branch to main
2. Requests review from the human
3. PR description includes the test results, NFR benchmarks, and links to artifacts
4. Also creates the GitHub Issue (for consistency)

```bash
gh pr create \
  --title "feat: Audio visualization feature (Sprint 1, US-001)" \
  --body "..." \
  --reviewer "$(git config user.name)"

gh issue create \
  --title "HC-3 Review Required: Sprint 1 — Audio Visualization Validation" \
  --label "human-checkpoint,blocked" \
  --body "..."
```

### 4.3 Status file (always updated, regardless of notification)

`docs/gates/CURRENT_STATE.md` always reflects the truth. If GitHub Issues fail for any reason, the human can always check this file.

### 4.4 Completion notification

When the feature reaches DONE, the agent creates a final GitHub Issue:

```bash
gh issue create \
  --title "Feature Complete: Sprint 1 — Audio Visualization" \
  --label "completed" \
  --body "Feature has been documented and is ready for deployment..."
```

---

## 5. Resumability Design

### 5.1 Session log

Each agent session writes a log to `docs/sprints/status/session-YYYY-MM-DD-NNN.md`:

```markdown
# Agent Session: session-2026-03-16-001

## Metadata
- **Started:** 2026-03-16T01:00:00Z
- **Ended:** 2026-03-16T02:34:00Z
- **Starting State:** PHASE_2_DESIGN
- **Ending State:** BLOCKED_AT_HC2
- **Sprint:** 1
- **Story:** US-001

## Work Completed
1. Delegated to architect agent — produced ADR-002, service contracts, data models
2. Delegated to designer agent — produced UI specs, component specs, user flows
3. Delegated to security-engineer agent — produced threat model
4. Ran Gate 2 reviews (all passed)
5. Created gate file: docs/gates/sprint-1-gate-2-architecture.md
6. Updated CURRENT_STATE.md → BLOCKED_AT_HC2
7. Created GitHub Issue #14 for human review

## Artifacts Produced
- `docs/architecture/decisions/ADR-002-audio-visualization.md`
- `docs/architecture/service-contracts/audio-api.md`
- `docs/design/audio-visualization-spec.md`
- `docs/security/threat-model-audio-viz.md`
- `docs/gates/sprint-1-gate-2-architecture.md`

## Commits
- `abc1234` — feat(design): audio visualization architecture and design
- `def5678` — docs(gates): gate 2 review and HC-2 block

## Notes
- No conflicts or issues encountered
- All agent reviews passed on first attempt
```

### 5.2 Recovery from interrupted sessions

If a session dies mid-phase (timeout, crash, quota):

1. `CURRENT_STATE.md` will show an in-progress phase (not a `BLOCKED_AT_*` state)
2. The session log will be incomplete or missing
3. The new session should:
   - Check git log for commits since the last known-good state
   - Check which artifacts exist vs. which are expected for the current phase
   - Decide whether to resume or restart the phase
   - If restarting, it is safe because phases are idempotent (overwriting artifacts is fine)

### 5.3 File naming conventions

```
docs/gates/
  CURRENT_STATE.md                          ← single source of truth
  GATE_TEMPLATE.md                          ← template for new gate files
  sprint-1-gate-1-requirements.md           ← Gate 1 for sprint 1
  sprint-1-gate-2-architecture.md           ← Gate 2 for sprint 1
  sprint-1-gate-3-test-plan.md              ← Gate 3 for sprint 1
  sprint-1-gate-5-review.md                 ← Gate 5 for sprint 1
  sprint-1-gate-6-validation.md             ← Gate 6 for sprint 1
  sprint-1-gate-7-documentation.md          ← Gate 7 for sprint 1

docs/sprints/
  sprint-1.md                               ← sprint plan
  status/
    session-2026-03-15-001.md               ← session log
    session-2026-03-16-001.md               ← session log
  retros/
    sprint-1-retro.md                       ← retrospective
```

### 5.4 State transitions (complete reference)

```
START
  │
  ▼
PHASE_1_REQUIREMENTS
  │ (product-owner agent produces requirements)
  ▼
GATE_1_REVIEW
  │ (architect, qa-engineer, security-engineer review)
  ▼
BLOCKED_AT_HC1 ─── [human approves] ───┐
  │                                      │
  │ [human requests changes]             │
  ▼                                      │
PHASE_1_REQUIREMENTS (loop back)         │
                                         │
  ┌──────────────────────────────────────┘
  ▼
PHASE_2_DESIGN
  │ (architect, designer, security-engineer produce artifacts)
  ▼
GATE_2_REVIEW
  │ (cross-agent reviews)
  ▼
BLOCKED_AT_HC2 ─── [human approves] ───┐
  │                                      │
  │ [human requests changes]             │
  ▼                                      │
PHASE_2_DESIGN (loop back)              │
                                         │
  ┌──────────────────────────────────────┘
  ▼
PHASE_3_TEST_PLANNING
  │ (qa-engineer produces test plan)
  ▼
GATE_3_REVIEW
  │ (product-owner, architect, security-engineer review)
  ▼
PHASE_4_IMPLEMENTATION
  │ (frontend, backend, devops engineers implement)
  ▼
GATE_4_SELF_CHECK
  │ (automated: lint, type-check, tests)
  ▼
PHASE_5_REVIEW
  │ (code-reviewer, security-engineer review code)
  ▼
GATE_5_RESOLUTION
  │ (fix loop until both approve)
  ▼
PHASE_6_VALIDATION
  │ (qa-engineer runs test plan)
  ▼
GATE_6_REVIEW
  │ (product-owner, architect verify)
  ▼
BLOCKED_AT_HC3 ─── [human approves] ───┐
  │                                      │
  │ [human requests changes]             │
  ▼                                      │
(loop back to appropriate phase)         │
                                         │
  ┌──────────────────────────────────────┘
  ▼
PHASE_7_DOCUMENTATION
  │ (technical-writer produces docs)
  ▼
GATE_7_REVIEW
  │ (architect, product-owner review)
  ▼
PHASE_8_DEPLOY
  │ (devops-engineer deploys)
  ▼
DONE
```

---

## 6. Agent Session Bootstrap Protocol

Every agent session (whether the scrum-master or the new-feature skill) should start with this sequence:

```
1. Read docs/gates/CURRENT_STATE.md
2. If no active work → check for new assignments (backlog, issues)
3. If active work exists:
   a. Read the current phase
   b. If BLOCKED_AT_HC* → check gate file for human approval
      - If approved → advance state, continue
      - If changes requested → read feedback, revise, re-submit to gate
      - If still pending → log "waiting on human", exit
   c. If mid-phase → read session log, assess progress, resume
   d. If DONE → check backlog for next story
4. Execute the current phase per the SDLC
5. On phase completion:
   a. Write gate file
   b. Update CURRENT_STATE.md
   c. Write session log
   d. Commit and push
   e. If next state is BLOCKED_AT_HC* → create notification, stop
   f. Otherwise → continue to next phase
```

---

## 7. Human Approval Protocol

When the human is ready to review:

### Quick approval (edit files directly)

1. Open the gate file (e.g., `docs/gates/sprint-1-gate-2-architecture.md`)
2. Change `**Status:** PENDING` to `**Status:** APPROVED`
3. Change `**Approved By:**` to `**Approved By:** human`
4. Add any notes under `## Human Decision`
5. Open `docs/gates/CURRENT_STATE.md`
6. Change `Current Phase` to the next phase (e.g., `PHASE_3_TEST_PLANNING`)
7. Change `Blocked On` to empty or remove the line
8. Commit and push

### Request changes

1. Open the gate file
2. Change `**Status:** PENDING` to `**Status:** CHANGES_REQUESTED`
3. Add feedback under `## Human Decision`
4. Open `docs/gates/CURRENT_STATE.md`
5. Change `Current Phase` back to the relevant phase (e.g., `PHASE_1_REQUIREMENTS`)
6. Commit and push

The next agent session will read the `CHANGES_REQUESTED` status, read the feedback, and revise.

---

## 8. Multi-Story Parallel Work

For multiple stories in a sprint, each story gets its own:

- Feature branch: `feat/us-001-audio-viz`
- State tracking in `CURRENT_STATE.md` (use a table of active stories)
- Independent gate files: `sprint-1-us-001-gate-2-architecture.md`
- Independent session logs

The scrum-master agent coordinates across stories, ensuring dependencies are respected.

---

## Summary

| Question | Answer |
|----------|--------|
| What can run overnight? | Everything between human checkpoints |
| Where does it pause? | HC-1 (requirements), HC-2 (design), HC-3 (validation) |
| How does it notify? | GitHub Issue (primary), PR at HC-3, status file (fallback) |
| How does it resume? | Reads `CURRENT_STATE.md`, checks gate files for approvals |
| How does it recover from crashes? | Checks git log + artifacts, restarts idempotent phase |
| What is the state machine? | `CURRENT_STATE.md` + gate files in `docs/gates/` |
| Biggest overnight win? | HC-2 approved → Phases 3-6 autonomously (test, build, review, validate) |
