"use client";

import { Eye } from "lucide-react";
import { useSession } from "@/components/providers/SessionProvider";
import { nombreRol } from "@/lib/roles";
import { ROLES_SIMULABLES } from "@/lib/simulacion-rol";
import { SettingsTabs, type TabDeAjustes } from "@/components/dashboard/SettingsTabs";

const TABS_ROLES: TabDeAjustes[] = [
  { href: "/dashboard/roles", label: "Roles principales" },
  { href: "/dashboard/roles/personalizados", label: "Roles personalizados" },
  { href: "/dashboard/roles/vista-previa", label: "Vista previa de roles" },
];

export default function RolesVistaPreviaPage() {
  const { rolSimulado, iniciarSimulacion } = useSession();

  return (
    <main>
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Roles</h1>
      <SettingsTabs tabs={TABS_ROLES} gridMobile2 />

      {/* "Ver como" (simulación de UI, ver src/lib/simulacion-rol.ts). Solo
          el botón de EMPEZAR vive acá — el de SALIR sigue siendo exclusivo
          del banner (VistaSimuladaBanner.tsx), porque esta misma página
          queda bloqueada por el proxy mientras se simula un rol no-admin
          (rutasSoloAdministrador incluye /dashboard/roles), así que no
          podría depender de un botón que vive en una ruta a la que ya no se
          puede volver a entrar mientras la simulación sigue activa. */}
      {!rolSimulado && (
        <div className="card mt-4 space-y-3 p-4">
          <h2 className="flex items-center gap-2 font-medium text-slate-900 dark:text-slate-100">
            <Eye size={16} /> Vista previa de roles
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Mirá tu dashboard como lo vería un encargado o un trabajador, antes de delegarles algo.
          </p>
          <div className="flex flex-wrap gap-2">
            {ROLES_SIMULABLES.map((rol) => (
              <button
                key={rol}
                type="button"
                onClick={() => iniciarSimulacion(rol)}
                className="btn-outline h-11 gap-1.5 text-sm sm:h-auto"
              >
                <Eye size={15} /> Ver como {nombreRol(rol)}
              </button>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
