import { expect, test } from "./fixtures";

const RANGE_ERROR =
  "La nota aprobatoria debe estar entre el mínimo y el máximo";

test.beforeEach(async ({ page, extensionId }) => {
  await page.goto(`chrome-extension://${extensionId}/dashboard.html`);
  await expect(
    page.getByRole("form", { name: "Agregar pendiente" }),
  ).toBeVisible();
});

test("a weighted grade shows the average, the remaining percent and the needed score", async ({
  page,
}) => {
  const rail = page.getByRole("navigation", { name: "Secciones" });
  await rail.getByRole("button", { name: "Pensum" }).click();
  await page.locator('[data-subject-id="calculo-integral"]').click();
  const panel = page.getByRole("complementary", { name: "Editar materia" });
  await panel.getByLabel("Estado").selectOption("cursando");
  await panel.getByRole("button", { name: "Guardar" }).click();
  await expect(panel).toHaveCount(0);

  await rail.getByRole("button", { name: "Notas" }).click();
  const card = page.getByRole("article", { name: "Cálculo integral" });
  await expect(card).toContainText("Sin notas");
  const form = card.getByRole("form", {
    name: "Agregar nota a Cálculo integral",
  });
  await form.getByLabel("Etiqueta").fill("Parcial 1");
  await form.getByLabel("Nota").fill("4");
  await expect(form.getByLabel("Máximo")).toHaveValue("5");
  await form.getByLabel("Peso %").fill("30");
  await form.getByRole("button", { name: "Agregar nota" }).click();

  await expect(card).toContainText("Promedio: 4.00");
  await expect(card).toContainText("Acumulado: 1.20");
  await expect(card).toContainText("Vas bien");
  await expect(card).toContainText("Falta 70% por calificar");
  await expect(card).toContainText("Necesitas 2.57 en lo restante para pasar");
  const row = card.getByRole("listitem").filter({ hasText: "Parcial 1" });
  await expect(row).toContainText("Manual");

  await page.reload();
  await expect(card).toContainText("Promedio: 4.00");
});

test("a pass mark above the maximum is rejected and the scale stays unchanged", async ({
  page,
}) => {
  await page
    .getByRole("navigation", { name: "Secciones" })
    .getByRole("button", { name: "Ajustes" })
    .click();
  const form = page.getByRole("form", { name: "Escala de notas" });
  await expect(form.getByLabel("Máximo")).toHaveValue("5");
  await form.getByLabel("Nota aprobatoria").fill("6");
  await form.getByRole("button", { name: "Guardar escala" }).click();
  await expect(form.getByRole("alert")).toHaveText(RANGE_ERROR);

  await page.reload();
  await expect(form.getByLabel("Mínimo")).toHaveValue("0");
  await expect(form.getByLabel("Máximo")).toHaveValue("5");
  await expect(form.getByLabel("Nota aprobatoria")).toHaveValue("3");
});
