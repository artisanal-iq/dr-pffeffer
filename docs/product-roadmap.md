# Power Practice Planner Product Roadmap

## Executive Summary
The roadmap translates the PRD into a four-quarter plan that balances foundational planner capabilities, AI-powered guidance, relationship insights, and advanced analytics. Early quarters focus on establishing reliable task management and daily practice loops, while subsequent quarters layer in automation, personalization, and data-driven coaching. Each phase includes measurable outcomes, explicit dependencies, and resource expectations to support planning and investment decisions.

## Phase-by-Phase Breakdown

### Q1 FY2026 – MVP Foundations
**Objectives**
- Launch core workspace enabling users to capture tasks, daily power practices, journals, and relationships.
- Deliver baseline dashboard summarizing activity and power score prototype.

**Capabilities & Complexity**
| Capability | Description | Complexity |
| --- | --- | --- |
| Task + Planner CRUD | Tasks with contexts, priorities, list-based scheduling, Supabase sync. Calendar UI pending. | M |
| Power Practice Routine | Morning focus prompt selection, midday nudges (manual scheduler), end-of-day rating capture. | M |
| Influence Journal | Text/voice entry capture (voice-to-text via browser), AI summary placeholder (rule-based). | S |
| Relationship Tracker | Contact management with reminders, basic tagging. | M |
| Dashboard Foundations | Power score calculation (rule-based), calendar heatmap, quick-add buttons. | M |
| Auth & Settings | Supabase Auth, profile settings, notification preferences. | S |

**Dependencies**
- Shared user profile and settings service required before routine, journal, and tracker modules.
- Dashboard metrics depend on data from task, practice, and journal tables.

**Success Metrics / KPIs**
- ≥ 50% of onboarded users complete at least 3 daily check-ins in first 2 weeks.
- ≥ 60% DAU/WAU ratio among beta cohort.
- 95% uptime for Supabase operations.

**Deliverables**
- Production-ready Next.js app with Supabase backend.
- Internal beta launch with manual AI prompts.

**Resource Estimate**
- 2 Full-stack engineers, 1 Product Designer, 0.5 AI/Prompt Engineer (shared).

### Q2 FY2026 – AI-Assisted Workflows
**Objectives**
- Introduce AI-driven prompts and summaries for daily practices and journals.
- Launch auto-plan scheduling assistant and refine nudges.

**Capabilities & Complexity**
| Capability | Description | Complexity |
| --- | --- | --- |
| AI Prompt Engine | OpenAI integration for daily focus and reflection summaries with persona memory. | L |
| Auto-Plan Algorithm | Motion-style scheduling within available slots, manual overrides. | L |
| Notification Automation | Vercel cron / Edge Functions for nudges. | M |
| Sentiment & Trend Insights | Display mood trends from journal sentiment analysis. | S |

**Dependencies**
- Requires complete data capture from Q1 modules.
- Auto-plan relies on reliable calendar data entry and time-zone aware scheduling.

**Success Metrics / KPIs**
- ≥ 70% of tasks auto-planned per active user.
- 80% of users rate AI daily focus “helpful” or higher.
- Reduction of manual scheduling time by 30% (self-reported).

**Deliverables**
- Public beta with AI features.
- Updated dashboard with sentiment and scheduling analytics.

**Resource Estimate**
- 3 Full-stack/Frontend engineers, 1 AI/Prompt Engineer, 1 Product Designer, 0.5 Data Analyst.

### Q3 FY2026 – Relationship Intelligence & Analytics
**Objectives**
- Enhance relationship tracker with influence mapping and advanced analytics.
- Extend dashboard with cohort comparisons and retention signals.

**Capabilities & Complexity**
| Capability | Description | Complexity |
| --- | --- | --- |
| Influence Map Visualization | Network graph of connections with recency and strength indicators. | L |
| Follow-up Intelligence | Recommend touchpoints based on activity gaps and tags. | M |
| Power Score 2.0 | Weighted scoring blending completion, reflection, confidence trends with AI insights. | M |
| Data Warehouse Pipeline | Aggregations for retention, engagement metrics. | M |

**Dependencies**
- Requires Q2 data enrichment for journals and tasks.
- Influence map requires consistent connection data and analytics pipeline.

**Success Metrics / KPIs**
- 50+ tracked connections per user within 60 days.
- 75% of active users engage with influence map monthly.
- Improvement of daily power score accuracy (correlation ≥ 0.7 with self-reported confidence surveys).

**Deliverables**
- Relationship intelligence suite.
- Analytics dashboards for internal teams.

**Resource Estimate**
- 3 Engineers (2 full-stack, 1 data viz), 1 Data Scientist, 1 Designer.

### Q4 FY2026 – Ecosystem Integrations & Optimization
**Objectives**
- Launch calendar integrations and personalization refinements.
- Harden infrastructure for scale and prepare for mobile expansion.

**Capabilities & Complexity**
| Capability | Description | Complexity |
| --- | --- | --- |
| Nylas/Motion Integration | Bi-directional calendar sync with conflict resolution. | XL |
| Personalization Engine | Adaptive prompts based on historical behavior and goal settings. | L |
| Privacy & Security Enhancements | Client-side encryption for journals, audit logs. | M |
| Growth & Retention Experiments | A/B testing framework, in-product onboarding loops. | M |

**Dependencies**
- Stable auto-plan and scheduling workflows from Q2.
- Requires robust analytics pipelines from Q3 for personalization feedback loops.

**Success Metrics / KPIs**
- 90% successful sync rate with external calendars.
- 30-day retention ≥ 65% post-integration launch.
- Zero P0 security incidents; SOC2 readiness checklist ≥ 80% complete.

**Deliverables**
- General Availability release.
- Integration marketplace groundwork.

**Resource Estimate**
- 4 Engineers (integration specialist, backend, frontend, security), 1 AI/ML Engineer, 1 Designer, 0.5 Compliance Specialist.

## Dependency Graph
- **Core Data Layer (Q1)** → prerequisite for all subsequent analytics, AI, and visualization work.
- **AI Prompt Engine (Q2)** → feeds personalization (Q4) and advanced power scoring (Q3).
- **Auto-Plan Scheduling (Q2)** → required for calendar integrations (Q4).
- **Relationship Tracker Enhancements (Q3)** → required for influence map and follow-up intelligence.
- **Analytics Pipeline (Q3)** → underpins personalization and retention experiments (Q4).

## Risk Register
| Risk | Phase Impacted | Likelihood | Severity | Mitigation |
| --- | --- | --- | --- | --- |
| AI output feels generic or off-brand | Q2+ | Medium | High | Establish brand voice guidelines, human-in-the-loop review, persona memory persistence. |
| Auto-plan conflicts with user preferences | Q2+ | Medium | Medium | Provide granular controls, undo/redo, user feedback loop feeding ML adjustments. |
| Calendar integration complexity | Q4 | High | High | Pilot with single provider (Nylas), add robust logging, staged rollout. |
| Data privacy for journals | Q1+ | Medium | High | Implement client-side encryption, strict RBAC, security audits. |
| Engagement drop after novelty | Q3+ | Medium | Medium | Implement retention analytics, A/B test nudges and content, add streaks later. |
| Resource constraints | All | Medium | Medium | Cross-train engineers, secure contractors for spikes, maintain backlog prioritization. |

## Resource Requirements Estimation
- **Engineering**: Scale from 2 engineers in Q1 to 4 engineers + specialists by Q4, with emphasis on AI, data, and integration skill sets.
- **Design/Research**: Continuous involvement of at least 1 product designer; add UX researcher (0.5 FTE) during Q2-Q4 for habit-forming validation.
- **AI/ML**: 0.5 FTE in Q1 growing to 1.0-1.5 FTE by Q4 for prompt engineering and personalization models.
- **Data/Analytics**: Introduce dedicated data analyst in Q2, expand to data scientist in Q3 for scoring models.
- **Product/Operations**: 1 product manager throughout; add customer success contractor in Q3 to manage beta cohort feedback.

## Missing Requirements & Clarifications Needed
- **Voice Entry Scope**: Clarify whether native speech-to-text must be built or if third-party browser APIs suffice for MVP.
- **Notification Channels**: Need decision on in-app vs. email/SMS nudges to finalize infrastructure.
- **Power Score Formula**: Define exact weighting and data inputs for Phase 1 vs. Phase 3 upgrade.
- **Security Baselines**: Confirm compliance targets (SOC2, GDPR) and encryption requirements for journals.
- **Auto-Plan Constraints**: Need explicit user-configurable working hours, calendar sources, and conflict resolution rules.

## Appendix: Capability Complexity Summary
| Theme | Capabilities | Complexity |
| --- | --- | --- |
| Task + Planner | CRUD, contexts, manual scheduling, auto-plan, calendar sync | M (core), L (auto-plan), XL (sync) |
| Power Practice Routine | Prompts, nudges, ratings, AI summaries, personalization | M, L, L |
| Influence Journal | Entry capture, sentiment, trend insights | S, S |
| Relationship Tracker | Contacts, reminders, influence map, follow-up intelligence | M, L, M |
| Dashboard & Analytics | Power score, heatmaps, sentiment trends, analytics pipeline | M, S, M |
| Platform & Security | Auth, settings, notifications, encryption | S, M |
