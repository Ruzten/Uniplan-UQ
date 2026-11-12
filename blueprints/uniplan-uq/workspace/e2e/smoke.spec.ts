import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "./fixtures";

const EXPECTED_PERMISSIONS = [
  "alarms",
  "identity",
  "notifications",
  "storage",
  "unlimitedStorage",
];

const EXPECTED_HOSTS = [
  "https://classroom.googleapis.com/*",
  "https://sac.uniquindio.edu.co/*",
];

type BuiltManifest = {
  permissions?: string[];
  host_permissions?: string[];
};

function readManifest(): BuiltManifest {
  const file = path.resolve(".output/chrome-mv3/manifest.json");
  return JSON.parse(readFileSync(file, "utf8")) as BuiltManifest;
}

test("dashboard shows the app heading", async ({ page, extensionId }) => {
  await page.goto(`chrome-extension://${extensionId}/dashboard.html`);
  const heading = page.getByRole("heading", { level: 1, name: "Uniplan UQ" });
  await expect(heading).toBeVisible();
});

test("manifest permissions", () => {
  const manifest = readManifest();
  const permissions = [...(manifest.permissions ?? [])].sort();
  const hosts = [...(manifest.host_permissions ?? [])].sort();
  expect(permissions).toEqual(EXPECTED_PERMISSIONS);
  expect(hosts).toEqual(EXPECTED_HOSTS);
});

test("permission budget", () => {
  const manifest = readManifest();
  const budget = readFileSync(path.resolve("PERMISSIONS.md"), "utf8");
  const declared = [
    ...(manifest.permissions ?? []),
    ...(manifest.host_permissions ?? []),
  ];
  for (const entry of declared) {
    expect(budget).toContain(`\`${entry}\``);
  }
});
