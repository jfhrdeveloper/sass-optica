import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { parsearExcelProductos } from "@/lib/productos-excel";

const PROVEEDORES = [{ id: "prov-1", negocioId: "n1", nombre: "Óptica Distribuidora SAC", activo: true }];

/* Arma un .xlsx en memoria con las mismas columnas que exporta
   generarExcelProductos — evita depender de un archivo fixture versionado
   y prueba el parseo contra el shape real que produce exceljs. */
async function construirExcel(filas: Record<string, unknown>[]): Promise<File> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Productos");
  ws.columns = [
    { header: "Código", key: "codigo" }, { header: "Nombre", key: "nombre" },
    { header: "Categoría", key: "categoria" }, { header: "Marca", key: "marca" },
    { header: "Proveedor", key: "proveedor" }, { header: "Precio venta (S/)", key: "precioVenta" },
    { header: "Precio costo (S/)", key: "precioCosto" }, { header: "Stock inicial", key: "stockInicial" },
    { header: "Stock mínimo", key: "stockMinimo" }, { header: "Duración reposición (días)", key: "duracionReposicionDias" },
    { header: "Garantía (meses)", key: "garantiaMeses" },
  ];
  for (const f of filas) ws.addRow(f);
  const buffer = await wb.xlsx.writeBuffer();
  return new File([buffer], "productos.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

describe("parsearExcelProductos", () => {
  it("acepta una fila válida completa", async () => {
    const archivo = await construirExcel([
      { codigo: "AR-001", nombre: "Armazón Ray-Ban", categoria: "montura", marca: "Ray-Ban", proveedor: "Óptica Distribuidora SAC", precioVenta: 350, precioCosto: 180, stockInicial: 5, stockMinimo: 2 },
    ]);
    const { validas, errores } = await parsearExcelProductos(archivo, PROVEEDORES);
    expect(errores).toHaveLength(0);
    expect(validas).toHaveLength(1);
    expect(validas[0]).toMatchObject({ nombre: "Armazón Ray-Ban", categoria: "montura", proveedorId: "prov-1", precioVenta: 350 });
  });

  it("rechaza una categoría inválida sin abortar el resto del archivo", async () => {
    const archivo = await construirExcel([
      { nombre: "Producto malo", categoria: "categoria-inventada", precioVenta: 10 },
      { nombre: "Producto bueno", categoria: "luna", precioVenta: 20 },
    ]);
    const { validas, errores } = await parsearExcelProductos(archivo, PROVEEDORES);
    expect(errores).toHaveLength(1);
    expect(errores[0].mensaje).toMatch(/categoría válida/);
    expect(validas).toHaveLength(1);
    expect(validas[0].nombre).toBe("Producto bueno");
  });

  it("rechaza precio de venta vacío o negativo", async () => {
    const archivo = await construirExcel([
      { nombre: "Sin precio", categoria: "luna" },
      { nombre: "Precio negativo", categoria: "luna", precioVenta: -5 },
    ]);
    const { validas, errores } = await parsearExcelProductos(archivo, PROVEEDORES);
    expect(errores).toHaveLength(2);
    expect(validas).toHaveLength(0);
  });

  it("ignora filas vacías al final del archivo sin marcarlas como error", async () => {
    const archivo = await construirExcel([
      { nombre: "Producto real", categoria: "luna", precioVenta: 10 },
      {},
    ]);
    const { validas, errores } = await parsearExcelProductos(archivo, PROVEEDORES);
    expect(validas).toHaveLength(1);
    expect(errores).toHaveLength(0);
  });

  it("avisa (sin bloquear la fila) si el proveedor no existe", async () => {
    const archivo = await construirExcel([
      { nombre: "Producto", categoria: "luna", precioVenta: 10, proveedor: "Proveedor Fantasma" },
    ]);
    const { validas, errores } = await parsearExcelProductos(archivo, PROVEEDORES);
    expect(validas).toHaveLength(1);
    expect(validas[0].proveedorId).toBeUndefined();
    expect(errores).toHaveLength(1);
    expect(errores[0].mensaje).toMatch(/Proveedor Fantasma/);
  });

  it("duracionReposicionDias solo se toma en cuenta si la categoría es lente_contacto", async () => {
    const archivo = await construirExcel([
      { nombre: "Montura", categoria: "montura", precioVenta: 10, duracionReposicionDias: 30 },
      { nombre: "Lente", categoria: "lente_contacto", precioVenta: 10, duracionReposicionDias: 30 },
    ]);
    const { validas } = await parsearExcelProductos(archivo, PROVEEDORES);
    expect(validas[0].duracionReposicionDias).toBeUndefined();
    expect(validas[1].duracionReposicionDias).toBe(30);
  });
});
