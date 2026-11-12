import { clsx } from "clsx";
import { useId, useState } from "react";
import { formatScore, type SubjectAverage } from "@/src/domain/grades";
import { projectedFinal } from "@/src/domain/grades-summary";
import type { GradeScale } from "@/src/domain/schemas";

type Props = {
  summary: SubjectAverage;
  scale: GradeScale;
};

export function GradeSimulator({ summary, scale }: Props) {
  const id = useId();
  const [value, setValue] = useState("");
  const hypothetical = Number(value.replace(",", "."));
  const valid =
    value.trim() !== "" &&
    !Number.isNaN(hypothetical) &&
    hypothetical >= scale.min &&
    hypothetical <= scale.max;
  const projected = valid ? projectedFinal(summary, hypothetical) : null;

  return (
    <div className="flex flex-col gap-2 rounded-control border border-border bg-bg p-3">
      <label htmlFor={id} className="text-sm font-medium text-muted">
        ¿Y si saco en lo restante…?
      </label>
      <div className="flex items-center gap-3">
        <input
          id={id}
          type="number"
          min={scale.min}
          max={scale.max}
          step="0.1"
          value={value}
          placeholder={String(scale.pass)}
          onChange={(event) => setValue(event.target.value)}
          className="field w-24"
        />
        <p aria-live="polite" className="text-sm">
          {projected === null ? (
            <span className="text-muted">
              Escribe una nota entre {scale.min} y {scale.max}.
            </span>
          ) : (
            <>
              Terminarías con{" "}
              <span
                className={clsx(
                  "font-mono font-bold",
                  projected >= scale.pass ? "text-success" : "text-warning",
                )}
              >
                {formatScore(projected)}
              </span>{" "}
              {projected >= scale.pass ? "y pasas" : "y no alcanzas"}
            </>
          )}
        </p>
      </div>
    </div>
  );
}
