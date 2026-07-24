"use client";

import { useState } from "react";
import Link from "next/link";
import { useData, type Producto } from "@/components/providers/DataProvider";

const CATEGORIAS = ["montura", "luna", "lente_contacto", "liquido", "accesorio", "servicio"] as const;
const VACIO: Partial<Producto> = { categoria: "montura", precioVenta: 0, precioCosto: 0 };

export default function ProductosPage() {
  const { productos, addProducto, updateProducto, ajustarStock } = useData();
  const [form, setForm] = useState<Partial<Producto>>(VACIO);
  const [stockInicial, setStockInicial] = useState(0);
  const [stockMinimo, setStockMinimo] = useState(0);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  function editar(p: Producto) {
    setEditandoId(p.id);
    setForm(p);
  }
  function cancelar() {
    setEditandoId(null);
    setForm(VACIO);
    setStockInicial(0);
    setStockMinimo(0);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombre) return;
    setGuardando(true);
    if (editandoId) {
      await updateProducto(editandoId, form);
    } else {
      await addProducto(form, stockInicial, stockMinimo);
    }
    setGuardando(false);
    cancelar();
  }

  async function ajustar(id: string, actual: number) {
    const texto = window.prompt("Nuevo stock actual:", String(actual));
    if (texto === null) return;
    const nuevo = Number(texto);
    if (Number.isNaN(nuevo)) return;
    await ajustarStock(id, "ajuste", nuevo, "Ajuste manual");
  }

  return (
    <main>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Productos y stock</h1>
        <Link href="/dashboard" className="text-sm font-medium text-primary hover:underline">← Inicio</Link>
      </div>

      <form onSubmit={onSubmit} className="card mt-4 grid grid-cols-2 gap-2 p-4 sm:grid-cols-4">
        <input placeholder="Nombre" required value={form.nombre ?? ""} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className="input text-sm" />
        <select value={form.categoria ?? "montura"} onChange={(e) => setForm({ ...form, categoria: e.target.value })} className="input text-sm">
          {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <input placeholder="Marca" value={form.marca ?? ""} onChange={(e) => setForm({ ...form, marca: e.target.value })} className="input text-sm" />
        <input placeholder="Código" value={form.codigo ?? ""} onChange={(e) => setForm({ ...form, codigo: e.target.value })} className="input text-sm" />
        <input placeholder="Precio venta (S/)" type="number" step="0.01" value={form.precioVenta ?? 0} onChange={(e) => setForm({ ...form, precioVenta: Number(e.target.value) })} className="input text-sm" />
        <input placeholder="Precio costo (S/)" type="number" step="0.01" value={form.precioCosto ?? 0} onChange={(e) => setForm({ ...form, precioCosto: Number(e.target.value) })} className="input text-sm" />
        {!editandoId && (
          <>
            <input placeholder="Stock inicial" type="number" value={stockInicial} onChange={(e) => setStockInicial(Number(e.target.value))} className="input text-sm" />
            <input placeholder="Stock mínimo" type="number" value={stockMinimo} onChange={(e) => setStockMinimo(Number(e.target.value))} className="input text-sm" />
          </>
        )}
        <div className="col-span-full flex gap-2">
          <button type="submit" disabled={guardando} className="btn-primary">
            {editandoId ? "Guardar cambios" : "Agregar producto"}
          </button>
          {editandoId && <button type="button" onClick={cancelar} className="text-sm font-medium text-primary hover:underline">Cancelar</button>}
        </div>
      </form>

      <table className="mt-4 w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-slate-400">
            <th className="py-2">Producto</th><th>Categoría</th><th>Precio</th><th>Stock</th><th />
          </tr>
        </thead>
        <tbody>
          {productos.map((p) => (
            <tr key={p.id} className="border-b border-slate-100">
              <td className="py-2">{p.nombre} {p.marca ? `(${p.marca})` : ""}</td>
              <td>{p.categoria}</td>
              <td>S/ {p.precioVenta.toFixed(2)}</td>
              <td className={p.stockActual <= p.stockMinimo ? "font-semibold text-red-600" : ""}>{p.stockActual}</td>
              <td className="space-x-2 text-right">
                <button onClick={() => ajustar(p.id, p.stockActual)} className="underline">Ajustar stock</button>
                <button onClick={() => editar(p)} className="underline">Editar</button>
              </td>
            </tr>
          ))}
          {productos.length === 0 && (
            <tr><td colSpan={5} className="py-6 text-center text-slate-400">Sin productos todavía.</td></tr>
          )}
        </tbody>
      </table>
    </main>
  );
}
