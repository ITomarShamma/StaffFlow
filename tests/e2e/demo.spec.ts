// Spec §10 — the demo script, steps 0–11, end to end in demo mode. One browser, one
// context per person. Waiting is replaced by the Team Lead's forward clock jumps.

import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import Database from "better-sqlite3";
import { SEED_USERS } from "../../prisma/seed-data";

const PASSWORD = "Demo1234";
const DAY = "2026-09-15"; // Tuesday — see scripts/e2e-server.mjs
const TOMORROW = "2026-09-16";
const DAY_AFTER = "2026-09-17"; // Thursday
const name = (username: string) => SEED_USERS.find((u) => u.username === username)!.nameAr;

// Cast per spec §10
const A = "agent01";
const B = "agent02";
const C = "agent03";
const M1 = "agent04";
const D = "agent06";
const E = "agent07";
const G = "agent08";
const F1 = "agent10";
const F2 = "agent11";

async function login(browser: Browser, username: string): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("/login");
  await page.locator('input[name="username"]').fill(username);
  await page.locator('input[name="password"]').fill(PASSWORD);
  await page.getByRole("button", { name: "دخول" }).click();
  await page.waitForURL(/\/(agent|lead|manager)$/);
  return { context, page };
}

/** Team Lead: jump the demo clock forward to HH:mm today. */
async function jumpTo(lead: Page, time: string) {
  await lead.goto("/lead");
  await lead.getByTestId("demo-badge").click();
  await lead.getByTestId("demo-time").fill(time);
  await lead.getByTestId("demo-jump").click();
  await expect(lead.getByTestId("demo-time")).toBeHidden();
}

async function nextDay(lead: Page) {
  await lead.goto("/lead");
  await lead.getByTestId("demo-badge").click();
  await lead.getByTestId("demo-next-day").click();
  await expect(lead.getByTestId("demo-next-day")).toBeHidden();
}

const tile = (page: Page, username: string) => page.locator(`[data-agent-name="${name(username)}"]`);
const pool = (page: Page, id: string) => page.getByTestId(`${id}-count`);

async function board(page: Page) {
  await page.goto("/lead");
  await expect(page.getByTestId("pool-general-count")).toBeVisible();
}

test("spec §10 demo script, steps 0–11", async ({ browser }) => {
  // ---- 0. Roles and 403 ----
  const a = await login(browser, A);
  await expect(a.page).toHaveURL(/\/agent$/);
  const forbidden = await a.page.goto("/manager");
  expect(forbidden?.status()).toBe(403);
  await expect(a.page.getByTestId("forbidden")).toContainText("غير مصرح لك بالوصول إلى هذه الصفحة");
  const forbiddenLead = await a.page.goto("/lead/requests");
  expect(forbiddenLead?.status()).toBe(403);

  const lead = (await login(browser, "lead")).page;
  const manager = (await login(browser, "manager")).page;
  await expect(lead).toHaveURL(/\/lead$/);
  await expect(manager).toHaveURL(/\/manager$/);

  // ---- 1. A clicks Smoke → board: A amber, General 1/2 ----
  await jumpTo(lead, "08:40");
  await a.page.goto("/agent");
  await a.page.getByTestId("break-smoke").click();
  await expect(a.page.getByTestId("status-card")).toHaveAttribute("data-status", "on_break");
  await expect(a.page.getByTestId("countdown")).toContainText("/ 03:00");
  await board(lead);
  await expect(tile(lead, A)).toHaveAttribute("data-status", "on_break");
  await expect(pool(lead, "pool-general")).toHaveText("1/2");

  // ---- 2. B clicks Meal → General 2/2 ----
  const b = await login(browser, B);
  await b.page.getByTestId("break-meal").click();
  await expect(b.page.getByTestId("status-card")).toHaveAttribute("data-status", "on_break");
  await board(lead);
  await expect(pool(lead, "pool-general")).toHaveText("2/2");

  // ---- 3. C clicks Prayer → unavailable, "Busy — try again shortly"; board still 2/2 ----
  const c = await login(browser, C);
  await expect(c.page.getByTestId("break-prayer")).toHaveAttribute("data-state", "busy");
  await expect(c.page.getByTestId("break-prayer")).toContainText("مشغول — حاول بعد قليل");
  await expect(c.page.getByTestId("break-prayer")).toBeDisabled();
  await board(lead);
  await expect(pool(lead, "pool-general")).toHaveText("2/2");

  // ---- 4. Team Lead sets cap 3 → C allowed, General 3/3, audit log records the change ----
  await lead.getByTestId("cap-3").click();
  await lead.getByTestId("cap-save").click();
  await expect(pool(lead, "pool-general")).toHaveText("2/3");
  await c.page.reload();
  await expect(c.page.getByTestId("break-prayer")).toHaveAttribute("data-state", "available");
  await c.page.getByTestId("break-prayer").click();
  await expect(c.page.getByTestId("status-card")).toHaveAttribute("data-status", "on_break");
  await board(lead);
  await expect(pool(lead, "pool-general")).toHaveText("3/3");
  const db = new Database("data/e2e.db", { readonly: true });
  const capChanges = db.prepare(`SELECT "before", "after" FROM "AuditLog" WHERE action = 'cap_changed'`).all() as { before: string; after: string }[];
  expect(capChanges).toHaveLength(1);
  expect(JSON.parse(capChanges[0]!.before)).toEqual({ capGeneral: 2 });
  expect(JSON.parse(capChanges[0]!.after)).toEqual({ capGeneral: 3 });

  // ---- 5. Toilet pools by gender ----
  const f1 = await login(browser, F1);
  await f1.page.getByTestId("break-toilet").click();
  await expect(f1.page.getByTestId("status-card")).toHaveAttribute("data-status", "on_break");
  await board(lead);
  await expect(pool(lead, "pool-toilet-f")).toHaveText("1/1");
  const f2 = await login(browser, F2);
  await expect(f2.page.getByTestId("break-toilet")).toHaveAttribute("data-state", "busy");
  await expect(f2.page.getByTestId("break-toilet")).toBeDisabled();
  const m1 = await login(browser, M1);
  await expect(m1.page.getByTestId("break-toilet")).toHaveAttribute("data-state", "available");
  await m1.page.getByTestId("break-toilet").click();
  await expect(m1.page.getByTestId("status-card")).toHaveAttribute("data-status", "on_break");
  await board(lead);
  await expect(pool(lead, "pool-toilet-m")).toHaveText("1/2");
  await expect(pool(lead, "pool-toilet-f")).toHaveText("1/1");

  // ---- 6. A passes 4 min → red; never returns → auto-ended at 10, flagged, "10 / 25" ----
  await jumpTo(lead, "08:45");
  await board(lead);
  await expect(tile(lead, A)).toHaveAttribute("data-status", "overrun");
  await a.page.goto("/agent");
  await expect(a.page.getByTestId("status-card")).toHaveAttribute("data-status", "overrun");
  await jumpTo(lead, "08:51");
  await board(lead);
  await expect(tile(lead, A)).toHaveAttribute("data-status", "on_floor");
  await expect(tile(lead, A)).toHaveAttribute("data-budget", "10");
  await expect(tile(lead, A)).toContainText("إنهاء تلقائي");

  // ---- 7. Team Lead corrects A's end to 5 min with a note → "5 / 25", edited ----
  await tile(lead, A).click();
  await expect(lead.getByTestId("corrections-dialog")).toBeVisible();
  await lead.getByTestId("edit-end").click();
  await lead.getByTestId("end-time").fill("08:45");
  await expect(lead.getByTestId("save-correction")).toBeDisabled();
  await lead.getByTestId("note").fill("عاد إلى العمل قبل تسجيل الإنهاء");
  await lead.getByTestId("save-correction").click();
  await expect(lead.getByTestId("correction-budget")).toHaveText("5 / 25");
  await expect(lead.getByTestId("correction-row").first()).toContainText("معدّل");
  await lead.getByTestId("close-corrections").click();
  await board(lead);
  await expect(tile(lead, A)).toHaveAttribute("data-budget", "5");
  await expect(tile(lead, A)).toContainText("معدّل");

  // ---- 8. D: Meal (15) then Prayer (10) → 25 / 25 → Smoke unavailable, Toilet still works ----
  await jumpTo(lead, "09:00");
  const d = await login(browser, D);
  await d.page.getByTestId("break-meal").click();
  await expect(d.page.getByTestId("status-card")).toHaveAttribute("data-status", "on_break");
  await jumpTo(lead, "09:15");
  await d.page.goto("/agent");
  await d.page.getByTestId("back-on-floor").click();
  await expect(d.page.getByTestId("status-card")).toHaveAttribute("data-status", "on_floor");
  await jumpTo(lead, "09:16");
  await d.page.goto("/agent");
  await d.page.getByTestId("break-prayer").click();
  await expect(d.page.getByTestId("status-card")).toHaveAttribute("data-status", "on_break");
  await expect(d.page.getByTestId("countdown")).toContainText("/ 10:00");
  await jumpTo(lead, "09:26");
  await d.page.goto("/agent");
  await d.page.getByTestId("back-on-floor").click();
  await expect(d.page.getByTestId("status-card")).toHaveAttribute("data-status", "on_floor");
  await expect(d.page.getByTestId("break-smoke")).toHaveAttribute("data-state", "unavailable");
  await expect(d.page.getByTestId("break-smoke")).toContainText("غير متاح اليوم");
  await expect(d.page.getByTestId("break-toilet")).toHaveAttribute("data-state", "available");
  await board(lead);
  await expect(tile(lead, D)).toHaveAttribute("data-budget", "25");

  // ---- 9. E: hourly leave 14:00–16:00 → lead sees, cannot decide → manager approves → away at 14:00, 13.75 ----
  const e = await login(browser, E);
  await e.page.goto("/agent/leave");
  await expect(e.page.getByTestId("balance-days")).toHaveText("14.00");
  await e.page.getByTestId("kind-hourly").click();
  await e.page.locator('input[name="date"]').fill(DAY);
  await e.page.locator('input[name="from"]').fill("14:00");
  await e.page.locator('input[name="to"]').fill("16:00");
  await e.page.locator('input[name="reason"]').fill("موعد طبي");
  await e.page.getByRole("button", { name: "إرسال" }).click();
  await expect(e.page.locator('[data-testid="my-request"][data-status="pending"]')).toHaveCount(1);
  await lead.goto("/lead/requests");
  await expect(lead.locator('[data-testid="request-row"][data-status="pending"]')).toHaveCount(1);
  await expect(lead.getByTestId("approve")).toHaveCount(0);
  await manager.goto("/manager/decisions");
  const eRow = manager.locator(`[data-testid="pending-row"][data-agent="${name(E)}"]`);
  await expect(eRow).toBeVisible();
  await eRow.getByTestId("approve").click();
  await expect(eRow).toHaveCount(0);
  await e.page.goto("/agent/leave");
  await expect(e.page.getByTestId("balance-days")).toHaveText("13.75");
  await jumpTo(lead, "14:00");
  await board(lead);
  await expect(tile(lead, E)).toHaveAttribute("data-status", "away");
  await expect(tile(lead, E)).toContainText("في إجازة ساعية");

  // ---- 10. G: daily leave for tomorrow → approved → tomorrow's board shows G on leave, 13.00 ----
  const g = await login(browser, G);
  await g.page.goto("/agent/leave");
  await g.page.getByTestId("kind-daily").click();
  await g.page.locator('input[name="startDate"]').fill(TOMORROW);
  await g.page.locator('input[name="endDate"]').fill(TOMORROW);
  await g.page.locator('input[name="reason"]').fill("ظرف عائلي");
  await g.page.getByRole("button", { name: "إرسال" }).click();
  await expect(g.page.locator('[data-testid="my-request"][data-status="pending"]')).toHaveCount(1);
  await manager.goto("/manager/decisions");
  const gRow = manager.locator(`[data-testid="pending-row"][data-agent="${name(G)}"]`);
  await gRow.getByTestId("approve").click();
  await expect(gRow).toHaveCount(0);
  await g.page.goto("/agent/leave");
  await expect(g.page.getByTestId("balance-days")).toHaveText("13.00");
  await nextDay(lead);
  await board(lead);
  await expect(tile(lead, G)).toHaveAttribute("data-status", "on_leave");
  await expect(tile(lead, G)).toContainText("في إجازة");
  await manager.goto("/manager");
  await expect(tile(manager, G)).toHaveAttribute("data-status", "on_leave");
  await expect(manager.getByTestId("cap-3")).toHaveCount(0);

  // ---- 11. Manager: today's summary → A: smoke 1, 5 min, 1 overrun, edited; D 25/25; E 2 h → CSV with BOM ----
  await manager.goto(`/manager/summary?date=${DAY}`);
  const aRow = manager.locator(`[data-testid="summary-row"][data-agent="${name(A)}"]`);
  await expect(aRow.locator('[data-col="smoke-n"]')).toHaveText("1");
  await expect(aRow.locator('[data-col="smoke-min"]')).toHaveText("5");
  await expect(aRow.locator('[data-col="overruns"]')).toHaveText("1");
  await expect(aRow.locator('[data-col="edited"]')).toHaveText("1");
  const dRow = manager.locator(`[data-testid="summary-row"][data-agent="${name(D)}"]`);
  await expect(dRow.locator('[data-col="budget"]')).toHaveText("25 / 25");
  const eSum = manager.locator(`[data-testid="summary-row"][data-agent="${name(E)}"]`);
  await expect(eSum.locator('[data-col="leave-h"]')).toHaveText("2");
  const csv = await manager.request.get(`/manager/summary/csv?date=${DAY}`);
  expect(csv.status()).toBe(200);
  expect(csv.headers()["content-type"]).toContain("text/csv");
  expect(csv.headers()["content-disposition"]).toContain(`staffflow-${DAY}.csv`);
  const body = await csv.body();
  expect(body[0]).toBe(0xef);
  expect(body[1]).toBe(0xbb);
  expect(body[2]).toBe(0xbf);
  const text = body.toString("utf8").slice(1);
  expect(text.split("\r\n")[0]).toContain("الموظف");
  expect(text).toContain(name(A));
  expect(text).toMatch(new RegExp(`${name(A)},5/25,1,5,`));

  // Balances page for the year
  await manager.goto("/manager/balances");
  await expect(manager.locator(`[data-testid="balance-row"][data-agent="${name(E)}"] [data-col="remaining"]`)).toHaveText("13.75");
  await expect(manager.locator(`[data-testid="balance-row"][data-agent="${name(G)}"] [data-col="remaining"]`)).toHaveText("13.00");

  // The CSV route is a manager-only route handler
  const agentCsv = await a.context.request.get(`/manager/summary/csv?date=${DAY}`);
  expect(agentCsv.status()).toBe(403);

  // ---- Team Lead leave (decision 2026-09-10): requests like an agent, decided by the manager, shown on the manager's board ----
  await lead.goto("/lead/leave");
  await expect(lead.getByTestId("balance-days")).toHaveText("14.00");
  await lead.getByTestId("kind-hourly").click();
  await lead.locator('input[name="date"]').fill(DAY_AFTER);
  await lead.locator('input[name="from"]').fill("08:00");
  await lead.locator('input[name="to"]').fill("12:00");
  await lead.locator('input[name="reason"]').fill("معاملة رسمية");
  await lead.getByRole("button", { name: "إرسال" }).click();
  await expect(lead.locator('[data-testid="my-request"][data-status="pending"]')).toHaveCount(1);
  await manager.goto("/manager/decisions");
  const leadRow = manager.locator(`[data-testid="pending-row"][data-agent="${name("lead")}"]`);
  await leadRow.getByTestId("approve").click();
  await expect(leadRow).toHaveCount(0);
  await lead.goto("/lead/leave");
  await expect(lead.getByTestId("balance-days")).toHaveText("13.50");
  await manager.goto("/manager");
  const leadTile = manager.locator('[data-kind="team_lead"]');
  await expect(leadTile).toHaveCount(1);
  await expect(leadTile).toHaveAttribute("data-agent-name", name("lead"));
  await board(lead);
  await expect(lead.locator('[data-kind="team_lead"]')).toHaveCount(0);
  await manager.goto("/manager/balances");
  await expect(manager.locator(`[data-testid="balance-row"][data-agent="${name("lead")}"] [data-col="remaining"]`)).toHaveText("13.50");
  db.close();
});
