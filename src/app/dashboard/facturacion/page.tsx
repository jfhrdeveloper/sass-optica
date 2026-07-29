"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { useData } from "@/components/providers/DataProvider";
import { useSession } from "@/components/providers/SessionProvider";
import { CulqiCheckoutButton } from "@/components/ui/CulqiCheckoutButton";
import { FeatureGateBanner } from "@/components/dashboard/FeatureGateBanner";
import { SettingsTabs } from "@/components/dashboard/SettingsTabs";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import {
  PLANES, precioSegunCiclo, montoCentimosSegunCiclo, etiquetaOferta, descripcionOferta,
  type CicloFacturacion,
} from "@/lib/precios";
import { formatearFechaPE } from "@/lib/formato/date";

export default function FacturacionPage() {
  const { negocio, suscripcion } = useData();
  const { empleado } = useSession();
  const esAdmin = empleado?.rol === "administrador";

  /* Plan/ciclo elegidos en el checkout — no confundir con `suscripcion.plan`
     (el que YA está activo). Empieza en el plan activo si lo hay, o en
     Premium por defecto para quien todavía no pagó nada. */
  const [ciclo, setCiclo] = useState<CicloFacturacion>("mensual");
  const [planId, setPlanId] = useState<string>(
    PLANES.some((p) => p.id === suscripcion?.plan) ? suscripcion!.plan : "premium",
  );
  const montoCentimos = montoCentimosSegunCiclo(planId, ciclo) ?? 0;

  return (
    <main>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Ajustes</h1>
      <SettingsTabs />

      <div className="card mt-4 p-4 text-sm">
        <p>Plan actual: <span className="font-medium capitalize">{suscripcion?.plan ?? "—"}</span></p>
        <p>Estado: <span className="font-medium">{suscripcion?.estado ?? "—"}</span></p>
        {suscripcion?.estado === "trial" && <p>Prueba gratuita hasta el {formatearFechaPE(suscripcion.trialFin)}.</p>}
        {suscripcion?.estado === "activa" && <p>Próximo cobro: {suscripcion.proximoCobro ? formatearFechaPE(suscripcion.proximoCobro) : "—"}</p>}
      </div>

      {suscripcion?.estado === "vencida" && (
        <p className="badge badge-danger mt-4 px-3 py-1.5">
          Tu prueba gratuita venció. {esAdmin ? "Activa un plan para seguir usando el sistema." : "Pide al administrador de tu negocio que active un plan."}
        </p>
      )}

      {esAdmin ? (
        <div className="mt-6">
          <h2 className="font-medium text-slate-900 dark:text-slate-100">Elige tu plan</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Pago con tarjeta o Yape.</p>

          <SegmentedControl
            aria-label="Ciclo de facturación"
            variante="opciones"
            valor={ciclo}
            onChange={(v) => setCiclo(v as CicloFacturacion)}
            className="mt-4 [&>div]:mx-0"
            opciones={[
              { valor: "mensual", label: "Mensual" },
              {
                valor: "anual",
                label: "Anual",
                extra: (
                  <span
                    className={`whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                      ciclo === "anual" ? "bg-white/20 text-white" : "bg-accent-light text-accent"
                    }`}
                  >
                    {etiquetaOferta()}
                  </span>
                ),
              },
            ]}
          />

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {PLANES.map((p) => {
              const precio = precioSegunCiclo(p.mensual, ciclo);
              const activo = p.id === planId;
              const esPlanVigente = suscripcion?.plan === p.id && suscripcion.estado === "activa";
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPlanId(p.id)}
                  aria-pressed={activo}
                  className={`card flex flex-col p-4 text-left transition-shadow hover:shadow-md ${activo ? "ring-2 ring-primary" : ""}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">{p.nombre}</h3>
                    {esPlanVigente && <span className="badge badge-success shrink-0">Plan actual</span>}
                  </div>
                  <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-100">
                    S/ {precio.toFixed(2)}
                    <span className="text-sm font-normal text-slate-400 dark:text-slate-500"> / {ciclo === "anual" ? "año" : "mes"}</span>
                  </p>
                  <ul className="mt-2 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                    {p.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-1.5">
                        <Check size={13} className="mt-0.5 shrink-0 text-accent" />
                        {b}
                      </li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>

          {ciclo === "anual" && (
            <p className="mt-3 text-xs font-medium text-accent">{descripcionOferta()}</p>
          )}

          <div className="mt-4">
            <CulqiCheckoutButton
              montoCentimos={montoCentimos}
              planId={planId}
              ciclo={ciclo}
              tituloNegocio={`${negocio?.nombre ?? "Óptica"} · Plan ${PLANES.find((p) => p.id === planId)?.nombre}`}
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
