import { clsx } from "clsx";
import type { GradeScale } from "@/src/domain/schemas";

type Props = {
  average: number;
  scale: GradeScale;
};

function position(value: number, scale: GradeScale): number {
  const span = scale.max - scale.min;
  if (span <= 0) return 0;
  return Math.min(1, Math.max(0, (value - scale.min) / span));
}

// Decorative: the numbers it shows are always written as text next to it.
export function ScaleBar({ average, scale }: Props) {
  const passing = average >= scale.pass;
  return (
    <div aria-hidden="true" className="flex flex-col gap-1">
      <div className="relative h-2 w-full rounded-full bg-surface-2">
        <div
          className={clsx(
            "absolute inset-y-0 left-0 w-full origin-left rounded-full",
            passing ? "bg-success/70" : "bg-warning/70",
          )}
          style={{ transform: `scaleX(${position(average, scale)})` }}
        />
        <div
          className="absolute -inset-y-1 w-0.5 rounded-full bg-text"
          style={{ left: `${position(scale.pass, scale) * 100}%` }}
        />
      </div>
      <div className="relative h-4 text-xs text-muted">
        <span className="absolute left-0">{scale.min}</span>
        <span
          className="absolute -translate-x-1/2"
          style={{ left: `${position(scale.pass, scale) * 100}%` }}
        >
          {scale.pass}
        </span>
        <span className="absolute right-0">{scale.max}</span>
      </div>
    </div>
  );
}
