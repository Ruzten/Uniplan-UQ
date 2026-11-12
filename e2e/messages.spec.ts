import { expect, test } from "./fixtures";

type ChromeLike = {
  chrome: { runtime: { sendMessage(m: unknown): Promise<unknown> } };
};

test("the service worker router answers ping and rejects unknown types", async ({
  page,
  extensionId,
}) => {
  await page.goto(`chrome-extension://${extensionId}/dashboard.html`);

  const pong = await page.evaluate(() =>
    (globalThis as unknown as ChromeLike).chrome.runtime.sendMessage({
      type: "ping",
    }),
  );
  expect(pong).toEqual({ ok: true, data: "pong" });

  const rejected = (await page.evaluate(() =>
    (globalThis as unknown as ChromeLike).chrome.runtime.sendMessage({
      type: "nope",
    }),
  )) as { ok: boolean; error?: { code: string } };
  expect(rejected.ok).toBe(false);
  expect(rejected.error?.code).toBe("unknown_message");
});
