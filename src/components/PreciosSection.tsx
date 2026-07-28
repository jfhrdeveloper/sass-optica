"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
import { SegmentedControl } from "@/components/SegmentedControl";
import {
  PLANES, precioSegunCiclo, ahorroAnual, etiquetaOferta, descripcionOferta,
  type CicloFacturacion,
} from "@/lib/precios";

/* Precios de la landing. Los montos, el descuento anual y los meses de
   regalo NO viven acá — son configuración comercial y están en
   src/lib/precios.ts, para poder cambiarlos en un solo lugar y testear la
   aritmética sin renderizar. Este componente solo los presenta.

   Modelo freemium (no trial con fecha de corte): la tarjeta "Gratis" es un
   plan PERMANENTE con límites (empleados, ventas/mes, sin Marketing), no
   una prueba de 30 días — la prioridad ahora es que se registren sin
   fricción; la conversión a Básico/Premium se resuelve más adelante,
   cuando el negocio crece y choca con esos límites. Los planes pagos
   agregan capacidad y funciones (premium = + facturación SUNAT), nunca
   quitan algo que el plan gratis ya tenía. */
export function PreciosSection() {
  const [ciclo, setCiclo] = useState<CicloFacturacion>("mensual");
  const anual = ciclo === "anual";

  return (
    <div>
      {/* variante="opciones": elegir Mensual/Anual no revela un panel
          distinto, cambia el precio mostrado — es un grupo de radios, no
          pestañas. Con el default ("tabs") un lector de pantalla anunciaba
          "Anual, pestaña 2 de 2", que describe mal lo que hace este control. */}
      <SegmentedControl
        aria-label="Ciclo de facturación"
        variante="opciones"
        valor={ciclo}
        onChange={(v) => setCiclo(v as CicloFacturacion)}
        opciones={[
          { valor: "mensual", label: "Mensual" },
          {
            valor: "anual",
            label: "Anual",
            /* Badge de oferta — el texto sale de OFERTA_ANUAL, no está
               escrito a mano: cambiar esa constante actualiza esto solo, y
               dice "-30%" o "2 meses gratis" según el tipo elegido. */
            extra: (
              <span
                className={`whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                  anual ? "bg-white/20 text-white" : "bg-accent-light text-accent"
                }`}
              >
                {etiquetaOferta()}
              </span>
            ),
          },
        ]}
      />

      <div className="mx-auto mt-8 grid max-w-4xl gap-6 sm:grid-cols-3">
        <div className="card flex flex-col p-6">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">Gratis</h3>
          <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">
            S/ 0 <span className="text-sm font-normal text-slate-400 dark:text-slate-500">/ para siempre</span>
          </p>
          <ul className="mt-4 flex-1 space-y-1.5 text-sm text-slate-600 dark:text-slate-300">
            <li className="flex items-start gap-2"><Check size={15} className="mt-0.5 shrink-0 text-accent" />Clientes, citas y recetas</li>
            <li className="flex items-start gap-2"><Check size={15} className="mt-0.5 shrink-0 text-accent" />Ventas e inventario</li>
            <li className="flex items-start gap-2"><Check size={15} className="mt-0.5 shrink-0 text-accent" />Hasta 2 empleados</li>
            <li className="flex items-start gap-2"><Check size={15} className="mt-0.5 shrink-0 text-accent" />Hasta 30 ventas al mes</li>
          </ul>
          <Link href="/registro" className="btn-outline mt-4 w-full">Crear cuenta gratis</Link>
        </div>

        {PLANES.map((p) => {
          const precio = precioSegunCiclo(p.mensual, ciclo);
          return (
            <div key={p.id} className={p.destacado ? "card flex flex-col p-6 ring-2 ring-primary" : "card flex flex-col p-6"}>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">{p.nombre}</h3>
              <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                S/ {precio.toFixed(2)}
                <span className="text-sm font-normal text-slate-400 dark:text-slate-500"> / {anual ? "año" : "mes"}</span>
              </p>
              {anual && (
                <p className="mt-1 text-xs font-medium text-accent">
                  Ahorras S/ {ahorroAnual(p.mensual).toFixed(2)} al año
                </p>
              )}
              <ul className="mt-4 flex-1 space-y-1.5 text-sm text-slate-600 dark:text-slate-300">
                {p.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2">
                    <Check size={15} className="mt-0.5 shrink-0 text-accent" />
                    {b}
                  </li>
                ))}
              </ul>
              <Link href="/registro" className={p.destacado ? "btn-primary mt-4 w-full" : "btn-outline mt-4 w-full"}>
                Empezar con {p.nombre}
              </Link>
            </div>
          );
        })}
      </div>

      {/* Oferta del plan anual — solo al elegir Anual, justo encima de la
          franja de confianza. Misma unidad que el badge del toggle (nunca
          "30%" y "2 meses" a la vez: sería el mismo beneficio dos veces). */}
      {anual && (
        <p className="mx-auto mt-8 flex w-fit items-center gap-2 rounded-full bg-accent-light px-4 py-2 text-sm font-medium text-accent">
          <Sparkles size={16} className="shrink-0" />
          {descripcionOferta()}
        </p>
      )}

      {/* "¿Por qué nuestros precios son diferentes?" (patrón del research de
          Finegym) — construye confianza justo al lado del precio real. */}
      <div className="mx-auto mt-6 flex max-w-4xl flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-500 dark:text-slate-400">
        <span>Sin cuota de instalación</span>
        <span>·</span>
        <span>Básico y Premium sin límite de clientes ni ventas</span>
        <span>·</span>
        <span>Sin permanencia, cancela cuando quieras</span>
      </div>
    </div>
  );
}
