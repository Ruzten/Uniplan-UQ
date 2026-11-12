import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "./fixtures";

const SAC_PAGE = readFileSync(
  path.resolve("tests/fixtures/sac/sac-page.html"),
  "utf8",
);
const SAC_URL = "https://sac.uniquindio.edu.co/sgacampus/notas";

test.beforeEach(async ({ context }) => {
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
});

test("importing from the SAC page creates the grades shown in Notas", async ({
  context,
  page,
  extensionId,
}) => {
  await page.goto(SAC_URL);
  const host = page.locator("#uniplan-sac-host");
  await host.getByRole("button", { name: "Importar a Uniplan" }).click();
  await expect(host.getByRole("status")).toHaveText(
    "Importado: 4 nuevas, 0 actualizadas, 1 sin asociar",
  );

  const panel = await context.newPage();
  await panel.goto(`chrome-extension://${extensionId}/dashboard.html`);
  await panel
    .getByRole("navigation", { name: "Secciones" })
    .getByRole("button", { name: "Notas" })
    .click();
  const card = panel.getByRole("article", { name: "Cálculo integral" });
  const row = card.getByRole("listitem").filter({ hasText: "Nota 1" });
  await expect(row).toBeVisible();
  await expect(row).toContainText("SAC");
});

test("associating an unmatched name creates its grade on the next import", async ({
  context,
  page,
  extensionId,
}) => {
  await page.goto(SAC_URL);
  const host = page.locator("#uniplan-sac-host");
  const importButton = host.getByRole("button", { name: "Importar a Uniplan" });
  await importButton.click();
  await expect(host.getByRole("status")).toContainText("1 sin asociar");

  const panel = await context.newPage();
  await panel.goto(`chrome-extension://${extensionId}/dashboard.html`);
  const rail = panel.getByRole("navigation", { name: "Secciones" });
  await rail.getByRole("button", { name: "Ajustes" }).click();
  await panel
    .getByLabel("Materia para Electiva Deportiva")
    .selectOption({ label: "Infraestructura computacional" });
  await panel
    .getByRole("button", { name: "Asociar Electiva Deportiva" })
    .click();
  await expect(panel.getByText("No hay nombres sin asociar.")).toBeVisible();

  await page.bringToFront();
  await importButton.click();
  await expect(host.getByRole("status")).toHaveText(
    "Importado: 1 nuevas, 0 actualizadas, 0 sin asociar",
  );

  await panel.bringToFront();
  await rail.getByRole("button", { name: "Notas" }).click();
  const card = panel.getByRole("article", {
    name: "Infraestructura computacional",
  });
  const row = card.getByRole("listitem").filter({ hasText: "Parcial 1" });
  await expect(row).toBeVisible();
  await expect(row).toContainText("SAC");
});
