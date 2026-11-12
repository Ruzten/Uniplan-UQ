import path from "node:path";
import { type BrowserContext, test as base, chromium } from "@playwright/test";

const EXTENSION_PATH = path.resolve(".output/chrome-mv3");

export const test = base.extend<{
  context: BrowserContext;
  extensionId: string;
}>({
  // biome-ignore lint/correctness/noEmptyPattern: Playwright requires an object pattern here
  context: async ({}, provide) => {
    const context = await chromium.launchPersistentContext("", {
      channel: "chromium",
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
      ],
    });
    await provide(context);
    await context.close();
  },
  extensionId: async ({ context }, provide) => {
    let [worker] = context.serviceWorkers();
    if (!worker) {
      worker = await context.waitForEvent("serviceworker");
    }
    const extensionId = worker.url().split("/")[2];
    if (!extensionId) {
      throw new Error("Could not read the extension id");
    }
    await provide(extensionId);
  },
});

export const expect = test.expect;
