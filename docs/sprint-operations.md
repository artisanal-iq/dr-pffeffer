# Sprint Operations Guidelines

To keep the sprint board resilient when unexpected issues appear, follow these guardrails every iteration:

## 1. Reserve Capacity for Unplanned Work
- During sprint planning, maintain a **dedicated backlog lane capped at six story points** for unplanned fixes.
- Track the buffer explicitly on the sprint board (e.g., a placeholder ticket or swimlane note) so the team can see remaining capacity at a glance.
- Only pull planned backlog items once the buffer is established to avoid accidental overcommitment.

## 2. Log Bugs Against the Buffer
- Whenever a new defect is discovered mid-sprint, create a **child task linked to the buffer item**.
- Capture reproduction steps, severity, and expected fix scope in the child ticket to improve estimation accuracy.
- Update the buffer’s remaining points as fixes are completed so remaining headroom is visible.

## 3. Monitor Burn-Down Daily
- Review the sprint burn-down chart each day to confirm the buffer is still intact or consciously consumed.
- If unplanned work threatens to exceed the six-point allocation, initiate a trade-off conversation (e.g., descoping a planned story or extending the sprint).
- Note any trade-offs in the sprint retrospective to refine future buffer sizing.
- Conduct a midpoint review of the sprint to decide whether capacity should be reallocated between planned work and the unplanned fixes lane.

Adhering to these practices keeps the team responsive to surprises without silently derailing sprint commitments.
