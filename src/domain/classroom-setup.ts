const CLIENT_ID_PATTERN = /^[0-9]+-[a-z0-9]+\.apps\.googleusercontent\.com$/;

export type ClientIdCheck = "vacio" | "valido" | "sospechoso";

export function checkClientId(value: string): ClientIdCheck {
  const trimmed = value.trim();
  if (trimmed === "") return "vacio";
  return CLIENT_ID_PATTERN.test(trimmed) ? "valido" : "sospechoso";
}

// Text the owner of the Google Cloud project sends to a classmate.
export function invitationMessage(clientId: string): string {
  return [
    "Para conectar Uniplan UQ con Google Classroom:",
    "1. Abre Uniplan → Ajustes → Google Classroom y elige «Un compañero ya lo configuró».",
    "2. Envíame tu correo institucional para agregarte como usuario de prueba.",
    `3. Cuando te avise, pega este ID de cliente y pulsa «Conectar con Google»: ${clientId.trim()}`,
  ].join("\n");
}

// Text a classmate sends to the owner asking to be added.
export function accessRequestMessage(redirectUri: string): string {
  return [
    "Hola, quiero conectar Uniplan UQ con Classroom. Por favor agrega mi correo",
    "institucional como usuario de prueba: (escríbelo aquí)",
    `La URI de redirección es la misma para todos: ${redirectUri}`,
  ].join("\n");
}
