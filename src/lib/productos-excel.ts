import type { Producto, Proveedor } from "@/components/providers/DataProvider";

/* Import/export masivo de productos vía Excel — mismo criterio que
   lib/caja-excel.ts: `exceljs` se importa de forma dinámica, solo se
   descarga al hacer clic en "Exportar"/"Importar", no en el JS inicial de
   /dashboard/productos. El export usa EXACTAMENTE las mismas columnas que
   espera el import, así que "Exportar" duplica como plantilla lista para
   editar y volver a subir. */

export const CATEGORIAS_VALIDAS = ["montura", "luna", "lente_contacto", "liquido", "accesorio", "servicio"] as const;

const COLUMNAS = [
  { header: "Código", key: "codigo", width: 16 },
  { header: "Nombre", key: "nombre", width: 28 },
  { header: "Categoría", key: "categoria", width: 16 },
  { header: "Marca", key: "marca", width: 16 },
  { header: "Proveedor", key: "proveedor", width: 20 },
  { header: "Precio venta (S/)", key: "precioVenta", width: 16 },
  { header: "Precio costo (S/)", key: "precioCosto", width: 16 },
  { header: "Stock inicial", key: "stockInicial", width: 13 },
  { header: "Stock mínimo", key: "stockMinimo", width: 13 },
  { header: "Duración reposición (días)", key: "duracionReposicionDias", width: 22 },
  { header: "Garantía (meses)", key: "garantiaMeses", width: 16 },
] as const;

export async function generarExcelProductos(negocioNombre: string, productos: Producto[], proveedores: Proveedor[]): Promise<Blob> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = negocioNombre;
  wb.created = new Date();

  const nombreProveedor = new Map(proveedores.map((p) => [p.id, p.nombre]));
  const ws = wb.addWorksheet("Productos");
  ws.columns = [...COLUMNAS];

  const headerRow = ws.getRow(1);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2563EB" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });
  headerRow.height = 20;

  for (const p of productos) {
    ws.addRow({
      codigo: p.codigo ?? "", nombre: p.nombre, categoria: p.categoria, marca: p.marca ?? "",
      proveedor: p.proveedorId ? (nombreProveedor.get(p.proveedorId) ?? "") : "",
      precioVenta: p.precioVenta, precioCosto: p.precioCosto,
      stockInicial: p.stockActual, stockMinimo: p.stockMinimo,
      duracionReposicionDias: p.duracionReposicionDias ?? "", garantiaMeses: p.garantiaMeses ?? "",
    });
  }
  ws.getColumn("precioVenta").numFmt = '"S/" #,##0.00';
  ws.getColumn("precioCosto").numFmt = '"S/" #,##0.00';

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

export interface FilaProductoImportada {
  fila: number; // número de fila real en el Excel, para que el error sea ubicable
  codigo?: string;
  nombre: string;
  categoria: string;
  marca?: string;
  proveedorId?: string;
  precioVenta: number;
  precioCosto: number;
  stockInicial: number;
  stockMinimo: number;
  duracionReposicionDias?: number;
  garantiaMeses?: number;
}

export interface ResultadoImportacion {
  validas: FilaProductoImportada[];
  errores: { fila: number; mensaje: string }[];
}

function celda(row: import("exceljs").Row, key: string): unknown {
  const idx = COLUMNAS.findIndex((c) => c.key === key) + 1;
  const valor = row.getCell(idx).value;
  // exceljs devuelve fórmulas/richtext como objeto — nada de eso aplica acá, solo texto/número plano.
  return typeof valor === "object" && valor !== null && "result" in valor ? (valor as { result: unknown }).result : valor;
}
function texto(v: unknown): string | undefined {
  const s = v == null ? "" : String(v).trim();
  return s || undefined;
}
function numero(v: unknown): number | undefined {
  if (v === null || v === undefined || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/* Valida fila por fila (no aborta en el primer error — junta TODOS los
   errores de una pasada, así el usuario corrige el Excel una sola vez en
   vez de subirlo y encontrar el siguiente error recién en el segundo
   intento). El stock NUNCA se toca en una fila que coincide con un producto
   YA EXISTENTE (mismo código) — solo aplica como stock inicial de un
   producto nuevo. Tocar el stock de uno existente por import saltaría
   `movimientos_stock` (la trazabilidad que ajustarStock() mantiene), y
   "cuántas unidades tenías" no es algo que deba resolverse pisando un
   número en un Excel. */
export async function parsearExcelProductos(archivo: File, proveedores: Proveedor[]): Promise<ResultadoImportacion> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await archivo.arrayBuffer());
  const ws = wb.worksheets[0];

  const idProveedorPorNombre = new Map(proveedores.map((p) => [p.nombre.trim().toLowerCase(), p.id]));
  const validas: FilaProductoImportada[] = [];
  const errores: { fila: number; mensaje: string }[] = [];

  if (!ws) {
    errores.push({ fila: 0, mensaje: "El archivo no tiene ninguna hoja." });
    return { validas, errores };
  }

  ws.eachRow({ includeEmpty: false }, (row, numFila) => {
    if (numFila === 1) return; // encabezado
    const nombre = texto(celda(row, "nombre"));
    if (!nombre) return; // fila vacía al final del archivo — se ignora en silencio, no es un error

    const categoria = texto(celda(row, "categoria"))?.toLowerCase() ?? "";
    if (!CATEGORIAS_VALIDAS.includes(categoria as (typeof CATEGORIAS_VALIDAS)[number])) {
      errores.push({ fila: numFila, mensaje: `"${categoria || "(vacío)"}" no es una categoría válida (${CATEGORIAS_VALIDAS.join(", ")}).` });
      return;
    }
    const precioVenta = numero(celda(row, "precioVenta"));
    if (precioVenta === undefined || precioVenta < 0) {
      errores.push({ fila: numFila, mensaje: "Precio de venta inválido o vacío." });
      return;
    }
    const proveedorNombre = texto(celda(row, "proveedor"));
    const proveedorId = proveedorNombre ? idProveedorPorNombre.get(proveedorNombre.toLowerCase()) : undefined;
    if (proveedorNombre && !proveedorId) {
      errores.push({ fila: numFila, mensaje: `Proveedor "${proveedorNombre}" no existe — se importa sin proveedor asignado.` });
    }

    validas.push({
      fila: numFila,
      codigo: texto(celda(row, "codigo")),
      nombre,
      categoria,
      marca: texto(celda(row, "marca")),
      proveedorId,
      precioVenta,
      precioCosto: numero(celda(row, "precioCosto")) ?? 0,
      stockInicial: numero(celda(row, "stockInicial")) ?? 0,
      stockMinimo: numero(celda(row, "stockMinimo")) ?? 0,
      duracionReposicionDias: categoria === "lente_contacto" ? numero(celda(row, "duracionReposicionDias")) : undefined,
      garantiaMeses: numero(celda(row, "garantiaMeses")),
    });
  });

  return { validas, errores };
}
