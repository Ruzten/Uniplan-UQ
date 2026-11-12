import { expect, test } from "./fixtures";

const REASON =
  /No desbloquea otras materias|Desbloquea \d+ materias?; cadena de \d+ semestres?/;

test("a course cap of 2 lists exactly 2 recommendations, each with its reason", async ({
  page,
  extensionId,
}) => {
  await page.goto(`chrome-extension://${extensionId}/dashboard.html`);
  await page
    .getByRole("navigation", { name: "Secciones" })
    .getByRole("button", { name: "Ruta" })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Recomendadas para el próximo semestre",
    }),
  ).toBeVisible();
  await expect(
    page.getByText("La recomendación no tiene en cuenta horarios."),
  ).toBeVisible();

  await page.getByLabel("Tope de materias").fill("2");
  const items = page.locator("ol > li[data-subject-id]");
  await expect(items).toHaveCount(2);
  for (const item of await items.all()) {
    await expect(item).toContainText(REASON);
  }

  await page.reload();
  await expect(page.getByLabel("Tope de materias")).toHaveValue("2");
  await expect(items).toHaveCount(2);
});
