import type { ComponentType } from "react";

export type SettingsSection = {
  id: string;
  order: number;
  title: string;
  Section: ComponentType;
};

const modules = import.meta.glob<{ default: SettingsSection }>(
  "../ajustes/sections/*.tsx",
  { eager: true },
);

const SECTIONS: SettingsSection[] = Object.values(modules)
  .map((module) => module.default)
  .sort((a, b) => a.order - b.order);

export default function AjustesView() {
  if (SECTIONS.length === 0) {
    return <p className="empty">Aún no hay ajustes disponibles.</p>;
  }
  return (
    <div className="grid grid-cols-4 items-start gap-6">
      <nav
        aria-label="Índice de ajustes"
        className="sticky top-8 flex flex-col gap-1"
      >
        <p aria-hidden="true" className="eyebrow mb-2 px-3">
          En esta página
        </p>
        {SECTIONS.map(({ id, title }) => (
          <a
            key={id}
            href={`#ajustes-${id}`}
            className="rounded-control px-3 py-1 text-sm text-muted hover:bg-surface-2 hover:text-text"
          >
            {title}
          </a>
        ))}
      </nav>
      <div className="col-span-3 flex flex-col gap-6">
        {SECTIONS.map(({ id, title, Section }) => {
          const headingId = `ajustes-${id}`;
          return (
            <section key={id} aria-labelledby={headingId} className="card">
              <h2
                id={headingId}
                className="section-title mb-4 scroll-mt-8 border-b border-border pb-4"
              >
                {title}
              </h2>
              <Section />
            </section>
          );
        })}
      </div>
    </div>
  );
}
