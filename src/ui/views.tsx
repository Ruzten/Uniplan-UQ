import {
  CalendarDays,
  GraduationCap,
  type LucideIcon,
  Network,
  Route,
  Settings,
} from "lucide-react";
import type { ComponentType } from "react";
import { VIEW_IDS, type ViewId } from "@/src/domain/schemas";

export type ViewEntry = {
  id: ViewId;
  label: string;
  icon: LucideIcon;
  description: string;
};

export const VIEWS: readonly ViewEntry[] = [
  {
    id: "agenda",
    label: "Agenda",
    icon: CalendarDays,
    description: "Tareas, parciales y horario de la semana.",
  },
  {
    id: "notas",
    label: "Notas",
    icon: GraduationCap,
    description: "Notas de las materias que estás cursando.",
  },
  {
    id: "pensum",
    label: "Pensum",
    icon: Network,
    description: "Tu avance en el plan de estudios.",
  },
  {
    id: "ruta",
    label: "Ruta",
    icon: Route,
    description: "Materias sugeridas para tu próxima matrícula.",
  },
  {
    id: "ajustes",
    label: "Ajustes",
    icon: Settings,
    description: "Sincronización, escala, recordatorios y respaldo.",
  },
];

export function resolveViewId(value: unknown): ViewId {
  const match = VIEW_IDS.find((id) => id === value);
  return match ?? "agenda";
}

const modules = import.meta.glob<{ default: ComponentType }>("./views/*.tsx", {
  eager: true,
});

function UnderConstruction() {
  return <p className="text-muted">Vista en construcción.</p>;
}

export function viewComponent(id: ViewId): ComponentType {
  return modules[`./views/${id}.tsx`]?.default ?? UnderConstruction;
}
