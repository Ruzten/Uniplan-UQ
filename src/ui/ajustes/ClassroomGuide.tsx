import { useState } from "react";
import {
  accessRequestMessage,
  checkClientId,
  invitationMessage,
} from "@/src/domain/classroom-setup";
import { CopyField } from "@/src/ui/shared/CopyField";
import { ExternalAnchor } from "@/src/ui/shared/ExternalAnchor";

type Path = "companero" | "propio";

type Props = {
  clientId: string;
  redirectUri: string;
};

const SCOPES = [
  "classroom.courses.readonly",
  "classroom.coursework.me.readonly",
  "classroom.student-submissions.me.readonly",
  "classroom.courseworkmaterials.readonly",
  "classroom.announcements.readonly",
];

export function ClassroomGuide({ clientId, redirectUri }: Props) {
  const [path, setPath] = useState<Path>("companero");
  const validId = checkClientId(clientId) === "valido";

  return (
    <div className="flex flex-col gap-4">
      <fieldset className="grid grid-cols-2 gap-2">
        <legend className="mb-2 text-sm font-medium text-muted">
          ¿Quién configura Google Cloud?
        </legend>
        {(
          [
            [
              "companero",
              "Un compañero ya lo configuró",
              "Solo necesitas que te dé acceso y te pase el ID.",
            ],
            [
              "propio",
              "Lo configuro yo",
              "Una sola vez; luego invitas a tus compañeros.",
            ],
          ] as const
        ).map(([value, label, hint]) => (
          <label
            key={value}
            className="flex items-start gap-3 rounded-control border border-border bg-bg p-3 has-checked:border-accent"
          >
            <input
              type="radio"
              name="classroom-path"
              checked={path === value}
              onChange={() => setPath(value)}
              className="check mt-0.5"
            />
            <span className="flex flex-col">
              <span className="font-medium">{label}</span>
              <span className="text-sm text-muted">{hint}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {path === "companero" ? (
        <ol className="flex list-decimal flex-col gap-4 pl-5 marker:text-muted">
          <li>
            <div className="flex flex-col gap-2">
              <p>
                Envía esta solicitud a quien configuró Google Cloud, con tu
                correo institucional, para que te agregue como usuario de
                prueba.
              </p>
              <CopyField
                label="Solicitud de acceso"
                value={accessRequestMessage(redirectUri)}
                multiline
                buttonLabel="Copiar solicitud"
              />
            </div>
          </li>
          <li>Cuando te confirme, pega arriba el ID de cliente que te pasó.</li>
          <li>
            Pulsa <strong>Conectar con Google</strong> y luego{" "}
            <strong>Sincronizar ahora</strong>.
          </li>
        </ol>
      ) : (
        <ol className="flex list-decimal flex-col gap-3 pl-5 marker:text-muted">
          <li>
            Crea un proyecto en{" "}
            <ExternalAnchor href="https://console.cloud.google.com/projectcreate">
              Google Cloud
            </ExternalAnchor>{" "}
            y habilita la{" "}
            <ExternalAnchor href="https://console.cloud.google.com/apis/library/classroom.googleapis.com">
              Google Classroom API
            </ExternalAnchor>
            .
          </li>
          <li>
            En la{" "}
            <ExternalAnchor href="https://console.cloud.google.com/auth/overview">
              pantalla de consentimiento
            </ExternalAnchor>{" "}
            elige usuarios externos y estado «en pruebas». Agrega tu correo
            institucional como usuario de prueba y estos alcances de solo
            lectura:
            <span className="mt-1 block font-mono text-xs text-muted">
              {SCOPES.join(" · ")}
            </span>
          </li>
          <li>
            En{" "}
            <ExternalAnchor href="https://console.cloud.google.com/auth/clients">
              Clientes
            </ExternalAnchor>{" "}
            crea un ID de cliente de tipo «Aplicación web» y agrega como URI de
            redirección autorizada:
            <span className="mt-2 block">
              <CopyField label="Tu URI de redirección" value={redirectUri} />
            </span>
          </li>
          <li>
            Copia el ID de cliente (termina en
            <code className="font-mono"> .apps.googleusercontent.com</code>),
            pégalo arriba y conéctate. No uses el secreto del cliente.
          </li>
        </ol>
      )}

      {path === "propio" && (
        <section
          aria-labelledby="classroom-invitar"
          className="flex flex-col gap-3 rounded-control border border-accent/30 bg-accent/5 p-4"
        >
          <h4 id="classroom-invitar" className="card-title">
            Invitar compañeros
          </h4>
          <p className="text-sm text-muted">
            Todos comparten la misma URI de redirección, así que por cada
            compañero solo agrega su correo como usuario de prueba (máximo 100).
            Luego envíale este mensaje.
          </p>
          {validId ? (
            <CopyField
              label="Mensaje para tus compañeros"
              value={invitationMessage(clientId)}
              multiline
              buttonLabel="Copiar mensaje"
            />
          ) : (
            <p className="text-sm text-muted">
              Pega primero un ID de cliente válido para generar el mensaje.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
