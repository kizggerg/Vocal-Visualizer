---
name: design-review
description: "Review a feature design for UX, accessibility, consistency, and technical feasibility."
user-invocable: true
argument-hint: "[feature or screen to review]"
---

## Design Review

Perform a design review for: **$ARGUMENTS**

### Step 1: UX Review
Use the **designer** agent to:
- Evaluate the user flow for clarity and simplicity
- Check consistency with the existing design system
- Review responsive behavior across breakpoints
- Assess accessibility (WCAG 2.1 AA)

### Step 2: Technical Feasibility
Use the **architect** agent to:
- Assess whether the design is technically implementable
- Identify any constraints or trade-offs
- Suggest component architecture for the design

### Step 3: Testability
Use the **qa-engineer** agent to:
- Verify the design is testable from acceptance criteria
- Identify states and scenarios that need test coverage

Present findings with specific recommendations for improvements.
