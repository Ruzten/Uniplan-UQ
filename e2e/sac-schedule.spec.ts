import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "./fixtures";

const SCHEDULE_PAGE = readFileSync(
  path.resolve("tests/fixtures/sac/pacr42-schedule.html"),
  "utf8",
);
const SCHEDULE_URL =
  "https://sac.uniquindio.edu.co/sgacampus/services/parf20/report/export/pacr42";

test.beforeEach(async ({ context }) => {
  await context.route("https://sac.uniquindio.edu.co/**", (route) =>
    route.abort(),
  );
  await context.route("https://sac.uniquindio.edu.co/sgacampus/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/html; charset=utf-8",
      body: SCHEDULE_PAGE,
    }),
  );
});

test("importing the pacr42 schedule fills Horario semanal in Agenda and the credits in Pensum", async ({
  context,
  page,
  extensionId,
}) => {
  const panel = await context.newPage();
  await panel.goto(`chrome-extension://${extensionId}/dashboard.html`);
  const schedule = panel.getByRole("region", { name: "Horario semanal" });
  await expect(schedule).toContainText(
    "Sin horario importado. Ábrelo en el SAC y pulsa Importar a Uniplan.",
  );

  await page.bringToFront();
  await page.goto(`${SCHEDULE_URL};jsessionid=E2E000?x=1`);
  const host = page.locator("#uniplan-sac-host");
  await host.getByRole("button", { name: "Importar a Uniplan" }).click();
  await expect(host.getByRole("status")).toHaveText(
    "Importado: 8 nuevas, 4 actualizadas, 1 sin asociar",
  );

  await panel.bringToFront();
  const saturday = schedule.getByRole("list", { name: "Sábado" });
  await expect(saturday.getByRole("listitem")).toHaveText([
    "14:00–16:00 · Infraestructura computacional · F6-204 SALÓN",
    "16:00–18:00 · Infraestructura computacional · F6-204 SALÓN",
  ]);
  const friday = schedule.getByRole("list", { name: "Viernes" });
  await expect(friday.getByRole("listitem")).toHaveText([
    "18:00–19:00 · Sistemas de Información · C2-305 AULA",
    "19:00–20:00 · ELECTIVA DEPORTIVA · COLISEO",
  ]);
  await expect(
    schedule.getByRole("list", { name: "Lunes" }).getByRole("listitem"),
  ).toHaveText(["18:00–20:00 · Cálculo integral · B1-101 AULA"]);
  await expect(schedule.getByRole("heading", { name: "Domingo" })).toHaveCount(
    0,
  );

  await panel
    .getByRole("navigation", { name: "Secciones" })
    .getByRole("button", { name: "Pensum" })
    .click();
  await panel.locator('[data-subject-id="calculo-integral"]').click();
  const editor = panel.getByRole("complementary", { name: "Editar materia" });
  await expect(editor.getByLabel("Créditos")).toHaveValue("4");
});
