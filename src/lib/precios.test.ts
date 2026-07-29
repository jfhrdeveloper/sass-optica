import { describe, expect, it } from "vitest";
import {
  PLANES, OFERTA_ANUAL,
  precioAnual, ahorroAnual, precioSegunCiclo, montoCentimosSegunCiclo,
  etiquetaOferta, descripcionOferta,
} from "@/lib/precios";

/* Es aritmética de dinero mostrada al cliente: un error acá es un precio mal
   publicado. Los tests se escriben contra la CONSTANTE `OFERTA_ANUAL` (no
   contra montos fijos) para que cambiar la oferta no los rompa sin motivo —
   lo que se fija es la relación, no el valor puntual. */

describe("precioAnual", () => {
  it("siempre sale más barato que pagar mes a mes", () => {
    for (const plan of PLANES) {
      expect(precioAnual(plan.mensual)).toBeLessThan(plan.mensual * 12);
    }
  });

  it("aplica la oferta configurada", () => {
    const mensual = 100;
    if (OFERTA_ANUAL.tipo === "descuento") {
      expect(precioAnual(mensual)).toBeCloseTo(mensual * 12 * (1 - OFERTA_ANUAL.porcentaje / 100), 2);
    } else {
      expect(precioAnual(mensual)).toBeCloseTo(mensual * (12 - OFERTA_ANUAL.meses), 2);
    }
  });

  it("redondea a 2 decimales (sin arrastrar el error de coma flotante)", () => {
    const valor = precioAnual(89.9);
    expect(valor).toBe(Number(valor.toFixed(2)));
  });

  it("nunca devuelve un precio negativo ni cero", () => {
    for (const plan of PLANES) {
      expect(precioAnual(plan.mensual)).toBeGreaterThan(0);
    }
  });
});

describe("ahorroAnual", () => {
  it("es la diferencia contra pagar los 12 meses sueltos", () => {
    for (const plan of PLANES) {
      expect(ahorroAnual(plan.mensual)).toBeCloseTo(plan.mensual * 12 - precioAnual(plan.mensual), 2);
    }
  });

  it("es positivo: la oferta configurada siempre da un beneficio real", () => {
    for (const plan of PLANES) {
      expect(ahorroAnual(plan.mensual)).toBeGreaterThan(0);
    }
  });
});

describe("precioSegunCiclo", () => {
  it("en mensual devuelve el precio de lista tal cual", () => {
    expect(precioSegunCiclo(89.9, "mensual")).toBe(89.9);
  });

  it("en anual devuelve el precio anual con la oferta aplicada", () => {
    expect(precioSegunCiclo(89.9, "anual")).toBe(precioAnual(89.9));
  });
});

describe("OFERTA_ANUAL — la oferta es UNA sola, nunca las dos", () => {
  /* El punto de la unión discriminada: no se puede configurar descuento Y
     meses gratis a la vez, que sería contar el mismo beneficio dos veces. */
  it("tiene un tipo válido y solo los campos de ese tipo", () => {
    if (OFERTA_ANUAL.tipo === "descuento") {
      expect(OFERTA_ANUAL.porcentaje).toBeGreaterThan(0);
      expect(OFERTA_ANUAL.porcentaje).toBeLessThan(100);
      expect(OFERTA_ANUAL).not.toHaveProperty("meses");
    } else {
      expect(OFERTA_ANUAL.meses).toBeGreaterThan(0);
      expect(OFERTA_ANUAL.meses).toBeLessThan(12);
      expect(OFERTA_ANUAL).not.toHaveProperty("porcentaje");
    }
  });

  it("el badge y la descripción hablan de la MISMA unidad que la oferta", () => {
    const badge = etiquetaOferta();
    const desc = descripcionOferta();
    if (OFERTA_ANUAL.tipo === "descuento") {
      expect(badge).toContain("%");
      expect(desc).toContain(`${OFERTA_ANUAL.porcentaje}%`);
      expect(desc).not.toMatch(/mes(es)? gratis/);
    } else {
      expect(badge).toMatch(/mes(es)?/);
      expect(desc).toContain(String(OFERTA_ANUAL.meses));
      expect(desc).not.toContain("%");
    }
  });

  it("singulariza bien si la oferta fuera de 1 mes", () => {
    /* Blindaje del texto: con meses = 1 no debe decir "1 meses". */
    if (OFERTA_ANUAL.tipo === "meses_gratis" && OFERTA_ANUAL.meses === 1) {
      expect(etiquetaOferta()).toBe("1 mes gratis");
    } else {
      expect(etiquetaOferta().length).toBeGreaterThan(0);
    }
  });
});

describe("montoCentimosSegunCiclo", () => {
  /* Es el monto que de verdad se le cobra a la tarjeta del cliente en
     /api/pagos/culqi/cargo — un plan inexistente NUNCA debe resolver a un
     monto cobrable, aunque sea 0 (mejor rechazar el pago explícitamente). */
  it("devuelve null si el planId no existe (nunca cobra un monto para un plan inventado)", () => {
    expect(montoCentimosSegunCiclo("plan-que-no-existe", "mensual")).toBeNull();
  });

  it("coincide con precioSegunCiclo pasado a céntimos, para cada plan real", () => {
    for (const plan of PLANES) {
      for (const ciclo of ["mensual", "anual"] as const) {
        const esperado = Math.round(precioSegunCiclo(plan.mensual, ciclo) * 100);
        expect(montoCentimosSegunCiclo(plan.id, ciclo)).toBe(esperado);
      }
    }
  });

  it("nunca devuelve un monto negativo ni cero para un plan real", () => {
    for (const plan of PLANES) {
      expect(montoCentimosSegunCiclo(plan.id, "mensual")).toBeGreaterThan(0);
      expect(montoCentimosSegunCiclo(plan.id, "anual")).toBeGreaterThan(0);
    }
  });
});

describe("configuración de planes", () => {
  it("hay exactamente un plan destacado (si hubiera dos, la UI marcaría ambos)", () => {
    expect(PLANES.filter((p) => p.destacado)).toHaveLength(1);
  });

  it("los ids son únicos (se usan como key de React)", () => {
    expect(new Set(PLANES.map((p) => p.id)).size).toBe(PLANES.length);
  });

  it("todos los planes tienen precio positivo y al menos un bullet", () => {
    for (const plan of PLANES) {
      expect(plan.mensual).toBeGreaterThan(0);
      expect(plan.bullets.length).toBeGreaterThan(0);
    }
  });
});
