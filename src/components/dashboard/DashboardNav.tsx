"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen, ChevronDown, Package, Search, Truck, Users, type LucideIcon } from "lucide-react";
import { useSession } from "@/components/providers/SessionProvider";
import { useData } from "@/components/providers/DataProvider";
import { coincideBusqueda } from "@/lib/formato/texto";
import { nombrePlanSuscripcion, nombreEstadoSuscripcion } from "@/lib/precios";
import { NAV, type Hijo, type Restriccion } from "@/lib/dashboard-nav";

const MAX_RESULTADOS_BUSQUEDA = 5;

/* Buscador global (antes vivía suelto en /dashboard/page.tsx, como
   "Inicio" del buscador): se mudó al sidebar para que esté disponible desde
   cualquier página del dashboard, no solo desde Inicio. Colapsado a
   solo-ícono no tiene espacio para el input + dropdown de resultados, así
   que el click ahí expande el sidebar (reusa `onToggle`) antes de enfocar. */
function BuscadorGlobal({ colapsado, onExpandir }: { colapsado: boolean; onExpandir: () => void }) {
  const router = useRouter();
  const { clientes, productos, proveedores } = useData();
  const [q, setQ] = useState("");
  const [enfocado, setEnfocado] = useState(false);

  const resultados = useMemo(() => {
    if (!q.trim()) return null;
    return {
      clientes: clientes
        .filter((c) => !c.eliminadoEn && coincideBusqueda(`${c.nombres} ${c.apellidos} ${c.documentoNumero ?? ""}`, q))
        .slice(0, MAX_RESULTADOS_BUSQUEDA),
      productos: productos
        .filter((p) => coincideBusqueda(`${p.nombre} ${p.codigo ?? ""} ${p.marca ?? ""}`, q))
        .slice(0, MAX_RESULTADOS_BUSQUEDA),
      proveedores: proveedores
        .filter((p) => coincideBusqueda(`${p.nombre} ${p.contacto ?? ""}`, q))
        .slice(0, MAX_RESULTADOS_BUSQUEDA),
    };
  }, [q, clientes, productos, proveedores]);

  const hayResultados = resultados && (resultados.clientes.length > 0 || resultados.productos.length > 0 || resultados.proveedores.length > 0);

  function ir(href: string) {
    router.push(href);
    setQ("");
    setEnfocado(false);
  }

  if (colapsado) {
    return (
      <div className="border-b border-slate-100 px-2 py-3 dark:border-slate-800">
        <button
          type="button"
          onClick={onExpandir}
          title="Buscar cliente, producto o proveedor"
          aria-label="Buscar cliente, producto o proveedor"
          className="flex w-full items-center justify-center rounded-lg border border-slate-200 px-3 py-2 text-slate-400 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-500 dark:hover:bg-slate-800"
        >
          <Search size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="relative border-b border-slate-100 px-2 py-3 dark:border-slate-800">
      <Search size={15} className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => setEnfocado(true)}
        onBlur={() => setTimeout(() => setEnfocado(false), 150)}
        placeholder="Buscar cliente, producto…"
        className="input w-full pl-8 text-sm"
      />

      {enfocado && q.trim() && (
        <div className="card absolute inset-x-2 top-full z-30 mt-1 max-h-96 overflow-y-auto p-2 shadow-lg">
          {!hayResultados ? (
            <p className="p-3 text-sm text-slate-400 dark:text-slate-500">Sin resultados para &quot;{q}&quot;.</p>
          ) : (
            <>
              {resultados!.clientes.length > 0 && (
                <div className="mb-1">
                  <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Clientes</p>
                  {resultados!.clientes.map((c) => (
                    <button
                      key={c.id}
                      onMouseDown={() => ir(`/dashboard/clientes/${c.id}`)}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <Users size={14} className="shrink-0 text-slate-400" /> {c.nombres} {c.apellidos}
                    </button>
                  ))}
                </div>
              )}
              {resultados!.proveedores.length > 0 && (
                <div className="mb-1">
                  <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Proveedores</p>
                  {resultados!.proveedores.map((p) => (
                    <button
                      key={p.id}
                      onMouseDown={() => ir(`/dashboard/proveedores/${p.id}`)}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <Truck size={14} className="shrink-0 text-slate-400" /> {p.nombre}
                    </button>
                  ))}
                </div>
              )}
              {resultados!.productos.length > 0 && (
                <div>
                  <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Productos</p>
                  {resultados!.productos.map((p) => (
                    <button
                      key={p.id}
                      onMouseDown={() => ir("/dashboard/productos")}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <Package size={14} className="shrink-0 text-slate-400" /> {p.nombre}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* Sidebar fijo del dashboard (patrón tomado de las referencias en
   diseno-referencia/: sidebar blanco). Oculta (no solo deshabilita) los
   links admin-only/con-permiso para quien no los tiene — la protección
   real es la RLS + el proxy, esto es solo ergonomía de UI.

   `colapsado`/`onToggle` vienen de DashboardShell.tsx (dueño del estado +
   persistencia en localStorage) — este componente es puramente presentacional
   respecto al colapso, así el ancho del sidebar y el margen del contenido
   nunca se desincronizan. */
const ESTADO_BADGE: Record<string, string> = {
  trial: "badge-warning",
  activa: "badge-success",
  vencida: "badge-danger",
  cancelada: "badge-neutral",
};

export function DashboardNav({ colapsado, onToggle }: { colapsado: boolean; onToggle: () => void }) {
  const pathname = usePathname();
  const { empleado } = useSession();
  const { negocio, suscripcion } = useData();
  const esAdmin = empleado?.rol === "administrador";
  const tienePermiso = (clave?: string) => esAdmin || !clave || empleado?.permisos?.[clave] === true;
  const puedeVer = (i: Restriccion) => (!i.soloAdmin || esAdmin) && tienePermiso(i.permiso);
  /* El link "Ajustes" apunta a /dashboard/ajustes si sos administrador; el
     resto de roles no puede entrar ahí (proxy.ts los rebota), así que
     aterrizan directo en la pestaña de Suscripción/facturación — ver
     SettingsTabs.tsx, comparten la misma UI de tabs. */
  const resolverHref = (href: string) => (href === "/dashboard/ajustes" && !esAdmin ? "/dashboard/facturacion" : href);
  const esActivo = (href: string) => pathname === resolverHref(href);
  const grupoTieneActivo = (hijos: Hijo[]) => hijos.some((h) => esActivo(h.href));

  /* Acordeón: un solo grupo abierto a la vez, por defecto el que contiene la
     ruta activa (si estoy en /dashboard/ventas, "Comercial" arranca abierto).
     Se deriva de `pathname` en cada render (sin efecto ni setState fuera de
     un click) — el click del usuario guarda una anulación puntual atada a
     ESA ruta (`override.path === pathname`); en cuanto cambia la ruta la
     anulación queda obsoleta sola y vuelve a mandar el valor derivado, sin
     necesidad de sincronizarlo a mano en un useEffect. */
  const grupoActivo = NAV.find((it) => it.kind === "group" && grupoTieneActivo(it.children));
  const grupoPorDefecto = grupoActivo && grupoActivo.kind === "group" ? grupoActivo.key : null;
  const [override, setOverride] = useState<{ path: string; key: string | null } | null>(null);
  const grupoAbierto = override && override.path === pathname ? override.key : grupoPorDefecto;
  const alternarGrupo = (key: string) => setOverride({ path: pathname, key: grupoAbierto === key ? null : key });

  function filaLink(href: string, label: string, Icon: LucideIcon, activo: boolean, esHijo = false) {
    return (
      <Link
        key={href}
        href={resolverHref(href)}
        title={colapsado ? label : undefined}
        className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
          colapsado ? "justify-center" : ""
        } ${
          activo
            ? "bg-primary-light text-primary"
            : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
        }`}
      >
        {esHijo ? (
          <span
            aria-hidden="true"
            className={`h-1 w-1 shrink-0 rounded-full ${activo ? "bg-primary/50" : "bg-slate-300 dark:bg-slate-600"}`}
          />
        ) : (
          <Icon size={18} strokeWidth={activo ? 2.5 : 2} />
        )}
        {!colapsado && label}
      </Link>
    );
  }

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-slate-200 bg-white transition-[width] duration-200 dark:border-slate-800 dark:bg-slate-900 md:flex ${
        colapsado ? "w-16" : "w-60"
      }`}
    >
      {/* Identidad del negocio/empleado y ThemeToggle viven en
          DashboardTopbar.tsx — este header queda solo con la marca de la
          app (genérica, no del tenant) y el botón de colapsar, así el
          sidebar es puramente navegación. */}
      <div className="flex items-center justify-between gap-1 border-b border-slate-100 px-3 py-4 dark:border-slate-800">
        {!colapsado && (
          <span className="truncate pl-1 font-display text-base text-slate-900 dark:text-slate-100">SaaS Óptica</span>
        )}
        <button
          onClick={onToggle}
          className={`flex items-center justify-center rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200 ${
            colapsado ? "w-full" : "shrink-0"
          }`}
          aria-label={colapsado ? "Expandir menú" : "Colapsar menú"}
          title={colapsado ? "Expandir menú" : "Colapsar menú"}
        >
          {colapsado ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      <BuscadorGlobal colapsado={colapsado} onExpandir={onToggle} />

      <nav className="flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden px-2 py-4">
        {NAV.map((item) => {
          if (item.kind === "link") {
            if (!puedeVer(item)) return null;
            return filaLink(item.href, item.label, item.icon, esActivo(item.href));
          }

          const hijos = item.children.filter(puedeVer);
          if (hijos.length === 0) return null;

          /* Sidebar colapsado: un grupo entero pasa a ser UN solo ícono (el
             del grupo, no sus hijos aplanados) — clicarlo expande el sidebar
             y abre ese grupo puntual, en vez de listar sus N hijos sueltos.
             Antes se aplanaban (12 íconos idénticos en fila, distinguibles
             solo por `title`); esto deja el riel colapsado con solo los
             ítems "principales" (los links sueltos + un ícono por grupo). */
          if (colapsado) {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  onToggle();
                  setOverride({ path: pathname, key: item.key });
                }}
                title={`${item.label} (expandir para elegir)`}
                aria-label={`${item.label} — expandir menú para elegir`}
                className={`mt-1 flex w-full items-center justify-center rounded-lg px-3 py-2 transition-colors ${
                  grupoTieneActivo(hijos)
                    ? "bg-primary-light text-primary"
                    : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                <Icon size={18} />
              </button>
            );
          }

          const abierto = grupoAbierto === item.key;
          const activo = grupoTieneActivo(hijos);
          const Icon = item.icon;

          return (
            <div key={item.key}>
              <button
                type="button"
                onClick={() => alternarGrupo(item.key)}
                aria-expanded={abierto}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  activo ? "text-primary" : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                <Icon size={18} strokeWidth={activo ? 2.5 : 2} />
                <span className="flex-1 text-left">{item.label}</span>
                <ChevronDown size={14} className={`transition-transform ${abierto ? "rotate-180" : ""}`} />
              </button>

              {abierto && (
                <div className="ml-4 mt-0.5 space-y-0.5 px-2">
                  {hijos.map((h) => (
                    <div key={h.href}>
                      {filaLink(h.href, h.label, h.icon, esActivo(h.href), true)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Identidad del negocio + plan — vivía como una línea de texto gris al
         fondo de Inicio (`dashboard/page.tsx`), suelta y sin diseño real.
         Se mudó acá porque es información constante del negocio, no de una
         página puntual — el sidebar está presente en todo el dashboard.
         Oculto en colapsado: no entra ni el nombre del negocio ni el badge
         en 64px, y ya queda accesible expandiendo. */}
      {!colapsado && negocio && (
        <div className="border-t border-slate-100 px-3 py-3 dark:border-slate-800">
          <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">{negocio.nombre}</p>
          <p className="truncate text-xs text-slate-400 dark:text-slate-500">{negocio.subdominio}</p>
          {suscripcion && (
            <span className={`badge mt-2 ${ESTADO_BADGE[suscripcion.estado] ?? "badge-neutral"}`}>
              {nombrePlanSuscripcion(suscripcion.plan)} · {nombreEstadoSuscripcion(suscripcion.estado)}
            </span>
          )}
        </div>
      )}
    </aside>
  );
}
