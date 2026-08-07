"use client";

import { useState } from "react";
import { ChevronDown, ShieldCheck } from "lucide-react";
import { nombreRol } from "@/lib/roles";
import { modulosDeRolPrincipal, type NivelPermiso } from "@/lib/permisos";
import { SettingsTabs, type TabDeAjustes } from "@/components/dashboard/SettingsTabs";

const TABS_ROLES: TabDeAjustes[] = [
  { href: "/dashboard/roles", label: "Roles principales" },
  { href: "/dashboard/roles/personalizados", label: "Roles personalizados" },
  { href: "/dashboard/roles/vista-previa", label: "Vista previa de roles" },
];

const ROLES_PRINCIPALES = ["administrador", "encargado", "trabajador"] as const;

function etiquetaNivel(nivel: NivelPermiso): string {
  return nivel === "escritura" ? "lectura y escritura" : "lectura";
}

/* Ruta protegida a nivel de proxy (rutasSoloAdministrador) — solo
   administrador llega hasta aquí. Junta las tres piezas de "gestión de
   roles" que antes vivían repartidas: la simulación de UI (antes en
   Ajustes) y el editor de roles personalizados (antes checkboxes sueltos
   dentro de cada fila de Empleados) — a pedido del usuario, todo lo que es
   "definir qué ve cada rol" vive en un solo lugar. */
export default function RolesPage() {
  // Mobile: fila expandida (ver el detalle de módulos) — mismo patrón que
  // Ventas → Ventas realizadas, la columna "Módulos" completa solo vive en
  // la tabla de desktop; en mobile antes quedaba oculta sin ninguna forma
  // de verla.
  const [rolExpandido, setRolExpandido] = useState<string | null>(null);

  return (
    <main>
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Roles</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Previsualizá el dashboard con otro rol y armá roles personalizados reutilizables para tus encargados y trabajadores.
      </p>
      <SettingsTabs tabs={TABS_ROLES} gridMobile2 />

      {/* Referencia de solo lectura — el acceso de los 3 roles principales es
         fijo (ver puede_gestionar()/sin_rol_personalizado() en el schema),
         nada acá se edita. Sirve para saber de un vistazo a dónde llega cada
         uno ANTES de asignarle un rol personalizado, que reemplaza este piso
         por completo (ver el aviso en el formulario de Roles personalizados). */}
      <h2 className="mt-4 flex items-center gap-2 font-medium text-slate-900 dark:text-slate-100">
        <ShieldCheck size={16} /> Roles principales
      </h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        El acceso de base de cada rol, sin ningún rol personalizado asignado — de referencia, no se edita acá.
      </p>
      <div className="table-card mt-3">
        {/* Desktop: tabla completa sin cambios (Módulos ya visible acá). */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="table-head-cell">Rol</th>
                <th className="table-head-cell">Módulos</th>
              </tr>
            </thead>
            <tbody>
              {ROLES_PRINCIPALES.map((rol) => {
                const modulos = modulosDeRolPrincipal(rol).filter((m) => m.nivel !== "ninguno");
                return (
                  <tr key={rol} className="table-row">
                    <td className="table-body-cell font-medium text-slate-900 dark:text-slate-100">{nombreRol(rol)}</td>
                    <td className="table-body-cell text-slate-500 dark:text-slate-400">
                      {rol === "administrador"
                        ? "Todos los módulos (lectura y escritura)."
                        : modulos.length > 0
                          ? modulos.map((m) => `${m.label} (${etiquetaNivel(m.nivel)})`).join(", ")
                          : "Ninguno."}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile: tarjeta por rol, el chevron despliega la lista de módulos
           (antes esa info estaba oculta del todo en mobile). */}
        <div className="space-y-2 p-3 md:hidden">
          {ROLES_PRINCIPALES.map((rol) => {
            const modulos = modulosDeRolPrincipal(rol).filter((m) => m.nivel !== "ninguno");
            const expandido = rolExpandido === rol;
            return (
              <div key={rol} className="card p-3 text-sm">
                <button
                  type="button"
                  onClick={() => setRolExpandido(expandido ? null : rol)}
                  aria-expanded={expandido}
                  className="flex w-full items-center gap-3 text-left"
                >
                  <span className="row-avatar shrink-0"><ShieldCheck size={16} /></span>
                  <span className="min-w-0 flex-1 font-medium text-slate-900 dark:text-slate-100">{nombreRol(rol)}</span>
                  <ChevronDown size={16} className={`shrink-0 text-slate-400 transition-transform ${expandido ? "rotate-180" : ""}`} />
                </button>

                {expandido && (
                  <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3 dark:border-slate-800">
                    {rol === "administrador" ? (
                      <p className="text-xs text-slate-500 dark:text-slate-500">Todos los módulos (lectura y escritura).</p>
                    ) : modulos.length > 0 ? (
                      modulos.map((m) => (
                        <p key={m.clave} className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-500">
                          <span>{m.label}</span>
                          <span className="capitalize">{etiquetaNivel(m.nivel)}</span>
                        </p>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500 dark:text-slate-500">Ninguno.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
