// Spec §5.5 — Team Lead corrections: edit the end time or void, always with a note.
// Original values are kept; who ended the session is preserved (decision Q17) and the
// editor is recorded separately. Actions live on ended sessions only (design decision).

import { overrunMinutes } from "./sessions";
import type { AppConfig, BreakTypeConfig, EndedBy, SessionRecord } from "./types";

export type CorrectionRefusal = "voided" | "open" | "too_old";
export type EditError = CorrectionRefusal | "note_required" | "end_before_start" | "end_in_future";

export function canCorrect(s: SessionRecord, now: Date, cfg: AppConfig): { ok: true } | { ok: false; reason: CorrectionRefusal } {
  if (s.voided) return { ok: false, reason: "voided" };
  if (s.endedAt === null) return { ok: false, reason: "open" };
  const windowMs = cfg.correctionWindowDays * 24 * 60 * 60 * 1000;
  if (s.startedAt.getTime() < now.getTime() - windowMs) return { ok: false, reason: "too_old" };
  return { ok: true };
}

export interface EditPatch {
  endedAt: Date;
  overrunMin: number;
  editNote: string;
  editedById: string;
  editedAt: Date;
  originalEndedAt: Date;
  originalEndedBy: EndedBy | null;
}

export interface VoidPatch {
  voided: true;
  editNote: string;
  editedById: string;
  editedAt: Date;
  originalEndedAt: Date;
  originalEndedBy: EndedBy | null;
}

export function editEnd(i: {
  session: SessionRecord;
  type: BreakTypeConfig;
  newEndedAt: Date;
  note: string;
  editorId: string;
  now: Date;
  cfg: AppConfig;
}): { ok: true; patch: EditPatch } | { ok: false; error: EditError } {
  const gate = canCorrect(i.session, i.now, i.cfg);
  if (!gate.ok) return { ok: false, error: gate.reason };
  const note = i.note.trim();
  if (!note) return { ok: false, error: "note_required" };
  if (i.newEndedAt.getTime() <= i.session.startedAt.getTime()) return { ok: false, error: "end_before_start" };
  if (i.newEndedAt.getTime() > i.now.getTime()) return { ok: false, error: "end_in_future" };
  const edited: SessionRecord = { ...i.session, endedAt: i.newEndedAt };
  return {
    ok: true,
    patch: {
      endedAt: i.newEndedAt,
      overrunMin: overrunMinutes(edited, i.type, i.newEndedAt),
      editNote: note,
      editedById: i.editorId,
      editedAt: i.now,
      // The first edit freezes the original; later edits keep it.
      originalEndedAt: i.session.originalEndedAt ?? (i.session.endedAt as Date),
      originalEndedBy: i.session.originalEndedBy ?? i.session.endedBy,
    },
  };
}

export function voidSession(i: {
  session: SessionRecord;
  note: string;
  editorId: string;
  now: Date;
  cfg: AppConfig;
}): { ok: true; patch: VoidPatch } | { ok: false; error: EditError } {
  const gate = canCorrect(i.session, i.now, i.cfg);
  if (!gate.ok) return { ok: false, error: gate.reason };
  const note = i.note.trim();
  if (!note) return { ok: false, error: "note_required" };
  return {
    ok: true,
    patch: {
      voided: true,
      editNote: note,
      editedById: i.editorId,
      editedAt: i.now,
      originalEndedAt: i.session.originalEndedAt ?? (i.session.endedAt as Date),
      originalEndedBy: i.session.originalEndedBy ?? i.session.endedBy,
    },
  };
}
