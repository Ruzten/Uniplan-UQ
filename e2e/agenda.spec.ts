import { expect, test } from "./fixtures";

const EMPTY_TEXT = "No hay pendientes. Agrega el primero arriba.";

test.beforeEach(async ({ page, extensionId }) => {
  await page.goto(`chrome-extension://${extensionId}/dashboard.html`);
  await expect(
    page.getByRole("form", { name: "Agregar pendiente" }),
  ).toBeVisible();
});

test("shows the empty state when there are no visible items", async ({
  page,
}) => {
  await expect(page.getByText(EMPTY_TEXT)).toBeVisible();
});

test("quick add without a date lands under Sin fecha and survives a reload", async ({
  page,
}) => {
  const title = page
    .getByRole("form", { name: "Agregar pendiente" })
    .getByLabel("Título");
  await title.fill("Taller de grafos");
  await title.press("Enter");
  const added = page
    .getByRole("region", { name: "Sin fecha" })
    .getByRole("listitem")
    .filter({ hasText: "Taller de grafos" });
  await expect(added).toBeVisible();
  await expect(added).toContainText("Manual");
  await page.reload();
  await expect(added).toBeVisible();
  await expect(added).toContainText("Manual");
});

test("an empty title shows an alert and creates nothing", async ({ page }) => {
  const form = page.getByRole("form", { name: "Agregar pendiente" });
  await form.getByRole("button", { name: "Agregar" }).click();
  await expect(form.getByRole("alert")).toHaveText("El título es obligatorio");
  await expect(page.getByText(EMPTY_TEXT)).toBeVisible();
  await page.reload();
  await expect(page.getByText(EMPTY_TEXT)).toBeVisible();
});

test("marking done, editing and deleting persist across a reload", async ({
  page,
}) => {
  const title = page
    .getByRole("form", { name: "Agregar pendiente" })
    .getByLabel("Título");
  await title.fill("Taller de grafos");
  await title.press("Enter");

  const checkbox = page.getByRole("checkbox", {
    name: "Marcar como hecha: Taller de grafos",
  });
  // The box is controlled by the live query, so it flips once Dexie answers.
  await checkbox.click();
  await expect(checkbox).toBeChecked();
  await page.reload();
  await expect(checkbox).toBeChecked();

  const original = page
    .getByRole("listitem")
    .filter({ hasText: "Taller de grafos" });
  await original.getByRole("button", { name: "Editar" }).click();
  const editForm = page.getByRole("form", {
    name: "Editar: Taller de grafos",
  });
  await editForm.getByLabel("Título").fill("Taller de árboles");
  await editForm.getByRole("button", { name: "Guardar" }).click();
  const renamed = page
    .getByRole("listitem")
    .filter({ hasText: "Taller de árboles" });
  await expect(renamed).toBeVisible();
  await expect(original).toHaveCount(0);
  await page.reload();
  await expect(renamed).toBeVisible();
  await expect(original).toHaveCount(0);

  await renamed.getByRole("button", { name: "Eliminar" }).click();
  await renamed.getByRole("button", { name: "Confirmar eliminación" }).click();
  await expect(renamed).toHaveCount(0);
  await expect(page.getByText(EMPTY_TEXT)).toBeVisible();
  await page.reload();
  await expect(page.getByText(EMPTY_TEXT)).toBeVisible();
});
