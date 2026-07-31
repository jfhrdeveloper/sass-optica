import { describe, expect, it } from "vitest";
import { puedeTransicionar, TRANSICIONES_VALIDAS } from "@/lib/laboratorio";

describe("puedeTransicionar", () => {
  it("permite quedarse en el mismo estado", () => {
    expect(puedeTransicionar("generado", "generado")).toBe(true);
  });

  it("permite avanzar al siguiente paso del flujo", () => {
    expect(puedeTransicionar("generado", "enviado")).toBe(true);
    expect(puedeTransicionar("enviado", "en_proceso")).toBe(true);
    expect(puedeTransicionar("en_proceso", "terminado")).toBe(true);
    expect(puedeTransicionar("terminado", "en_transito")).toBe(true);
    expect(puedeTransicionar("en_transito", "recibido")).toBe(true);
    expect(puedeTransicionar("recibido", "entregado")).toBe(true);
  });

  it("rechaza saltarse pasos del flujo", () => {
    expect(puedeTransicionar("generado", "entregado")).toBe(false);
    expect(puedeTransicionar("generado", "terminado")).toBe(false);
  });

  it("rechaza retroceder", () => {
    expect(puedeTransicionar("en_proceso", "enviado")).toBe(false);
    expect(puedeTransicionar("entregado", "recibido")).toBe(false);
  });

  it("cancelado es alcanzable desde cualquier estado no terminal", () => {
    for (const estado of Object.keys(TRANSICIONES_VALIDAS) as (keyof typeof TRANSICIONES_VALIDAS)[]) {
      if (estado === "entregado" || estado === "cancelado") continue;
      expect(puedeTransicionar(estado, "cancelado")).toBe(true);
    }
  });

  it("entregado y cancelado son terminales — no transicionan a nada más", () => {
    expect(TRANSICIONES_VALIDAS.entregado).toEqual([]);
    expect(TRANSICIONES_VALIDAS.cancelado).toEqual([]);
    expect(puedeTransicionar("entregado", "enviado")).toBe(false);
    expect(puedeTransicionar("cancelado", "generado")).toBe(false);
  });
});
