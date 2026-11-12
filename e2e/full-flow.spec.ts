import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "./fixtures";

const SAC_PAGE = readFileSync(
  path.resolve("tests/fixtures/sac/sac-page.html"),
  "utf8",
);
const SAC_URL = "https://sac.uniquindio.edu.co/sgacampus/notas";

test("full flow keeps manual data and student edits across reloads and imports", async ({
  context,
  page,
  extensionId,
}) => {
  await context.route("https://sac.uniquindio.edu.co/**", (route) =>
    route.abort(),
  );
  await context.route("https://sac.uniquindio.edu.co/sgacampus/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/html; charset=utf-8",
      body: SAC_PAGE,
    }),
  );

  await page.goto(`chrome-extension://${extensionId}/dashboard.html`);
  const rail = page.getByRole("navigation", { name: "Secciones" });

  await rail.getByRole("button", { name: "Pensum" }).click();
  const card = page
    .locator("[data-subject-id]")
    .filter({ hasText: "Matemáticas Generales" });
  await expect(card).toHaveAttribute("data-state", "disponible");

  await rail.getByRole("button", { name: "Agenda" }).click();
  const title = page
    .getByRole("form", { name: "Agregar pendiente" })
    .getByLabel("Título");
  await title.fill("Entrega proyecto");
  await title.press("Enter");
  const manual = page
    .getByRole("listitem")
    .filter({ hasText: "Entrega proyecto" });
  await expect(manual).toBeVisible();
  await page.reload();
  await expect(manual).toBeVisible();

  const sac = await context.newPage();
  await sac.goto(SAC_URL);
  const host = sac.locator("#uniplan-sac-host");
  const importButton = host.getByRole("button", { name: "Importar a Uniplan" });
  await importButton.click();
  await expect(host.getByRole("status")).toContainText("Importado:");

  await page.bringToFront();
  await rail.getByRole("button", { name: "Notas" }).click();
  const calculo = page.getByRole("article", { name: "Cálculo integral" });
  const row = calculo.getByRole("listitem").filter({ hasText: "Nota 1" });
  await expect(row).toContainText("SAC");
  await row.getByRole("button", { name: "Editar" }).click();
  const editForm = calculo.getByRole("form", { name: "Editar nota: Nota 1" });
  await editForm.getByLabel("Nota", { exact: true }).fill("4.9");
  await editForm.getByRole("button", { name: "Guardar" }).click();
  await expect(row).toContainText("4.9 / 5");
  await expect(row).toContainText("editado");

  await sac.bringToFront();
  await importButton.click();
  await expect(host.getByRole("status")).toContainText("0 nuevas");

  await page.bringToFront();
  await page.reload();
  await expect(row).toContainText("4.9 / 5");
  await expect(row).toContainText("editado");

  await rail.getByRole("button", { name: "Ajustes" }).click();
  const backup = page.getByRole("region", { name: "Respaldo" });
  await expect(
    backup.getByRole("status").filter({ hasText: /^Último respaldo/ }),
  ).toBeVisible();
  const log = page.getByRole("table", { name: "Registro de sincronización" });
  await expect(log.locator("tbody tr").first()).toBeVisible();
  await expect
    .poll(() => log.locator("tbody tr").count())
    .toBeGreaterThanOrEqual(2);

  const downloadPromise = page.waitForEvent("download");
  await backup.getByRole("button", { name: "Exportar respaldo" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(
    /^uniplan-respaldo-\d{4}-\d{2}-\d{2}\.json$/,
  );
});
