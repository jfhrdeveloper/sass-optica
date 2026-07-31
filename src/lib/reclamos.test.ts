import { describe, expect, it } from "vitest";
import { validarReclamo, construirHtmlConstanciaReclamo, type DatosReclamo } from "@/lib/reclamos";

function datos(patch: Partial<DatosReclamo> = {}): DatosReclamo {
  return {
    tipo: "reclamo",
    consumidorNombres: "Juan", consumidorApellidos: "Pérez",
    consumidorDocumentoTipo: "DNI", consumidorDocumentoNumero: "12345678",
    consumidorDomicilio: "Av. Siempre Viva 123, Lima",
    consumidorEmail: "juan@example.com",
    esMenorEdad: false,
    bienTipo: "servicio", bienDescripcion: "Plan Básico",
    detalle: "El sistema no cargó mi pago.",
    pedido: "Que se aplique el pago correctamente.",
    ...patch,
  };
}

describe("validarReclamo", () => {
  it("null (válido) cuando todos los campos obligatorios están completos", () => {
    expect(validarReclamo(datos())).toBeNull();
  });

  it("rechaza un tipo inválido", () => {
    expect(validarReclamo(datos({ tipo: undefined }))).toMatch(/reclamo o una queja/);
  });

  it("rechaza sin nombres/apellidos/documento/domicilio/email", () => {
    expect(validarReclamo(datos({ consumidorNombres: "" }))).toMatch(/nombres/);
    expect(validarReclamo(datos({ consumidorApellidos: "" }))).toMatch(/apellidos/);
    expect(validarReclamo(datos({ consumidorDocumentoNumero: "" }))).toMatch(/documento/);
    expect(validarReclamo(datos({ consumidorDomicilio: "" }))).toMatch(/domicilio/);
    expect(validarReclamo(datos({ consumidorEmail: "" }))).toMatch(/email/);
  });

  it("rechaza un tipo de bien inválido", () => {
    expect(validarReclamo(datos({ bienTipo: undefined }))).toMatch(/producto o un servicio/);
  });

  it("rechaza sin descripción/detalle/pedido", () => {
    expect(validarReclamo(datos({ bienDescripcion: "" }))).toMatch(/Describe/);
    expect(validarReclamo(datos({ detalle: "" }))).toMatch(/Detalla/);
    expect(validarReclamo(datos({ pedido: "" }))).toMatch(/pides/);
  });

  it("el teléfono es opcional", () => {
    expect(validarReclamo(datos({ consumidorTelefono: undefined }))).toBeNull();
  });

  it("exige el nombre del apoderado si el reclamante es menor de edad", () => {
    expect(validarReclamo(datos({ esMenorEdad: true, apoderadoNombre: undefined }))).toMatch(/padre, madre o apoderado/);
    expect(validarReclamo(datos({ esMenorEdad: true, apoderadoNombre: "Ana Pérez" }))).toBeNull();
  });

  it("el apoderado no es obligatorio si no es menor de edad", () => {
    expect(validarReclamo(datos({ esMenorEdad: false, apoderadoNombre: undefined }))).toBeNull();
  });
});

describe("construirHtmlConstanciaReclamo", () => {
  it("incluye el número de reclamo y los datos del consumidor", () => {
    const html = construirHtmlConstanciaReclamo("RC-000001", datos());
    expect(html).toContain("RC-000001");
    expect(html).toContain("Juan Pérez");
    expect(html).toContain("Plan Básico");
  });

  it("escapa HTML en campos de texto libre (defensa contra XSS)", () => {
    const html = construirHtmlConstanciaReclamo("RC-000002", datos({ detalle: "<script>alert(1)</script>" }));
    expect(html).not.toContain("<script>alert");
    expect(html).toContain("&lt;script&gt;");
  });

  it("solo muestra el monto reclamado cuando viene definido", () => {
    const sinMonto = construirHtmlConstanciaReclamo("RC-1", datos());
    const conMonto = construirHtmlConstanciaReclamo("RC-2", datos({ montoReclamado: 149.9 }));
    expect(sinMonto).not.toContain("Monto reclamado");
    expect(conMonto).toContain("S/ 149.90");
  });
});
