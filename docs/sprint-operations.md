# Sprint Operations Guidelines

To keep the sprint board resilient when unexpected issues appear, follow these guardrails every iteration:

## 1. Reserve Capacity for Unplanned Work
- During sprint planning, block out **up to four story points** as an “unplanned work” buffer.
- Track the buffer explicitly on the sprint board (e.g., a placeholder ticket or swimlane note) so the team can see remaining capacity at a glance.
- Only pull planned backlog items once the buffer is established to avoid accidental overcommitment.
- Dedicate **at least two points of the buffer** specifically for **production and staging journal bugs** so fixes can ship without derailing planned delivery.

## 2. Log Bugs Against the Buffer
- Whenever a new defect is discovered mid-sprint, create a **child task linked to the buffer item**.
- Capture reproduction steps, severity, and expected fix scope in the child ticket to improve estimation accuracy.
- Update the buffer’s remaining points as fixes are completed so remaining headroom is visible.
- Journal bugs should note whether they originated in production or staging so the triage review can prioritize the highest-impact work.

## 3. Monitor Burn-Down Daily
- Review the sprint burn-down chart each day to confirm the buffer is still intact or consciously consumed.
- If unplanned work threatens to exceed the four-point allocation, initiate a trade-off conversation (e.g., descoping a planned story or extending the sprint).
- Note any trade-offs in the sprint retrospective to refine future buffer sizing.

## 4. Hold Biweekly Triage Reviews
- Schedule two triage review sessions per week (e.g., Monday and Thursday) to assess incoming production and staging journal bugs.
- Adjust allocation within the sprint buffer based on triage outcomes, ensuring the most urgent journal bugs remain covered without overcommitting planned scope.
- Record triage decisions and ownership updates directly on the buffer child tasks so the whole team can see the latest plan.

Adhering to these practices keeps the team responsive to surprises without silently derailing sprint commitments.
