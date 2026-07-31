import { describe, expect, it } from "vitest";
import { sumarMinutosHora, diferenciaMinutos, HORA_FIN_AGENDA } from "@/lib/citas";

describe("sumarMinutosHora", () => {
  it("suma minutos dentro del mismo día", () => {
    expect(sumarMinutosHora("09:00", 30)).toBe("09:30");
    expect(sumarMinutosHora("09:45", 30)).toBe("10:15");
  });

  it("acota al tope de la agenda (HORA_FIN_AGENDA) en vez de pasarse de largo", () => {
    expect(sumarMinutosHora("20:45", 60)).toBe(`${HORA_FIN_AGENDA}:00`);
  });

  it("no se pasa del tope aunque ya esté justo en el límite", () => {
    expect(sumarMinutosHora(`${HORA_FIN_AGENDA}:00`, 30)).toBe(`${HORA_FIN_AGENDA}:00`);
  });
});

describe("diferenciaMinutos", () => {
  it("calcula los minutos entre hora de inicio y hora de fin", () => {
    expect(diferenciaMinutos("09:00", "09:30")).toBe(30);
    expect(diferenciaMinutos("09:00", "10:00")).toBe(60);
  });

  it("da 0 si inicio y fin son iguales (el formulario lo trata como inválido)", () => {
    expect(diferenciaMinutos("09:00", "09:00")).toBe(0);
  });

  it("da negativo si el fin es anterior al inicio (mismo criterio de invalidez)", () => {
    expect(diferenciaMinutos("10:00", "09:00")).toBeLessThan(0);
  });
});
