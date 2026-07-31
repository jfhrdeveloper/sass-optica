"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Truck, Pencil, Trash2 } from "lucide-react";
import { useData, type Proveedor } from "@/components/providers/DataProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { SlideOver } from "@/components/ui/SlideOver";
import { BotonWhatsApp } from "@/components/clientes/BotonWhatsApp";
import { Pagination } from "@/components/ui/Pagination";
import { usePaginado } from "@/lib/hooks/usePaginado";

const VACIO: Partial<Proveedor> = { nombre: "", activo: true };

/* Extraído del research de competencia (sistema de facturación SUNAT):
   catálogo de proveedores enlazable desde Productos y Gastos vía
   proveedorId — ver selector en esas dos páginas. */
export default function ProveedoresPage() {
  const { proveedores, addProveedor, updateProveedor, deleteProveedor } = useData();
  const toast = useToast();
  const router = useRouter();
  const [form, setForm] = useState<Partial<Proveedor>>(VACIO);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);
  const { pagina, setPagina, totalPaginas, visibles } = usePaginado(proveedores);

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
      toast("Cambios guardados.");
    } else {
      await addProveedor(form);
      toast("Proveedor agregado.");
    }
    setGuardando(false);
    cerrar();
  }

  async function eliminar(id: string) {
    const p = proveedores.find((pr) => pr.id === id);
    await deleteProveedor(id);
    setConfirmandoId(null);
    if (p) {
      toast("Proveedor eliminado.", "info", { label: "Deshacer", onClick: () => { void addProveedor(p); } });
    } else {
      toast("Proveedor eliminado.", "info");
    }
  }

  return (
    <main>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Proveedores</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Catálogo de proveedores. Se pueden vincular a Productos y a Gastos.
      </p>

      <div className="table-card mt-4">
        <div className="table-filter-bar justify-end">
          <button onClick={nuevo} className="btn-primary gap-1.5">
            <Plus size={16} /> Nuevo proveedor
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="table-head-cell">Nombre</th>
                <th className="table-head-cell hidden md:table-cell">Contacto</th>
                <th className="table-head-cell">Teléfono</th>
                <th className="table-head-cell">Estado</th>
                <th className="table-head-cell text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((p) => (
                <tr key={p.id} onClick={() => router.push(`/dashboard/proveedores/${p.id}`)} className="table-row cursor-pointer">
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      <span className="row-avatar"><Truck size={16} /></span>
                      <span>
                        <span className="block font-medium text-slate-900 transition-colors hover:text-primary dark:text-slate-100">{p.nombre}</span>
                        <span className="block text-xs text-slate-400 dark:text-slate-500">{p.ruc ?? "Sin RUC"}</span>
                      </span>
                    </div>
                  </td>
                  <td className="table-cell hidden md:table-cell text-slate-600 dark:text-slate-300">{p.contacto ?? "—"}</td>
                  <td className="table-cell text-slate-600 dark:text-slate-300">
                    {p.telefono ? (
                      <span className="flex items-center gap-2">
                        {p.telefono}
                        <BotonWhatsApp telefono={p.telefono} />
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="table-cell">
                    <label className="inline-flex cursor-pointer items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox" role="switch" checked={p.activo}
                        onChange={() => updateProveedor(p.id, { activo: !p.activo })}
                        className="switch"
                      />
                      <span className="text-sm text-slate-600 dark:text-slate-300">{p.activo ? "Activo" : "Inactivo"}</span>
                    </label>
                  </td>
                  <td className="table-cell text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    {confirmandoId === p.id ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="text-xs text-slate-500 dark:text-slate-400">¿Seguro?</span>
                        <button onClick={() => eliminar(p.id)} className="link-danger">Sí</button>
                        <button onClick={() => setConfirmandoId(null)} className="link-muted">No</button>
                      </span>
                    ) : (
                      <div className="inline-flex gap-1">
                        <button onClick={() => editar(p)} title="Editar" aria-label={`Editar ${p.nombre}`} className="row-icon-btn">
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => setConfirmandoId(p.id)} title="Eliminar" aria-label={`Eliminar ${p.nombre}`} className="row-icon-btn row-icon-btn-danger">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {proveedores.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <div className="table-empty">
                      <Truck size={28} className="text-slate-300 dark:text-slate-600" />
                      Sin proveedores todavía.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination pagina={pagina} totalPaginas={totalPaginas} onCambiar={setPagina} />
      </div>

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
