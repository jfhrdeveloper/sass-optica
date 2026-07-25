"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

/* Mapa ruta → etiqueta + grupo del sidebar.

   El GRUPO no está en la URL: todas las rutas del dashboard son planas
   (`/dashboard/ventas`, no `/dashboard/comercial/ventas`), pero el sidebar
   sí las agrupa en Comercial/Administración — así que el usuario ya piensa
   la navegación en esos grupos. Este mapa es lo que permite que el rastro
   refleje esa jerarquía mental en vez de la URL cruda, que sería siempre
   de 2 niveles y no aportaría nada.

   Si se agrega una ruta al sidebar (DashboardNav.tsx), va también acá.

   `facturacion` comparte etiqueta con `ajustes` a propósito: son un mismo
   cluster de configuración con tabs internas (ver SettingsTabs.tsx), y el
   sidebar tiene una sola entrada para ambas. */
const RUTAS: Record<string, { label: string; grupo?: string }> = {
  clientes:     { label: "Clientes" },
  citas:        { label: "Citas" },
  productos:    { label: "Stock",        grupo: "Comercial" },
  proveedores:  { label: "Proveedores",  grupo: "Comercial" },
  cotizaciones: { label: "Cotizaciones", grupo: "Comercial" },
  ventas:       { label: "Ventas",       grupo: "Comercial" },
  descuentos:   { label: "Descuentos",   grupo: "Comercial" },
  marketing:    { label: "Marketing",    grupo: "Comercial" },
  gastos:       { label: "Gastos",       grupo: "Administración" },
  informes:     { label: "Informes",     grupo: "Administración" },
  empleados:    { label: "Empleados",    grupo: "Administración" },
  ajustes:      { label: "Ajustes",      grupo: "Administración" },
  facturacion:  { label: "Ajustes",      grupo: "Administración" },
};

function Separador() {
  /* `aria-hidden`: el separador es decorativo. Si fuera texto ("/" o ">")
     el lector de pantalla lo dictaría entre cada crumb ("Inicio barra
     Comercial barra Ventas"). Un SVG oculto del árbol de accesibilidad
     cumple el mismo rol que el pseudo-elemento CSS del patrón de
     referencia: se ve, no se anuncia. */
  return <ChevronRight size={14} aria-hidden="true" className="shrink-0 text-slate-300 dark:text-slate-600" />;
}

/* Rastro de navegación del dashboard. Montado UNA sola vez en
   DashboardShell, no por página — mismo criterio que `.page-enter` y la
   tipografía de headings: un solo punto de aplicación.

   No se implementa el colapso en elipsis del patrón de referencia porque
   acá el rastro llega como máximo a 3 niveles (Inicio / Grupo / Página):
   nunca hay ancestros intermedios "de bajo valor" que esconder. Si algún
   día se anidan rutas de detalle, ahí sí haría falta. */
export function Breadcrumbs() {
  const pathname = usePathname();
  const seccion = pathname.split("/")[2] ?? "";
  const actual = RUTAS[seccion];

  /* En /dashboard (la raíz) el rastro sería un único ítem apuntándose a sí
     mismo: no se muestra nada. */
  if (!actual) return null;

  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      {/* <ol> y no <div>: los breadcrumbs son una lista ORDENADA — el orden
          ES la jerarquía. Con divs se ve igual pero se pierde esa semántica. */}
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
        <li>
          <Link href="/dashboard" className="link">Inicio</Link>
        </li>

        {actual.grupo && (
          <li className="flex items-center gap-1.5">
            <Separador />
            {/* Texto plano, no link: no existe /dashboard/comercial — el
                grupo es un agrupador visual del sidebar, no una página. */}
            <span>{actual.grupo}</span>
          </li>
        )}

        <li className="flex items-center gap-1.5">
          <Separador />
          {/* La página actual NUNCA es un link a sí misma. */}
          <span aria-current="page" className="font-medium text-slate-900 dark:text-slate-100">
            {actual.label}
          </span>
        </li>
      </ol>
    </nav>
  );
}
