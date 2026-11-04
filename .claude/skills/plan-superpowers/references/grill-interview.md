# Grill-Me Protocol: Requirement Stress-Testing & Assumptions Probe

The Grill-Me protocol ensures that neither the human nor the agent jumps into writing code based on vague, incomplete, or unverified assumptions.

## 1. The Grilling Mindset
- **Skeptical & Rigorous**: Do not nod along. Ask: "What happens when this breaks?"
- **Probing Edge Cases**: Look for silent assumptions in the user's prompt (e.g. data volumes, auth states, latency, offline sync, schema migrations).
- **Surface Trade-Offs**: Identify trade-offs early (e.g., in-memory vs. persistent storage, strict consistency vs. eventual consistency, quick hack vs. extensible architecture).

## 2. Grilling Questions Matrix

### A. Data & State Integrity
- What are the minimum and maximum data volumes expected?
- What happens on network disconnect or server crash midway through an operation?
- Are operations idempotent? What prevents double-submissions or duplicate records?
- How is error state persisted and surfaced to the end user?

### B. Security & Permissions
- Who is authorized to trigger this action?
- Are inputs sanitized against injection / malformed payloads?
- Are secrets and tokens isolated from frontend bundles or commit history?

### C. UX & Performance
- What is the loading state while async operations are running?
- How is optimistic UI updated, and what rolls it back on failure?
- Is there any Cumulative Layout Shift (CLS) when data renders?

## 3. Grilling Deliverable
After grilling, synthesize findings into a concise list of **Locked Decisions**:
- Scope Inclusions (what is definitely in)
- Scope Exclusions (what is explicitly deferred)
- Resolved Edge Cases & Recovery Behaviors
