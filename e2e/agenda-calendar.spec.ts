import { expect, test } from "./fixtures";

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function nextMonthFifteenth(): { key: string; local: string } {
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth() + 1, 15, 10, 0);
  const key = `${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}`;
  return { key, local: `${key}T10:00` };
}

test.beforeEach(async ({ page, extensionId }) => {
  await page.goto(`chrome-extension://${extensionId}/dashboard.html`);
  await expect(
    page.getByRole("form", { name: "Agregar pendiente" }),
  ).toBeVisible();
});

test("a dated item shows inside its day cell in the calendar", async ({
  page,
}) => {
  const { key, local } = nextMonthFifteenth();
  const form = page.getByRole("form", { name: "Agregar pendiente" });
  await form.getByLabel("Título").fill("Entrega del proyecto");
  await form.getByLabel("Fecha y hora").fill(local);
  await form.getByRole("button", { name: "Agregar" }).click();
  await expect(
    page.getByRole("listitem").filter({ hasText: "Entrega del proyecto" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Calendario" }).click();
  await expect(
    page.getByRole("button", { name: "Calendario" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Mes siguiente" }).click();
  await expect(page.locator(`[data-date="${key}"]`)).toContainText(
    "Entrega del proyecto",
  );
});

test("the Tipo filter hides other types from the list and the calendar", async ({
  page,
}) => {
  const { key, local } = nextMonthFifteenth();
  const form = page.getByRole("form", { name: "Agregar pendiente" });
  await form.getByLabel("Título").fill("Parcial de grafos");
  await form.getByLabel("Tipo").selectOption("parcial");
  await form.getByLabel("Fecha y hora").fill(local);
  await form.getByRole("button", { name: "Agregar" }).click();
  await expect(
    page.getByRole("listitem").filter({ hasText: "Parcial de grafos" }),
  ).toBeVisible();
  await form.getByLabel("Título").fill("Taller corto");
  await form.getByLabel("Tipo").selectOption("tarea");
  await form.getByLabel("Fecha y hora").fill(local);
  await form.getByRole("button", { name: "Agregar" }).click();
  await expect(
    page.getByRole("listitem").filter({ hasText: "Taller corto" }),
  ).toBeVisible();

  await page
    .getByRole("group", { name: "Filtros" })
    .getByLabel("Tipo")
    .selectOption("parcial");
  await expect(
    page.getByRole("listitem").filter({ hasText: "Parcial de grafos" }),
  ).toBeVisible();
  await expect(
    page.getByRole("listitem").filter({ hasText: "Taller corto" }),
  ).toHaveCount(0);

  await page.getByRole("button", { name: "Calendario" }).click();
  await page.getByRole("button", { name: "Mes siguiente" }).click();
  const cell = page.locator(`[data-date="${key}"]`);
  await expect(cell).toContainText("Parcial de grafos");
  await expect(cell).not.toContainText("Taller corto");
});

test("a month without items renders one empty cell per day", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Calendario" }).click();
  const now = new Date();
  const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const prefix = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-`;
  const cells = page.locator("[data-date]");
  await expect(cells).toHaveCount(days);
  await expect(page.locator(`[data-date^="${prefix}"]`)).toHaveCount(days);
  await expect(page.locator("[data-date] li")).toHaveCount(0);
});
