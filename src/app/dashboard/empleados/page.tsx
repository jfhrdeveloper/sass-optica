"use client";

import { Fragment, useState } from "react";
import { Plus, Trash2, UserRound } from "lucide-react";
import { useData } from "@/components/providers/DataProvider";
import { useSession } from "@/components/providers/SessionProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { SlideOver } from "@/components/ui/SlideOver";
import { Pagination } from "@/components/ui/Pagination";
import { usePaginado } from "@/lib/hooks/usePaginado";
import { nombreRol } from "@/lib/roles";

/* Ruta protegida a nivel de proxy y de RLS. El alta/baja NUNCA llama a
   Supabase directo desde aquí — siempre vía /api/empleados/* con
   service_role (ver invariante en docs/architecture.md).

   Qué módulos ve cada rol/plantilla ya NO se edita acá — se mudó entero a
   /dashboard/roles (a pedido del usuario: esta página es alta/baja/datos de
   la PERSONA, no la definición de qué ve cada preset). Acá solo queda
   elegir CUÁL plantilla tiene asignada cada empleado (updateEmpleado →
   RLS empleados_admin_update, ya exige is_administrador()). Sin plantilla
   asignada, el empleado sigue con el acceso base de su rol (puede_gestionar()
   para encargado, mínimo para trabajador) — mismo comportamiento que
   siempre tuvo. */
export default function EmpleadosPage() {
  const { empleados, plantillasRol, updateEmpleado } = useData();
  const { empleado: yo } = useSession();
  const toast = useToast();
  const { pagina, setPagina, totalPaginas, visibles } = usePaginado(empleados);
  const [email, setEmail] = useState("");
  const [nombres, setNombres] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [rol, setRol] = useState<"encargado" | "trabajador">("trabajador");
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [abierto, setAbierto] = useState(false);
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
    toast(`Invitación enviada a ${email}.`);
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
    toast("Empleado eliminado.", "info");
  }

  return (
    <main>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Empleados</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Qué módulos ve cada uno se define como plantilla en{" "}
        <a href="/dashboard/roles" className="link">Roles</a> — acá solo elegís cuál le corresponde a cada persona.
      </p>

      <div className="table-card mt-4">
        <div className="table-filter-bar justify-end">
          <button onClick={() => setAbierto(true)} className="btn-primary gap-1.5">
            <Plus size={16} /> Invitar empleado
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="table-head-cell">Nombre</th>
                <th className="table-head-cell">Rol</th>
                <th className="table-head-cell">Plantilla de permisos</th>
                <th className="table-head-cell text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((e) => {
                const plantillasDelRol = plantillasRol.filter((p) => p.rolBase === e.rol);
                return (
                  <Fragment key={e.id}>
                    <tr className="table-row">
                      <td className="table-body-cell">
                        <div className="flex items-center gap-3">
                          <span className="row-avatar"><UserRound size={16} /></span>
                          <span>
                            <span className="block font-medium text-slate-900 dark:text-slate-100">{e.nombres} {e.apellidos}</span>
                            <span className="block text-xs text-slate-400 dark:text-slate-500">{e.email ?? "—"}</span>
                          </span>
                        </div>
                      </td>
                      <td className="table-body-cell text-slate-600 dark:text-slate-300">{nombreRol(e.rol)}</td>
                      <td className="table-body-cell">
                        {e.rol === "administrador" ? (
                          <span className="text-slate-400 dark:text-slate-500">No aplica</span>
                        ) : (
                          <select
                            value={e.plantillaRolId ?? ""}
                            onChange={(ev) => updateEmpleado(e.id, { plantillaRolId: ev.target.value || undefined })}
                            className="select text-sm"
                          >
                            <option value="">Sin plantilla (acceso base)</option>
                            {plantillasDelRol.map((p) => (
                              <option key={p.id} value={p.id}>{p.nombre}</option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="table-body-cell text-right">
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
                            <button onClick={() => { setConfirmandoId(e.id); setErrorEliminar(null); }} title="Eliminar" aria-label={`Eliminar a ${e.nombres} ${e.apellidos}`} className="row-icon-btn row-icon-btn-danger">
                              <Trash2 size={15} />
                            </button>
                          )
                        )}
                      </td>
                    </tr>
                    {confirmandoId === e.id && errorEliminar && (
                      <tr className="table-row">
                        <td colSpan={4} className="px-4 py-2 text-sm text-red-600 dark:text-red-400">{errorEliminar}</td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination pagina={pagina} totalPaginas={totalPaginas} onCambiar={setPagina} />
      </div>

      <SlideOver abierto={abierto} onClose={() => setAbierto(false)} titulo="Invitar empleado">
        <form onSubmit={invitar} className="space-y-3">
          <input placeholder="Nombres" required value={nombres} onChange={(e) => setNombres(e.target.value)} className="input w-full text-sm" />
          <input placeholder="Apellidos" value={apellidos} onChange={(e) => setApellidos(e.target.value)} className="input w-full text-sm" />
          <input placeholder="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input w-full text-sm" />
          <select value={rol} onChange={(e) => setRol(e.target.value as "encargado" | "trabajador")} className="select w-full text-sm">
            <option value="trabajador">{nombreRol("trabajador")}</option>
            <option value="encargado">{nombreRol("encargado")}</option>
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
