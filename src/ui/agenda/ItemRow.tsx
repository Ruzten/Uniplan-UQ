import { clsx } from "clsx";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Clock, Pencil, Scale, Trash2 } from "lucide-react";
import { useState } from "react";
import { db } from "@/src/db/db";
import { dueTone } from "@/src/domain/agenda-summary";
import type { Item, Source, Subject } from "@/src/domain/schemas";
import { editRecord, removeRecord } from "@/src/sync/merge";
import { DueBlock } from "@/src/ui/agenda/DueBlock";
import {
  ITEM_TYPE_LABELS,
  ItemForm,
  type ItemFormValues,
} from "@/src/ui/agenda/ItemForm";

export const SOURCE_LABELS: Record<Source, string> = {
  manual: "Manual",
  sac: "SAC",
  classroom: "Classroom",
  moodle: "Aulas Virtuales",
};

type Props = {
  item: Item;
  subjects: readonly Subject[];
};

const buttonClass = "btn btn-sm btn-ghost";

export function ItemRow({ item, subjects }: Props) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const subject = subjects.find((entry) => entry.id === item.subjectId);

  async function save(values: ItemFormValues) {
    await editRecord(db, "items", item.id, values);
    setEditing(false);
  }

  if (editing) {
    return (
      <li data-item-id={item.id} className="card">
        <ItemForm
          label={`Editar: ${item.title}`}
          subjects={subjects}
          initial={item}
          submitLabel="Guardar"
          onSubmit={save}
          onCancel={() => setEditing(false)}
        />
      </li>
    );
  }

  return (
    <li
      data-item-id={item.id}
      className={clsx(
        "group flex items-center gap-4 rounded-card border border-border bg-surface py-3 pr-3 pl-4 hover:border-muted/40",
        item.done && "opacity-60",
      )}
    >
      <input
        type="checkbox"
        checked={item.done}
        aria-label={`Marcar como hecha: ${item.title}`}
        onChange={(event) =>
          void editRecord(db, "items", item.id, { done: event.target.checked })
        }
        className="check"
      />
      <DueBlock dueAt={item.dueAt} tone={dueTone(item, new Date())} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span
          className={clsx(
            "line-clamp-2 font-semibold break-words",
            item.done && "text-muted line-through",
          )}
        >
          {item.title}
        </span>
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
          <span className="badge border-accent/40 text-accent">
            {ITEM_TYPE_LABELS[item.type]}
          </span>
          <span className="truncate">{subject?.name ?? "Sin materia"}</span>
          {item.dueAt !== null && (
            <span className="flex shrink-0 items-center gap-1">
              <Clock aria-hidden="true" size={14} />
              {format(new Date(item.dueAt), "EEE d 'de' MMM, HH:mm", {
                locale: es,
              })}
            </span>
          )}
          {item.weightPct !== null && (
            <span className="flex shrink-0 items-center gap-1">
              <Scale aria-hidden="true" size={14} />
              Peso {item.weightPct}%
            </span>
          )}
        </span>
      </div>
      <span className="badge">{SOURCE_LABELS[item.source]}</span>
      {item.overrides.length > 0 && (
        <span className="badge border-warning/40 text-warning">editado</span>
      )}
      <div
        className={clsx(
          "flex items-center opacity-0 transition-opacity duration-150 ease-out group-focus-within:opacity-100 group-hover:opacity-100",
          confirming && "opacity-100",
        )}
      >
        <button
          type="button"
          onClick={() => setEditing(true)}
          className={buttonClass}
        >
          <Pencil aria-hidden="true" size={14} />
          Editar
        </button>
        {confirming ? (
          <button
            type="button"
            onClick={() => void removeRecord(db, "items", item.id)}
            className={clsx(buttonClass, "btn-danger")}
          >
            <Trash2 aria-hidden="true" size={14} />
            Confirmar eliminación
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className={buttonClass}
          >
            <Trash2 aria-hidden="true" size={14} />
            Eliminar
          </button>
        )}
      </div>
    </li>
  );
}
