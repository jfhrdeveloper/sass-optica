import { describe, expect, it } from "vitest";
import { formatearFechaPE } from "@/lib/date";

/* Este helper existe por un bug real (ver bitácora 2026-07-24 (12)): usar
   `new Date("2026-07-24").toLocaleDateString()` interpreta el string como
   medianoche UTC y en America/Lima (UTC-5) lo corre un día ATRÁS. Los tests
   fijan justamente ese comportamiento para que nadie lo "simplifique" de
   vuelta a `new Date()` sin darse cuenta. */

describe("formatearFechaPE", () => {
  it("pasa de ISO a DD-MM-AAAA", () => {
    expect(formatearFechaPE("2026-07-24")).toBe("24-07-2026");
  });

  it("NO corre la fecha un día atrás (el bug de zona horaria que motivó el helper)", () => {
    /* Con `new Date("2026-01-01").toLocaleDateString("es-PE")` en UTC-5 esto
       daría 31-12-2025. Debe dar el 1 de enero. */
    expect(formatearFechaPE("2026-01-01")).toBe("01-01-2026");
  });

  it("es independiente de la zona horaria del proceso", () => {
    const original = process.env.TZ;
    try {
      process.env.TZ = "Pacific/Kiritimati"; // UTC+14
      const adelantado = formatearFechaPE("2026-07-24");
      process.env.TZ = "Pacific/Midway"; // UTC-11
      const atrasado = formatearFechaPE("2026-07-24");
      expect(adelantado).toBe("24-07-2026");
      expect(atrasado).toBe("24-07-2026");
    } finally {
      process.env.TZ = original;
    }
  });

  it("ignora la parte de hora de un timestamp completo", () => {
    expect(formatearFechaPE("2026-07-24T23:45:00.000Z")).toBe("24-07-2026");
  });

  it("conserva los ceros a la izquierda", () => {
    expect(formatearFechaPE("2026-03-05")).toBe("05-03-2026");
  });
});
