// Status → token classes (design: 4 px stripe on the start edge, tinted tile, filled chip).
// Full class names are spelled out so Tailwind can find them.

import type { AgentStatus } from "@/domain/types";

export const statusTheme: Record<AgentStatus, { stripe: string; tint: string; chip: string }> = {
  on_floor: { stripe: "bg-floor", tint: "bg-floor-tint", chip: "bg-floor" },
  on_break: { stripe: "bg-break", tint: "bg-break-tint", chip: "bg-break" },
  overrun: { stripe: "bg-overrun", tint: "bg-overrun-tint", chip: "bg-overrun" },
  on_leave: { stripe: "bg-leave", tint: "bg-leave-tint", chip: "bg-leave" },
  away: { stripe: "bg-away", tint: "bg-away-tint", chip: "bg-away" },
};
