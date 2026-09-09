// Server entry hook: runs the sweep on an interval (CLAUDE.md rule 9) so auto-end, stale
// release and the 16:00 close happen even when nobody is looking at a screen.

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { runSweep } = await import("./server/sweep");
  const { loadConfig } = await import("./server/config");
  type G = typeof globalThis & { __sfSweepTimer?: ReturnType<typeof setInterval> };
  const g = globalThis as G;
  if (g.__sfSweepTimer) clearInterval(g.__sfSweepTimer);
  let everyMs = 5000;
  try {
    everyMs = (await loadConfig()).boardRefreshS * 1000;
  } catch {
    // database not ready yet (first run before db:reset) — keep the default
  }
  const tick = async () => {
    try {
      await runSweep();
    } catch (e) {
      console.error("[sweep]", e);
    }
  };
  g.__sfSweepTimer = setInterval(tick, everyMs);
  g.__sfSweepTimer.unref?.();
}
