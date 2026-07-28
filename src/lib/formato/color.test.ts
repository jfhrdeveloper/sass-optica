import { describe, expect, it } from "vitest";
import {
  PALETA_MARCA, CONTRASTE_MINIMO,
  contraste, esHexValido, sirveParaTextoBlanco,
} from "@/lib/formato/color";

/* El color de marca termina siendo el fondo de `.btn-primary`, que lleva
   texto blanco. Un color demasiado claro deja los botones ilegibles en la
   óptica del cliente — por eso la paleta se valida acá y no a ojo. */

describe("contraste", () => {
  it("negro sobre blanco da el máximo (21:1)", () => {
    expect(contraste("#000000", "#FFFFFF")).toBeCloseTo(21, 1);
  });

  it("un color contra sí mismo da 1:1", () => {
    expect(contraste("#2563EB", "#2563EB")).toBeCloseTo(1, 5);
  });

  it("es simétrico (no importa el orden de los argumentos)", () => {
    expect(contraste("#2563EB", "#FFFFFF")).toBeCloseTo(contraste("#FFFFFF", "#2563EB"), 5);
  });

  it("devuelve 0 ante un hex inválido en vez de un número engañoso", () => {
    expect(contraste("azul", "#FFFFFF")).toBe(0);
    expect(contraste("#FFF", "#FFFFFF")).toBe(0);
  });
});

describe("esHexValido", () => {
  it("acepta hex de 6 dígitos con almohadilla", () => {
    expect(esHexValido("#2563EB")).toBe(true);
    expect(esHexValido("#2563eb")).toBe(true);
  });

  it("rechaza formatos que el resto del sistema no sabe leer", () => {
    for (const malo of ["2563EB", "#FFF", "#2563EBB", "rgb(0,0,0)", ""]) {
      expect(esHexValido(malo)).toBe(false);
    }
  });
});

describe("PALETA_MARCA", () => {
  it("TODOS los colores ofrecidos pasan WCAG AA con texto blanco", () => {
    for (const c of PALETA_MARCA) {
      const r = contraste(c.hex, "#FFFFFF");
      expect(r, `${c.nombre} (${c.hex}) da ${r.toFixed(2)}:1`).toBeGreaterThanOrEqual(CONTRASTE_MINIMO);
    }
  });

  it("no ofrece colores repetidos", () => {
    const hexes = PALETA_MARCA.map((c) => c.hex.toUpperCase());
    expect(new Set(hexes).size).toBe(hexes.length);
  });

  it("todos los hex tienen formato válido", () => {
    for (const c of PALETA_MARCA) expect(esHexValido(c.hex)).toBe(true);
  });

  it("incluye el azul primario actual del sistema", () => {
    expect(PALETA_MARCA.some((c) => c.hex.toUpperCase() === "#2563EB")).toBe(true);
  });

  it("NO incluye el verde de acento: 3.3:1 es insuficiente como fondo con texto blanco", () => {
    expect(PALETA_MARCA.some((c) => c.hex.toUpperCase() === "#16A34A")).toBe(false);
    expect(sirveParaTextoBlanco("#16A34A")).toBe(false);
  });
});

describe("sirveParaTextoBlanco", () => {
  it("rechaza colores claros que dejarían el texto blanco ilegible", () => {
    for (const claro of ["#FFFF00", "#FFFFFF", "#FDE047", "#7DD3FC"]) {
      expect(sirveParaTextoBlanco(claro)).toBe(false);
    }
  });

  it("acepta colores oscuros y saturados", () => {
    for (const oscuro of ["#2563EB", "#B91C1C", "#334155"]) {
      expect(sirveParaTextoBlanco(oscuro)).toBe(true);
    }
  });
});
