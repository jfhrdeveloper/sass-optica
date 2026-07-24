"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useData, type Cotizacion, type CotizacionItem } from "@/components/providers/DataProvider";

const IGV = 0.18;
type ItemForm = Omit<CotizacionItem, "id" | "cotizacionId">;

const ESTADO_BADGE: Record<Cotizacion["estado"], string> = {
  pendiente: "badge-neutral",
  aceptada: "badge-success",
  rechazada: "badge-danger",
  vencida: "badge-neutral",
};

/* Extraído del research de competencia (sistema de facturación SUNAT):
   documento previo a la venta, no toca stock ni caja hasta que se
   convierte — ver convertirCotizacionAVenta en DataProvider.tsx. */
export default function CotizacionesPage() {
  const { cotizaciones, cotizacionItems, clientes, productos, addCotizacion, updateCotizacion, convertirCotizacionAVenta } = useData();
  const [clienteId, setClienteId] = useState("");
  const [vigenciaHasta, setVigenciaHasta] = useState("");
  const [items, setItems] = useState<ItemForm[]>([]);
  const [productoId, setProductoId] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [guardando, setGuardando] = useState(false);
  const [convirtiendoId, setConvirtiendoId] = useState<string | null>(null);

  const [filtroEstado, setFiltroEstado] = useState<"todos" | Cotizacion["estado"]>("todos");

  const total = useMemo(() => items.reduce((acc, it) => acc + it.subtotal, 0), [items]);
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
    setGuardando(false);
    setItems([]);
    setClienteId("");
    setVigenciaHasta("");
  }

  async function convertir(id: string) {
    setConvirtiendoId(id);
    await convertirCotizacionAVenta(id);
    setConvirtiendoId(null);
  }

  const nombreCliente = (id?: string) => {
    if (!id) return "Sin cliente";
    const c = clientes.find((c) => c.id === id);
    return c ? `${c.nombres} ${c.apellidos}` : "—";
  };

  const ordenadas = [...cotizaciones]
    .filter((c) => filtroEstado === "todos" || c.estado === filtroEstado)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));

  return (
    <main>
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="text-sm font-medium link">← Inicio</Link>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Cotizaciones</h1>
      </div>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Envía un presupuesto antes de la venta. No descuenta stock hasta que se convierte en venta.
      </p>

      <div className="card mt-4 p-4">
        <h2 className="font-medium">Nueva cotización</h2>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className="select text-sm">
            <option value="">Sin cliente</option>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombres} {c.apellidos}</option>)}
          </select>
          <input type="date" value={vigenciaHasta} onChange={(e) => setVigenciaHasta(e.target.value)} className="input text-sm" aria-label="Vigente hasta" />
        </div>

        <div className="mt-2 flex flex-wrap gap-2">
          <select value={productoId} onChange={(e) => setProductoId(e.target.value)} className="select text-sm">
            <option value="">Producto…</option>
            {productos.map((p) => <option key={p.id} value={p.id}>{p.nombre} — S/ {p.precioVenta.toFixed(2)}</option>)}
          </select>
          <input type="number" min={1} value={cantidad} onChange={(e) => setCantidad(Number(e.target.value))} className="input w-20 text-sm" />
          <button type="button" onClick={agregarItem} disabled={!productoId} className="btn-outline px-3 py-1 text-sm disabled:opacity-50">
            Agregar ítem
          </button>
        </div>

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

        <div className="mt-3 flex items-center justify-end text-sm">
          <span className="font-medium">Total: S/ {total.toFixed(2)} (IGV incl.)</span>
        </div>

        <button
          onClick={confirmarCotizacion} disabled={guardando || items.length === 0}
          className="btn-primary mt-3 w-full"
        >
          {guardando ? "Guardando…" : "Crear cotización"}
        </button>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value as typeof filtroEstado)} className="select text-sm">
          <option value="todos">Todos los estados</option>
          <option value="pendiente">Pendiente</option>
          <option value="aceptada">Aceptada</option>
          <option value="rechazada">Rechazada</option>
          <option value="vencida">Vencida</option>
        </select>
      </div>

      <table className="mt-3 w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-800 text-left text-slate-400 dark:text-slate-500">
            <th className="py-2">Fecha</th><th>Cliente</th><th>Vigencia</th><th>Total</th><th>Estado</th><th />
          </tr>
        </thead>
        <tbody>
          {ordenadas.map((c) => (
            <tr key={c.id} className="border-b align-top border-slate-100 dark:border-slate-800 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800">
              <td className="py-2">{c.fecha}</td>
              <td>{nombreCliente(c.clienteId)}</td>
              <td className="text-slate-500 dark:text-slate-400">{c.vigenciaHasta ?? "—"}</td>
              <td>
                S/ {c.total.toFixed(2)}
                <div className="text-xs text-slate-400 dark:text-slate-500">
                  {cotizacionItems.filter((it) => it.cotizacionId === c.id).map((it) => it.descripcion).join(", ")}
                </div>
              </td>
              <td>
                {c.estado === "pendiente" ? (
                  <div className="flex flex-wrap gap-1">
                    <button onClick={() => updateCotizacion(c.id, { estado: "rechazada" })} className="badge badge-neutral cursor-pointer hover:opacity-75">Rechazar</button>
                  </div>
                ) : (
                  <span className={`badge ${ESTADO_BADGE[c.estado]}`}>{c.estado}</span>
                )}
              </td>
              <td className="text-right">
                {c.estado === "pendiente" && (
                  <button
                    onClick={() => convertir(c.id)}
                    disabled={convirtiendoId === c.id}
                    className="link disabled:opacity-50"
                  >
                    {convirtiendoId === c.id ? "Convirtiendo…" : "Convertir a venta"}
                  </button>
                )}
                {c.estado === "aceptada" && c.ventaId && (
                  <span className="text-xs text-slate-400 dark:text-slate-500">Ya es venta</span>
                )}
              </td>
            </tr>
          ))}
          {ordenadas.length === 0 && (
            <tr><td colSpan={6} className="py-6 text-center text-slate-400 dark:text-slate-500">Sin cotizaciones todavía.</td></tr>
          )}
        </tbody>
      </table>
    </main>
  );
}
