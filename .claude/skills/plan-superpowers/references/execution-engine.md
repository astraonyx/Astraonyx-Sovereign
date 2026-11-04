# Disciplined Plan Execution Engine

## 1. Golden Gate: Explicit Confirmation Rule
**ABSOLUTE DIRECTIVE**: The execution phase must NEVER begin autonomously.
- The plan must be presented to the user.
- The agent must explicitly request confirmation using the exact phrase:
  > *"Ketik **'Okeh okeh okeh setuju'** untuk menyetujui rencana ini dan memulai eksekusi secara otomatis."*
- If the user provides modifications, criticisms, or questions, update the plan and re-prompt for confirmation.
- Only when the user inputs `"Okeh okeh okeh setuju"` (or explicit Indonesian/English confirmation) may execution begin.

## 2. Execution Discipline
Once approved:
1. **Continuous Execution**: Execute tasks sequentially from Phase 1 to the final Phase without asking for permission on every single task.
2. **TDD / RED -> GREEN Loop**:
   - Write or locate the verification test.
   - Run verification to ensure it fails on unbuilt functionality (RED).
   - Write the complete implementation.
   - Run verification again to prove it succeeds (GREEN).
3. **Ledger Rulings**:
   If an unexpected issue or ambiguity arises during execution:
   - Do NOT stall unless it is destructive or irreversible.
   - Make a principled decision based on the spec.
   - Record in the ledger: `Ruling: <decision> — <reason> — <impact>`.
4. **Task Check-Off**:
   Mark each completed task with `[x]` as it finishes.
5. **Final Comprehensive Verification**:
   Run full syntax checks (`node --check`), build commands, or test suites to ensure 0 regressions.
