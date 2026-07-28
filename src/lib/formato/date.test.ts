import { describe, expect, it } from "vitest";
import { formatearFechaPE, aFechaLocal, aCadenaISO, ordenarRango } from "@/lib/formato/date";

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

/* ================= PUENTE FECHA CIVIL <-> Date =================
   Es el borde donde entra y sale react-day-picker (DateRangePicker.tsx). Los
   dos errores clásicos que se fijan acá son los que el propio proyecto ya
   sufrió: interpretar "YYYY-MM-DD" como UTC (corre un día en Lima) y olvidar
   que los meses de Date son 0-based. */

describe("aFechaLocal", () => {
  it("construye la fecha a medianoche LOCAL, no UTC", () => {
    const d = aFechaLocal("2026-07-24")!;
    expect(d.getFullYear()).toBe(2026);
    expect(d.getDate()).toBe(24);
    expect(d.getHours()).toBe(0);
  });

  it("no corre el día (el bug de UTC): 1 de enero sigue siendo 1 de enero", () => {
    const d = aFechaLocal("2026-01-01")!;
    expect(d.getDate()).toBe(1);
    expect(d.getMonth()).toBe(0); // enero = 0
  });

  it("respeta el mes pedido (los meses de Date son 0-based)", () => {
    /* Diciembre es 11: si alguien pasara el mes sin restar 1, este caso
       devolvería enero del año siguiente. */
    const d = aFechaLocal("2026-12-05")!;
    expect(d.getMonth()).toBe(11);
    expect(d.getFullYear()).toBe(2026);
  });

  it("devuelve undefined con entradas inválidas o vacías", () => {
    expect(aFechaLocal("")).toBeUndefined();
    expect(aFechaLocal("no-es-fecha")).toBeUndefined();
    expect(aFechaLocal("2026-07")).toBeUndefined();
  });
});

describe("aCadenaISO", () => {
  it("serializa por componentes locales, no con toISOString", () => {
    /* 23:30 local: con toISOString en un huso negativo esto saltaría al día
       siguiente. Debe quedarse en el día local. */
    expect(aCadenaISO(new Date(2026, 6, 24, 23, 30))).toBe("2026-07-24");
  });

  it("rellena mes y día con cero a la izquierda", () => {
    expect(aCadenaISO(new Date(2026, 2, 5))).toBe("2026-03-05");
  });

  it("devuelve cadena vacía si no hay fecha", () => {
    expect(aCadenaISO(undefined)).toBe("");
    expect(aCadenaISO(new Date("invalida"))).toBe("");
  });

  it("ida y vuelta no altera la fecha", () => {
    for (const iso of ["2026-01-01", "2026-07-24", "2026-12-31"]) {
      expect(aCadenaISO(aFechaLocal(iso))).toBe(iso);
    }
  });
});

describe("ordenarRango", () => {
  it("intercambia los extremos si el fin quedó antes del inicio", () => {
    expect(ordenarRango("2026-07-24", "2026-07-01")).toEqual(["2026-07-01", "2026-07-24"]);
  });

  it("deja el rango intacto si ya está en orden", () => {
    expect(ordenarRango("2026-07-01", "2026-07-24")).toEqual(["2026-07-01", "2026-07-24"]);
  });

  it("no toca nada si falta un extremo", () => {
    expect(ordenarRango("2026-07-24", "")).toEqual(["2026-07-24", ""]);
    expect(ordenarRango("", "2026-07-24")).toEqual(["", "2026-07-24"]);
  });
});
