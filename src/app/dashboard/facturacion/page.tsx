"use client";

import Link from "next/link";
import { useData } from "@/components/providers/DataProvider";
import { useSession } from "@/components/providers/SessionProvider";
import { CulqiCheckoutButton } from "@/components/CulqiCheckoutButton";
import { FeatureGateBanner } from "@/components/FeatureGateBanner";
import { SettingsTabs } from "@/components/SettingsTabs";

const MONTO_PLAN_PRO_CENTIMOS = 4900; // S/ 49.00 — placeholder, ver brief §12

export default function FacturacionPage() {
  const { negocio, suscripcion } = useData();
  const { empleado } = useSession();
  const esAdmin = empleado?.rol === "administrador";

  return (
    <main>
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="text-sm font-medium link">← Inicio</Link>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Ajustes</h1>
      </div>
      <SettingsTabs />

      <div className="card mt-4 p-4 text-sm">
        <p>Plan actual: <span className="font-medium">{suscripcion?.plan ?? "—"}</span></p>
        <p>Estado: <span className="font-medium">{suscripcion?.estado ?? "—"}</span></p>
        {suscripcion?.estado === "trial" && <p>Prueba gratuita hasta el {suscripcion.trialFin}.</p>}
        {suscripcion?.estado === "activa" && <p>Próximo cobro: {suscripcion.proximoCobro ?? "—"}</p>}
      </div>

      {suscripcion?.estado === "vencida" && (
        <p className="badge badge-danger mt-4 px-3 py-1.5">
          Tu prueba gratuita venció. {esAdmin ? "Activa el plan Pro para seguir usando el sistema." : "Pide al administrador de tu negocio que active el plan Pro."}
        </p>
      )}

      {esAdmin ? (
        <div className="mt-6">
          <h2 className="font-medium">Activar plan Pro</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
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
        <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
          Solo el administrador de tu negocio puede gestionar la facturación.
        </p>
      )}

      {suscripcion?.plan !== "premium" && (
        <div className="mt-8">
          <h2 className="font-medium text-slate-900 dark:text-slate-100">Facturación electrónica SUNAT</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Emite boletas y facturas electrónicas directamente desde cada venta, integradas con un OSE (Nubefact).
          </p>
          <div className="mt-3">
            <FeatureGateBanner mensaje="La facturación electrónica SUNAT no está disponible en tu plan actual." />
          </div>
          {/* "Candado visible" (idea de UX #10): el módulo se muestra completo,
              solo en modo lectura — no se oculta como haría un feature flag
              tradicional, así el equipo ve el valor del plan Pro. */}
          <fieldset disabled className="card mt-3 grid grid-cols-1 gap-2 p-4 opacity-60 sm:grid-cols-3">
            <select className="select text-sm"><option>Boleta</option><option>Factura</option></select>
            <input placeholder="Serie-número (auto)" className="input text-sm" />
            <button type="button" className="btn-primary">Emitir comprobante</button>
          </fieldset>
        </div>
      )}
    </main>
  );
}
