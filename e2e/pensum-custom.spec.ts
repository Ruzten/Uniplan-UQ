import { expect, test } from "./fixtures";

const OWN_PENSUM = [
  "semestre | nombre | créditos | prerrequisitos",
  "1 | Química general | 4 |",
  "1 | Biología celular | 3 |",
  "2 | Química orgánica | 4 | Química general",
  "2 | Bioquímica | 4 | Química orgánica; Biología celular",
].join("\n");

test.beforeEach(async ({ page, extensionId }) => {
  await page.goto(`chrome-extension://${extensionId}/dashboard.html`);
});

test("a student of another career loads, extends and trims their own pensum", async ({
  page,
}) => {
  const rail = page.getByRole("navigation", { name: "Secciones" });

  await rail.getByRole("button", { name: "Pensum" }).click();
  await expect(
    page.getByRole("heading", { name: "¿Este es tu pensum?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cambiar pensum" }).click();
  await expect(rail.getByRole("button", { name: "Ajustes" })).toHaveAttribute(
    "aria-current",
    "page",
  );

  const career = page.getByRole("form", { name: "Carrera" });
  await career.getByLabel("Nombre de la carrera").fill("Química");
  await career.getByRole("button", { name: "Guardar carrera" }).click();
  await expect(page.getByText("Química", { exact: true })).toBeVisible();

  const replace = page.getByRole("button", { name: "Reemplazar pensum" });
  await page.getByLabel("Pensum en texto").fill("1 | | \n");
  await expect(page.getByRole("alert")).toContainText("Línea 1");
  await expect(replace).toBeDisabled();

  await page.getByLabel("Pensum en texto").fill(OWN_PENSUM);
  await expect(page.getByText("Listo para cargar: 4 materias")).toBeVisible();
  await replace.click();
  const backup = page.waitForEvent("download");
  await page.getByRole("button", { name: "Confirmar cambio" }).click();
  expect((await backup).suggestedFilename()).toMatch(/^uniplan-respaldo-/);
  await expect(page.getByText("Pensum actualizado: 4 materias")).toBeVisible();

  await rail.getByRole("button", { name: "Pensum" }).click();
  await expect(page.locator("[data-subject-id]")).toHaveCount(4);
  await expect(
    page.getByRole("heading", { name: "¿Este es tu pensum?" }),
  ).toHaveCount(0);
  await expect(
    page.locator('[data-subject-id="quimica-organica"]'),
  ).toHaveAttribute("data-state", "bloqueada");

  await page.getByRole("button", { name: "Agregar materia" }).click();
  const add = page.getByRole("complementary", { name: "Agregar materia" });
  await add.getByLabel("Nombre").fill("Fisicoquímica");
  await add.getByLabel("Semestre").selectOption("3");
  await add.getByRole("button", { name: "Agregar", exact: true }).click();
  const edit = page.getByRole("complementary", { name: "Editar materia" });
  await expect(edit).toContainText("Fisicoquímica");
  await edit
    .getByRole("checkbox", { name: "Química orgánica", exact: true })
    .click();
  await edit.getByRole("button", { name: "Guardar" }).click();
  await expect(edit).toHaveCount(0);
  await expect(page.locator("[data-subject-id]")).toHaveCount(5);

  await page.locator('[data-subject-id="quimica-general"]').click();
  await edit.getByRole("button", { name: "Eliminar materia" }).click();
  await edit.getByRole("button", { name: "Confirmar eliminación" }).click();
  await expect(page.locator("[data-subject-id]")).toHaveCount(4);
  await expect(
    page.locator('[data-subject-id="quimica-organica"]'),
  ).toHaveAttribute("data-state", "disponible");

  await page.reload();
  await expect(page.locator("[data-subject-id]")).toHaveCount(4);
});

test("a classmate of the same career keeps the subjects and resets the progress", async ({
  page,
}) => {
  const rail = page.getByRole("navigation", { name: "Secciones" });
  await rail.getByRole("button", { name: "Ajustes" }).click();
  await page
    .getByRole("radio", { name: /Conservar las materias y reiniciar/ })
    .check();
  await page.getByRole("button", { name: "Reiniciar avance" }).click();
  const backup = page.waitForEvent("download");
  await page.getByRole("button", { name: "Confirmar cambio" }).click();
  await backup;
  await expect(page.getByText("Avance reiniciado")).toBeVisible();

  await rail.getByRole("button", { name: "Pensum" }).click();
  await expect(page.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "0",
  );
  await expect(page.locator('[data-state="aprobada"]')).toHaveCount(0);
  await expect(page.locator('[data-state="cursando"]')).toHaveCount(0);
});
