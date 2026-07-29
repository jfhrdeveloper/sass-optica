"use client";

import { useMemo, useState } from "react";
import { FileText, ArrowRightCircle, Trash2, RotateCcw } from "lucide-react";
import { useData, type Cotizacion, type CotizacionItem } from "@/components/providers/DataProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Pagination } from "@/components/ui/Pagination";
import { usePaginado } from "@/lib/hooks/usePaginado";
import { formatearFechaPE } from "@/lib/formato/date";
import { DatePicker } from "@/components/calendario/DatePicker";
import { buscarDescuentoValido, montoDescuento } from "@/lib/descuentos";

/* Label visible arriba de cada campo del formulario "Nueva cotización" — el
   `placeholder`/`aria-label` de los selects y de DatePicker desaparece en
   cuanto el usuario elige un valor, así que sin esto no hay forma de
   recordar qué campo es cada uno una vez lleno (queja real de usuario). */
function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">{label}</label>
      {children}
    </div>
  );
}

const IGV = 0.18;
type ItemForm = Omit<CotizacionItem, "id" | "cotizacionId">;

const ESTADO_BADGE: Record<Cotizacion["estado"], string> = {
  pendiente: "badge-neutral",
  aceptada: "badge-success",
  rechazada: "badge-danger",
  vencida: "badge-neutral",
};
const ESTADO_LABEL: Record<Cotizacion["estado"], string> = {
  pendiente: "Pendiente",
  aceptada: "Aceptada",
  rechazada: "Rechazada",
  vencida: "Vencida",
};

/* Extraído del research de competencia (sistema de facturación SUNAT):
   documento previo a la venta, no toca stock ni caja hasta que se
   convierte — ver convertirCotizacionAVenta en DataProvider.tsx. */
export default function CotizacionesPage() {
  const { cotizaciones, cotizacionItems, clientes, productos, descuentos, addCotizacion, updateCotizacion, updateDescuento, deleteCotizacion, convertirCotizacionAVenta } = useData();
  const toast = useToast();
  const [clienteId, setClienteId] = useState("");
  const [vigenciaHasta, setVigenciaHasta] = useState("");
  const [items, setItems] = useState<ItemForm[]>([]);
  const [modoItem, setModoItem] = useState<"catalogo" | "personalizado">("catalogo");
  const [productoId, setProductoId] = useState("");
  const [descripcionManual, setDescripcionManual] = useState("");
  const [precioManual, setPrecioManual] = useState(0);
  const [cantidad, setCantidad] = useState(1);
  const [codigoDescuento, setCodigoDescuento] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [convirtiendoId, setConvirtiendoId] = useState<string | null>(null);
  const [confirmarEliminar, setConfirmarEliminar] = useState<Cotizacion | null>(null);

  const [filtroEstado, setFiltroEstado] = useState<"todos" | Cotizacion["estado"]>("todos");

  const itemsTotal = useMemo(() => items.reduce((acc, it) => acc + it.subtotal, 0), [items]);
  const descuentoAplicado = useMemo(
    () => buscarDescuentoValido(descuentos, codigoDescuento, "cotizaciones"),
    [descuentos, codigoDescuento],
  );
  const descuentoMonto = descuentoAplicado ? montoDescuento(descuentoAplicado, itemsTotal) : 0;
  const total = itemsTotal - descuentoMonto;
  const subtotal = total / (1 + IGV);
  const igv = total - subtotal;

  function agregarItem() {
    const producto = productos.find((p) => p.id === productoId);
    if (!producto) return;
    setItems([...items, {
      productoId: producto.id, descripcion: producto.nombre,
      cantidad, precioUnitario: producto.precioVenta, subtotal: producto.precioVenta * cantidad,
    }]);
    setProductoId("");
    setCantidad(1);
  }

  /* Ítem "personalizado": para negocios que recién arrancan y todavía no
     tienen todo su catálogo cargado en Stock, o para conceptos que nunca
     son un producto propio (montura + luna + antireflejo/UV, cada uno con
     su propio precio a mano). Sin `productoId`, igual que cualquier línea
     que no venga del catálogo (ver tipo CotizacionItem). */
  function agregarItemManual() {
    if (!descripcionManual.trim() || precioManual <= 0) return;
    setItems([...items, {
      descripcion: descripcionManual.trim(),
      cantidad, precioUnitario: precioManual, subtotal: precioManual * cantidad,
    }]);
    setDescripcionManual("");
    setPrecioManual(0);
    setCantidad(1);
  }

  function quitarItem(i: number) {
    setItems(items.filter((_, idx) => idx !== i));
  }

  async function confirmarCotizacion() {
    if (items.length === 0) return;
    setGuardando(true);
    await addCotizacion(
      { clienteId: clienteId || undefined, vigenciaHasta: vigenciaHasta || undefined, subtotal, igv, total, estado: "pendiente" },
      items,
    );
    if (descuentoAplicado) {
      await updateDescuento(descuentoAplicado.id, { usos: descuentoAplicado.usos + 1 });
    }
    setGuardando(false);
    setItems([]);
    setClienteId("");
    setVigenciaHasta("");
    setCodigoDescuento("");
    toast("Cotización creada.");
  }

  async function convertir(id: string) {
    setConvirtiendoId(id);
    await convertirCotizacionAVenta(id);
    setConvirtiendoId(null);
    toast("Cotización convertida en venta.");
  }

  async function rechazar(id: string) {
    await updateCotizacion(id, { estado: "rechazada" });
    toast("Cotización rechazada.", "info");
  }

  async function reabrir(id: string) {
    await updateCotizacion(id, { estado: "pendiente" });
    toast("Cotización vuelta a pendiente.", "info");
  }

  async function confirmarEliminarAccion() {
    const c = confirmarEliminar;
    if (!c) return;
    setConfirmarEliminar(null);
    await deleteCotizacion(c.id);
    toast("Cotización eliminada.", "info");
  }

  const nombreCliente = (id?: string) => {
    if (!id) return "Sin cliente";
    const c = clientes.find((c) => c.id === id);
    return c ? `${c.nombres} ${c.apellidos}` : "—";
  };

  const ordenadas = [...cotizaciones]
    .filter((c) => filtroEstado === "todos" || c.estado === filtroEstado)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
  const { pagina, setPagina, totalPaginas, visibles } = usePaginado(ordenadas);

  return (
    <main>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Cotizaciones</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Envía un presupuesto antes de la venta. No descuenta stock hasta que se convierte en venta.
      </p>

      <div className="card mt-4 p-4">
        <h2 className="font-medium">Nueva cotización</h2>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Campo label="Cliente">
            <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className="select w-full text-sm">
              <option value="">Sin cliente</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombres} {c.apellidos}</option>)}
            </select>
          </Campo>
          <Campo label="Vigente hasta">
            <DatePicker etiqueta="Vigente hasta" placeholder="Sin fecha límite" valor={vigenciaHasta} onChange={setVigenciaHasta} />
          </Campo>
        </div>

        <div className="mt-3 flex gap-1">
          <button
            type="button" onClick={() => setModoItem("catalogo")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${modoItem === "catalogo" ? "bg-primary-light text-primary" : "text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"}`}
          >
            Del catálogo
          </button>
          <button
            type="button" onClick={() => setModoItem("personalizado")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${modoItem === "personalizado" ? "bg-primary-light text-primary" : "text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"}`}
          >
            Personalizado
          </button>
        </div>

        {modoItem === "catalogo" ? (
          <div className="mt-2 flex flex-wrap items-end gap-2">
            <Campo label="Producto">
              <select value={productoId} onChange={(e) => setProductoId(e.target.value)} className="select text-sm">
                <option value="">Elegir producto…</option>
                {productos.map((p) => <option key={p.id} value={p.id}>{p.nombre} — S/ {p.precioVenta.toFixed(2)}</option>)}
              </select>
            </Campo>
            <Campo label="Cantidad">
              <input type="number" min={1} value={cantidad} onChange={(e) => setCantidad(Number(e.target.value))} className="input w-20 text-sm" />
            </Campo>
            <button type="button" onClick={agregarItem} disabled={!productoId} className="btn-outline px-3 py-1 text-sm disabled:opacity-50">
              Agregar ítem
            </button>
          </div>
        ) : (
          <div className="mt-2 flex flex-wrap items-end gap-2">
            <Campo label="Descripción (ej. montura, luna, antireflejo, UV…)">
              <input value={descripcionManual} onChange={(e) => setDescripcionManual(e.target.value)} placeholder="Ej. Luna con antireflejo" className="input text-sm" />
            </Campo>
            <Campo label="Precio unitario (S/)">
              <input type="number" min={0} step="0.01" value={precioManual} onChange={(e) => setPrecioManual(Number(e.target.value))} className="input w-28 text-sm" />
            </Campo>
            <Campo label="Cantidad">
              <input type="number" min={1} value={cantidad} onChange={(e) => setCantidad(Number(e.target.value))} className="input w-20 text-sm" />
            </Campo>
            <button type="button" onClick={agregarItemManual} disabled={!descripcionManual.trim() || precioManual <= 0} className="btn-outline px-3 py-1 text-sm disabled:opacity-50">
              Agregar ítem
            </button>
          </div>
        )}

        {items.length > 0 && (
          <ul className="mt-3 space-y-1 text-sm">
            {items.map((it, i) => (
              <li key={i} className="flex items-center justify-between">
                <span>{it.cantidad}× {it.descripcion}</span>
                <span>
                  S/ {it.subtotal.toFixed(2)}{" "}
                  <button onClick={() => quitarItem(i)} className="link-danger">quitar</button>
                </span>
              </li>
            ))}
          </ul>
        )}

        {items.length > 0 && (
          <div className="mt-3 flex flex-wrap items-end justify-between gap-2">
            <Campo label="Código de descuento (opcional)">
              <input
                value={codigoDescuento} onChange={(e) => setCodigoDescuento(e.target.value)}
                placeholder="Ej. VERANO10" className="input w-40 text-sm uppercase"
              />
            </Campo>
            <div className="text-right text-sm">
              {descuentoAplicado ? (
                <p className="text-accent">
                  {descuentoAplicado.codigo} aplicado: −S/ {descuentoMonto.toFixed(2)}
                </p>
              ) : codigoDescuento.trim() ? (
                <p className="text-red-600 dark:text-red-400">Ese código no es válido para cotizaciones.</p>
              ) : null}
              <p className="font-medium">Total: S/ {total.toFixed(2)} (IGV incl.)</p>
            </div>
          </div>
        )}

        <button
          onClick={confirmarCotizacion} disabled={guardando || items.length === 0}
          className="btn-primary mt-3 w-full"
        >
          {guardando ? "Guardando…" : "Crear cotización"}
        </button>
      </div>

      <div className="table-card mt-6">
        <div className="table-filter-bar">
          <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value as typeof filtroEstado)} className="select text-sm">
            <option value="todos">Todos los estados</option>
            <option value="pendiente">Pendiente</option>
            <option value="aceptada">Aceptada</option>
            <option value="rechazada">Rechazada</option>
            <option value="vencida">Vencida</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="table-head-cell">Fecha</th>
                <th className="table-head-cell">Cliente</th>
                <th className="table-head-cell">Vigencia</th>
                <th className="table-head-cell">Total</th>
                <th className="table-head-cell">Estado</th>
                <th className="table-head-cell text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((c) => (
                <tr key={c.id} className="table-row align-top">
                  <td className="table-cell text-slate-600 dark:text-slate-300">{formatearFechaPE(c.fecha)}</td>
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      <span className="row-avatar"><FileText size={16} /></span>
                      <span className="font-medium text-slate-900 dark:text-slate-100">{nombreCliente(c.clienteId)}</span>
                    </div>
                  </td>
                  <td className="table-cell text-slate-500 dark:text-slate-400">{c.vigenciaHasta ? formatearFechaPE(c.vigenciaHasta) : "—"}</td>
                  <td className="table-cell">
                    <span className="font-medium text-slate-900 dark:text-slate-100">S/ {c.total.toFixed(2)}</span>
                    <div className="text-xs text-slate-400 dark:text-slate-500">
                      {cotizacionItems.filter((it) => it.cotizacionId === c.id).map((it) => it.descripcion).join(", ")}
                    </div>
                  </td>
                  <td className="table-cell">
                    {c.estado === "pendiente" ? (
                      <button onClick={() => rechazar(c.id)} className="badge badge-neutral cursor-pointer hover:opacity-75">
                        Rechazar
                      </button>
                    ) : c.estado === "rechazada" ? (
                      <span className="flex items-center gap-1.5">
                        <span className={`badge ${ESTADO_BADGE[c.estado]}`}>{ESTADO_LABEL[c.estado]}</span>
                        <button onClick={() => reabrir(c.id)} title="Volver a pendiente" className="row-icon-btn">
                          <RotateCcw size={13} />
                        </button>
                      </span>
                    ) : (
                      <span className={`badge ${ESTADO_BADGE[c.estado]}`}>{ESTADO_LABEL[c.estado]}</span>
                    )}
                  </td>
                  <td className="table-cell text-right">
                    <div className="flex justify-end gap-1">
                      {c.estado === "pendiente" && (
                        <button
                          onClick={() => convertir(c.id)}
                          disabled={convirtiendoId === c.id}
                          title="Convertir a venta"
                          className="row-icon-btn disabled:opacity-50"
                        >
                          <ArrowRightCircle size={16} />
                        </button>
                      )}
                      {c.estado === "aceptada" && c.ventaId ? (
                        <span className="text-xs text-slate-400 dark:text-slate-500">Ya es venta</span>
                      ) : (
                        <button onClick={() => setConfirmarEliminar(c)} title="Eliminar" className="row-icon-btn row-icon-btn-danger">
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {ordenadas.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <div className="table-empty">
                      <FileText size={28} className="text-slate-300 dark:text-slate-600" />
                      Sin cotizaciones todavía.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination pagina={pagina} totalPaginas={totalPaginas} onCambiar={setPagina} />
      </div>

      <ConfirmDialog
        abierto={Boolean(confirmarEliminar)}
        titulo="¿Eliminar cotización?"
        mensaje="Esta acción no se puede deshacer."
        confirmarTexto="Eliminar"
        onConfirmar={confirmarEliminarAccion}
        onCancelar={() => setConfirmarEliminar(null)}
      />
    </main>
  );
}
