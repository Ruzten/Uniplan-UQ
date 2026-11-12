import { type FormEvent, useId, useState } from "react";
import { isoToLocalInput, localInputToIso } from "@/src/domain/agenda";
import type { Item, ItemType, Subject } from "@/src/domain/schemas";

export type ItemFormValues = {
  title: string;
  type: ItemType;
  subjectId: string | null;
  dueAt: string | null;
  weightPct: number | null;
  notes: string;
};

export const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  tarea: "Tarea",
  parcial: "Parcial",
  quiz: "Quiz",
  proyecto: "Proyecto",
  otro: "Otro",
};

const NO_SUBJECT = "";

type Props = {
  label: string;
  subjects: readonly Subject[];
  initial?: Item;
  submitLabel: string;
  onSubmit: (values: ItemFormValues) => Promise<void>;
  onCancel?: () => void;
};

const fieldClass = "field";

export function ItemForm({
  label,
  subjects,
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: Props) {
  const id = useId();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [type, setType] = useState<ItemType>(initial?.type ?? "tarea");
  const [subjectId, setSubjectId] = useState(initial?.subjectId ?? NO_SUBJECT);
  const [due, setDue] = useState(isoToLocalInput(initial?.dueAt ?? null));
  const [weight, setWeight] = useState(
    initial?.weightPct === null || initial?.weightPct === undefined
      ? ""
      : String(initial.weightPct),
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (title.trim() === "") {
      setError("El título es obligatorio");
      return;
    }
    const weightPct = weight.trim() === "" ? null : Number(weight);
    if (
      weightPct !== null &&
      (Number.isNaN(weightPct) || weightPct < 0 || weightPct > 100)
    ) {
      setError("El peso debe estar entre 0 y 100");
      return;
    }
    try {
      await onSubmit({
        title: title.trim(),
        type,
        subjectId: subjectId === NO_SUBJECT ? null : subjectId,
        dueAt: localInputToIso(due),
        weightPct,
        notes,
      });
      setError(null);
      if (initial === undefined) {
        setTitle("");
        setDue("");
        setWeight("");
        setNotes("");
      }
    } catch {
      setError("No se pudo guardar. Revisa los datos e intenta de nuevo.");
    }
  }

  return (
    <form
      aria-label={label}
      noValidate
      onSubmit={handleSubmit}
      className="flex flex-col gap-3"
    >
      <div className="grid grid-cols-12 gap-3">
        <label className="field-label col-span-8">
          <span className="text-sm text-muted">Título</span>
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            aria-describedby={error === null ? undefined : `${id}-error`}
            className={fieldClass}
          />
        </label>
        <label className="field-label col-span-4">
          <span className="text-sm text-muted">Tipo</span>
          <select
            value={type}
            onChange={(event) => setType(event.target.value as ItemType)}
            className={fieldClass}
          >
            {Object.entries(ITEM_TYPE_LABELS).map(([value, text]) => (
              <option key={value} value={value}>
                {text}
              </option>
            ))}
          </select>
        </label>
        <label className="field-label col-span-5">
          <span className="text-sm text-muted">Materia</span>
          <select
            value={subjectId}
            onChange={(event) => setSubjectId(event.target.value)}
            className={fieldClass}
          >
            <option value={NO_SUBJECT}>Sin materia</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field-label col-span-4">
          <span className="text-sm text-muted">Fecha y hora</span>
          <input
            type="datetime-local"
            value={due}
            onChange={(event) => setDue(event.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="field-label col-span-3">
          <span className="text-sm text-muted">Peso %</span>
          <input
            type="number"
            min={0}
            max={100}
            value={weight}
            onChange={(event) => setWeight(event.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="field-label col-span-12">
          <span className="text-sm text-muted">Notas</span>
          <input
            type="text"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className={fieldClass}
          />
        </label>
      </div>
      {error !== null && (
        <p id={`${id}-error`} role="alert" className="text-danger">
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
