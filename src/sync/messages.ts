import { browser } from "wxt/browser";
import { z } from "zod";

export type ErrorCode =
  | "unknown_message"
  | "not_implemented"
  | "handler_error"
  | "invalid_backup"
  | "auth_required"
  | "classroom_http_error";

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: ErrorCode; message: string } };

export const sacTableSchema = z.object({
  headers: z.array(z.string()),
  rows: z.array(z.array(z.string())),
});
export type SacTable = z.infer<typeof sacTableSchema>;

export const sacCaptureSchema = z.object({
  url: z.string(),
  title: z.string(),
  capturedAt: z.string(),
  tables: z.array(sacTableSchema),
  texts: z.array(z.string()).default([]),
});
export type SacCapture = z.infer<typeof sacCaptureSchema>;

export const messageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("ping") }),
  z.object({ type: z.literal("sac/import"), payload: sacCaptureSchema }),
  z.object({ type: z.literal("reminders/check") }),
]);
export type Message = z.infer<typeof messageSchema>;
export type MessageType = Message["type"];

export type Handlers = {
  [K in MessageType]?: (
    message: Extract<Message, { type: K }>,
  ) => Promise<unknown>;
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function handleMessage(
  raw: unknown,
  handlers: Handlers,
): Promise<Result<unknown>> {
  const parsed = messageSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: "unknown_message",
        message: "El mensaje no cumple el contrato",
      },
    };
  }
  const message = parsed.data;
  const handler = handlers[message.type] as
    | ((message: Message) => Promise<unknown>)
    | undefined;
  if (handler === undefined) {
    return {
      ok: false,
      error: {
        code: "not_implemented",
        message: `Sin manejador para ${message.type}`,
      },
    };
  }
  try {
    const data = await handler(message);
    return { ok: true, data };
  } catch (error) {
    return {
      ok: false,
      error: { code: "handler_error", message: errorMessage(error) },
    };
  }
}

export async function sendMessage(message: Message): Promise<Result<unknown>> {
  return (await browser.runtime.sendMessage(message)) as Result<unknown>;
}

export function registerRouter(handlers: Handlers): void {
  browser.runtime.onMessage.addListener((raw, _sender, sendResponse) => {
    void handleMessage(raw, handlers).then(sendResponse);
    return true;
  });
}
