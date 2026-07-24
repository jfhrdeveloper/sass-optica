"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Package, PackageSearch, Pencil } from "lucide-react";
import { useData, type Producto } from "@/components/providers/DataProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { SlideOver } from "@/components/SlideOver";
import { Stepper } from "@/components/Stepper";
import { Pagination } from "@/components/Pagination";
import { usePaginado } from "@/lib/hooks/usePaginado";

const CATEGORIAS = ["montura", "luna", "lente_contacto", "liquido", "accesorio", "servicio"] as const;
const TIPOS_MOVIMIENTO = ["entrada", "salida", "ajuste", "devolucion"] as const;
const VACIO: Partial<Producto> = { categoria: "montura", precioVenta: 0, precioCosto: 0, activo: true };

export default function ProductosPage() {
  const { productos, proveedores, addProducto, updateProducto, ajustarStock } = useData();
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

  const filtrados = productos
    .filter((p) => filtroCategoria === "todas" || p.categoria === filtroCategoria)
    .filter((p) => filtroEstado === "todos" || (filtroEstado === "activo" ? p.activo : !p.activo));
  const { pagina, setPagina, totalPaginas, visibles } = usePaginado(filtrados);

  return (
    <main>
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="text-sm font-medium link">← Inicio</Link>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Productos y stock</h1>
      </div>

      <div className="table-card mt-4">
        <div className="table-filter-bar">
          <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)} className="select text-sm">
            <option value="todas">Todas las categorías</option>
            {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value as typeof filtroEstado)} className="select text-sm">
            <option value="todos">Todos los estados</option>
            <option value="activo">Activo</option>
            <option value="borrador">Borrador</option>
          </select>
          <button onClick={nuevo} className="btn-primary ml-auto gap-1.5">
            <Plus size={16} /> Nuevo producto
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="table-head-cell">Producto</th>
                <th className="table-head-cell">Categoría</th>
                <th className="table-head-cell">Precio</th>
                <th className="table-head-cell">Stock</th>
                <th className="table-head-cell">Estado</th>
                <th className="table-head-cell text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((p) => (
                <tr key={p.id} className="table-row">
                  <td className="table-cell">
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
                  <td className="table-cell text-slate-600 capitalize dark:text-slate-300">{p.categoria.replace("_", " ")}</td>
                  <td className="table-cell text-slate-600 dark:text-slate-300">S/ {p.precioVenta.toFixed(2)}</td>
                  <td className={`table-cell ${p.stockActual <= p.stockMinimo ? "font-semibold text-red-600 dark:text-red-400" : "text-slate-600 dark:text-slate-300"}`}>
                    {p.stockActual}
                  </td>
                  <td className="table-cell">
                    <label className="inline-flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox" role="switch" checked={p.activo}
                        onChange={() => updateProducto(p.id, { activo: !p.activo })}
                        className="switch"
                      />
                      <span className="text-sm text-slate-600 dark:text-slate-300">{p.activo ? "Activo" : "Borrador"}</span>
                    </label>
                  </td>
                  <td className="table-cell text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => abrirAjuste(p)} title="Ajustar stock" className="row-icon-btn">
                        <PackageSearch size={15} />
                      </button>
                      <button onClick={() => editar(p)} title="Editar" className="row-icon-btn">
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
              <input placeholder="Nombre" required value={form.nombre ?? ""} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className="input w-full text-sm" />
              <select value={form.categoria ?? "montura"} onChange={(e) => setForm({ ...form, categoria: e.target.value })} className="select w-full text-sm">
                {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <input placeholder="Marca" value={form.marca ?? ""} onChange={(e) => setForm({ ...form, marca: e.target.value })} className="input w-full text-sm" />
              <input placeholder="Código" value={form.codigo ?? ""} onChange={(e) => setForm({ ...form, codigo: e.target.value })} className="input w-full text-sm" />
              <select value={form.proveedorId ?? ""} onChange={(e) => setForm({ ...form, proveedorId: e.target.value || undefined })} className="select w-full text-sm">
                <option value="">Sin proveedor</option>
                {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
              <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <input type="checkbox" checked={form.activo ?? true} onChange={(e) => setForm({ ...form, activo: e.target.checked })} className="checkbox" />
                Publicado como Activo (desmarca para dejarlo en Borrador)
              </label>
              <button type="button" disabled={!form.nombre} onClick={() => setPaso(2)} className="btn-primary mt-2 w-full">
                Siguiente
              </button>
            </>
          ) : (
            <>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">Precios y stock</p>
              <div className="grid grid-cols-2 gap-2">
                <input placeholder="Precio venta (S/)" type="number" step="0.01" value={form.precioVenta ?? 0} onChange={(e) => setForm({ ...form, precioVenta: Number(e.target.value) })} className="input text-sm" />
                <input placeholder="Precio costo (S/)" type="number" step="0.01" value={form.precioCosto ?? 0} onChange={(e) => setForm({ ...form, precioCosto: Number(e.target.value) })} className="input text-sm" />
              </div>
              {!editandoId && (
                <div className="grid grid-cols-2 gap-2">
                  <input placeholder="Stock inicial" type="number" value={stockInicial} onChange={(e) => setStockInicial(Number(e.target.value))} className="input text-sm" />
                  <input placeholder="Stock mínimo" type="number" value={stockMinimo} onChange={(e) => setStockMinimo(Number(e.target.value))} className="input text-sm" />
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
                {TIPOS_MOVIMIENTO.map((t) => <option key={t} value={t}>{t}</option>)}
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
    </main>
  );
}
