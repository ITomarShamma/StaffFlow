# StaffFlow — v0 Spec

**Sham Cash · Internal · Spec v0.3 · 9 Sep 2026**

---

## 1. Purpose

v0 exists to show the Branch Manager the idea working, in one sitting, with realistic data.

StaffFlow is a **floor coverage tool**: at any moment, who is on the floor, who is off it and why, and whether the team is still covered. Breaks and leave are the two reasons someone is off-floor.

Success = the demo script in §10 runs end-to-end without a workaround.

---

## 2. Scope

**In (v0)**
- Self-serve breaks: a general pool with a Team Lead–adjustable cap (1–3), and gender-separated toilet pools (female 1, male 2)
- A daily break budget of 25 min per agent, enforced by the system; visible to the Team Lead and Branch Manager only
- Live board — Team Lead with controls, Branch Manager read-only
- Leave: hourly and daily requests; the Branch Manager approves or rejects; annual balance of 14 days, 8 hours = 1 day
- Daily summary and leave balances for the Branch Manager, CSV export
- Login with username and password, role-based authorization, seeded accounts
- One branch, one team: 12 agents (9 male, 3 female), 1 Team Lead, 1 Branch Manager — held as data, never hard-coded
- Fully Arabic, RTL, desktop browsers on the branch LAN
- Demo mode (fast clock) so overrun and auto-end can be shown in seconds

**Out (v0) — deliberately**
- Phone or tablet layouts, Wi-Fi access, anything outside the LAN
- Shifts other than the fixed 08:00–16:00 day
- HR role, HR handoff, Excel / PDF export
- Notifications outside the app (SMS, email, WhatsApp)
- Prayer-time computation
- Break queueing ("you're next") — unavailable is enough
- Performance scoring
- Multi-branch, multi-team
- User management screen (headcount changes go through the seed / an admin script in v0)
- Sick, unpaid, or other leave types

---

## 3. Roles

| Role | Arabic | Access | Does |
|---|---|---|---|
| Agent | موظف خدمة عملاء | Desktop browser at their desk | Takes breaks, submits leave, sees own leave balance |
| Team Lead | مشرف | Desktop browser (may host the server) | Watches the board, sets the general cap, corrects sessions, views leave requests |
| Branch Manager | مدير الفرع | Desktop browser (may host the server) | Decides leave, reads summaries and balances, sees the board read-only |

Team Lead and Branch Manager do not take breaks. HR is not a user in v0.

---

## 4. Glossary (confirmed)

Full screen-by-screen UI copy is in Appendix A.

| Term | Arabic | Meaning |
|---|---|---|
| On floor | متواجد | Present and available to customers |
| On break | في استراحة | Off-floor on a break session |
| Away (leave) | في إجازة ساعية | Off-floor on approved hourly leave |
| On leave | في إجازة | Not present today (approved daily leave) |
| Smoke break | استراحة تدخين | |
| Prayer break | استراحة صلاة | |
| Toilet break | دورة مياه | |
| Meal break | استراحة طعام | |
| General pool | المجموعة العامة | Smoke, prayer, meal — shared cap |
| Toilet pool (female / male) | دورة مياه (نساء / رجال) | Separate caps by gender |
| Coverage cap | الحد الأقصى للاستراحات المتزامنة | Max concurrent sessions in a pool |
| Daily break budget | رصيد الاستراحات اليومي | 25 min per agent per day, timed types only |
| Overrun | تجاوز المدة | Session ran past its max + grace |
| Auto-ended | إنهاء تلقائي | System closed the session |
| Hourly leave | إجازة ساعية | |
| Daily leave | إجازة يومية | |
| Leave balance | رصيد الإجازات | 14 days per year |
| Pending / Approved / Rejected | قيد المراجعة / مقبول / مرفوض | |

---

## 5. Break rules

### 5.1 Types and pools

Three pools per team:

- **General** — smoke, prayer, meal. Cap set by the Team Lead at runtime: 1, 2 or 3 (seed value 2).
- **Toilet — female** — cap 1, fixed.
- **Toilet — male** — cap 2, fixed.

| Type | Pool | Max | Grace | Auto-end at | Allowance / day | Counts toward 25-min budget |
|---|---|---|---|---|---|---|
| Smoke | General | 3 min | 1 min | 10 min | 5 | Yes |
| Prayer | General | 10 min | 2 min | 20 min | 1 | Yes |
| Meal | General | 15 min | 2 min | 25 min | 1 | Yes |
| Toilet | Toilet (by gender) | — | — | Auto-release at 20 min, flagged "stale" | Unlimited | No |

All numbers are configuration (§12), not code.

### 5.2 Daily break budget

- Each agent has **25 minutes per day** for timed breaks (smoke, prayer, meal). Toilet never counts.
- **Actual duration counts, including overrun.** A 3-min smoke that ends at 5 min costs 5.
- **Effective max** of a break = min(type max, remaining budget). With 14 min left, a meal runs 14 min max; the agent's countdown shows that.
- When remaining budget reaches 0, all timed break buttons are unavailable for the rest of the day. Toilet stays available.
- Budget used, per-type counts and remaining minutes are visible to the **Team Lead and Branch Manager only**. The agent sees button states and the countdown of the break they are currently on — nothing else.

Arithmetic worth knowing: meal 15 + prayer 10 = 25. An agent who eats and prays has no smoke minutes that day.

### 5.3 Taking a break — self-serve

1. Agent clicks a break type.
2. Server checks, in order: (a) within work hours 08:00–16:00; (b) agent is on floor — not on a break, not on leave right now; (c) allowance left for that type today; (d) remaining budget > 0 (timed types only); (e) the pool has a free slot — for toilet, the pool matching the agent's gender.
3. Any check fails → the button is unavailable. The agent sees a neutral label only: "Busy — try again shortly" when the pool is full, "Not available today" for allowance or budget. No numbers.
4. All pass → session starts immediately. No approval step.
5. Agent clicks **Back on floor** to end. That is the only way an agent ends a break.

One active session per agent at a time.

### 5.4 Timing, overrun, auto-end

- The board and the agent's screen show elapsed time; the agent also sees the effective max.
- **Overrun** = elapsed > effective max + grace. Board tile turns red, overrun badge. Nothing is blocked; the agent can still end normally.
- **Auto-end** at the type's auto-end mark: the system ends the session, sets `ended_by = system`, flags it for Team Lead review, frees the slot. The full duration is charged to the budget.
- **Toilet**: no max, no overrun. Auto-releases at 20 min to free the slot, flagged "stale".
- **16:00**: any open session is auto-ended, `ended_by = system`, flagged "end of day".
- Time is **server-authoritative**. Clients only display.

### 5.5 Corrections (Team Lead)

- Edit end time, or void a session — always with a note. Original values kept; corrected sessions carry an "edited" marker.
- A correction also corrects the budget charge.
- Sessions older than 7 days cannot be edited (v0 simplification).

### 5.6 General cap control (Team Lead)

- A control in the board header: General cap **1 / 2 / 3**.
- Takes effect immediately for new breaks. Running breaks are never cut short.
- Every change is audit-logged: who, from, to, when.

### 5.7 Day boundaries

- Work day 08:00–16:00 Asia/Damascus. Breaks cannot start outside it.
- Allowances and budget reset at 00:00 Asia/Damascus.

---

## 6. Leave rules

- **Hourly leave**: date + from time + to time (within 08:00–16:00) + reason. Covers late arrival, early departure, and mid-shift permission — one object in v0.
- **Daily leave**: start date + end date (inclusive) + reason.
- Reason is required, one line.
- **Flow**: Agent submits → Pending → **Branch Manager** approves or rejects (optional note) → Agent sees the status. The Team Lead sees requests read-only.
- Agent can cancel while Pending. Only the Branch Manager can revoke an Approved request.
- The system prevents overlapping requests for the same agent.
- **Effect on the board**: approved daily leave → tile shows "On leave" all day. Approved hourly leave → tile shows "Away (leave)" during the window.
- Leave never consumes a break slot or budget. An agent on leave cannot start a break.

**Balance**
- 14 days per year, tracked internally as **112 hours**.
- Daily leave deducts 8 h per working day in the range (working days Sun–Thu). Hourly leave deducts the actual hours.
- Displayed in days with two decimals (a 2-hour leave = 0.25 day).
- Resets on 1 January.
- A request that would exceed the remaining balance is blocked at submission. Unpaid leave is a v1 type.
- Visible to: the agent (own), Team Lead and Branch Manager (all).

---

## 7. Screens — all desktop, RTL, designed for ≥ 1280 px

### Agent
1. **Home** — status card: "On floor", or "On break · Smoke · 01:12 / 03:00" with a **Back on floor** button. Four break buttons (Smoke, Prayer, Meal, Toilet), each available or unavailable with the neutral label from §5.3. No counts, no minutes remaining.
2. **Leave** — remaining balance (days), New request (hourly or daily), My requests with status chips.

### Team Lead
3. **Live board** — one tile per agent: name, status colour (green on floor · amber on break · red overrun · grey on leave · blue away-leave), break type + elapsed / effective max, budget used ("12 / 25"), per-type counters ("S 3/5 · P 1/1 · M 0/1"). Header: pool meters "General 2/2 · Toilet F 0/1 · Toilet M 1/2" and the **General cap 1 / 2 / 3** control. Refreshes every 5 s.
4. **Corrections** — from a tile: today's sessions for that agent, edit end time or void, with note.
5. **Leave requests** — read-only list with status and balances.

### Branch Manager
6. **Board** — same as screen 3, read-only: no cap control, no corrections.
7. **Leave decisions** — pending list; each row shows the agent's remaining balance; approve / reject with an optional note; revoke on approved ones.
8. **Daily summary** — date picker; table per agent: budget used / 25 · breaks by type (count / minutes) · toilet count · overruns · auto-ended · edited · leave (hours / days). **Export CSV**.
9. **Leave balances** — per agent for the year: used, remaining.

### All
10. **Login** — username + password. Seeded accounts. Role decides which screens exist; a Branch Manager URL opened by an agent returns 403.

---

## 8. Data model (minimal)

- `Branch` — id, name
- `Team` — id, branch_id, name, cap_general (1–3), cap_toilet_female, cap_toilet_male
- `User` — id, team_id, username, password_hash, role (agent | team_lead | branch_manager), gender (male | female), name_ar, active
- `BreakType` — code (smoke | prayer | meal | toilet), pool (general | toilet), max_min, grace_min, auto_end_at_min, allowance_per_day (null = unlimited), counts_toward_budget
- `BreakSession` — id, user_id, type, started_at, ended_at, effective_max_min, ended_by (agent | system | team_lead), overrun_min, stale, voided, edit_note, edited_by, original_ended_at
- `LeaveRequest` — id, user_id, kind (hourly | daily), date, from_time, to_time, start_date, end_date, hours, reason, status (pending | approved | rejected | cancelled | revoked), decided_by, decided_at, decision_note
- `Config` — daily_budget_min, work_start, work_end, working_days, annual_leave_days, hours_per_leave_day, leave_year_start, board_refresh_s, correction_window_days
- `AuditLog` — id, actor_id, action (incl. cap_changed, session_edited, leave_decided), entity, entity_id, before, after, at
- `Session` — server-side auth session

Leave balance is computed from approved requests, not stored. Timestamps stored in UTC; displayed in Asia/Damascus.

---

## 9. Reporting — v0 metrics

**Per agent, per day**

| Metric | Definition |
|---|---|
| Budget used | Sum of durations of timed types, out of 25 |
| Breaks by type | Count and minutes for smoke, prayer, meal |
| Toilet | Count only |
| Overruns | Sessions where duration > effective max + grace |
| Auto-ended | Sessions with ended_by = system (toilet "stale" excluded) |
| Edited | Sessions with a correction |
| Leave | Approved hourly hours that day; 1 if a daily leave covers the day |

**Per agent, per year**: leave used and remaining (days).

Coverage-below-minimum minutes and weekly / monthly roll-ups → v2.

---

## 10. Demo script (= acceptance criteria)

Seeded: 12 agents (9 M, 3 F), 1 Team Lead, 1 Branch Manager. General cap 2. Toilet F 1, M 2. Demo mode on (10× clock).

0. Log in as an agent → only agent screens exist; a Branch Manager URL returns 403.
1. Agent A clicks **Smoke** → board: A amber, "General 1/2", A's tile shows the budget ticking.
2. Agent B clicks **Meal** → "General 2/2".
3. Agent C clicks **Prayer** → unavailable, "Busy — try again shortly". Board still "General 2/2".
4. Team Lead sets General cap to **3** → C clicks **Prayer** → allowed, "General 3/3". Audit log records the change.
5. Female agent F1 clicks **Toilet** → "Toilet F 1/1". F2 clicks **Toilet** → unavailable. Male agent M1 clicks **Toilet** → allowed, "Toilet M 1/2".
6. A passes 4 min → tile red, overrun badge. A never returns → at 10 min the system auto-ends, flags for review; A shows "10 / 25".
7. Team Lead corrects A's end to 5 min with a note → "5 / 25", edited marker.
8. Agent D takes **Meal** (15) then **Prayer** (10) → "25 / 25" → D's Smoke button is unavailable, "Not available today". D's Toilet still works.
9. Agent E submits hourly leave 14:00–16:00 → Team Lead can see it but not decide → Branch Manager approves → E's tile shows "Away (leave)" at 14:00; E's balance 14.00 → 13.75.
10. Agent G submits daily leave for tomorrow → approved → tomorrow's board shows G "On leave"; balance 13.00.
11. Branch Manager opens today's summary → A: smoke 1, 5 min, 1 overrun, edited; D: 25 / 25; E: 2 h leave → **Export CSV** opens in Excel with Arabic names intact (UTF-8 with BOM).

---

## 11. Non-functional

- **Fully Arabic, RTL.** No language switch. UI strings still live in one file for maintainability.
- **Desktop only.** Designed for ≥ 1280 px; no responsive phone work.
- **Hosting**: served from one desktop on the branch LAN (Team Lead's or Branch Manager's). Agents open `http://<LAN-IP>:<port>` in a browser. The server runs as an auto-start service on that machine.
- Board polls every 5 s. No websockets in v0.
- Server-authoritative time; Asia/Damascus for display and boundaries.
- **Auth**: username + password, server-side sessions, role check on every API route, gender check on toilet pools server-side.
- Seed data resettable with one command. Headcount and names live in the seed, never in code.
- Demo mode: a flag that runs the server clock at 10×.
- No customer data touches this system. Employee names only.

---

## 12. Config defaults

| Key | Default |
|---|---|
| daily_budget_min | 25 |
| cap_general | 1–3, set by Team Lead at runtime; seed 2 |
| cap_toilet_female | 1 |
| cap_toilet_male | 2 |
| Break type parameters | see §5.1 |
| work_hours | 08:00–16:00 Asia/Damascus |
| working_days | Sun–Thu |
| annual_leave_days | 14 (= 112 h) |
| hours_per_leave_day | 8 |
| leave_year_start | 1 January |
| board_refresh_seconds | 5 |
| correction_window_days | 7 |
| demo_clock_multiplier | 10 |

---

## 13. Decisions

**Decided**
- Name: **StaffFlow**
- Stack: Next.js (App Router) + TypeScript + Tailwind + Prisma + SQLite for v0. One repo, one process, runs on a Windows desktop. Switch to Postgres in v1 without touching app code.
- Auth: username + password with server-side sessions (upgraded from a user picker — roles now gate real decisions)
- Team Lead and Branch Manager do not take breaks
- Glossary (§4) confirmed

**Confirmed 9 Sep 2026**
- Meal 15 + prayer 10 = 25 leaves no smoke minutes that day — intended
- Effective-max rule (§5.2): a break starts clamped to the remaining budget rather than being blocked
- Working days Sun–Thu; leave year = calendar year
- Agents see their own leave balance; the break budget stays hidden from them
- Open sessions auto-end at 16:00
- Agents see two neutral labels: "Busy — try again shortly" (pool full) and "Not available today" (everything else)

No open decisions. v0 is ready for the Design and Code stages.

---

## 14. Roadmap pointer

- **v1** — user management screen (add / remove agents, gender, role), unpaid and sick leave types, shifts beyond 08:00–16:00, break queue, prayer-time awareness, peak-hour cap rules, Postgres
- **v2** — weekly / monthly reports, Arabic Excel / PDF export, "send to HR" with status, full audit views
- **v3** — organizational performance score with configurable weights and manager comments
- **v4+** — multi-branch, HR as a user, employee profiles and documents, attendance-device integration, payroll inputs

---

## Appendix A — UI copy

Use these strings exactly. Product name stays as the Latin wordmark "StaffFlow". Digits are Western (0–9).

**Navigation and auth**

| Key | Arabic |
|---|---|
| Login | تسجيل الدخول |
| Username | اسم المستخدم |
| Password | كلمة المرور |
| Sign in | دخول |
| Wrong username or password | اسم المستخدم أو كلمة المرور غير صحيحة |
| Not authorized (403) | غير مصرح لك بالوصول إلى هذه الصفحة |
| Log out | تسجيل الخروج |
| Home | الرئيسية |
| Live board | اللوحة الحية |
| Leave | الإجازات |
| Leave requests | طلبات الإجازة |
| Leave decisions | قرارات الإجازة |
| Corrections | التصحيحات |
| Daily summary | الملخص اليومي |
| Leave balances | أرصدة الإجازات |
| Demo mode | وضع العرض التجريبي |

**Status**

| Key | Arabic |
|---|---|
| On floor | متواجد |
| On break | في استراحة |
| Overrun | تجاوز المدة |
| Away (hourly leave) | في إجازة ساعية |
| On leave | في إجازة |

**Breaks**

| Key | Arabic |
|---|---|
| Smoke break | استراحة تدخين |
| Prayer break | استراحة صلاة |
| Meal break | استراحة طعام |
| Toilet | دورة مياه |
| Back on floor | عودة إلى العمل |
| Busy — try again shortly | مشغول — حاول بعد قليل |
| Not available today | غير متاح اليوم |
| General pool | المجموعة العامة |
| Toilet — women | دورة مياه — نساء |
| Toilet — men | دورة مياه — رجال |
| General cap | الحد الأقصى للمجموعة العامة |
| Budget used | الرصيد المستخدم |
| Tile counters (example) | تدخين 3/5 · صلاة 1/1 · طعام 0/1 |
| Auto-ended | إنهاء تلقائي |
| End not recorded (stale toilet) | لم يُسجَّل الإنهاء |
| End of day | نهاية الدوام |
| Edited | معدّل |
| Today's sessions | استراحات اليوم |
| Start | البداية |
| End | النهاية |
| Duration | المدة |
| Edit end time | تعديل وقت الانتهاء |
| Void session | إلغاء الاستراحة |
| Note (required) | ملاحظة (إلزامية) |
| Save | حفظ |
| Cancel | إلغاء |
| No sessions today | لا توجد استراحات اليوم |

**Leave**

| Key | Arabic |
|---|---|
| New request | طلب جديد |
| Hourly leave | إجازة ساعية |
| Daily leave | إجازة يومية |
| Date | التاريخ |
| From | من |
| To | إلى |
| Start date | من تاريخ |
| End date | إلى تاريخ |
| Reason | السبب |
| Submit | إرسال |
| My requests | طلباتي |
| Remaining balance | الرصيد المتبقي |
| Requested by | مقدم الطلب |
| Hours | الساعات |
| Pending | قيد المراجعة |
| Approved | مقبول |
| Rejected | مرفوض |
| Cancelled | ملغى |
| Revoked | تم سحب الموافقة |
| Approve | موافقة |
| Reject | رفض |
| Revoke | سحب الموافقة |
| Decision note (optional) | ملاحظة القرار (اختيارية) |
| Exceeds remaining balance | يتجاوز الرصيد المتبقي |
| Overlaps an existing request | يتعارض مع طلب آخر |
| No pending requests | لا توجد طلبات قيد المراجعة |

**Summary and tables**

| Key | Arabic |
|---|---|
| Agent | الموظف |
| Count | العدد |
| Minutes | الدقائق |
| Overruns | التجاوزات |
| Used | المستخدم |
| Remaining | المتبقي |
| Day(s) | يوم |
| Export CSV | تصدير CSV |
