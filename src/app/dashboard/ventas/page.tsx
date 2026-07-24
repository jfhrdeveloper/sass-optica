"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useData, type VentaItem } from "@/components/providers/DataProvider";

const IGV = 0.18;
type ItemForm = Omit<VentaItem, "id" | "ventaId">;

export default function VentasPage() {
  const { ventas, ventaItems, clientes, productos, addVenta } = useData();
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

  return (
    <main>
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="text-sm font-medium link">← Inicio</Link>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Ventas</h1>
      </div>

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

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <select value={filtroMetodo} onChange={(e) => setFiltroMetodo(e.target.value)} className="select text-sm">
          <option value="todos">Todos los métodos</option>
          <option value="efectivo">Efectivo</option>
          <option value="tarjeta">Tarjeta</option>
          <option value="yape">Yape</option>
          <option value="plin">Plin</option>
          <option value="transferencia">Transferencia</option>
        </select>
        <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="input text-sm" aria-label="Desde" />
        <span className="text-sm text-slate-400 dark:text-slate-500">—</span>
        <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="input text-sm" aria-label="Hasta" />
      </div>

      <table className="mt-3 w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-800 text-left text-slate-400 dark:text-slate-500">
            <th className="py-2">Fecha</th><th>Cliente</th><th>Método</th><th>Total</th>
          </tr>
        </thead>
        <tbody>
          {ordenadas.map((v) => (
            <tr key={v.id} className="border-b align-top transition-colors hover:bg-slate-50 dark:hover:bg-slate-800">
              {/* suppressHydrationWarning: mismo falso positivo de Intl que en citas/page.tsx. */}
              <td className="py-2" suppressHydrationWarning>{new Date(v.fecha).toLocaleString("es-PE", { timeZone: "America/Lima" })}</td>
              <td>{nombreCliente(v.clienteId)}</td>
              <td>{v.metodoPago}</td>
              <td>
                S/ {v.total.toFixed(2)}
                <div className="text-xs text-slate-400 dark:text-slate-500">
                  {ventaItems.filter((it) => it.ventaId === v.id).map((it) => it.descripcion).join(", ")}
                </div>
              </td>
            </tr>
          ))}
          {ordenadas.length === 0 && (
            <tr><td colSpan={4} className="py-6 text-center text-slate-400 dark:text-slate-500">Sin ventas todavía.</td></tr>
          )}
        </tbody>
      </table>
    </main>
  );
}
