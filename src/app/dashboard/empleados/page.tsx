"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { Plus, Settings2 } from "lucide-react";
import { useData } from "@/components/providers/DataProvider";
import { useSession } from "@/components/providers/SessionProvider";
import { SlideOver } from "@/components/SlideOver";

const MODULOS_DELEGABLES = [
  { clave: "gastos", label: "Gastos y caja" },
  { clave: "descuentos", label: "Descuentos y cupones" },
  { clave: "marketing", label: "Marketing (campañas)" },
] as const;

/* Ruta protegida a nivel de proxy y de RLS. El alta/baja NUNCA llama a
   Supabase directo desde aquí — siempre vía /api/empleados/* con
   service_role (ver invariante en docs/architecture.md). Los permisos
   granulares SÍ se actualizan directo (updateEmpleado → RLS
   empleados_admin_update, ya exige is_administrador()). */
export default function EmpleadosPage() {
  const { empleados, updateEmpleado } = useData();
  const { empleado: yo } = useSession();
  const [email, setEmail] = useState("");
  const [nombres, setNombres] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [rol, setRol] = useState<"encargado" | "trabajador">("trabajador");
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [permisosAbiertos, setPermisosAbiertos] = useState<string | null>(null);
  /* Antes: window.confirm()/window.alert() — diálogos nativos del navegador,
     sin estilo y bloqueantes. Reemplazados por confirmación inline (mismo
     patrón que la Zona de Peligro de Ajustes) + mensaje de error en la fila.
     `errorEliminar` es un solo estado compartido (no un mapa por id) porque
     solo puede haber una fila en modo "confirmando" a la vez — se limpia
     explícitamente en cada click de Eliminar/No para que un error viejo no
     se quede pegado si el admin cancela y confirma otra fila distinta. */
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null);
  const [eliminando, setEliminando] = useState(false);

  async function invitar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setMensaje(null);
    const res = await fetch("/api/empleados/invitar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, nombres, apellidos, rol }),
    });
    const data = await res.json();
    setEnviando(false);
    if (!res.ok) {
      setMensaje(data.error ?? "No se pudo invitar.");
      return;
    }
    setMensaje(`Invitación enviada a ${email}.`);
    setEmail(""); setNombres(""); setApellidos("");
    setAbierto(false);
  }

  async function eliminar(id: string) {
    setEliminando(true);
    setErrorEliminar(null);
    const res = await fetch("/api/empleados/eliminar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setEliminando(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErrorEliminar(data.error ?? "No se pudo eliminar.");
      return;
    }
    setConfirmandoId(null);
  }

  async function togglePermiso(empleadoId: string, permisosActuales: Record<string, boolean>, clave: string) {
    await updateEmpleado(empleadoId, { permisos: { ...permisosActuales, [clave]: !permisosActuales[clave] } });
  }

  return (
    <main>
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="text-sm font-medium link">← Inicio</Link>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Empleados</h1>
      </div>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Puedes delegar módulos puntuales a un encargado o trabajador sin cambiarle el rol. Usa el ícono de permisos para eso.
      </p>

      <div className="mt-4 flex justify-end">
        <button onClick={() => setAbierto(true)} className="btn-primary gap-1.5">
          <Plus size={16} /> Invitar empleado
        </button>
      </div>

      <table className="mt-4 w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-800 text-left text-slate-400 dark:text-slate-500">
            <th className="py-2">Nombre</th><th>Email</th><th>Rol</th><th>Permisos extra</th><th />
          </tr>
        </thead>
        <tbody>
          {empleados.map((e) => (
            <Fragment key={e.id}>
              <tr className="border-b border-slate-100 dark:border-slate-800 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800">
                <td className="py-2">{e.nombres} {e.apellidos}</td>
                <td>{e.email ?? "—"}</td>
                <td>{e.rol}</td>
                <td>
                  {e.rol !== "administrador" && (
                    <button
                      onClick={() => setPermisosAbiertos(permisosAbiertos === e.id ? null : e.id)}
                      className="inline-flex items-center gap-1 link"
                    >
                      <Settings2 size={14} />
                      {Object.values(e.permisos ?? {}).filter(Boolean).length || 0} activos
                    </button>
                  )}
                </td>
                <td className="text-right">
                  {e.rol !== "administrador" && e.id !== yo?.id && (
                    confirmandoId === e.id ? (
                      <span className="inline-flex items-center gap-2 whitespace-nowrap">
                        <span className="text-xs text-slate-500 dark:text-slate-400">¿Seguro?</span>
                        <button onClick={() => eliminar(e.id)} disabled={eliminando} className="link-danger">
                          {eliminando ? "Eliminando…" : "Sí"}
                        </button>
                        <button onClick={() => { setConfirmandoId(null); setErrorEliminar(null); }} className="link-muted">No</button>
                      </span>
                    ) : (
                      <button onClick={() => { setConfirmandoId(e.id); setErrorEliminar(null); }} className="link-danger">Eliminar</button>
                    )
                  )}
                </td>
              </tr>
              {confirmandoId === e.id && errorEliminar && (
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <td colSpan={5} className="px-2 py-2 text-sm text-red-600 dark:text-red-400">{errorEliminar}</td>
                </tr>
              )}
              {permisosAbiertos === e.id && e.rol !== "administrador" && (
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                  <td colSpan={5} className="px-2 py-3">
                    <div className="flex flex-wrap gap-3">
                      {MODULOS_DELEGABLES.map((m) => (
                        <label key={m.clave} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                          <input
                            type="checkbox"
                            checked={Boolean(e.permisos?.[m.clave])}
                            onChange={() => togglePermiso(e.id, e.permisos ?? {}, m.clave)}
                            className="checkbox"
                          />
                          {m.label}
                        </label>
                      ))}
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>

      <SlideOver abierto={abierto} onClose={() => setAbierto(false)} titulo="Invitar empleado">
        <form onSubmit={invitar} className="space-y-3">
          <input placeholder="Nombres" required value={nombres} onChange={(e) => setNombres(e.target.value)} className="input w-full text-sm" />
          <input placeholder="Apellidos" value={apellidos} onChange={(e) => setApellidos(e.target.value)} className="input w-full text-sm" />
          <input placeholder="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input w-full text-sm" />
          <select value={rol} onChange={(e) => setRol(e.target.value as "encargado" | "trabajador")} className="select w-full text-sm">
            <option value="trabajador">Trabajador</option>
            <option value="encargado">Encargado</option>
          </select>
          <button type="submit" disabled={enviando} className="btn-primary w-full">
            {enviando ? "Enviando…" : "Invitar empleado"}
          </button>
          {mensaje && <p className="text-sm text-slate-600 dark:text-slate-300">{mensaje}</p>}
        </form>
      </SlideOver>
    </main>
  );
}
