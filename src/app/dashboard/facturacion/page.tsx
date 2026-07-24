"use client";

import Link from "next/link";
import { useData } from "@/components/providers/DataProvider";
import { useSession } from "@/components/providers/SessionProvider";
import { CulqiCheckoutButton } from "@/components/CulqiCheckoutButton";

const MONTO_PLAN_PRO_CENTIMOS = 4900; // S/ 49.00 — placeholder, ver brief §12

export default function FacturacionPage() {
  const { negocio, suscripcion } = useData();
  const { empleado } = useSession();
  const esAdmin = empleado?.rol === "administrador";

  return (
    <main>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Facturación</h1>
        <Link href="/dashboard" className="text-sm underline">← Inicio</Link>
      </div>

      <div className="mt-4 rounded border p-4 text-sm">
        <p>Plan actual: <span className="font-medium">{suscripcion?.plan ?? "—"}</span></p>
        <p>Estado: <span className="font-medium">{suscripcion?.estado ?? "—"}</span></p>
        {suscripcion?.estado === "trial" && <p>Prueba gratuita hasta el {suscripcion.trialFin}.</p>}
        {suscripcion?.estado === "activa" && <p>Próximo cobro: {suscripcion.proximoCobro ?? "—"}</p>}
      </div>

      {suscripcion?.estado === "vencida" && (
        <p className="mt-4 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm">
          Tu prueba gratuita venció. {esAdmin ? "Activa el plan Pro para seguir usando el sistema." : "Pide al administrador de tu negocio que active el plan Pro."}
        </p>
      )}

      {esAdmin ? (
        <div className="mt-6">
          <h2 className="font-medium">Activar plan Pro</h2>
          <p className="mt-1 text-sm text-neutral-600">
            Incluye facturación electrónica SUNAT y empleados ilimitados. Pago con tarjeta o Yape.
          </p>
          <div className="mt-3">
            <CulqiCheckoutButton
              montoCentimos={MONTO_PLAN_PRO_CENTIMOS}
              tituloNegocio={negocio?.nombre ?? "Plan Pro"}
              onExito={() => window.location.reload()}
            />
          </div>
        </div>
      ) : (
        <p className="mt-6 text-sm text-neutral-600">
          Solo el administrador de tu negocio puede gestionar la facturación.
        </p>
      )}
    </main>
  );
}
