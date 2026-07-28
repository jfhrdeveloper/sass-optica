"use client";

import { useMemo, useState } from "react";
import { Receipt } from "lucide-react";
import { useData, type VentaItem } from "@/components/providers/DataProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { Pagination } from "@/components/ui/Pagination";
import { usePaginado } from "@/lib/hooks/usePaginado";
import { DateRangePicker } from "@/components/calendario/DateRangePicker";

const IGV = 0.18;
type ItemForm = Omit<VentaItem, "id" | "ventaId">;

export default function VentasPage() {
  const { ventas, ventaItems, clientes, productos, addVenta } = useData();
  const toast = useToast();
  const [clienteId, setClienteId] = useState("");
  const [metodoPago, setMetodoPago] = useState("efectivo");
  const [items, setItems] = useState<ItemForm[]>([]);
  const [productoId, setProductoId] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [guardando, setGuardando] = useState(false);

  const [filtroMetodo, setFiltroMetodo] = useState("todos");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

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

  async function confirmarVenta() {
    if (items.length === 0) return;
    setGuardando(true);
    await addVenta(
      { clienteId: clienteId || undefined, subtotal, igv, total, metodoPago, estado: "pagada", montoPagado: total },
      items,
    );
    setGuardando(false);
    setItems([]);
    setClienteId("");
    toast("Venta registrada.");
  }

  const nombreCliente = (id?: string) => {
    if (!id) return "Sin cliente";
    const c = clientes.find((c) => c.id === id);
    return c ? `${c.nombres} ${c.apellidos}` : "—";
  };

  const ordenadas = [...ventas]
    .filter((v) => filtroMetodo === "todos" || v.metodoPago === filtroMetodo)
    .filter((v) => !desde || v.fecha.slice(0, 10) >= desde)
    .filter((v) => !hasta || v.fecha.slice(0, 10) <= hasta)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
  const { pagina, setPagina, totalPaginas, visibles } = usePaginado(ordenadas);

  return (
    <main>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Ventas</h1>

      <div className="card mt-4 p-4">
        <h2 className="font-medium">Nueva venta</h2>
        <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className="select mt-2 w-full text-sm">
          <option value="">Sin cliente</option>
          {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombres} {c.apellidos}</option>)}
        </select>

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

        <div className="mt-3 flex items-center justify-between text-sm">
          <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)} className="select text-sm">
            <option value="efectivo">Efectivo</option>
            <option value="tarjeta">Tarjeta</option>
            <option value="yape">Yape</option>
            <option value="plin">Plin</option>
            <option value="transferencia">Transferencia</option>
          </select>
          <span className="font-medium">Total: S/ {total.toFixed(2)} (IGV incl.)</span>
        </div>

        <button
          onClick={confirmarVenta} disabled={guardando || items.length === 0}
          className="btn-primary mt-3 w-full"
        >
          {guardando ? "Guardando…" : "Confirmar venta"}
        </button>
      </div>

      <div className="table-card mt-6">
        <div className="table-filter-bar">
          <select value={filtroMetodo} onChange={(e) => setFiltroMetodo(e.target.value)} className="select text-sm">
            <option value="todos">Todos los métodos</option>
            <option value="efectivo">Efectivo</option>
            <option value="tarjeta">Tarjeta</option>
            <option value="yape">Yape</option>
            <option value="plin">Plin</option>
            <option value="transferencia">Transferencia</option>
          </select>
          <DateRangePicker desde={desde} hasta={hasta} onChange={(d, h) => { setDesde(d); setHasta(h); }} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="table-head-cell">Fecha</th>
                <th className="table-head-cell">Cliente</th>
                <th className="table-head-cell">Método</th>
                <th className="table-head-cell">Total</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((v) => (
                <tr key={v.id} className="table-row align-top">
                  <td className="table-cell text-slate-600 dark:text-slate-300" suppressHydrationWarning>
                    {new Date(v.fecha).toLocaleString("es-PE", { timeZone: "America/Lima" })}
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      <span className="row-avatar"><Receipt size={16} /></span>
                      <span className="font-medium text-slate-900 dark:text-slate-100">{nombreCliente(v.clienteId)}</span>
                    </div>
                  </td>
                  <td className="table-cell capitalize text-slate-600 dark:text-slate-300">{v.metodoPago}</td>
                  <td className="table-cell">
                    <span className="font-medium text-slate-900 dark:text-slate-100">S/ {v.total.toFixed(2)}</span>
                    <div className="text-xs text-slate-400 dark:text-slate-500">
                      {ventaItems.filter((it) => it.ventaId === v.id).map((it) => it.descripcion).join(", ")}
                    </div>
                  </td>
                </tr>
              ))}
              {ordenadas.length === 0 && (
                <tr>
                  <td colSpan={4}>
                    <div className="table-empty">
                      <Receipt size={28} className="text-slate-300 dark:text-slate-600" />
                      Sin ventas todavía.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination pagina={pagina} totalPaginas={totalPaginas} onCambiar={setPagina} />
      </div>
    </main>
  );
}
