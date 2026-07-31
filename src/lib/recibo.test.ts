import { describe, expect, it } from "vitest";
import { construirHtmlRecibo } from "@/lib/recibo";
import type { Venta, VentaItem } from "@/components/providers/DataProvider";

const venta: Venta = {
  id: "v1", negocioId: "n1", fecha: "2026-07-24T15:30:00.000Z",
  subtotal: 100, igv: 18, total: 118, metodoPago: "yape",
  estado: "pagada", montoPagado: 118,
};
const items: VentaItem[] = [
  { id: "i1", ventaId: "v1", descripcion: "Lente antirreflejo", cantidad: 2, precioUnitario: 50, subtotal: 100 },
];

describe("construirHtmlRecibo", () => {
  it("incluye negocio, cliente, ítems y totales", () => {
    const html = construirHtmlRecibo({ negocioNombre: "Óptica Visión", clienteNombre: "Juan Pérez", venta, items });
    expect(html).toContain("Óptica Visión");
    expect(html).toContain("Juan Pérez");
    expect(html).toContain("Lente antirreflejo");
    expect(html).toContain("S/ 118.00");
    expect(html).toContain("yape");
  });

  it("escapa HTML en campos de texto libre (defensa contra XSS vía nombre/descripción)", () => {
    const maligno = '<script>alert(1)</script>';
    const html = construirHtmlRecibo({
      negocioNombre: maligno, clienteNombre: "Cliente",
      venta, items: [{ ...items[0], descripcion: maligno }],
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("solo muestra el RUC cuando viene definido", () => {
    const sinRuc = construirHtmlRecibo({ negocioNombre: "N", clienteNombre: "C", venta, items });
    const conRuc = construirHtmlRecibo({ negocioNombre: "N", negocioRuc: "12345678901", clienteNombre: "C", venta, items });
    expect(sinRuc).not.toContain("RUC");
    expect(conRuc).toContain("RUC 12345678901");
  });
});
