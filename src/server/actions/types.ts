export type ActionResult<E extends string = string> = { ok: true } | { ok: false; error: E };
