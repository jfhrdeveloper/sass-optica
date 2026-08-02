"use client";

import { useRef, useState } from "react";
import { Plus, Package, PackageSearch, Pencil, ScanBarcode, Download, Upload, X } from "lucide-react";
import { useData, type Producto } from "@/components/providers/DataProvider";
import { useSession } from "@/components/providers/SessionProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { SlideOver } from "@/components/ui/SlideOver";
import { Stepper } from "@/components/ui/Stepper";
import { Pagination } from "@/components/ui/Pagination";
import { EscanerCodigoBarras } from "@/components/ui/EscanerCodigoBarras";
import { usePaginado } from "@/lib/hooks/usePaginado";
import { descargarBlob } from "@/lib/archivo";
import { generarExcelProductos, parsearExcelProductos } from "@/lib/productos-excel";

const CATEGORIAS = ["montura", "luna", "lente_contacto", "liquido", "accesorio", "servicio"] as const;
const CATEGORIA_LABEL: Record<(typeof CATEGORIAS)[number], string> = {
  montura: "Montura",
  luna: "Luna",
  lente_contacto: "Lente de contacto",
  liquido: "Líquido",
  accesorio: "Accesorio",
  servicio: "Servicio",
};
const TIPOS_MOVIMIENTO = ["entrada", "salida", "ajuste", "devolucion"] as const;
const TIPO_MOVIMIENTO_LABEL: Record<(typeof TIPOS_MOVIMIENTO)[number], string> = {
  entrada: "Entrada",
  salida: "Salida",
  ajuste: "Ajuste",
  devolucion: "Devolución",
};
// Sin categoría por default (antes "montura") — mismo motivo que el fix de
// categoría en gastos/page.tsx: forzar una elección a propósito en vez de
// heredar en silencio la primera opción de la lista.
const VACIO: Partial<Producto> = { precioVenta: 0, precioCosto: 0, activo: true };

export default function ProductosPage() {
  const { negocio, productos, proveedores, addProducto, updateProducto, ajustarStock } = useData();
  const { empleado } = useSession();
  // El margen (precio de costo) es un dato financiero: el brief dice
  // explícitamente que el rol "trabajador" ve solo ventas/atención y
  // consulta de stock, sin reportes financieros. Sin este gate cualquier
  // vendedor veía el costo real de cada producto en el paso 2 del formulario.
  const puedeVerCosto = empleado?.rol !== "trabajador";
  const toast = useToast();
  const [form, setForm] = useState<Partial<Producto>>(VACIO);
  const [stockInicial, setStockInicial] = useState(0);
  const [stockMinimo, setStockMinimo] = useState(0);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const [paso, setPaso] = useState(1);

  /* Ajuste de stock: antes era un window.prompt() (diálogo nativo del
     navegador, sin estilo, bloquea toda la página) — ahora un SlideOver
     propio, consistente con el resto del panel, y expone el `tipo` real del
     movimiento (entrada/salida/ajuste/devolución) en vez de forzar todo a
     "ajuste manual". */
  const [productoAjuste, setProductoAjuste] = useState<Producto | null>(null);
  const [tipoMov, setTipoMov] = useState<(typeof TIPOS_MOVIMIENTO)[number]>("ajuste");
  const [cantidadMov, setCantidadMov] = useState(0);
  const [motivoMov, setMotivoMov] = useState("");
  const [guardandoMov, setGuardandoMov] = useState(false);

  const [filtroCategoria, setFiltroCategoria] = useState("todas");
  const [filtroEstado, setFiltroEstado] = useState<"todos" | "activo" | "borrador">("todos");
  const [escanerAbierto, setEscanerAbierto] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [erroresImportacion, setErroresImportacion] = useState<{ fila: number; mensaje: string }[]>([]);
  const inputImportarRef = useRef<HTMLInputElement>(null);

  function nuevo() {
    setEditandoId(null);
    setForm(VACIO);
    setStockInicial(0);
    setStockMinimo(0);
    setPaso(1);
    setAbierto(true);
  }
  function editar(p: Producto) {
    setEditandoId(p.id);
    setForm(p);
    setPaso(1);
    setAbierto(true);
  }
  function cerrar() {
    setAbierto(false);
    setEditandoId(null);
    setForm(VACIO);
    setStockInicial(0);
    setStockMinimo(0);
    setPaso(1);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombre) return;
    setGuardando(true);
    if (editandoId) {
      await updateProducto(editandoId, form);
      toast("Cambios guardados.");
    } else {
      await addProducto(form, stockInicial, stockMinimo);
      toast("Producto agregado.");
    }
    setGuardando(false);
    cerrar();
  }

  /* Arranca en "ajuste" con el stock actual precargado (equivalente al
     prompt anterior: "aquí está el número de hoy, corrígelo si hace
     falta") — cambiar a entrada/salida/devolución reinterpreta ese mismo
     campo como cantidad a sumar/restar en vez de total nuevo, ver el label
     condicional del formulario más abajo y ajustarStock() en
     DataProvider.tsx (el delta solo se calcula ahí para tipos != "ajuste"). */
  function abrirAjuste(p: Producto) {
    setProductoAjuste(p);
    setTipoMov("ajuste");
    setCantidadMov(p.stockActual);
    setMotivoMov("");
  }
  function cerrarAjuste() {
    setProductoAjuste(null);
    setCantidadMov(0);
    setMotivoMov("");
  }
  async function onSubmitAjuste(e: React.FormEvent) {
    e.preventDefault();
    if (!productoAjuste) return;
    setGuardandoMov(true);
    await ajustarStock(productoAjuste.id, tipoMov, cantidadMov, motivoMov || undefined);
    setGuardandoMov(false);
    toast("Stock actualizado.");
    cerrarAjuste();
  }

  /* Escanear busca por `codigo` (el "código interno" que ya existe en el
     formulario) y abre directo la ficha del producto para editar/ajustar
     stock — más rápido que filtrar una lista y buscarlo a ojo. */
  function onEscaneado(codigo: string) {
    setEscanerAbierto(false);
    const encontrado = productos.find((p) => p.codigo === codigo);
    if (encontrado) editar(encontrado);
    else toast(`Ningún producto tiene el código "${codigo}".`, "error");
  }

  async function exportarExcel() {
    setExportando(true);
    const blob = await generarExcelProductos(negocio?.nombre ?? "Óptica", productos, proveedores);
    descargarBlob(`productos-${negocio?.subdominio ?? "optica"}.xlsx`, blob);
    setExportando(false);
  }

  /* Actualiza por `codigo` (si coincide con un producto ya existente) o crea
     uno nuevo — nunca toca el stock de uno existente, ver el comentario en
     parsearExcelProductos(). Secuencial (no Promise.all): son escrituras a
     la misma tabla, en paralelo se arriesga a pisarse entre sí si dos filas
     comparten código por error de tipeo en el Excel. */
  async function onImportarExcel(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;
    setImportando(true);
    setErroresImportacion([]);
    const { validas, errores } = await parsearExcelProductos(archivo, proveedores);
    let creados = 0, actualizados = 0;
    for (const fila of validas) {
      const existente = fila.codigo ? productos.find((p) => p.codigo === fila.codigo) : undefined;
      const datos: Partial<Producto> = {
        codigo: fila.codigo, nombre: fila.nombre, categoria: fila.categoria, marca: fila.marca,
        proveedorId: fila.proveedorId, precioVenta: fila.precioVenta, precioCosto: fila.precioCosto,
        duracionReposicionDias: fila.duracionReposicionDias, garantiaMeses: fila.garantiaMeses,
      };
      if (existente) {
        await updateProducto(existente.id, datos);
        actualizados++;
      } else {
        await addProducto(datos, fila.stockInicial, fila.stockMinimo);
        creados++;
      }
    }
    setImportando(false);
    setErroresImportacion(errores);
    toast(
      `Importación lista: ${creados} nuevos, ${actualizados} actualizados${errores.length ? `, ${errores.length} filas con error` : ""}.`,
      errores.length ? "error" : "success",
    );
  }

  const filtrados = productos
    .filter((p) => filtroCategoria === "todas" || p.categoria === filtroCategoria)
    .filter((p) => filtroEstado === "todos" || (filtroEstado === "activo" ? p.activo : !p.activo));
  const { pagina, setPagina, totalPaginas, visibles } = usePaginado(filtrados);

  return (
    <main>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Productos y stock</h1>

      <div className="table-card mt-4">
        <div className="table-filter-bar">
          <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)} className="select text-sm">
            <option value="todas">Todas las categorías</option>
            {CATEGORIAS.map((c) => <option key={c} value={c}>{CATEGORIA_LABEL[c]}</option>)}
          </select>
          <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value as typeof filtroEstado)} className="select text-sm">
            <option value="todos">Todos los estados</option>
            <option value="activo">Activo</option>
            <option value="borrador">Borrador</option>
          </select>
          <button onClick={() => setEscanerAbierto(true)} className="btn-outline ml-auto gap-1.5">
            <ScanBarcode size={16} /> Escanear
          </button>
          <button onClick={exportarExcel} disabled={exportando} className="btn-outline gap-1.5">
            <Download size={16} /> {exportando ? "Exportando…" : "Exportar"}
          </button>
          <button onClick={() => inputImportarRef.current?.click()} disabled={importando} className="btn-outline gap-1.5">
            <Upload size={16} /> {importando ? "Importando…" : "Importar"}
          </button>
          <input ref={inputImportarRef} type="file" accept=".xlsx" onChange={onImportarExcel} className="hidden" />
          <button onClick={nuevo} className="btn-primary gap-1.5">
            <Plus size={16} /> Nuevo producto
          </button>
        </div>

        {erroresImportacion.length > 0 && (
          <div className="mx-4 mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium">{erroresImportacion.length} fila{erroresImportacion.length === 1 ? "" : "s"} del Excel no se importaron:</p>
              <button onClick={() => setErroresImportacion([])} aria-label="Cerrar" className="shrink-0 text-red-600 hover:text-red-800 dark:text-red-400">
                <X size={15} />
              </button>
            </div>
            <ul className="mt-1.5 list-disc space-y-0.5 pl-5">
              {erroresImportacion.map((e, i) => <li key={i}>Fila {e.fila}: {e.mensaje}</li>)}
            </ul>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="table-head-cell">Producto</th>
                <th className="table-head-cell hidden md:table-cell">Categoría</th>
                <th className="table-head-cell">Precio</th>
                <th className="table-head-cell">Stock</th>
                <th className="table-head-cell">Estado</th>
                <th className="table-head-cell text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((p) => (
                <tr key={p.id} className="table-row">
                  <td className="table-body-cell">
                    <div className="flex items-center gap-3">
                      <span className="row-avatar"><Package size={16} /></span>
                      <span>
                        <span className="block font-medium text-slate-900 dark:text-slate-100">{p.nombre}</span>
                        <span className="block text-xs text-slate-400 dark:text-slate-500">
                          {p.marca ?? "—"}{p.codigo ? ` · ${p.codigo}` : ""}
                        </span>
                      </span>
                    </div>
                  </td>
                  <td className="table-body-cell hidden md:table-cell text-slate-600 dark:text-slate-300">{CATEGORIA_LABEL[p.categoria as (typeof CATEGORIAS)[number]] ?? p.categoria}</td>
                  <td className="table-body-cell text-slate-600 dark:text-slate-300">S/ {p.precioVenta.toFixed(2)}</td>
                  <td className={`table-body-cell ${p.stockActual <= p.stockMinimo ? "font-semibold text-red-600 dark:text-red-400" : "text-slate-600 dark:text-slate-300"}`}>
                    {p.stockActual}
                  </td>
                  <td className="table-body-cell">
                    <label className="inline-flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox" role="switch" checked={p.activo}
                        onChange={() => updateProducto(p.id, { activo: !p.activo })}
                        className="switch"
                      />
                      <span className="text-sm text-slate-600 dark:text-slate-300">{p.activo ? "Activo" : "Borrador"}</span>
                    </label>
                  </td>
                  <td className="table-body-cell text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => abrirAjuste(p)} title="Ajustar stock" aria-label={`Ajustar stock de ${p.nombre}`} className="row-icon-btn">
                        <PackageSearch size={15} />
                      </button>
                      <button onClick={() => editar(p)} title="Editar" aria-label={`Editar ${p.nombre}`} className="row-icon-btn">
                        <Pencil size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtrados.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <div className="table-empty">
                      <Package size={28} className="text-slate-300 dark:text-slate-600" />
                      Sin productos para este filtro.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination pagina={pagina} totalPaginas={totalPaginas} onCambiar={setPagina} />
      </div>

      <SlideOver abierto={abierto} onClose={cerrar} titulo={editandoId ? "Editar producto" : "Nuevo producto"}>
        <Stepper paso={paso} total={2} />
        <form onSubmit={onSubmit} className="space-y-3">
          {paso === 1 ? (
            <>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">Datos básicos</p>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Nombre del producto</label>
                <input placeholder="Ej. Ray-Ban Aviator" required value={form.nombre ?? ""} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className="input mt-1 w-full text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Categoría</label>
                <select
                  value={form.categoria ?? ""}
                  onChange={(e) => {
                    const categoria = e.target.value;
                    // Los 3 campos de lente de contacto solo son válidos con esta
                    // categoría (constraint de DB) — se limpian al cambiar a otra,
                    // para no arrastrar valores que el submit rechazaría en silencio.
                    setForm(categoria === "lente_contacto"
                      ? { ...form, categoria }
                      : { ...form, categoria, curvaBase: undefined, diametro: undefined, potencia: undefined });
                  }}
                  className="select mt-1 w-full text-sm"
                >
                  <option value="" disabled>Elegir categoría…</option>
                  {CATEGORIAS.map((c) => <option key={c} value={c}>{CATEGORIA_LABEL[c]}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Marca (opcional)</label>
                <input placeholder="Ej. Ray-Ban" value={form.marca ?? ""} onChange={(e) => setForm({ ...form, marca: e.target.value })} className="input mt-1 w-full text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Código o SKU (opcional)</label>
                <input placeholder="Tu código interno para identificarlo" value={form.codigo ?? ""} onChange={(e) => setForm({ ...form, codigo: e.target.value })} className="input mt-1 w-full text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Proveedor (opcional)</label>
                <select value={form.proveedorId ?? ""} onChange={(e) => setForm({ ...form, proveedorId: e.target.value || undefined })} className="select mt-1 w-full text-sm">
                  <option value="">Sin proveedor</option>
                  {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <input type="checkbox" checked={form.activo ?? true} onChange={(e) => setForm({ ...form, activo: e.target.checked })} className="checkbox" />
                Publicado como Activo (desmarca para dejarlo en Borrador)
              </label>
              <button type="button" disabled={!form.nombre || !form.categoria} onClick={() => setPaso(2)} className="btn-primary mt-2 w-full">
                Siguiente
              </button>
            </>
          ) : (
            <>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">Precios y stock</p>
              <div className={puedeVerCosto ? "grid grid-cols-2 gap-2" : ""}>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Precio de venta (S/)</label>
                  <input type="number" step="0.01" value={form.precioVenta ?? 0} onChange={(e) => setForm({ ...form, precioVenta: Number(e.target.value) })} className="input mt-1 w-full text-sm" />
                </div>
                {puedeVerCosto && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Precio de costo (S/)</label>
                    <input type="number" step="0.01" value={form.precioCosto ?? 0} onChange={(e) => setForm({ ...form, precioCosto: Number(e.target.value) })} className="input mt-1 w-full text-sm" />
                  </div>
                )}
              </div>
              {form.categoria === "lente_contacto" && (
                <>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">Parámetros del lente de contacto</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Curva base</label>
                      <input type="number" step="0.01" placeholder="8.60" value={form.curvaBase ?? ""} onChange={(e) => setForm({ ...form, curvaBase: e.target.value ? Number(e.target.value) : undefined })} className="input mt-1 w-full text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Diámetro</label>
                      <input type="number" step="0.01" placeholder="14.20" value={form.diametro ?? ""} onChange={(e) => setForm({ ...form, diametro: e.target.value ? Number(e.target.value) : undefined })} className="input mt-1 w-full text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Potencia</label>
                      <input type="number" step="0.01" placeholder="-2.50" value={form.potencia ?? ""} onChange={(e) => setForm({ ...form, potencia: e.target.value ? Number(e.target.value) : undefined })} className="input mt-1 w-full text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Duración de una caja (días)</label>
                    <input type="number" placeholder="30" value={form.duracionReposicionDias ?? ""} onChange={(e) => setForm({ ...form, duracionReposicionDias: e.target.value ? Number(e.target.value) : undefined })} className="input mt-1 w-full text-sm" />
                    <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                      Con esto avisamos a tus clientes cuándo les toca reponer (ej. 30 para mensual, 1 para diario).
                    </p>
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Garantía del proveedor (meses)</label>
                <input type="number" placeholder="Opcional" value={form.garantiaMeses ?? ""} onChange={(e) => setForm({ ...form, garantiaMeses: e.target.value ? Number(e.target.value) : undefined })} className="input mt-1 w-full text-sm" />
              </div>
              {!editandoId && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Stock inicial</label>
                    <input type="number" value={stockInicial} onChange={(e) => setStockInicial(Number(e.target.value))} className="input mt-1 w-full text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Stock mínimo</label>
                    <input type="number" value={stockMinimo} onChange={(e) => setStockMinimo(Number(e.target.value))} className="input mt-1 w-full text-sm" />
                    <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Se marca en rojo cuando el stock baje de aquí.</p>
                  </div>
                </div>
              )}
              <div className="mt-2 flex gap-2">
                <button type="button" onClick={() => setPaso(1)} className="btn-outline flex-1">Atrás</button>
                <button type="submit" disabled={guardando} className="btn-primary flex-1">
                  {editandoId ? "Guardar cambios" : "Agregar producto"}
                </button>
              </div>
            </>
          )}
        </form>
      </SlideOver>

      <SlideOver abierto={Boolean(productoAjuste)} onClose={cerrarAjuste} titulo="Ajustar stock">
        {productoAjuste && (
          <form onSubmit={onSubmitAjuste} className="space-y-3">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {productoAjuste.nombre} — stock actual: <strong>{productoAjuste.stockActual}</strong>
            </p>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Tipo de movimiento</label>
              <select value={tipoMov} onChange={(e) => setTipoMov(e.target.value as typeof tipoMov)} className="select mt-1 w-full text-sm">
                {TIPOS_MOVIMIENTO.map((t) => <option key={t} value={t}>{TIPO_MOVIMIENTO_LABEL[t]}</option>)}
              </select>
            </div>
            {/* El label cambia de significado según el tipo: en "ajuste" el
                número ES el stock final; en entrada/salida/devolución es
                cuánto se suma o resta al stock que ya había. */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                {tipoMov === "ajuste" ? "Nuevo stock actual" : "Cantidad"}
              </label>
              <input
                type="number" min={0} required value={cantidadMov}
                onChange={(e) => setCantidadMov(Number(e.target.value))}
                className="input mt-1 w-full text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Motivo (opcional)</label>
              <input
                value={motivoMov} onChange={(e) => setMotivoMov(e.target.value)}
                placeholder="Ej. conteo físico, producto dañado…"
                className="input mt-1 w-full text-sm"
              />
            </div>
            <button type="submit" disabled={guardandoMov} className="btn-primary w-full">
              {guardandoMov ? "Guardando…" : "Guardar ajuste"}
            </button>
          </form>
        )}
      </SlideOver>

      <EscanerCodigoBarras abierto={escanerAbierto} onCerrar={() => setEscanerAbierto(false)} onDetectado={onEscaneado} />
    </main>
  );
}
