import { describe, expect, it } from "vitest";
import { productosRelacionados } from "@/lib/venta-cruzada";

describe("productosRelacionados", () => {
  it("cuenta cuántas veces cada producto acompañó al elegido, ordenado de más a menos", () => {
    const items = [
      { ventaId: "v1", productoId: "armazon" }, { ventaId: "v1", productoId: "luna" },
      { ventaId: "v2", productoId: "armazon" }, { ventaId: "v2", productoId: "luna" },
      { ventaId: "v3", productoId: "armazon" }, { ventaId: "v3", productoId: "estuche" },
    ];
    expect(productosRelacionados("armazon", items)).toEqual(["luna", "estuche"]);
  });

  it("nunca incluye al propio producto entre los relacionados", () => {
    const items = [
      { ventaId: "v1", productoId: "armazon" }, { ventaId: "v1", productoId: "armazon" }, // duplicado en la misma venta, no debería auto-contarse
    ];
    expect(productosRelacionados("armazon", items)).toEqual([]);
  });

  it("ignora ítems sin producto ligado (ventas personalizadas/manuales)", () => {
    const items = [
      { ventaId: "v1", productoId: "armazon" }, { ventaId: "v1" }, // ítem manual, sin productoId
    ];
    expect(productosRelacionados("armazon", items)).toEqual([]);
  });

  it("respeta el límite de resultados", () => {
    const items = [
      { ventaId: "v1", productoId: "armazon" }, { ventaId: "v1", productoId: "a" },
      { ventaId: "v1", productoId: "b" }, { ventaId: "v1", productoId: "c" }, { ventaId: "v1", productoId: "d" },
    ];
    expect(productosRelacionados("armazon", items, 2)).toHaveLength(2);
  });

  it("devuelve vacío si el producto nunca apareció en ninguna venta", () => {
    expect(productosRelacionados("nuevo-sin-historial", [{ ventaId: "v1", productoId: "otro" }])).toEqual([]);
  });
});
