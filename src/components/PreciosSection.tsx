"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";

type Ciclo = "mensual" | "anual";

interface Plan {
  id: string;
  nombre: string;
  mensual: number;
  anual: number;
  destacado?: boolean;
  bullets: string[];
}

/* "Anual" = mensual × 10 (2 meses gratis), mismo descuento que usan los
   competidores del rubro (research de Finegym, ver docs/pending-task.md).
   Dos planes pagos, no tres/cuatro como Finegym: el brief ya definió el
   modelo como trial 30 días → básico/premium (premium = facturación SUNAT),
   no freemium para siempre — no vale la pena romper eso solo por copiar la
   cantidad de tiers de un competidor de otro rubro. */
const PLANES: Plan[] = [
  {
    id: "basico",
    nombre: "Básico",
    mensual: 89.90,
    anual: 899.00,
    bullets: [
      "Clientes, citas y recetas",
      "Ventas, inventario y gastos",
      "Proveedores, cotizaciones e informes",
      "Empleados ilimitados",
    ],
  },
  {
    id: "premium",
    nombre: "Premium",
    mensual: 149.90,
    anual: 1499.00,
    destacado: true,
    bullets: [
      "Todo lo de Básico, además de:",
      "Facturación electrónica SUNAT",
      "Soporte prioritario",
    ],
  },
];

export function PreciosSection() {
  const [ciclo, setCiclo] = useState<Ciclo>("mensual");

  return (
    <div>
      <div className="mx-auto flex w-fit rounded-lg border border-slate-200 p-0.5 dark:border-slate-800">
        <button
          onClick={() => setCiclo("mensual")}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            ciclo === "mensual" ? "bg-primary text-white" : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
          }`}
        >
          Mensual
        </button>
        <button
          onClick={() => setCiclo("anual")}
          className={`flex items-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            ciclo === "anual" ? "bg-primary text-white" : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
          }`}
        >
          Anual
          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${ciclo === "anual" ? "bg-white/20 text-white" : "bg-accent-light text-accent"}`}>
            2 meses gratis
          </span>
        </button>
      </div>

      <div className="mx-auto mt-8 grid max-w-4xl gap-6 sm:grid-cols-3">
        <div className="card p-6">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">Prueba gratuita</h3>
          <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">
            Gratis <span className="text-sm font-normal text-slate-400 dark:text-slate-500">/ 30 días</span>
          </p>
          <ul className="mt-4 space-y-1.5 text-sm text-slate-600 dark:text-slate-300">
            <li className="flex items-start gap-2"><Check size={15} className="mt-0.5 shrink-0 text-accent" />Todas las funciones del sistema</li>
            <li className="flex items-start gap-2"><Check size={15} className="mt-0.5 shrink-0 text-accent" />Hasta 3 empleados</li>
            <li className="flex items-start gap-2"><Check size={15} className="mt-0.5 shrink-0 text-accent" />Sin tarjeta de crédito</li>
          </ul>
          <Link href="/registro" className="btn-outline mt-4 block text-center">Empezar gratis</Link>
        </div>

        {PLANES.map((p) => {
          const precio = ciclo === "mensual" ? p.mensual : p.anual;
          return (
            <div key={p.id} className={p.destacado ? "card border-primary bg-primary p-6 text-white" : "card p-6"}>
              <h3 className={`font-semibold ${p.destacado ? "" : "text-slate-900 dark:text-slate-100"}`}>{p.nombre}</h3>
              <p className={`mt-1 text-2xl font-semibold ${p.destacado ? "" : "text-slate-900 dark:text-slate-100"}`}>
                S/ {precio.toFixed(2)}
                <span className={`text-sm font-normal ${p.destacado ? "text-blue-200" : "text-slate-400 dark:text-slate-500"}`}>
                  {" "}/ {ciclo === "mensual" ? "mes" : "año"}
                </span>
              </p>
              <ul className={`mt-4 space-y-1.5 text-sm ${p.destacado ? "text-blue-100" : "text-slate-600 dark:text-slate-300"}`}>
                {p.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2">
                    <Check size={15} className={`mt-0.5 shrink-0 ${p.destacado ? "text-white" : "text-accent"}`} />
                    {b}
                  </li>
                ))}
              </ul>
              <Link
                href="/registro"
                className={
                  p.destacado
                    ? "mt-4 block rounded-lg bg-white px-4 py-2 text-center text-sm font-medium text-primary hover:bg-blue-50"
                    : "btn-outline mt-4 block text-center"
                }
              >
                Empezar gratis
              </Link>
            </div>
          );
        })}
      </div>

      {/* "¿Por qué nuestros precios son diferentes?" (idea de UX tomada del
          research de Finegym) — construye confianza justo al lado del precio
          real, en vez de dejarlo solo. */}
      <div className="mx-auto mt-10 flex max-w-2xl flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-500 dark:text-slate-400">
        <span>Sin cuota de instalación</span>
        <span>·</span>
        <span>Sin límite de clientes ni productos</span>
        <span>·</span>
        <span>Sin permanencia, cancela cuando quieras</span>
      </div>
    </div>
  );
}
