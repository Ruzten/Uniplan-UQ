import { expect, test } from "./fixtures";

type StoredSubject = {
  id: string;
  semester: number;
  status: "aprobada" | "cursando" | "pendiente";
  prereqIds: string[];
};

test.beforeEach(async ({ page, extensionId }) => {
  await page.goto(`chrome-extension://${extensionId}/dashboard.html`);
  await page
    .getByRole("navigation", { name: "Secciones" })
    .getByRole("button", { name: "Pensum" })
    .click();
  await expect(page.getByRole("progressbar")).toBeVisible();
});

function readSubjects(): Promise<StoredSubject[]> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("uniplan");
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const all = database
        .transaction("subjects", "readonly")
        .objectStore("subjects")
        .getAll();
      all.onerror = () => reject(all.error);
      all.onsuccess = () => {
        database.close();
        resolve(all.result as StoredSubject[]);
      };
    };
  });
}

test("renders one card per subject in a single row of semesters", async ({
  page,
}) => {
  const subjects = await page.evaluate(readSubjects);
  const last = Math.max(...subjects.map((subject) => subject.semester));
  for (let semester = 1; semester <= last; semester += 1) {
    await expect(
      page.getByRole("heading", {
        level: 2,
        name: `Semestre ${semester}`,
        exact: true,
      }),
    ).toHaveCount(1);
  }
  await expect(page.getByRole("heading", { name: /^Año / })).toHaveCount(0);
  expect(subjects.length).toBeGreaterThan(0);
  await expect(page.locator("[data-subject-id]")).toHaveCount(subjects.length);
  for (const subject of subjects) {
    await expect(page.locator(`[data-subject-id="${subject.id}"]`)).toHaveCount(
      1,
    );
  }
});

test("pending cards are available or blocked according to their prerequisites", async ({
  page,
}) => {
  const subjects = await page.evaluate(readSubjects);
  const byId = new Map(subjects.map((subject) => [subject.id, subject]));
  const pending = subjects.filter((subject) => subject.status === "pendiente");
  const states = new Set<string>();
  for (const subject of pending) {
    const unlocked = subject.prereqIds.every((id) => {
      const status = byId.get(id)?.status;
      return status === "aprobada" || status === "cursando";
    });
    const expected = unlocked ? "disponible" : "bloqueada";
    states.add(expected);
    await expect(
      page.locator(`[data-subject-id="${subject.id}"]`),
    ).toHaveAttribute("data-state", expected);
  }
  expect([...states].sort()).toEqual(["bloqueada", "disponible"]);
});

test("focusing Cálculo integral highlights its prerequisite and its dependents", async ({
  page,
}) => {
  await page.locator('[data-subject-id="calculo-integral"]').focus();
  await expect(
    page.locator('[data-subject-id="calculo-diferencial"]'),
  ).toHaveAttribute("data-highlight", "prereq");
  await expect(
    page.locator('[data-subject-id="calculo-multivariado-y-vectorial"]'),
  ).toHaveAttribute("data-highlight", "dependent");
  await expect(page.locator("svg path.stroke-warning")).toHaveCount(1);
  await expect(page.locator("svg path.stroke-info").first()).toBeAttached();
  await page.locator('[data-subject-id="calculo-integral"]').blur();
  await expect(
    page.locator('[data-subject-id="calculo-diferencial"]'),
  ).not.toHaveAttribute("data-highlight", /.+/);
  await expect(page.locator("svg path.stroke-warning")).toHaveCount(0);
});

test("approving Estadística y probabilidad updates its card and the progress", async ({
  page,
}) => {
  const bar = page.getByRole("progressbar");
  const before = Number(await bar.getAttribute("aria-valuenow"));
  const card = page.locator('[data-subject-id="estadistica-y-probabilidad"]');
  await expect(card).not.toHaveAttribute("data-state", "aprobada");
  await card.click();
  const panel = page.getByRole("complementary", { name: "Editar materia" });
  await panel.getByLabel("Estado").selectOption("aprobada");
  await panel.getByRole("button", { name: "Guardar" }).click();
  await expect(card).toHaveAttribute("data-state", "aprobada");
  await expect
    .poll(async () => Number(await bar.getAttribute("aria-valuenow")))
    .toBeGreaterThan(before);
  await page.reload();
  await expect(card).toHaveAttribute("data-state", "aprobada");
});

test("a prerequisite that closes a cycle is rejected and not saved", async ({
  page,
}) => {
  await page.locator('[data-subject-id="calculo-diferencial"]').click();
  const panel = page.getByRole("complementary", { name: "Editar materia" });
  await panel
    .getByRole("checkbox", { name: "Cálculo integral", exact: true })
    .check();
  await panel.getByRole("button", { name: "Guardar" }).click();
  await expect(panel.getByRole("alert")).toHaveText(
    "Ese prerrequisito crearía un ciclo",
  );
  const subjects = await page.evaluate(readSubjects);
  const diferencial = subjects.find(
    (subject) => subject.id === "calculo-diferencial",
  );
  expect(diferencial?.prereqIds).not.toContain("calculo-integral");
});
