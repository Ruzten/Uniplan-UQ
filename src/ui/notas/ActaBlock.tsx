import { type FormEvent, useState } from "react";
import { db } from "@/src/db/db";
import { addManualItem } from "@/src/db/repo";
import { localInputToIso } from "@/src/domain/agenda";
import type { Link } from "@/src/domain/classroom";
import type { Subject } from "@/src/domain/schemas";

type Props = {
  subject: Subject;
  links: readonly Link[];
};

const fieldClass = "field";

export function ActaBlock({ subject, links }: Props) {
  const [title, setTitle] = useState("");
  const [when, setWhen] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const headingId = `acta-${subject.id}`;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (title.trim() === "") {
      setError("Escribe un título para el parcial");
      setSaved(false);
      return;
    }
    await addManualItem(db, {
      title,
      type: "parcial",
      subjectId: subject.id,
      dueAt: localInputToIso(when),
    });
    setTitle("");
    setWhen("");
    setError(null);
    setSaved(true);
  }

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-3 rounded-control border border-accent/30 bg-accent/5 p-4"
    >
      <h3 id={headingId} className="card-title">
        Acta de concertación
      </h3>
      <ul className="flex flex-col gap-1">
        {links.map((link) => (
          <li key={`${link.url}-${link.title}`}>
            <a
              href={link.url}
              target="_blank"
              rel="noreferrer noopener"
              className="text-accent underline underline-offset-2 hover:opacity-80"
            >
              {link.title}
            </a>
          </li>
        ))}
      </ul>
      <form
        aria-label={`Agregar parcial a ${subject.name}`}
        noValidate
        onSubmit={handleSubmit}
        className="flex flex-col gap-2"
      >
        <div className="grid grid-cols-2 gap-2">
          <label className="field-label">
            <span className="text-sm text-muted">Título</span>
            <input
              type="text"
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                setSaved(false);
              }}
              className={fieldClass}
            />
          </label>
          <label className="field-label">
            <span className="text-sm text-muted">Fecha y hora</span>
            <input
              type="datetime-local"
              value={when}
              onChange={(event) => setWhen(event.target.value)}
              className={fieldClass}
            />
          </label>
        </div>
        {error !== null && (
          <p role="alert" className="text-danger">
            {error}
          </p>
        )}
        {saved && (
          <p role="status" className="text-success">
            Parcial agregado a la agenda
          </p>
        )}
        <div>
          <button type="submit" className="btn btn-primary">
            Agregar parcial
          </button>
        </div>
      </form>
    </section>
  );
}
