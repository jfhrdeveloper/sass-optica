"use client";

import { useState } from "react";
import { Plus, Store, Pencil } from "lucide-react";
import { useData, type Sucursal } from "@/components/providers/DataProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { SlideOver } from "@/components/ui/SlideOver";
import { BotonWhatsApp } from "@/components/clientes/BotonWhatsApp";
import { FeatureGateBanner } from "@/components/dashboard/FeatureGateBanner";

const VACIO: Partial<Sucursal> = { nombre: "", activo: true };

/* Estructural (soloAdmin, como Empleados) — no operativo. Sin delete a
   propósito: una sede con citas/ventas históricas ligadas no debería poder
   desaparecer del todo; "Activo" alcanza para dejar de usarla hacia
   adelante sin perder esa trazabilidad. Crear la primera sucursal acá NO
   mueve stock ni reasigna nada retroactivamente — ver Fase B.

   Multisedes es exclusivo del plan Premium — mismo "candado visible" (idea
   de UX #10) que ya usa /dashboard/facturacion para SUNAT: el módulo se
   sigue mostrando completo (lo que ya se registró antes de bajar de plan
   sigue ahí, visible), solo con los controles de escritura deshabilitados
   si el plan actual no es Premium. */
export default function SucursalesPage() {
  const { sucursales, suscripcion, addSucursal, updateSucursal } = useData();
  const toast = useToast();
  const esPremium = suscripcion?.plan === "premium";
  const [form, setForm] = useState<Partial<Sucursal>>(VACIO);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);

  function nuevo() {
    setEditandoId(null);
    setForm(VACIO);
    setAbierto(true);
  }
  function editar(s: Sucursal) {
    setEditandoId(s.id);
    setForm(s);
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
      await updateSucursal(editandoId, form);
      toast("Cambios guardados.");
    } else {
      await addSucursal(form);
      toast("Sucursal creada.");
    }
    setGuardando(false);
    cerrar();
  }

  return (
    <main>
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Sucursales</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Solo hace falta si tu óptica tiene más de una sede. Sin sucursales creadas, el negocio funciona igual que siempre.
      </p>

      {!esPremium && (
        <div className="mt-4">
          <FeatureGateBanner mensaje="Multisedes no está disponible en tu plan actual." />
        </div>
      )}

      <div className="table-card mt-4">
        <div className="table-filter-bar justify-end">
          <button onClick={nuevo} disabled={!esPremium} className="btn-primary gap-1.5">
            <Plus size={16} /> Nueva sucursal
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="table-head-cell">Nombre</th>
                <th className="table-head-cell hidden md:table-cell">Dirección</th>
                <th className="table-head-cell">Teléfono</th>
                <th className="table-head-cell">Estado</th>
                <th className="table-head-cell text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {sucursales.map((s) => (
                <tr key={s.id} className="table-row">
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      <span className="row-avatar"><Store size={16} /></span>
                      <span className="font-medium text-slate-900 dark:text-slate-100">{s.nombre}</span>
                    </div>
                  </td>
                  <td className="table-cell hidden md:table-cell text-slate-600 dark:text-slate-300">{s.direccion ?? "—"}</td>
                  <td className="table-cell text-slate-600 dark:text-slate-300">
                    {s.telefono ? (
                      <span className="flex items-center gap-2">
                        {s.telefono}
                        <BotonWhatsApp telefono={s.telefono} />
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="table-cell">
                    <label className="inline-flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox" role="switch" checked={s.activo} disabled={!esPremium}
                        onChange={() => updateSucursal(s.id, { activo: !s.activo })}
                        className="switch"
                      />
                      <span className="text-sm text-slate-600 dark:text-slate-300">{s.activo ? "Activa" : "Inactiva"}</span>
                    </label>
                  </td>
                  <td className="table-cell text-right">
                    <button onClick={() => editar(s)} disabled={!esPremium} title="Editar" aria-label={`Editar ${s.nombre}`} className="row-icon-btn">
                      <Pencil size={15} />
                    </button>
                  </td>
                </tr>
              ))}
              {sucursales.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <div className="table-empty">
                      <Store size={28} className="text-slate-300 dark:text-slate-600" />
                      Sin sucursales — tu negocio opera con una sola sede.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <SlideOver abierto={abierto} onClose={cerrar} titulo={editandoId ? "Editar sucursal" : "Nueva sucursal"}>
        <form onSubmit={onSubmit} className="space-y-3">
          <input placeholder="Nombre (ej. Puente Piedra)" required value={form.nombre ?? ""} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className="input w-full text-sm" />
          <input placeholder="Dirección" value={form.direccion ?? ""} onChange={(e) => setForm({ ...form, direccion: e.target.value })} className="input w-full text-sm" />
          <input placeholder="Teléfono" value={form.telefono ?? ""} onChange={(e) => setForm({ ...form, telefono: e.target.value })} className="input w-full text-sm" />
          {editandoId && (
            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <input type="checkbox" checked={form.activo ?? true} onChange={(e) => setForm({ ...form, activo: e.target.checked })} className="checkbox" />
              Activa
            </label>
          )}
          <button type="submit" disabled={guardando} className="btn-primary w-full">
            {guardando ? "Guardando…" : editandoId ? "Guardar cambios" : "Crear sucursal"}
          </button>
        </form>
      </SlideOver>
    </main>
  );
}
