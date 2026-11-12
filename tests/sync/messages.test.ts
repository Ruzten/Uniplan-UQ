import { describe, expect, it, vi } from "vitest";
import { handleMessage } from "@/src/sync/messages";

describe("handleMessage", () => {
  it("resolves pong for a ping with a registered handler", async () => {
    const result = await handleMessage(
      { type: "ping" },
      { ping: async () => "pong" },
    );
    expect(result).toEqual({ ok: true, data: "pong" });
  });

  it("rejects an unknown type without invoking any handler", async () => {
    const ping = vi.fn(async () => "pong");
    const result = await handleMessage({ type: "nope" }, { ping });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("unknown_message");
      expect(typeof result.error.message).toBe("string");
    }
    expect(ping).not.toHaveBeenCalled();
  });

  it("rejects values that are not objects", async () => {
    const ping = vi.fn(async () => "pong");
    for (const raw of [null, undefined, "ping", 42, []]) {
      const result = await handleMessage(raw, { ping });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("unknown_message");
      }
    }
    expect(ping).not.toHaveBeenCalled();
  });

  it("answers not_implemented for a valid type without handler", async () => {
    const result = await handleMessage({ type: "reminders/check" }, {});
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("not_implemented");
    }
  });

  it("turns a thrown error into handler_error with its message", async () => {
    const result = await handleMessage(
      { type: "ping" },
      {
        ping: async () => {
          throw new Error("boom");
        },
      },
    );
    expect(result).toEqual({
      ok: false,
      error: { code: "handler_error", message: "boom" },
    });
  });
});
