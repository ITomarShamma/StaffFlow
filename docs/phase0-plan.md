# Phase 0 — Understand

Source: `docs/spec.md` v0.3 (9 Sep 2026) and `CLAUDE.md`. No code in this phase.

Question numbers below (Q1…) are what I need answered. Everything else is a
restatement or a proposal I will follow unless told otherwise. Answers go to
`docs/DECISIONS.md`.

---

## 1. Domain rules, restated

### Breaks (§5)

1. **Three pools per team.** General (smoke, prayer, meal) with a runtime cap of
   1, 2 or 3 set by the Team Lead (seed 2). Toilet-female, cap 1. Toilet-male,
   cap 2. A toilet request goes to the pool matching the agent's gender as stored
   on the server. Cap = maximum number of *open* sessions in the pool.
2. **Type parameters** are rows in `BreakType`, never constants:
   - Smoke: max 3, grace 1 (overrun after 4:00), auto-end at 10, 5 per day, budgeted.
   - Prayer: max 10, grace 2 (overrun after 12:00), auto-end at 20, 1 per day, budgeted.
   - Meal: max 15, grace 2 (overrun after 17:00), auto-end at 25, 1 per day, budgeted.
   - Toilet: no max, no grace, no overrun; auto-release at 20 (flag *stale*);
     unlimited; not budgeted.
3. **Daily budget** = 25 min per agent per Damascus calendar day, budgeted types
   only. The charge is the **actual** duration including overrun: a 3-min smoke
   ending at 5:00 costs 5. Used can therefore exceed 25; remaining =
   max(0, 25 − used).
4. **Effective max** = min(type max, remaining budget at the moment of start). It
   is fixed on the session at start. With 14 min left a meal has effective max 14,
   the countdown shows `/ 14:00`, and overrun begins after 16:00 (14 + grace 2).
5. **Budget exhausted** (remaining = 0) makes every budgeted type unavailable for
   the rest of the day; toilet is unaffected. Meal 15 + prayer 10 = 25, so an
   agent who eats and prays has no smoke that day (confirmed §13).
6. **Start checks, in this order; the first failure is the reason code:**
   - (a) now is inside 08:00–16:00 Damascus → else `outside_hours`
   - (b) the agent has no open session → else `not_on_floor`; and is not on leave
     right now (approved daily leave covering today, or approved hourly leave
     whose window contains now) → else `on_leave`
   - (c) today's non-voided sessions of that type < the type's allowance → else
     `allowance_used` (toilet: unlimited, never fails)
   - (d) budgeted types only: remaining budget > 0 → else `budget_exhausted`
   - (e) open sessions in the target pool < that pool's cap, cap read at call
     time → else `pool_full`
   The agent sees exactly two labels: `pool_full` → «مشغول — حاول بعد قليل»,
   every other reason → «غير متاح اليوم». Never a number.
7. **Start is immediate**, no approval. One open session per agent. The start
   timestamp is `clock.now()` on the server.
8. **End by the agent** happens only through «عودة إلى العمل»: `ended_at = now`,
   `ended_by = agent`. Otherwise the system ends it (rules 10–12) or the Team
   Lead corrects it (rule 13).
9. **Overrun** = elapsed > effective max + grace. Board tile turns red with the
   «تجاوز المدة» badge. Nothing is blocked; the agent can still end normally.
10. **Auto-end** for budgeted types at start + auto-end mark (10 / 20 / 25):
    `ended_at` is exactly start + mark (not the moment the sweep noticed),
    `ended_by = system`, reason `auto_end` (shown as «إنهاء تلقائي»), slot freed,
    the full 10 / 20 / 25 charged to the budget.
11. **Stale toilet** at start + 20: `ended_at = start + 20`, `ended_by = system`,
    `stale = true` («لم يُسجَّل الإنهاء»), no budget effect, not counted as
    auto-ended in reports.
12. **16:00 close**: every open session of any type ends at that day's 16:00
    Damascus, `ended_by = system`, reason `end_of_day` («نهاية الدوام»). Budgeted
    types are charged the actual duration (a meal started 15:58 costs 2).
13. **Corrections** are Team Lead only: edit the end time or void the session,
    always with a non-empty note. Original end and who ended it are preserved,
    the session carries «معدّل», and budget charge, overrun and allowance count
    are recomputed from the corrected values. Sessions older than 7 days are
    refused. Every correction is audit-logged.
14. **General cap 1 / 2 / 3** takes effect for the next start; open sessions are
    never cut, so a pool can briefly read 3/2. Each change is audit-logged with
    actor, from, to, when.
15. **Day boundaries**: breaks cannot start outside 08:00–16:00 Damascus;
    allowances and budget reset at 00:00 Damascus; all timestamps stored as UTC.

### Leave (§6)

16. **Hourly leave** = date + from + to (both within 08:00–16:00, from < to) +
    reason. Hours = to − from. Covers late arrival, early departure and mid-shift
    permission with one object.
17. **Daily leave** = start date … end date inclusive + reason. Hours = 8 × number
    of working days (Sun–Thu) in the range. A range covering only Fri–Sat costs 0.
18. **Reason** is required, one line.
19. **Lifecycle**: submit → `pending` → Branch Manager `approved` or `rejected`
    (optional note; decided_by, decided_at recorded; audit-logged). The agent may
    `cancel` while pending. Only the Branch Manager may `revoke` an approved
    request. The Team Lead sees everything read-only.
20. **No overlap**: a new request is refused («يتعارض مع طلب آخر») when its
    interval intersects any pending or approved request of the same agent, with
    hourly windows and daily ranges compared on one timeline.
21. **Board effect**: approved daily leave covering today → «في إجازة» all day;
    approved hourly leave whose window contains now → «في إجازة ساعية». Leave
    never uses a slot or the budget, and an agent on leave right now cannot start
    a break (rule 6b).
22. **Balance**: 112 h per calendar year (14 days × 8 h). Used = hours of
    approved requests dated in the year; remaining = 112 − used; displayed in
    days with two decimals (2 h → 0.25). Resets 1 January. A submission whose
    hours exceed the remaining balance is refused («يتجاوز الرصيد المتبقي»).
    Visible to the agent (own), Team Lead and Branch Manager (all).

---

## 2. Ambiguities, gaps, contradictions

**Q = needs your answer. A = my assumption; say so if you disagree.**

### Demo clock

- **Q1. The demo needs a settable clock, not only a fast one.** At 10×, the demo
  reaches 16:00 in under 50 real minutes from 08:00, step 9 needs "14:00" and
  step 10 needs "tomorrow". Proposal: `DEMO_CLOCK_START` (Damascus local, e.g.
  `2026-09-10 08:30`) read at boot in demo mode, anchor persisted in `Config` so
  a restart keeps continuity, plus a demo-mode-only control in the app bar badge
  («وضع العرض التجريبي», Team Lead and Branch Manager): jump forward to a time or
  to tomorrow 08:00. Forward only, audit-logged. Not a product feature; it does
  not exist when the multiplier is 1.
- **A2.** The sweep runs on demo time, every 5 real seconds. A forward jump
  ends sessions at their true marks (start + 10 etc.), not at the jump moment.
- **A3.** The Playwright run uses the same mechanism with a higher multiplier.
- **A4. Demo pitfall, not a code issue:** if the demo runs on a Thursday, "daily
  leave for tomorrow" is a Friday and G's balance stays 14.00, not 13.00. The
  e2e will pick a working day for "tomorrow"; the presenter should too.

### Budget and sessions

- **Q5. Rounding.** Timestamps have seconds; the budget is in minutes. Proposal:
  charge = duration rounded to the nearest minute, minimum 1 for any budgeted
  session. Alternative: round up. (Both give 10 → 5 → 25/25 in the demo.)
- **Q6. Auto-end mark on a clamped break.** A meal started with 14 min left:
  auto-end at the type's mark (25, literal §5.4) or relative to the effective
  max? Proposal: literal — the mark is a hard stop per type. Consequence: used
  can reach 36/25 that day. Acceptable?
- **A7.** Used above 25 is displayed as is («34 / 25»); remaining clamps to 0.
- **A8.** `overrun_min` = max(0, charged minutes − effective max − grace);
  overrun ⇔ `overrun_min > 0`. Matches §9 "duration > effective max + grace".
- **A9.** The 16:00 close counts as auto-ended in the summary (`ended_by =
  system`, not stale); in Corrections it shows «نهاية الدوام» rather than
  «إنهاء تلقائي».
- **A10. Status precedence** when states coincide: daily leave > open session
  (overrun > on break) > hourly-leave window > on floor. An agent who started a
  break at 13:55 with leave from 14:00 stays "on break" until it ends.
- **A11.** The agent's countdown keeps counting past the effective max
  (03:40 / 03:00); no red on the agent screen — §5.4 gives red to the board only.
- **A12.** Pool meter when the cap drops below the running count: «3/2», all
  segments filled, no error.
- **A13.** Voided sessions are excluded from budget, allowance, counts and the
  summary; they stay visible in Corrections with the note (row label needs a
  string → `// TODO-COPY`).
- **A14.** Two agents racing for the last slot: the start runs inside one
  write transaction (`BEGIN IMMEDIATE`), so the check and the insert are atomic.
- **A15.** "Flagged for review" (§5.4) has no acknowledge action in §7. The flag
  is the «إنهاء تلقائي» marker in Corrections; a review workflow goes to the
  backlog.

### Corrections

- **Q16. May the Team Lead end an open session?** §5.3 says only the agent ends
  a break, but `ended_by` allows `team_lead`. Proposal: yes — "edit end time"
  on an open session ends it with `ended_by = team_lead`; voiding an open session
  frees the slot.
- **Q17. Auto-ended, then corrected.** Demo step 11 lists A as "smoke 1, 5 min,
  1 overrun, edited" and is silent on auto-ended. Proposal: `ended_by` stays
  `system` (the system did end it; the Team Lead fixed the time), so A also
  counts 1 in the auto-ended column. Alternative: the edit replaces the system
  end and A counts 0.
- **A18.** Edit constraints: start < new end ≤ now; note non-empty; a second
  edit keeps the first `original_ended_at`; each edit audit-logged before/after.
- **A19.** §7.4 lists "today's sessions" while §5.5 allows 7 days. v0 UI shows
  today; the 7-day rule is still enforced server-side; a date picker is backlog.
- **A20.** 7-day window = `started_at ≥ now − 7 × 24 h`.

### Leave

- **Q21. Which balance blocks a submission?** §8 says balance = approved only,
  and demo step 9 moves E's balance at approval, not at submission. With
  approved-only, two pending requests can jointly overdraw. Proposal: display =
  112 − approved (spec); the submission check subtracts pending too; approval
  re-checks against approved-only and refuses with the same message.
- **Q22. Past dates.** A late-arrival request is naturally filed after the
  fact. Proposal: any date within the current leave year is accepted; the Branch
  Manager judges. Alternative: today or later only.
- **A23.** Overlap is checked against pending + approved only; touching windows
  (10:00–11:00 and 11:00–12:00) do not overlap; an hourly request on a day inside
  a daily range does.
- **A24.** Hourly times are minute-precise; the form offers 15-minute steps.
- **A25.** A daily range that crosses 1 January is refused (file two requests).
  All hours of a request belong to the year of its start date.
- **A26.** A daily request with 0 working days (Fri–Sat) is accepted, costs 0,
  and shows «في إجازة» on those days.
- **A27.** Revoke is allowed at any time on an approved request, even after the
  dates have passed; the balance is restored.
- **A28.** Summary "leave" column: hourly hours that day, or «1 يوم» when a
  daily leave covers it (§9).

### Auth, seed, brand

- **Q29. Credentials.** Usernames Latin lowercase (`agent01`…`agent12`, `lead`,
  `manager`)? Passwords: one `SEED_PASSWORD` for all accounts, set in `.env`
  (default in `.env.example`, used by `npm run demo` and the e2e), overridable —
  or a random password per account printed once?
- **Q30. Sham Cash mark.** `public/brand/` needs the mark as SVG or PNG. I found
  `Downloads/LOGO.pdf` but cannot render it here. Please drop an SVG/PNG in
  `public/brand/`, or tell me the file to use.
- **Q31. Design handoff.** `docs/design/` does not exist. The design brief
  (`Downloads/staffflow-design-prompt.md`) has a fuller token table than the
  kickoff (surfaces, disabled, type scale, radii). Proposal: copy it to
  `docs/design-brief.md` as a reference (not a handoff) and build from the
  kickoff tokens plus its type scale and radii.
- **A32.** Agent names: 12 invented Syrian names (9 M, 3 F) in the seed until
  you supply real ones.
- **A33.** Auth session: opaque token in an httpOnly, SameSite=Lax cookie, 12 h
  sliding expiry, not `Secure` (plain http on the LAN). Passwords hashed with
  Node's built-in `scrypt`, no extra dependency.
- **A34.** Appendix A lacks a few table headers and labels (request kind, status
  column, note column, voided row, demo clock badge, toilet count header). Each
  goes in `ar.ts` with `// TODO-COPY`.
- **A35.** The agent home polls every `board_refresh_s` too, so auto-end and
  pool changes reach the agent without a manual refresh.

---

## 3. Proposed Prisma schema

SQLite via Prisma. Enumerations are `String` columns validated by Zod and typed
as unions in `src/domain/types.ts` (portable to Postgres in v1). Calendar values
that are not instants (leave dates and times) are stored as Damascus-local
strings; instants are UTC `DateTime`.

```prisma
model Branch  { id String @id @default(cuid())  name String  teams Team[] }

model Team {
  id              String @id @default(cuid())
  branchId        String
  name            String
  capGeneral      Int      // 1..3, Team Lead at runtime, seed 2
  capToiletFemale Int      // seed 1
  capToiletMale   Int      // seed 2
  users           User[]
}

model User {
  id           String  @id @default(cuid())
  teamId       String
  username     String  @unique
  passwordHash String
  role         String  // agent | team_lead | branch_manager
  gender       String  // male | female
  nameAr       String
  active       Boolean @default(true)
  breakSessions BreakSession[]
  leaveRequests LeaveRequest[]
  authSessions  AuthSession[]
}

model BreakType {
  code               String  @id   // smoke | prayer | meal | toilet
  pool               String        // general | toilet
  maxMin             Int?          // null for toilet
  graceMin           Int?
  autoEndAtMin       Int           // toilet: stale threshold
  allowancePerDay    Int?          // null = unlimited
  countsTowardBudget Boolean
  sortOrder          Int
}

model BreakSession {
  id              String    @id @default(cuid())
  userId          String
  typeCode        String
  startedAt       DateTime
  endedAt         DateTime?
  effectiveMaxMin Int?      // null for toilet
  endedBy         String?   // agent | system | team_lead
  endReason       String?   // auto_end | stale | end_of_day   (system ends)   ← added
  overrunMin      Int       @default(0)
  stale           Boolean   @default(false)
  voided          Boolean   @default(false)
  editNote        String?
  editedById      String?
  editedAt        DateTime?                                                    ← added
  originalEndedAt DateTime?
  originalEndedBy String?                                                      ← added
  @@index([userId, startedAt])
  @@index([endedAt])
}

model LeaveRequest {
  id           String    @id @default(cuid())
  userId       String
  kind         String    // hourly | daily
  date         String?   // hourly, YYYY-MM-DD Damascus
  fromTime     String?   // hourly, HH:mm
  toTime       String?
  startDate    String?   // daily, YYYY-MM-DD
  endDate      String?
  startsAt     DateTime  // derived UTC interval for overlap and "now" checks ← added
  endsAt       DateTime                                                      ← added
  minutes      Int       // spec says hours; stored as whole minutes to avoid float drift
  reason       String
  status       String    // pending | approved | rejected | cancelled | revoked
  decidedById  String?
  decidedAt    DateTime?
  decisionNote String?
  createdAt    DateTime  @default(now())
  @@index([userId, status])
}

model Config   { key String @id  value String }   // §12 keys + demo clock anchor

model AuditLog {
  id       String   @id @default(cuid())
  actorId  String
  action   String   // cap_changed | session_edited | session_voided | leave_decided | leave_revoked | demo_clock_set
  entity   String
  entityId String
  before   String?  // JSON
  after    String?  // JSON
  at       DateTime
  @@index([entity, entityId])
}

model AuthSession {   // spec "Session", renamed to avoid clashing with break sessions
  id        String   @id          // random token
  userId    String
  createdAt DateTime
  expiresAt DateTime
  @@index([userId])
}
```

Deviations from §8, all additive: `endReason`, `editedAt`, `originalEndedBy`,
`LeaveRequest.startsAt/endsAt`, `minutes` instead of `hours`, `AuthSession` name,
`Config` as key/value. The budget charge is not stored; it is derived from the
timestamps so corrections never leave a stale number.

`prisma/seed-data.ts` exports the break types, config, caps and the 14 users.
The seed and the unit tests both import it, so "every row of §5.1" is tested
against the same data the app runs on.

---

## 4. Domain modules, signatures, tests

All pure: inputs are plain records, outputs are values or patches. No Prisma,
no `Date.now()`, no env. `src/server/` loads, calls, writes, audits.

### `clock.ts`
```ts
interface Clock { now(): Date }
realClock(): Clock
demoClock(a: { multiplier: number; anchorReal: Date; anchorDemo: Date }): Clock
  // now = anchorDemo + (Date.now() − anchorReal) × multiplier
clockFromEnv(env, persistedAnchor?: DemoAnchor): Clock
```
Tests: multiplier 1 equals real time; 10× advances 10 s per real second (fake
timers); anchor round-trips; a forward jump replaces the anchor.

### `tz.ts` (Asia/Damascus, via `Intl`, no dependency)
```ts
localParts(d: Date): { date: 'YYYY-MM-DD'; time: 'HH:mm'; minuteOfDay: number; weekday: 0..6 }
localToUtc(date: string, time: string): Date
dayStartUtc(date: string): Date;  addDays(date: string, n: number): string
workWindow(date: string, cfg): { start: Date; end: Date }
isWithinWorkHours(now: Date, cfg): boolean
isWorkingDay(date: string, cfg): boolean
workingDaysBetween(start: string, end: string, cfg): number
```
Tests: UTC ↔ Damascus (+03:00), 00:00 boundary, 08:00/16:00 window, Sun–Thu
working, Fri–Sat not, inclusive ranges.

### `pools.ts`
```ts
resolvePool(type: BreakTypeConfig, gender: Gender): Pool   // 'general' | 'toilet_female' | 'toilet_male'
capOf(pool: Pool, team: TeamCaps): number
poolCounts(open: SessionRecord[], usersById, types, team): Record<Pool, { active: number; cap: number }>
hasFreeSlot(pool: Pool, counts): boolean
validateCap(n: unknown): n is 1 | 2 | 3
```
Tests: female refused when the female pool is full while the male pool has
room, and vice versa; cap 2 → 3 admits a waiting agent; cap 3 → 1 with three
running shows 3/1 and ends nothing; cap is read at call time.

### `allowances.ts`
```ts
usedCount(type, todaySessions: SessionRecord[]): number      // non-voided
allowanceLeft(type, todaySessions): boolean                  // null allowance → true
```
Tests: 5th smoke allowed, 6th refused; 2nd prayer and 2nd meal refused; toilet
unlimited; voided sessions do not count.

### `budget.ts`
```ts
chargedMinutes(s: SessionRecord, type, now: Date): number   // 0 if voided or not budgeted; open → elapsed so far
usedToday(todaySessions, types, now): number
remaining(cfg, used: number): number                         // max(0, budget − used)
effectiveMax(type, remaining: number): number | null         // min(type max, remaining); null for toilet
```
Tests: every row of §5.1 from `seed-data`; 3-min smoke ending at 5 charges 5;
meal with 14 left is clamped to 14; meal 15 + prayer 10 = 25 → remaining 0;
toilet charges 0; voided charges 0; used 34 → remaining 0; an open session
counts its elapsed minutes ("budget ticking").

### `sessions.ts`
```ts
type Refusal = 'outside_hours' | 'not_on_floor' | 'on_leave' | 'allowance_used' | 'budget_exhausted' | 'pool_full'
canStart(i: { now; agent: { id; gender }; type; team; cfg;
              agentTodaySessions; teamOpenSessions; teamUsers; agentApprovedLeave })
  : { ok: true; pool: Pool; effectiveMaxMin: number | null } | { ok: false; reason: Refusal }
newSession(i, decision): SessionDraft                       // startedAt = now
endByAgent(s, now): SessionPatch                            // endedAt, endedBy 'agent', overrunMin
elapsedSeconds(s, now): number
overrunMinutes(s, type, endedAt): number
agentStatus(i: { now; openSession?; approvedLeave; types }): 'on_floor' | 'on_break' | 'overrun' | 'away' | 'on_leave'
buttonStates(i): Record<BreakTypeCode, 'available' | 'busy' | 'unavailable'>
```
Tests: check order (outside hours first; on break → not_on_floor; leave now →
on_leave; allowance before budget before pool); only pool_full maps to «مشغول»;
meal then prayer → smoke refused with budget_exhausted while toilet still
starts; effective max recorded at start; smoke overrun at 4:01 not at 4:00;
status precedence per A10.

### `sweep.ts`
```ts
type SweepAction = { sessionId; endedAt: Date; endedBy: 'system';
                     endReason: 'auto_end' | 'stale' | 'end_of_day'; stale: boolean; overrunMin: number }
planSweep(i: { now; openSessions; types; cfg }): SweepAction[]
```
For each open session take the earliest of start + autoEndAt (auto_end, or
stale for toilet) and that day's 16:00 (end_of_day); act if it is ≤ now.
Idempotent by construction: inputs are open sessions, outputs are fixed by
start times. Tests: auto-end at 10 / 20 / 25 with `endedAt = start + mark` even
when the sweep runs late; charges 10 / 20 / 25; stale toilet at 20 with 0
charge; 16:00 closes all types with the actual charge; meal started 15:58
costs 2; whichever mark comes first wins; nothing at 9:59; second run is a
no-op.

### `corrections.ts`
```ts
canCorrect(s, now, cfg): { ok: true } | { ok: false; reason: 'too_old' | 'voided' }
editEnd(i: { session; type; newEndedAt; note; editorId; now }): SessionPatch
voidSession(i: { session; note; editorId; now }): SessionPatch
```
Tests: A auto-ended at 10 corrected to 5 → charge 5, overrun 1, «معدّل»,
original 10 kept; second edit keeps the first original; empty note, end ≤
start, end in the future all refused; 8-day-old refused; void → charge 0,
allowance restored, slot freed if it was open.

### `leave.ts`
```ts
hourlyMinutes(from: 'HH:mm', to: 'HH:mm', cfg): number       // validates window
dailyMinutes(start: string, end: string, cfg): number         // working days × 8 × 60
requestInterval(r): { startsAt: Date; endsAt: Date }
overlaps(a, b): boolean                                       // half-open
findOverlap(candidate, existing: LeaveRecord[]): LeaveRecord | undefined   // pending + approved
validateSubmission(i: { input; existing; remainingMinutes; cfg; now })
  : { ok: true; minutes; interval } | { ok: false; error: 'exceeds_balance' | 'overlaps' | 'invalid_window' }
leaveStateAt(approved, now): 'none' | 'daily' | 'hourly'
leaveOnDate(approved, date, cfg): { hourlyMinutes: number; dailyCovers: boolean }
transition(r, action: 'approve' | 'reject' | 'cancel' | 'revoke', actor: Role): Status  // throws if not allowed
```
Tests: 14:00–16:00 = 120 min = 0.25 day; Fri–Sat daily = 0; Sun–Thu week =
40 h; Thu–Sun = 16 h; beyond balance refused; hourly/hourly overlap refused;
hourly inside daily refused; touching windows allowed; rejected/cancelled/
revoked ignored; only pending can be approved, rejected, cancelled; only
approved can be revoked; Team Lead can do none.

### `balance.ts`
```ts
annualMinutes(cfg): number                                    // 14 × 8 × 60
usedMinutes(approved, year): number
remainingMinutes(cfg, approved, year): number
committedRemaining(cfg, approvedAndPending, year): number     // Q21
toDays(minutes, cfg): number;  formatDays(minutes, cfg): string   // '13.75'
```
Tests: 14.00 → 13.75 after 2 h; 14.00 → 13.00 after one working day; year
filter; two decimals; revoked and rejected excluded.

### `summary.ts`
```ts
dailySummary(i: { date; agents; sessions; types; leave; cfg }): SummaryRow[]   // §9 metrics
toCsv(rows, headers): string                                  // quoted, CRLF; BOM added by the route
```
Tests: demo step 11 (A smoke 1 / 5 min / 1 overrun / edited; D 25 / 25; E 2 h);
stale excluded from auto-ended; voided excluded everywhere; CSV escapes commas
and quotes; Arabic preserved.

### Server layer (thin, for Phase 1+)
`src/server/sweep.ts` loads open sessions, calls `planSweep`, applies in one
transaction; called at the start of every session read/write and from a 5-s
interval in `instrumentation.ts`. Every server action: session → role →
`sweep` → load → domain → write in one transaction → audit.

### Kickoff test list → where it lives
| Required case | Module |
|---|---|
| every row of §5.1 | budget, sweep (from `seed-data`) |
| meal then prayer = 25, smoke refused | sessions, budget |
| 3-min smoke ending at 5 charges 5 | budget |
| meal with 14 left clamped to 14 | budget, sessions |
| cap 2 → 3 admits, never ends a running one | pools |
| female refused while male has room, and vice versa | pools, sessions |
| auto-end at 10 / 20 / 25 | sweep |
| stale toilet at 20 | sweep |
| 16:00 close | sweep |
| hourly 14:00–16:00 = 0.25 day | leave, balance |
| daily over Fri–Sat deducts 0 | leave |
| beyond balance blocked | leave, balance |
| overlapping request blocked | leave |
