"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { useData, type Proveedor } from "@/components/providers/DataProvider";
import { SlideOver } from "@/components/SlideOver";

const VACIO: Partial<Proveedor> = { nombre: "", activo: true };

/* Extraído del research de competencia (sistema de facturación SUNAT):
   catálogo de proveedores enlazable desde Productos y Gastos vía
   proveedorId — ver selector en esas dos páginas. */
export default function ProveedoresPage() {
  const { proveedores, addProveedor, updateProveedor, deleteProveedor } = useData();
  const [form, setForm] = useState<Partial<Proveedor>>(VACIO);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);

  function nuevo() {
    setEditandoId(null);
    setForm(VACIO);
    setAbierto(true);
  }
  function editar(p: Proveedor) {
    setEditandoId(p.id);
    setForm(p);
    setAbierto(true);
  }
  function cerrar() {
    setAbierto(false);
    setEditandoId(null);
    setForm(VACIO);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombre) return;
    setGuardando(true);
    if (editandoId) {
      await updateProveedor(editandoId, form);
    } else {
      await addProveedor(form);
    }
    setGuardando(false);
    cerrar();
  }

  async function eliminar(id: string) {
    await deleteProveedor(id);
    setConfirmandoId(null);
  }

  return (
    <main>
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="text-sm font-medium link">← Inicio</Link>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Proveedores</h1>
      </div>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Catálogo de proveedores. Se pueden vincular a Productos y a Gastos.
      </p>

      <div className="mt-4 flex justify-end">
        <button onClick={nuevo} className="btn-primary gap-1.5">
          <Plus size={16} /> Nuevo proveedor
        </button>
      </div>

      <table className="mt-4 w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-800 text-left text-slate-400 dark:text-slate-500">
            <th className="py-2">Nombre</th><th>RUC</th><th>Contacto</th><th>Teléfono</th><th>Estado</th><th />
          </tr>
        </thead>
        <tbody>
          {proveedores.map((p) => (
            <tr key={p.id} className="border-b border-slate-100 dark:border-slate-800 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800">
              <td className="py-2 font-medium">{p.nombre}</td>
              <td>{p.ruc ?? "—"}</td>
              <td>{p.contacto ?? "—"}</td>
              <td>{p.telefono ?? "—"}</td>
              <td>
                <button
                  onClick={() => updateProveedor(p.id, { activo: !p.activo })}
                  className={`badge cursor-pointer transition-opacity hover:opacity-75 ${p.activo ? "badge-success" : "badge-neutral"}`}
                  title="Click para cambiar de estado"
                >
                  {p.activo ? "Activo" : "Inactivo"}
                </button>
              </td>
              <td className="space-x-2 text-right whitespace-nowrap">
                <button onClick={() => editar(p)} className="link">Editar</button>
                {confirmandoId === p.id ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="text-xs text-slate-500 dark:text-slate-400">¿Seguro?</span>
                    <button onClick={() => eliminar(p.id)} className="link-danger">Sí</button>
                    <button onClick={() => setConfirmandoId(null)} className="link-muted">No</button>
                  </span>
                ) : (
                  <button onClick={() => setConfirmandoId(p.id)} className="link-danger">Eliminar</button>
                )}
              </td>
            </tr>
          ))}
          {proveedores.length === 0 && (
            <tr><td colSpan={6} className="py-6 text-center text-slate-400 dark:text-slate-500">Sin proveedores todavía.</td></tr>
          )}
        </tbody>
      </table>

      <SlideOver abierto={abierto} onClose={cerrar} titulo={editandoId ? "Editar proveedor" : "Nuevo proveedor"}>
        <form onSubmit={onSubmit} className="space-y-3">
          <input placeholder="Nombre / razón social" required value={form.nombre ?? ""} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className="input w-full text-sm" />
          <input placeholder="RUC" value={form.ruc ?? ""} onChange={(e) => setForm({ ...form, ruc: e.target.value })} className="input w-full text-sm" />
          <input placeholder="Persona de contacto" value={form.contacto ?? ""} onChange={(e) => setForm({ ...form, contacto: e.target.value })} className="input w-full text-sm" />
          <div className="grid grid-cols-2 gap-2">
            <input placeholder="Teléfono" value={form.telefono ?? ""} onChange={(e) => setForm({ ...form, telefono: e.target.value })} className="input text-sm" />
            <input placeholder="Email" type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input text-sm" />
          </div>
          <input placeholder="Dirección" value={form.direccion ?? ""} onChange={(e) => setForm({ ...form, direccion: e.target.value })} className="input w-full text-sm" />
          <textarea placeholder="Notas (opcional)" value={form.notas ?? ""} onChange={(e) => setForm({ ...form, notas: e.target.value })} className="input w-full text-sm" rows={2} />
          {editandoId && (
            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <input type="checkbox" checked={form.activo ?? true} onChange={(e) => setForm({ ...form, activo: e.target.checked })} className="checkbox" />
              Activo
            </label>
          )}
          <button type="submit" disabled={guardando} className="btn-primary w-full">
            {guardando ? "Guardando…" : editandoId ? "Guardar cambios" : "Agregar proveedor"}
          </button>
        </form>
      </SlideOver>
    </main>
  );
}
