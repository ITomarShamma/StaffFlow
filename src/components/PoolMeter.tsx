// Segmented pool meter: one 26×10 segment per slot, filled with the accent (design).
// When the cap was lowered below the running count the meter shows e.g. 3/2 fully filled (decision A12).

export function PoolMeter({ label, active, cap, testId }: { label: string; active: number; cap: number; testId: string }) {
  return (
    <div className="flex items-center gap-2.5 whitespace-nowrap" data-testid={testId}>
      <span className="font-medium">{label}</span>
      <span className="flex gap-[3px]">
        {Array.from({ length: cap }, (_, i) => (
          <span key={i} className={`w-[26px] h-2.5 rounded-sm ${i < active ? "bg-indigo-600" : "bg-surface-2"}`} />
        ))}
      </span>
      <span dir="ltr" className="text-lg font-semibold tabular-nums" data-testid={`${testId}-count`}>
        {active}/{cap}
      </span>
    </div>
  );
}
