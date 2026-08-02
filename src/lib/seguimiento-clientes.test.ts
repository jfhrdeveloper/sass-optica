import { describe, expect, it } from "vitest";
import { calcularSeguimientos, calcularRecallControlAnual, seguimientosProximos, estaVencido } from "@/lib/seguimiento-clientes";

const PRODUCTOS = [
  { id: "lc-1", nombre: "Acuvue Oasys mensual", duracionReposicionDias: 30 },
  { id: "lc-2", nombre: "Lente diario", duracionReposicionDias: 1 },
  { id: "mont-1", nombre: "Armazón Ray-Ban", garantiaMeses: 12 },
  { id: "sin-seguimiento", nombre: "Estuche" },
];

describe("calcularSeguimientos", () => {
  it("calcula la fecha de reposición sumando los días a la fecha de venta", () => {
    const ventas = [{ id: "v1", clienteId: "c1", fecha: "2026-01-01" }];
    const items = [{ ventaId: "v1", productoId: "lc-1", descripcion: "" }];
    const seguimientos = calcularSeguimientos(ventas, items, PRODUCTOS);
    expect(seguimientos).toHaveLength(1);
    expect(seguimientos[0]).toMatchObject({ clienteId: "c1", tipo: "reposicion", fecha: "2026-01-31" });
  });

  it("calcula la garantía sumando meses, no días", () => {
    const ventas = [{ id: "v1", clienteId: "c1", fecha: "2026-01-15" }];
    const items = [{ ventaId: "v1", productoId: "mont-1", descripcion: "" }];
    const seguimientos = calcularSeguimientos(ventas, items, PRODUCTOS);
    expect(seguimientos[0]).toMatchObject({ tipo: "garantia", fecha: "2027-01-15" });
  });

  it("con varias compras del mismo cliente+producto, solo cuenta la reposición de la compra más reciente", () => {
    const ventas = [
      { id: "v1", clienteId: "c1", fecha: "2026-01-01" },
      { id: "v2", clienteId: "c1", fecha: "2026-02-01" }, // más reciente, reinicia el conteo
    ];
    const items = [
      { ventaId: "v1", productoId: "lc-1", descripcion: "" },
      { ventaId: "v2", productoId: "lc-1", descripcion: "" },
    ];
    const seguimientos = calcularSeguimientos(ventas, items, PRODUCTOS);
    expect(seguimientos).toHaveLength(1);
    expect(seguimientos[0].fecha).toBe("2026-03-03"); // desde v2, no desde v1
  });

  it("cada compra con garantía se lista por separado (2 monturas = 2 vencimientos)", () => {
    const ventas = [
      { id: "v1", clienteId: "c1", fecha: "2026-01-01" },
      { id: "v2", clienteId: "c1", fecha: "2026-06-01" },
    ];
    const items = [
      { ventaId: "v1", productoId: "mont-1", descripcion: "" },
      { ventaId: "v2", productoId: "mont-1", descripcion: "" },
    ];
    expect(calcularSeguimientos(ventas, items, PRODUCTOS)).toHaveLength(2);
  });

  it("ignora productos sin duracionReposicionDias ni garantiaMeses", () => {
    const ventas = [{ id: "v1", clienteId: "c1", fecha: "2026-01-01" }];
    const items = [{ ventaId: "v1", productoId: "sin-seguimiento", descripcion: "" }];
    expect(calcularSeguimientos(ventas, items, PRODUCTOS)).toHaveLength(0);
  });

  it("ignora ventas sin cliente (venta anónima) o ítems sin producto ligado", () => {
    const ventas = [{ id: "v1", fecha: "2026-01-01" }, { id: "v2", clienteId: "c1", fecha: "2026-01-01" }];
    const items = [
      { ventaId: "v1", productoId: "lc-1", descripcion: "" },
      { ventaId: "v2", descripcion: "ítem suelto sin producto" },
    ];
    expect(calcularSeguimientos(ventas, items, PRODUCTOS)).toHaveLength(0);
  });
});

describe("seguimientosProximos / estaVencido", () => {
  const hoy = new Date("2026-03-15");

  it("incluye lo vencido y lo próximo dentro de la ventana, excluye lo lejano", () => {
    const seguimientos = [
      { clienteId: "c1", ventaId: "v1", productoNombre: "A", tipo: "reposicion" as const, fecha: "2026-03-01" }, // vencido
      { clienteId: "c1", ventaId: "v2", productoNombre: "B", tipo: "reposicion" as const, fecha: "2026-03-25" }, // próximo
      { clienteId: "c1", ventaId: "v3", productoNombre: "C", tipo: "garantia" as const, fecha: "2026-08-01" },   // lejano
    ];
    const resultado = seguimientosProximos(seguimientos, 30, hoy);
    expect(resultado.map((s) => s.productoNombre)).toEqual(["A", "B"]);
  });

  it("estaVencido compara contra hoy", () => {
    expect(estaVencido("2026-03-01", hoy)).toBe(true);
    expect(estaVencido("2026-03-20", hoy)).toBe(false);
  });
});

describe("calcularRecallControlAnual", () => {
  it("calcula el recall 12 meses después de la última receta o examen, lo que sea más reciente", () => {
    const recetas = [{ clienteId: "c1", fecha: "2026-01-15" }];
    const examenes = [{ clienteId: "c1", fecha: "2026-03-01" }]; // más reciente que la receta
    const recalls = calcularRecallControlAnual(recetas, examenes);
    expect(recalls).toHaveLength(1);
    expect(recalls[0]).toMatchObject({ clienteId: "c1", tipo: "control_anual", fecha: "2027-03-01" });
  });

  it("con varias visitas del mismo cliente, solo cuenta la más reciente", () => {
    const recetas = [
      { clienteId: "c1", fecha: "2025-01-01" },
      { clienteId: "c1", fecha: "2026-01-01" },
    ];
    const recalls = calcularRecallControlAnual(recetas, []);
    expect(recalls).toHaveLength(1);
    expect(recalls[0].fecha).toBe("2027-01-01");
  });

  it("respeta un mesesControl distinto al default", () => {
    const recalls = calcularRecallControlAnual([{ clienteId: "c1", fecha: "2026-01-01" }], [], 6);
    expect(recalls[0].fecha).toBe("2026-07-01");
  });

  it("un cliente sin ninguna receta ni examen no genera recall", () => {
    expect(calcularRecallControlAnual([], [])).toHaveLength(0);
  });
});
