# Implementation Plan Specification & Artifact Template

Every implementation plan must follow this exact, bite-sized specification so that an engineer or agent can execute it without ambiguity.

## 1. Antigravity Plan Artifact Structure
When creating a plan artifact, save it to the conversation artifact directory (`<appDataDir>\brain\<conversation-id>/plan.md`) with `RequestFeedback=true` and `UserFacing=true`.

```markdown
# [Feature Name] Implementation Plan

**Goal:** [Single clear sentence describing the exact deliverable]
**Architecture:** [2-3 sentences explaining architectural approach & key design patterns]
**Tech Stack:** [Languages, frameworks, database, libraries]

---

## Global Constraints & Principles
- **No Truncation**: Deliver 100% complete files without placeholders.
- **Zero Regression**: Preserve existing IDs, event listeners, backend socket handlers.
- **Strict Verification**: Every task ends with an automated syntax check (`node --check`) or unit test.

---

## File Changes Matrix
| Action | File Path | Responsibility |
| :--- | :--- | :--- |
| Create | `src/services/billing.js` | Stripe webhooks and invoice generation |
| Modify | `src/routes/api.js` | Mount billing router endpoints |
| Test | `tests/billing.test.js` | Unit test cases for invoice math |

---

## Phased Task Breakdown

### Phase 1: Foundations & Schemas
- [ ] **Task 1.1: [Name]**
  - **Files:** `path/to/file.js`
  - **Action:** Create schema and validator.
  - **Verification:** Run unit test `npm test -- tests/schema.test.js` (Verify RED -> GREEN).

### Phase 2: Core Logic & Services
- [ ] **Task 2.1: [Name]**
  - **Files:** `path/to/service.js`
  - **Action:** Implement business logic.
  - **Verification:** Run test suite and check exit code 0.

### Phase 3: Integration & UI Components
- [ ] **Task 3.1: [Name]**
  - **Files:** `path/to/component.jsx`
  - **Action:** Implement component with accessible states.
  - **Verification:** Test layout and check browser console.

### Phase 4: Final Verification & Smoke Test
- [ ] **Task 4.1: [Name]**
  - **Action:** End-to-end smoke test across the entire workflow.
  - **Verification:** All tests pass, build passes cleanly.
```
