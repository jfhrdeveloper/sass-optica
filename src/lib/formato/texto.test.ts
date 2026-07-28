import { describe, expect, it } from "vitest";
import { normalizarBusqueda, coincideBusqueda } from "@/lib/formato/texto";

describe("normalizarBusqueda", () => {
  it("quita tildes sin romper la letra base", () => {
    expect(normalizarBusqueda("José Peña")).toBe("jose pena");
  });

  it("baja a minúsculas", () => {
    expect(normalizarBusqueda("ÓPTICA Central")).toBe("optica central");
  });

  it("recorta espacios sobrantes en los extremos", () => {
    expect(normalizarBusqueda("  José  ")).toBe("jose");
  });
});

describe("coincideBusqueda", () => {
  it("encuentra con o sin tilde en la búsqueda, sea cual sea el original", () => {
    expect(coincideBusqueda("José Ramírez", "jose")).toBe(true);
    expect(coincideBusqueda("Jose Ramirez", "josé")).toBe(true);
  });

  it("es insensible a mayúsculas", () => {
    expect(coincideBusqueda("Óptica Los Olivos", "LOS OLIVOS")).toBe(true);
  });

  it("con búsqueda vacía deja pasar todo", () => {
    expect(coincideBusqueda("cualquier cosa", "")).toBe(true);
    expect(coincideBusqueda("cualquier cosa", "   ")).toBe(true);
  });

  it("no matchea texto que no está", () => {
    expect(coincideBusqueda("José Ramírez", "garcia")).toBe(false);
  });
});
