---
name: approve-gate
description: "Approve or reject a human checkpoint gate in the SDLC. Use when the human wants to approve requirements, architecture, or validation."
user-invocable: true
argument-hint: "[gate number or name] [approve/reject] [optional feedback]"
---

## Gate Approval

The human wants to act on a gate checkpoint: **$ARGUMENTS**

### Steps

1. Read `docs/gates/CURRENT_STATE.md` to find the current blocked state
2. Identify the gate file that needs action (e.g., `docs/gates/sprint-N-gate-M-*.md`)
3. Read the gate file to understand what was reviewed

### If approving:

4. Update the gate file:
   - Set `**Status:** APPROVED`
   - Set `**Approved By:** human`
   - Set `**Date:**` to today
   - Add any conditions under `## Human Decision`
5. Update `docs/gates/CURRENT_STATE.md`:
   - Advance `Current Phase` to the next phase
   - Update `Last Completed Phase` and `Last Completed Gate`
   - Clear `Blocked On`
   - Update `Last Updated`
6. Commit both files with message: `docs(gates): approve [gate name]`

### If rejecting / requesting changes:

4. Update the gate file:
   - Set `**Status:** CHANGES_REQUESTED`
   - Add the human's feedback under `## Human Decision`
5. Update `docs/gates/CURRENT_STATE.md`:
   - Set `Current Phase` back to the relevant phase for rework
   - Set `Blocked On` to describe what needs to change
   - Update `Last Updated`
6. Commit both files with message: `docs(gates): request changes on [gate name]`

### After either action:

7. If there's an open GitHub Issue for this checkpoint, comment on it with the decision and close it
8. Summarize what was done and what the next agent session will pick up
