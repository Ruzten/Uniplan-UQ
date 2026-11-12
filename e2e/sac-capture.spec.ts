import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "./fixtures";

const SAC_PAGE = readFileSync(
  path.resolve("tests/fixtures/sac/sac-page.html"),
  "utf8",
);

type Capture = { tables: { headers: string[]; rows: string[][] }[] };

test("the simulated SAC page shows the panel and offers a sample with both tables", async ({
  context,
  page,
  extensionId,
}) => {
  expect(extensionId).toBeTruthy();
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
  await page.goto("https://sac.uniquindio.edu.co/sgacampus/notas");

  const host = page.locator("#uniplan-sac-host");
  await expect(host).toHaveCount(1);
  const hasShadow = await host.evaluate((el) => el.shadowRoot !== null);
  expect(hasShadow).toBe(true);

  const importButton = host.getByRole("button", { name: "Importar a Uniplan" });
  const sampleButton = host.getByRole("button", { name: "Guardar muestra" });
  await expect(importButton).toBeVisible();
  await expect(sampleButton).toBeVisible();

  await sampleButton.click();
  const link = host.getByRole("link", { name: "Descargar muestra" });
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute("download", "uniplan-sac-muestra.json");
  const href = await link.getAttribute("href");
  expect(href).toBeTruthy();

  const capture = (await page.evaluate(async (url) => {
    const response = await fetch(url);
    return response.json();
  }, href ?? "")) as Capture;
  const headers = capture.tables.map((table) => table.headers);
  expect(headers).toContainEqual([
    "Asignatura",
    "Grupo",
    "Nota 1",
    "Nota 2",
    "Definitiva",
  ]);
  expect(headers).toContainEqual(["Materia", "Parcial 1", "Nota definitiva"]);
});
