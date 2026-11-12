import { type FormEvent, useState } from "react";
import type { Grade } from "@/src/domain/schemas";

export type GradeFormValues = {
  label: string;
  score: number;
  maxScore: number;
  weightPct: number | null;
};

type Props = {
  label: string;
  defaultMax: number;
  initial?: Grade;
  submitLabel: string;
  onSubmit: (values: GradeFormValues) => Promise<void>;
  onCancel?: () => void;
};

const fieldClass = "field";

function validate(
  label: string,
  score: string,
  max: string,
  weight: string,
): GradeFormValues | string {
  if (label.trim() === "") {
    return "La etiqueta es obligatoria";
  }
  const scoreValue = Number(score);
  if (score.trim() === "" || Number.isNaN(scoreValue) || scoreValue < 0) {
    return "La nota debe ser un número mayor o igual a 0";
  }
  const maxValue = Number(max);
  if (max.trim() === "" || Number.isNaN(maxValue) || maxValue <= 0) {
    return "El máximo debe ser mayor que 0";
  }
  if (scoreValue > maxValue) {
    return "La nota no puede superar el máximo";
  }
  const weightValue = weight.trim() === "" ? null : Number(weight);
  if (
    weightValue !== null &&
    (Number.isNaN(weightValue) || weightValue < 0 || weightValue > 100)
  ) {
    return "El peso debe estar entre 0 y 100";
  }
  return {
    label: label.trim(),
    score: scoreValue,
    maxScore: maxValue,
    weightPct: weightValue,
  };
}

export function GradeForm({
  label,
  defaultMax,
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: Props) {
  const [name, setName] = useState(initial?.label ?? "");
  const [score, setScore] = useState(
    initial === undefined || initial.score === null
      ? ""
      : String(initial.score),
  );
  const [max, setMax] = useState(String(initial?.maxScore ?? defaultMax));
  const [weight, setWeight] = useState(
    initial?.weightPct === null || initial?.weightPct === undefined
      ? ""
      : String(initial.weightPct),
  );
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validate(name, score, max, weight);
    if (typeof result === "string") {
      setError(result);
      return;
    }
    try {
      await onSubmit(result);
      setError(null);
      if (initial === undefined) {
        setName("");
        setScore("");
        setWeight("");
      }
    } catch {
      setError("No se pudo guardar la nota. Revisa los datos.");
    }
  }

  return (
    <form
      aria-label={label}
      noValidate
      onSubmit={handleSubmit}
      className="flex flex-col gap-2"
    >
      <div className="grid grid-cols-5 items-end gap-3">
        <label className="field-label col-span-2">
          <span className="text-sm text-muted">Etiqueta</span>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="field-label">
          <span className="text-sm text-muted">Nota</span>
          <input
            type="number"
            min={0}
            step="any"
            value={score}
            onChange={(event) => setScore(event.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="field-label">
          <span className="text-sm text-muted">Máximo</span>
          <input
            type="number"
            min={0}
            step="any"
            value={max}
            onChange={(event) => setMax(event.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="field-label">
          <span className="text-sm text-muted">Peso %</span>
          <input
            type="number"
            min={0}
            max={100}
            step="any"
            value={weight}
            onChange={(event) => setWeight(event.target.value)}
            className={fieldClass}
          />
        </label>
      </div>
      {error !== null && (
        <p role="alert" className="text-danger">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button type="submit" className="btn btn-primary">
          {submitLabel}
        </button>
        {onCancel !== undefined && (
          <button type="button" onClick={onCancel} className="btn">
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
