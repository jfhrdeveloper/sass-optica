import { describe, expect, it } from "vitest";
import { buscarDescuentoValido, montoDescuento } from "@/lib/descuentos";
import type { Descuento } from "@/components/providers/DataProvider";

function crear(patch: Partial<Descuento> = {}): Descuento {
  return {
    id: "1", negocioId: "n1", codigo: "VERANO10",
    tipo: "porcentaje", valor: 10, aplicaA: "ambos",
    usos: 0, activo: true,
    ...patch,
  };
}

describe("buscarDescuentoValido", () => {
  it("encuentra el cupón sin importar mayúsculas/minúsculas ni espacios", () => {
    const d = crear();
    expect(buscarDescuentoValido([d], " verano10 ", "ventas")).toBe(d);
  });

  it("devuelve null si el código no existe", () => {
    expect(buscarDescuentoValido([crear()], "NOEXISTE", "ventas")).toBeNull();
  });

  it("devuelve null con código vacío", () => {
    expect(buscarDescuentoValido([crear()], "  ", "ventas")).toBeNull();
  });

  it("devuelve null si el cupón está inactivo", () => {
    expect(buscarDescuentoValido([crear({ activo: false })], "VERANO10", "ventas")).toBeNull();
  });

  it("respeta el ámbito (aplicaA): un cupón de solo cotizaciones no vale en ventas", () => {
    const d = crear({ aplicaA: "cotizaciones" });
    expect(buscarDescuentoValido([d], "VERANO10", "ventas")).toBeNull();
    expect(buscarDescuentoValido([d], "VERANO10", "cotizaciones")).toBe(d);
  });

  it("un cupón 'ambos' vale en los dos contextos", () => {
    const d = crear({ aplicaA: "ambos" });
    expect(buscarDescuentoValido([d], "VERANO10", "ventas")).toBe(d);
    expect(buscarDescuentoValido([d], "VERANO10", "cotizaciones")).toBe(d);
  });

  it("rechaza fuera de vigencia (todavía no empieza / ya venció)", () => {
    const hoy = new Date().toISOString().slice(0, 10);
    const manana = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    expect(buscarDescuentoValido([crear({ vigenciaDesde: manana })], "VERANO10", "ventas")).toBeNull();
    expect(buscarDescuentoValido([crear({ vigenciaHasta: "2000-01-01" })], "VERANO10", "ventas")).toBeNull();
    expect(buscarDescuentoValido([crear({ vigenciaDesde: hoy, vigenciaHasta: hoy })], "VERANO10", "ventas")).not.toBeNull();
  });

  it("rechaza si ya alcanzó el límite de usos", () => {
    expect(buscarDescuentoValido([crear({ limiteUsos: 5, usos: 5 })], "VERANO10", "ventas")).toBeNull();
    expect(buscarDescuentoValido([crear({ limiteUsos: 5, usos: 4 })], "VERANO10", "ventas")).not.toBeNull();
  });

  it("sin límite de usos configurado, el conteo de usos no importa", () => {
    expect(buscarDescuentoValido([crear({ limiteUsos: undefined, usos: 999 })], "VERANO10", "ventas")).not.toBeNull();
  });
});

describe("montoDescuento", () => {
  it("calcula el porcentaje sobre la base", () => {
    expect(montoDescuento(crear({ tipo: "porcentaje", valor: 20 }), 100)).toBe(20);
  });

  it("usa el monto fijo tal cual cuando el tipo es 'monto'", () => {
    expect(montoDescuento(crear({ tipo: "monto", valor: 15 }), 100)).toBe(15);
  });

  it("nunca descuenta más que la base (un monto fijo mayor que la venta se acota)", () => {
    expect(montoDescuento(crear({ tipo: "monto", valor: 500 }), 100)).toBe(100);
  });

  it("nunca da un descuento negativo", () => {
    expect(montoDescuento(crear({ tipo: "monto", valor: -50 }), 100)).toBe(0);
  });
});
