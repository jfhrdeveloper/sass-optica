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

  const ordenadas = [...ventas].sort((a, b) => b.fecha.localeCompare(a.fecha));

  return (
    <main>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Ventas</h1>
        <Link href="/dashboard" className="text-sm underline">← Inicio</Link>
      </div>

      <div className="mt-4 rounded border p-4">
        <h2 className="font-medium">Nueva venta</h2>
        <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className="mt-2 w-full rounded border px-2 py-1 text-sm">
          <option value="">Sin cliente</option>
          {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombres} {c.apellidos}</option>)}
        </select>

        <div className="mt-2 flex flex-wrap gap-2">
          <select value={productoId} onChange={(e) => setProductoId(e.target.value)} className="rounded border px-2 py-1 text-sm">
            <option value="">Producto…</option>
            {productos.map((p) => <option key={p.id} value={p.id}>{p.nombre} — S/ {p.precioVenta.toFixed(2)}</option>)}
          </select>
          <input type="number" min={1} value={cantidad} onChange={(e) => setCantidad(Number(e.target.value))} className="w-20 rounded border px-2 py-1 text-sm" />
          <button type="button" onClick={agregarItem} disabled={!productoId} className="rounded border px-3 py-1 text-sm disabled:opacity-50">
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
                  <button onClick={() => quitarItem(i)} className="text-red-600 underline">quitar</button>
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-3 flex items-center justify-between text-sm">
          <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)} className="rounded border px-2 py-1">
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
          className="mt-3 w-full rounded bg-black px-3 py-2 text-sm text-white disabled:opacity-50"
        >
          {guardando ? "Guardando…" : "Confirmar venta"}
        </button>
      </div>

      <table className="mt-6 w-full text-sm">
        <thead>
          <tr className="border-b text-left text-neutral-500">
            <th className="py-2">Fecha</th><th>Cliente</th><th>Método</th><th>Total</th>
          </tr>
        </thead>
        <tbody>
          {ordenadas.map((v) => (
            <tr key={v.id} className="border-b align-top">
              <td className="py-2">{new Date(v.fecha).toLocaleString("es-PE")}</td>
              <td>{nombreCliente(v.clienteId)}</td>
              <td>{v.metodoPago}</td>
              <td>
                S/ {v.total.toFixed(2)}
                <div className="text-xs text-neutral-500">
                  {ventaItems.filter((it) => it.ventaId === v.id).map((it) => it.descripcion).join(", ")}
                </div>
              </td>
            </tr>
          ))}
          {ordenadas.length === 0 && (
            <tr><td colSpan={4} className="py-6 text-center text-neutral-500">Sin ventas todavía.</td></tr>
          )}
        </tbody>
      </table>
    </main>
  );
}
