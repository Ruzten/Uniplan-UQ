import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "./fixtures";

const REPORT_PAGE = readFileSync(
  path.resolve("tests/fixtures/sac/notr62-report.html"),
  "utf8",
);
const REPORT_URL =
  "https://sac.uniquindio.edu.co/sgacampus/services/parf20/report/export/notr62";

test.beforeEach(async ({ context }) => {
  await context.route("https://sac.uniquindio.edu.co/**", (route) =>
    route.abort(),
  );
  await context.route("https://sac.uniquindio.edu.co/sgacampus/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/html; charset=utf-8",
      body: REPORT_PAGE,
    }),
  );
});

test("importing the notr62 grade report shows every component, graded or pending, with its weight in Notas", async ({
  context,
  page,
  extensionId,
}) => {
  await page.goto(`${REPORT_URL};jsessionid=E2E000?x=1`);
  const host = page.locator("#uniplan-sac-host");
  await host.getByRole("button", { name: "Importar a Uniplan" }).click();
  await expect(host.getByRole("status")).toHaveText(
    "Importado: 10 nuevas, 0 actualizadas, 1 sin asociar",
  );

  await host.getByRole("button", { name: "Guardar muestra" }).click();
  await expect(host.getByRole("status")).toContainText(
    "4 materias del reporte",
  );
  const href = await host
    .getByRole("link", { name: "Descargar muestra" })
    .getAttribute("href");
  const sample = (await page.evaluate(async (url) => {
    const response = await fetch(url);
    return response.json();
  }, href ?? "")) as { url: string; texts: string[] };
  expect(sample.url).toBe(REPORT_URL);
  expect(sample.texts).toContain("CÁLCULO INTEGRAL");

  const panel = await context.newPage();
  await panel.goto(`chrome-extension://${extensionId}/dashboard.html`);
  await panel
    .getByRole("navigation", { name: "Secciones" })
    .getByRole("button", { name: "Notas" })
    .click();
  const card = panel.getByRole("article", { name: "Cálculo integral" });
  const row = card.getByRole("listitem").filter({ hasText: "Parcial 1" });
  await expect(row).toBeVisible();
  await expect(row).toContainText("SAC");
  await expect(row).toContainText("Peso 25%");
  const pending = card.getByRole("listitem").filter({ hasText: "Parcial 2" });
  await expect(pending).toContainText("Sin calificar");
  await expect(pending).toContainText("Peso 25%");
  await expect(
    card.getByRole("listitem").filter({ hasText: "Parcial 3" }),
  ).toContainText("Sin calificar");
  // graded 3.4 and 4 at 25% each; the two pending 25% are the remaining half
  await expect(card).toContainText("Promedio: 3.70");
  await expect(card).toContainText("Falta 50% por calificar");
  await expect(card).toContainText("Necesitas 2.30 en lo restante");

  await pending.getByRole("button", { name: "Editar" }).click();
  const form = card.getByRole("form", { name: "Editar nota: Parcial 2" });
  await form.getByLabel("Nota", { exact: true }).fill("0");
  await form.getByRole("button", { name: "Guardar" }).click();
  const edited = card.getByRole("listitem").filter({ hasText: "Parcial 2" });
  await expect(edited).toContainText("0 / 5");
  await expect(edited).not.toContainText("Sin calificar");
  const infra = panel.getByRole("article", {
    name: "Infraestructura computacional",
  });
  await expect(
    infra.getByRole("listitem").filter({ hasText: "PARTE PRACTICA" }),
  ).toContainText("Peso 50%");
  const proyecto = infra.getByRole("listitem").filter({ hasText: "PROYECTO" });
  await expect(proyecto).toContainText("Sin calificar");
  await expect(proyecto).toContainText("Peso 30%");
});
