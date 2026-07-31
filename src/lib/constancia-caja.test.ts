import { describe, expect, it } from "vitest";
import { construirHtmlConstanciaCierre } from "@/lib/constancia-caja";
import type { Caja } from "@/components/providers/DataProvider";

const caja: Caja = {
  id: "caja-1", negocioId: "n1",
  fechaApertura: "2026-07-24T08:00:00.000Z", fechaCierre: "2026-07-24T20:00:00.000Z",
  montoInicial: 100,
  desgloseApertura: [{ metodo: "Efectivo", monto: 100 }],
  totalEfectivo: 250, totalTarjeta: 300, totalYape: 50, totalPlin: 0, totalTransferencia: 0,
  montoEfectivoEsperado: 350, montoEfectivoContado: 348, diferencia: -2,
  estado: "cerrada",
};

describe("construirHtmlConstanciaCierre", () => {
  it("incluye negocio, totales por método y la diferencia", () => {
    const html = construirHtmlConstanciaCierre({ negocioNombre: "Óptica Visión", caja });
    expect(html).toContain("Óptica Visión");
    expect(html).toContain("S/ 250.00");
    expect(html).toContain("S/ 300.00");
    expect(html).toContain("S/ -2.00");
  });

  it("escapa HTML en campos de texto libre (defensa contra XSS)", () => {
    const maligno = "<script>alert(1)</script>";
    const html = construirHtmlConstanciaCierre({ negocioNombre: maligno, empleadoAperturaNombre: maligno, caja });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("solo muestra empleados de apertura/cierre cuando vienen definidos", () => {
    const sinEmpleados = construirHtmlConstanciaCierre({ negocioNombre: "N", caja });
    const conEmpleados = construirHtmlConstanciaCierre({ negocioNombre: "N", empleadoAperturaNombre: "Ana", empleadoCierreNombre: "Luis", caja });
    expect(sinEmpleados).not.toContain("Abierta por");
    expect(conEmpleados).toContain("Ana");
    expect(conEmpleados).toContain("Luis");
  });
});
