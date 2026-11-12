import { expect, test } from "./fixtures";

const VIEW_LABELS = ["Agenda", "Notas", "Pensum", "Ruta", "Ajustes"];

function dashboardUrl(extensionId: string): string {
  return `chrome-extension://${extensionId}/dashboard.html`;
}

test("rail shows the five views with Agenda active", async ({
  page,
  extensionId,
}) => {
  await page.goto(dashboardUrl(extensionId));
  const rail = page.getByRole("navigation", { name: "Secciones" });
  await expect(rail.getByRole("button")).toHaveText(VIEW_LABELS);
  await expect(rail.getByRole("button", { name: "Agenda" })).toHaveAttribute(
    "aria-current",
    "page",
  );
});

test("active view survives a reload", async ({ page, extensionId }) => {
  await page.goto(dashboardUrl(extensionId));
  const rail = page.getByRole("navigation", { name: "Secciones" });
  await expect(rail.getByRole("button", { name: "Agenda" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  const pensum = rail.getByRole("button", { name: "Pensum" });
  await pensum.click();
  await expect(pensum).toHaveAttribute("aria-current", "page");
  await page.reload();
  await expect(rail.getByRole("button", { name: "Pensum" })).toHaveAttribute(
    "aria-current",
    "page",
  );
});

test("keyboard focus on a rail button draws a 2px outline", async ({
  page,
  extensionId,
}) => {
  await page.goto(dashboardUrl(extensionId));
  const rail = page.getByRole("navigation", { name: "Secciones" });
  await expect(rail.getByRole("button", { name: "Agenda" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await page.keyboard.press("Tab");
  const focused = rail.locator("button:focus");
  await expect(focused).toHaveCount(1);
  await expect(focused).toHaveCSS("outline-width", "2px");
});

test("an unknown stored view falls back to Agenda", async ({
  page,
  extensionId,
}) => {
  await page.goto(dashboardUrl(extensionId));
  const rail = page.getByRole("navigation", { name: "Secciones" });
  await expect(rail.getByRole("button", { name: "Agenda" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open("uniplan");
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const database = request.result;
          const tx = database.transaction("settings", "readwrite");
          tx.objectStore("settings").put({ key: "activeView", value: "zzz" });
          tx.oncomplete = () => {
            database.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
  );
  await page.reload();
  await expect(rail.getByRole("button")).toHaveText(VIEW_LABELS);
  await expect(rail.getByRole("button", { name: "Agenda" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(rail.locator('[aria-current="page"]')).toHaveCount(1);
});

test("page is in Spanish and keeps the app heading", async ({
  page,
  extensionId,
}) => {
  await page.goto(dashboardUrl(extensionId));
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await expect(
    page.getByRole("heading", { level: 1, name: "Uniplan UQ" }),
  ).toBeVisible();
});
