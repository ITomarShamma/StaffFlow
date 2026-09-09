// One process, one writer: every session-touching write (start, sweep, cap change,
// correction) runs inside this async mutex so a check-then-insert can never race
// another for the last slot in a pool (decision A14).

type G = typeof globalThis & { __sfLock?: Promise<unknown> };
const g = globalThis as G;
g.__sfLock ??= Promise.resolve();

export function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = (g.__sfLock as Promise<unknown>).then(fn, fn);
  g.__sfLock = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}
