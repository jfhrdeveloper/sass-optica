import { describe, expect, it } from "vitest";
import { aCSV } from "@/lib/csv";

describe("aCSV", () => {
  it("une celdas con coma y filas con CRLF", () => {
    expect(aCSV([["a", "b"], ["c", "d"]])).toBe("﻿a,b\r\nc,d");
  });

  it("envuelve en comillas una celda que contiene coma", () => {
    expect(aCSV([["Lima, Perú"]])).toBe('﻿"Lima, Perú"');
  });

  it("duplica comillas internas (regla RFC 4180)", () => {
    expect(aCSV([['Dijo "hola"']])).toBe('﻿"Dijo ""hola"""');
  });

  it("envuelve en comillas una celda con salto de línea", () => {
    expect(aCSV([["línea1\nlínea2"]])).toContain('"línea1\nlínea2"');
  });

  it("no envuelve celdas simples sin caracteres especiales", () => {
    expect(aCSV([["Juan Pérez"]])).toBe("﻿Juan Pérez");
  });
});
