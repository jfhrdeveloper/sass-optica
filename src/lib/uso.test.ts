import { describe, expect, it } from "vitest";
import {
  ultimaActividad, etiquetaUltimaActividad, diasInactivo,
  eventosPorDia, heatmapDiaHora, picoDeUso, etiquetaPico, ultimaActividadPorNegocio,
  etiquetaRuta, modulosMasUsados, DIAS_SEMANA, type EventoUso,
} from "@/lib/uso";

/* Todos los timestamps de prueba están escritos en UTC pero pensados para
   caer en horas cómodas de Lima (UTC-5): "T15:00:00Z" es "10:00" en Lima. */

describe("ultimaActividad", () => {
  it("devuelve null sin eventos", () => {
    expect(ultimaActividad([])).toBeNull();
  });

  it("devuelve el createdAt más reciente, sin importar el orden de entrada", () => {
    const eventos: EventoUso[] = [
      { ruta: "/dashboard", createdAt: "2026-07-20T10:00:00Z" },
      { ruta: "/dashboard/ventas", createdAt: "2026-07-25T10:00:00Z" },
      { ruta: "/dashboard/clientes", createdAt: "2026-07-22T10:00:00Z" },
    ];
    expect(ultimaActividad(eventos)).toBe("2026-07-25T10:00:00Z");
  });
});

describe("etiquetaUltimaActividad", () => {
  const ahora = new Date("2026-07-28T12:00:00Z");

  it("sin actividad registrada cuando no hay fecha", () => {
    expect(etiquetaUltimaActividad(null, ahora)).toBe("Sin actividad registrada");
  });

  it("distingue minutos, horas y días", () => {
    expect(etiquetaUltimaActividad("2026-07-28T11:55:00Z", ahora)).toBe("Hace 5 min");
    expect(etiquetaUltimaActividad("2026-07-28T06:00:00Z", ahora)).toBe("Hace 6 h");
    expect(etiquetaUltimaActividad("2026-07-25T12:00:00Z", ahora)).toBe("Hace 3 d");
  });
});

describe("diasInactivo", () => {
  it("null si nunca hubo actividad", () => {
    expect(diasInactivo(null)).toBeNull();
  });

  it("cuenta días completos desde la última actividad", () => {
    const ahora = new Date("2026-07-28T12:00:00Z");
    expect(diasInactivo("2026-07-14T12:00:00Z", ahora)).toBe(14);
  });
});

describe("eventosPorDia", () => {
  it("incluye ceros para días sin eventos (no los omite)", () => {
    const ahora = new Date("2026-07-28T12:00:00Z");
    const serie = eventosPorDia([], 7, ahora);
    expect(serie).toHaveLength(7);
    expect(serie.every((p) => p.total === 0)).toBe(true);
  });

  it("agrupa por día civil en America/Lima, no en UTC", () => {
    const ahora = new Date("2026-07-28T12:00:00Z");
    /* 2026-07-28T02:00:00Z son las 21:00 del 27-jul en Lima (UTC-5): un
       agrupador que no convirtiera zona horaria lo contaría en el día
       equivocado. */
    const eventos: EventoUso[] = [{ ruta: "/dashboard", createdAt: "2026-07-28T02:00:00Z" }];
    const serie = eventosPorDia(eventos, 3, ahora);
    const dia27 = serie.find((p) => p.fecha === "2026-07-27");
    const dia28 = serie.find((p) => p.fecha === "2026-07-28");
    expect(dia27?.total).toBe(1);
    expect(dia28?.total).toBe(0);
  });

  it("último punto de la serie es siempre hoy", () => {
    const ahora = new Date("2026-07-28T12:00:00Z");
    const serie = eventosPorDia([], 5, ahora);
    expect(serie.at(-1)?.fecha).toBe("2026-07-28");
  });
});

describe("heatmapDiaHora", () => {
  it("devuelve una matriz 7×24 en ceros sin eventos", () => {
    const matriz = heatmapDiaHora([]);
    expect(matriz).toHaveLength(7);
    expect(matriz.every((fila) => fila.length === 24 && fila.every((c) => c === 0))).toBe(true);
  });

  it("ubica el evento en el día/hora de Lima, no de UTC", () => {
    /* 2026-07-27 (lunes) a las 15:00 UTC = 10:00 en Lima, mismo día. */
    const eventos: EventoUso[] = [{ ruta: "/dashboard", createdAt: "2026-07-27T15:00:00Z" }];
    const matriz = heatmapDiaHora(eventos);
    expect(matriz[0][10]).toBe(1); // lunes = índice 0
    const totalCeldas = matriz.flat().reduce((a, b) => a + b, 0);
    expect(totalCeldas).toBe(1);
  });

  it("cruzar medianoche UTC → Lima cae en el día anterior", () => {
    /* 2026-07-27T02:00:00Z = 2026-07-26 21:00 en Lima: domingo, no lunes. */
    const eventos: EventoUso[] = [{ ruta: "/dashboard", createdAt: "2026-07-27T02:00:00Z" }];
    const matriz = heatmapDiaHora(eventos);
    expect(matriz[6][21]).toBe(1); // domingo = índice 6
  });
});

describe("picoDeUso", () => {
  it("null sin eventos", () => {
    expect(picoDeUso([])).toBeNull();
  });

  it("encuentra la casilla día/hora con más eventos", () => {
    const eventos: EventoUso[] = [
      { ruta: "/dashboard", createdAt: "2026-07-27T15:00:00Z" }, // lunes 10h Lima
      { ruta: "/dashboard", createdAt: "2026-07-27T15:10:00Z" }, // mismo lunes 10h
      { ruta: "/dashboard", createdAt: "2026-07-28T15:00:00Z" }, // martes 10h, solo 1
    ];
    const pico = picoDeUso(eventos);
    expect(pico).toEqual({ dia: 0, hora: 10, total: 2 });
  });
});

describe("etiquetaPico", () => {
  it("null sin pico", () => {
    expect(etiquetaPico(null)).toBeNull();
  });

  it("formatea día largo y rango de hora con dos dígitos", () => {
    expect(etiquetaPico({ dia: 2, hora: 9 })).toBe("Miércoles, 09:00–10:00");
  });

  it("la hora 23 cruza a 00 sin romperse", () => {
    expect(etiquetaPico({ dia: 6, hora: 23 })).toBe("Domingo, 23:00–00:00");
  });
});

describe("ultimaActividadPorNegocio", () => {
  it("devuelve la fecha más reciente de cada negocio, no la global", () => {
    const eventos = [
      { negocioId: "a", createdAt: "2026-07-20T10:00:00Z" },
      { negocioId: "b", createdAt: "2026-07-25T10:00:00Z" },
      { negocioId: "a", createdAt: "2026-07-22T10:00:00Z" },
    ];
    const mapa = ultimaActividadPorNegocio(eventos);
    expect(mapa.get("a")).toBe("2026-07-22T10:00:00Z");
    expect(mapa.get("b")).toBe("2026-07-25T10:00:00Z");
  });

  it("un negocio sin eventos simplemente no aparece en el mapa", () => {
    const mapa = ultimaActividadPorNegocio([{ negocioId: "a", createdAt: "2026-07-20T10:00:00Z" }]);
    expect(mapa.has("c")).toBe(false);
  });
});

describe("DIAS_SEMANA", () => {
  it("empieza en lunes, igual que el resto del calendario del proyecto", () => {
    expect(DIAS_SEMANA[0]).toBe("Lun");
    expect(DIAS_SEMANA[6]).toBe("Dom");
    expect(DIAS_SEMANA).toHaveLength(7);
  });
});

describe("etiquetaRuta", () => {
  it("resuelve un link de primer nivel", () => {
    expect(etiquetaRuta("/dashboard/clientes")).toBe("Clientes");
  });

  it("resuelve un hijo dentro de un grupo", () => {
    expect(etiquetaRuta("/dashboard/ventas")).toBe("Ventas");
  });

  it("cae al segmento de la ruta si no la reconoce (nunca oculta el dato)", () => {
    expect(etiquetaRuta("/dashboard/algo-que-no-existe")).toBe("algo-que-no-existe");
  });

  it("la raíz del dashboard es Inicio", () => {
    expect(etiquetaRuta("/dashboard")).toBe("Inicio");
  });
});

describe("modulosMasUsados", () => {
  it("ordena de mayor a menor uso", () => {
    const eventos: EventoUso[] = [
      { ruta: "/dashboard/ventas", createdAt: "2026-07-27T15:00:00Z" },
      { ruta: "/dashboard/ventas", createdAt: "2026-07-27T16:00:00Z" },
      { ruta: "/dashboard/clientes", createdAt: "2026-07-27T15:00:00Z" },
    ];
    const top = modulosMasUsados(eventos);
    expect(top[0]).toEqual({ ruta: "/dashboard/ventas", label: "Ventas", total: 2 });
    expect(top[1]).toEqual({ ruta: "/dashboard/clientes", label: "Clientes", total: 1 });
  });

  it("respeta el límite `top`", () => {
    const eventos: EventoUso[] = [
      { ruta: "/dashboard/a", createdAt: "2026-07-27T15:00:00Z" },
      { ruta: "/dashboard/b", createdAt: "2026-07-27T15:00:00Z" },
      { ruta: "/dashboard/c", createdAt: "2026-07-27T15:00:00Z" },
    ];
    expect(modulosMasUsados(eventos, 2)).toHaveLength(2);
  });
});
