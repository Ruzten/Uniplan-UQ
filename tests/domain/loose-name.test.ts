import { describe, expect, it } from "vitest";
import { findByLooseName, looseName } from "@/src/domain/text";

describe("looseName", () => {
  it("ignora mayúsculas, tildes y la s final de palabras largas", () => {
    expect(looseName("SISTEMA DE INFORMACIÓN")).toBe(
      looseName("Sistemas de Información"),
    );
  });

  it("no recorta palabras cortas", () => {
    expect(looseName("Los gas")).toBe("los gas");
  });
});

describe("findByLooseName", () => {
  const subjects = [
    { id: "a", name: "Sistemas de Información" },
    { id: "b", name: "Cálculo integral" },
  ];

  it("asocia un nombre en singular con la materia en plural", () => {
    expect(findByLooseName("SISTEMA DE INFORMACIÓN", subjects)?.id).toBe("a");
  });

  it("devuelve null cuando no hay coincidencia", () => {
    expect(findByLooseName("Física mecánica", subjects)).toBeNull();
  });

  it("devuelve null cuando dos materias coinciden", () => {
    const twins = [
      { id: "x", name: "Electiva" },
      { id: "y", name: "Electivas" },
    ];
    expect(findByLooseName("ELECTIVA", twins)).toBeNull();
  });
});
