"use client";

import { useData } from "@/components/providers/DataProvider";
import { useSession } from "@/components/providers/SessionProvider";

/* Placeholder de dashboard: confirma que auth + tenant + roles funcionan de
   punta a punta. Los módulos reales (clientes, citas, ventas...) se
   construyen en una fase posterior sobre esta base. */
export default function DashboardPage() {
  const { empleado, signOut } = useSession();
  const { negocio, suscripcion } = useData();

  return (
    <main className="mx-auto max-w-2xl p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{negocio?.nombre ?? "Dashboard"}</h1>
        <button onClick={signOut} className="text-sm underline">
          Cerrar sesión
        </button>
      </div>

      <dl className="mt-6 space-y-2 text-sm">
        <div><dt className="inline font-medium">Subdominio: </dt><dd className="inline">{negocio?.subdominio}</dd></div>
        <div><dt className="inline font-medium">Tu rol: </dt><dd className="inline">{empleado?.rol}</dd></div>
        <div><dt className="inline font-medium">Empleado: </dt><dd className="inline">{empleado?.nombres} {empleado?.apellidos}</dd></div>
        <div><dt className="inline font-medium">Plan: </dt><dd className="inline">{suscripcion?.plan ?? "—"}</dd></div>
        <div><dt className="inline font-medium">Estado suscripción: </dt><dd className="inline">{suscripcion?.estado ?? "—"}</dd></div>
        <div><dt className="inline font-medium">Trial hasta: </dt><dd className="inline">{suscripcion?.trialFin ?? "—"}</dd></div>
      </dl>
    </main>
  );
}
