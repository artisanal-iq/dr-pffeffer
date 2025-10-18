# 🧭 Product Requirements Document (PRD)

**Product Name:** Power Practice Planner
**Tagline:** *Master presence, purpose, and productivity.*
**Version:** 1.0 (MVP)
**Owner:** Jay Jordan
**Date:** October 2025

---

## 1. Purpose

The Power Practice Planner helps ambitious professionals **embody power intentionally**—combining daily behavioral conditioning (à la Jeffrey Pfeffer), **AI-assisted scheduling**, and **GTD clarity** in a single digital workspace.

It’s not just a planner; it’s a personal influence operating system that turns time, attention, and relationships into strategic assets.

---

## 2. Goals and Objectives

| Goal                                         | Success Metric                                        | Why It Matters                            |
| -------------------------------------------- | ----------------------------------------------------- | ----------------------------------------- |
| Build consistent habits of powerful behavior | ≥ 70 % of users complete ≥ 5 daily check-ins per week | Behavior → perception → influence         |
| Reduce cognitive load through AI scheduling  | 80 % of tasks auto-planned via Motion-style algorithm | Free mental bandwidth for leadership work |
| Increase self-awareness                      | 90 % of users journal ≥ 4× per week                   | Reflection reinforces power habits        |
| Strengthen professional networks             | Track 50+ connections per user within 60 days         | Power flows through relationships         |

---

## 3. User Personas

1. **Emerging Leader (30-45 yrs)** — Manager or specialist wanting to project more confidence and executive presence.
2. **Solo Professional / Consultant** — Needs structured self-management and visibility-building.
3. **Ambitious Learner** — Uses it as a daily discipline to train communication, confidence, and influence.

---

## 4. Core Features (MVP Scope)

### A. **Task + Planner (GTD Engine)**

* CRUD tasks
* Contexts, priorities, and statuses
* Manual scheduling + optional AI auto-plan (Phase 2)
* Calendar view with Supabase sync

### B. **Power Practice Daily Routine**

* Morning “Power Focus” prompt (e.g. *Decisive communication*)
* Midday posture or tone nudge
* End-of-day confidence rating (1–5)
* AI feedback summary (OpenAI API)

### C. **Influence Journal**

* Text or voice entry
* GPT summary + sentiment
* Timeline view of growth patterns

### D. **Relationship Tracker**

* Simple CRM for allies, mentors, and peers
* Reminders for follow-ups
* Influence map (Phase 2 analytics)

### E. **Dashboard**

* Daily power score (blend of completion %, reflection %, confidence trend)
* Calendar heatmap of consistency
* Quick-add buttons for journal or connection

---

## 5. Out-of-Scope (Future)

| Future Feature                       | Reason for Delay                      |
| ------------------------------------ | ------------------------------------- |
| Motion/Nylas API calendar automation | Phase 2 AI complexity                 |
| Voice analysis for tone coaching     | Phase 3 ML feature                    |
| Team dashboards                      | Post-MVP expansion                    |
| Mobile app                           | Later native port after web stability |

---

## 6. User Flow Summary

**Morning Flow**

1. User logs in → sees “Today’s Power Focus” (AI generated)
2. Reviews top tasks → presses *Auto-Plan Day*
3. Tasks assigned to open calendar slots

**Midday**

1. In-app notifications: posture/tone check-in
2. Quick-capture tasks or contacts

**Evening**

1. Reflection prompt → 3 questions
2. AI generates short feedback summary
3. Dashboard updates daily power score

---

## 7. Information Architecture / Database Schema (Supabase)

**Tables**

1. `users`

   * `id`, `email`, `name`, `created_at`

2. `tasks`

   * `id`, `user_id`, `title`, `status`, `priority`, `scheduled_time`, `context`, `created_at`

3. `power_practices`

   * `id`, `user_id`, `date`, `focus`, `reflection`, `rating`, `ai_feedback`

4. `journals`

   * `id`, `user_id`, `entry`, `ai_summary`, `date`

5. `connections`

   * `id`, `user_id`, `name`, `org`, `category`, `last_contact`, `next_action`, `notes`

6. `settings`

   * `id`, `user_id`, `theme`, `notifications`, `ai_persona`

Indexes on `user_id` for all tables.

---

## 8. Technical Architecture

| Layer             | Technology                             | Notes                                |
| ----------------- | -------------------------------------- | ------------------------------------ |
| **Frontend**      | Next.js 14 (React Server Components)   | Deployed via Vercel                  |
| **UI Framework**  | TailwindCSS + shadcn/ui                | Minimal, elegant                     |
| **State Mgmt**    | React Query + Zustand                  | Offline cache                        |
| **Backend**       | Supabase (Postgres + Auth + Realtime)  | Managed backend                      |
| **AI Layer**      | OpenAI GPT via Vercel AI SDK           | Prompts for power focus + reflection |
| **Calendar Sync** | Manual input (MVP) → Nylas API Phase 2 |                                      |
| **Notifications** | Vercel Cron / Supabase Edge Functions  | Scheduled nudges                     |
| **Analytics**     | Supabase SQL + Drizzle ORM             | Power score computation              |

---

## 9. UX / UI Guidelines

* **Tone:** confident, sleek, encouraging (think *Notion × Stoic coach*)
* **Color palette:** dark neutral + bold accent (gold or crimson)
* **Interactions:**

  * Morning flow: guided onboarding with affirmational micro-copy
  * Journal: distraction-free text box
  * Dashboard: one-glance view of confidence trend

---

## 10. AI Prompt Logic (Phase 1)

**Daily Power Focus Prompt**

> “Generate a behavioral focus for projecting confidence, authority, or clarity. Include a one-sentence actionable instruction.”

**Reflection Summary Prompt**

> “Summarize this reflection in 2 sentences highlighting confidence, influence, and emotional tone. Suggest one behavioral tweak.”

---

## 11. Success Metrics (MVP)

* **DAU/WAU ratio ≥ 0.35** (habitual use)
* **Avg. reflections per user/week ≥ 4**
* **Retention @ 30 days ≥ 60 %**
* **≥ 70 % of users rate daily focus ‘helpful’ or higher**

---

## 12. Risks and Mitigation

| Risk                          | Mitigation                                   |
| ----------------------------- | -------------------------------------------- |
| AI feedback feels generic     | Fine-tune system prompts, add persona memory |
| Overwhelm from GTD complexity | Start minimal, progressive disclosure        |
| Calendar API friction         | Allow manual drag-and-drop planning first    |
| Privacy of reflections        | Encrypt journals client-side                 |

---

## 13. Timeline (High-Level)

| Phase                     | Duration       | Deliverables                   |
| ------------------------- | -------------- | ------------------------------ |
| **Phase 1 (Weeks 1-6)**   | MVP foundation | Auth, CRUD, dashboard skeleton |
| **Phase 2 (Weeks 7-10)**  | AI layer       | GPT reflection + daily focus   |
| **Phase 3 (Weeks 11-14)** | Integrations   | Calendar sync, analytics       |
| **Phase 4 (Post-Launch)** | Feedback loop  | User testing, retention tuning |

---

## 14. Future Vision (v2+)

* **AI Power Coach Agent:** Personalized, contextual behavior training
* **Influence Analytics:** Relationship strength, visibility metrics
* **Gamification:** Streaks, badges (“Command Presence 100 Days”)
* **Team Mode:** Shared accountability circles

---

Would you like me to follow this with a **developer-ready technical spec** (API endpoints, component tree, and Supabase SQL script) so it can move straight to build?
