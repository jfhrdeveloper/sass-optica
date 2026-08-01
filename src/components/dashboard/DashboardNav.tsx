"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen, ChevronDown, Package, Search, Truck, Users, type LucideIcon } from "lucide-react";
import { useSession } from "@/components/providers/SessionProvider";
import { useData } from "@/components/providers/DataProvider";
import { coincideBusqueda } from "@/lib/formato/texto";
import { nombrePlanSuscripcion, nombreEstadoSuscripcion } from "@/lib/precios";
import { NAV, type Hijo, type Restriccion } from "@/lib/dashboard-nav";
import { puedeLeerModulo } from "@/lib/permisos";

const MAX_RESULTADOS_BUSQUEDA = 5;

/* `useLayoutEffect` no hace nada en el servidor (y React tira un warning en
   consola si se usa igual durante el SSR) — este componente SÍ se renderiza
   en servidor (no está montado con `ssr: false`), así que se evita con el
   patrón estándar "isomorphic": en el navegador es `useLayoutEffect` de
   verdad (mide el DOM antes del pintado, sin flash); en el servidor cae a
   `useEffect` (que ahí no llega a ejecutarse de todos modos). */
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

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
  const { negocio, suscripcion, citas, productos, rolesPersonalizados } = useData();
  const esAdmin = empleado?.rol === "administrador";

  /* Badges "en vivo" — el sidebar deja de ser solo navegación y muestra el
     estado real del negocio: cuántas citas hay HOY (mismo criterio que la
     stat card de Inicio, `dashboard/page.tsx`) y si algún producto está con
     stock bajo. Cuando el sidebar está colapsado a solo íconos, la alerta
     de stock se ve como punto sobre el ícono del grupo "Comercial" (única
     forma de que no quede escondida en 64px); expandido, viaja al costado
     derecho de la fila de "Stock" (o del propio grupo si está cerrado),
     igual que el número de citas. */
  const citasHoy = citas.filter((c) => c.fechaHora.slice(0, 10) === new Date().toISOString().slice(0, 10)).length;
  const stockBajo = productos.filter((p) => p.stockActual <= p.stockMinimo).length;
  const contadorDe = (href: string) => (href === "/dashboard/citas" && citasHoy > 0 ? citasHoy : null);
  const alertaDe = (href: string) => href === "/dashboard/productos" && stockBajo > 0;
  const grupoTieneAlerta = (key: string) => key === "comercial" && stockBajo > 0;
  const tienePermiso = (clave?: string) => !clave || puedeLeerModulo(empleado, rolesPersonalizados, clave);
  const puedeVer = (i: Restriccion) => (!i.soloAdmin || esAdmin) && tienePermiso(i.permiso);
  /* El link "Ajustes" apunta a /dashboard/ajustes si sos administrador; el
     resto de roles no puede entrar ahí (proxy.ts los rebota), así que
     aterrizan directo en la pestaña de Suscripción/facturación — ver
     SettingsTabs.tsx, comparten la misma UI de tabs. */
  const resolverHref = (href: string) => (href === "/dashboard/ajustes" && !esAdmin ? "/dashboard/facturacion" : href);
  /* Rutas que son "pestañas hermanas" de un ítem del NAV (ver SettingsTabs.tsx:
     /dashboard/facturacion es una pestaña DENTRO de Ajustes, /dashboard/informes/reportes
     dentro de Informes) — sin este mapa, cambiar de pestaña ahí deja de
     matchear el href exacto del ítem del sidebar, el grupo pierde su activo
     y el acordeón se cierra solo. */
  const RUTAS_HERMANAS: Record<string, string[]> = {
    "/dashboard/ajustes": ["/dashboard/facturacion"],
    "/dashboard/informes": ["/dashboard/informes/reportes"],
  };
  /* `/dashboard/clientes/[id]` (ficha del cliente) y `/dashboard/proveedores/[id]`
     son sub-rutas de detalle de un link del NAV, no ítems propios — sin el
     `startsWith` de acá el link "Clientes"/"Proveedores" perdía el resaltado
     azul apenas se entraba a la ficha, y recién volvía al listar de nuevo.
     Se excluye "/dashboard" (Inicio) porque es prefijo literal de TODAS las
     rutas del dashboard: con `startsWith` ahí, "Inicio" quedaría marcado
     activo en cualquier página. */
  const esActivo = (href: string) =>
    pathname === href ||
    (href !== "/dashboard" && pathname.startsWith(`${href}/`)) ||
    (RUTAS_HERMANAS[href]?.includes(pathname) ?? false) ||
    pathname === resolverHref(href);
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

  /* Indicador activo deslizante: en vez de que el fondo `bg-primary-light`
     aparezca/desaparezca de golpe en la fila nueva, una sola píldora se
     desliza entre filas (transform, no framer-motion — la librería está
     deliberadamente fuera del bundle del dashboard, ver
     `LandingMotionProvider.tsx`).

     Se mide con `getBoundingClientRect()` (posición real en pantalla,
     restada contra el propio `<nav>`) en vez de `offsetTop/Left`: estos
     últimos dependen de cuál sea el ancestro *posicionado* más cercano
     (`offsetParent`), que cambia según qué wrappers intermedios tengan
     `position: relative` (p. ej. el contenedor de la línea vertical de los
     hijos) — un supuesto frágil que se rompía apenas se tocaba el árbol.
     `getBoundingClientRect` da coordenadas absolutas de pantalla, así que
     el resultado es el mismo sin importar la estructura de wrappers de
     adentro.

     La fila se busca por `data-nav-key` con `querySelector`, contra el DOM
     real en cada medición — nunca se cachea un elemento entre renders. Los
     hijos de un grupo cerrado ya NO se desmontan (antes `{abierto && ...}`
     los sacaba del DOM del todo); ahora quedan siempre montados y solo se
     ocultan con la clase `hidden`, así el nodo con su `data-nav-key` es
     estable de entrada — cerrar/reabrir el acordeón nunca vuelve a
     desincronizar la búsqueda. */
  const navRef = useRef<HTMLElement>(null);
  let claveActiva: string | null = null;
  for (const item of NAV) {
    if (item.kind === "link") {
      if (puedeVer(item) && esActivo(item.href)) { claveActiva = item.href; break; }
    } else {
      const hijosVisibles = item.children.filter(puedeVer);
      if (hijosVisibles.length > 0 && grupoTieneActivo(hijosVisibles)) {
        claveActiva = colapsado ? item.key : (hijosVisibles.find((h) => esActivo(h.href))?.href ?? null);
        break;
      }
    }
  }
  const [indicador, setIndicador] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const medirIndicador = () => {
    const nav = navRef.current;
    if (!nav || !claveActiva) { setIndicador(null); return; }
    const el = nav.querySelector<HTMLElement>(`[data-nav-key="${claveActiva}"]`);
    if (!el || el.offsetParent === null) { setIndicador(null); return; }
    const navRect = nav.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    setIndicador({
      top: elRect.top - navRect.top + nav.scrollTop,
      left: elRect.left - navRect.left + nav.scrollLeft,
      width: elRect.width,
      height: elRect.height,
    });
  };
  useIsomorphicLayoutEffect(medirIndicador, [claveActiva, grupoAbierto]);
  /* El ancho de `<aside>` anima 200ms al colapsar/expandir el sidebar
     (`transition-[width]`) — medir en ese instante captura un ancho a
     mitad de camino y la píldora "salta" de tamaño en vez de solo moverse.
     La parte SÍNCRONA (ocultar apenas cambia `colapsado`) se hace ajustando
     estado durante el render, no dentro de un efecto — patrón recomendado
     por React para "ajustar estado cuando cambia una prop"; hacerlo desde
     un `useEffect` dispara el lint `react-hooks/set-state-in-effect`
     (cascada de renders). El efecto de abajo solo maneja la parte
     asíncrona: remedir una vez pasados los 200ms. */
  const [colapsadoAnterior, setColapsadoAnterior] = useState(colapsado);
  const [colapsando, setColapsando] = useState(false);
  if (colapsado !== colapsadoAnterior) {
    setColapsadoAnterior(colapsado);
    setColapsando(true);
  }
  useEffect(() => {
    if (!colapsando) return;
    const id = setTimeout(() => {
      setColapsando(false);
      medirIndicador();
    }, 200);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colapsando]);

  /* Fila de badge — número (citas de hoy) o punto de alerta (stock bajo),
     nunca ambos en la misma fila. Se dibuja al final de la fila, en el
     mismo lugar donde iría cualquiera de los dos, para que el punto rojo
     quede alineado con el número: antes vivía sobre el ícono y no eran
     comparables entre sí. El número usa `flex items-center justify-center`
     con alto/ancho fijos en vez de solo padding — con padding el dígito
     quedaba visualmente descentrado según la fuente. */
  function badge(contador: number | null, alerta: boolean) {
    if (contador !== null) {
      return (
        <span className="ml-1 flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-semibold leading-none text-white">
          {contador}
        </span>
      );
    }
    if (alerta) {
      return <span aria-hidden="true" className="ml-1 h-2 w-2 shrink-0 rounded-full bg-red-500 dark:bg-red-400" />;
    }
    return null;
  }

  function filaLink(href: string, label: string, Icon: LucideIcon, activo: boolean, esHijo = false) {
    return (
      <Link
        key={href}
        data-nav-key={href}
        href={resolverHref(href)}
        title={colapsado ? label : undefined}
        className={`relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
          colapsado ? "justify-center" : ""
        } ${
          activo ? "text-primary" : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
        }`}
      >
        {!esHijo && <Icon size={18} strokeWidth={activo ? 2.5 : 2} className="shrink-0" />}
        {!colapsado && <span className="flex-1 truncate text-left">{label}</span>}
        {!colapsado && badge(contadorDe(href), alertaDe(href))}
      </Link>
    );
  }

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-30 hidden flex-col overflow-hidden rounded-r-[1.75rem] border-r border-slate-200 bg-white shadow-[4px_0_16px_-4px_rgba(15,23,42,0.12)] transition-[width] duration-200 dark:border-slate-800 dark:bg-slate-900 dark:shadow-[4px_0_16px_-4px_rgba(0,0,0,0.4)] md:flex ${
        colapsado ? "w-16" : "w-60"
      }`}
    >
      {/* Identidad del negocio/empleado y ThemeToggle viven en
          DashboardTopbar.tsx — este header queda solo con la marca de la
          app (genérica, no del tenant) y el botón de colapsar, así el
          sidebar es puramente navegación. `h-16` fijo (no `py-*`) para que la
          línea inferior caiga exactamente a la misma altura que el borde del
          topbar (DashboardTopbar.tsx: mismo `h-16`) sin depender de que el
          contenido interno de ambos mida lo mismo. */}
      <div className="flex h-16 items-center justify-between gap-1 border-b border-slate-100 px-3 dark:border-slate-800">
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

      <nav ref={navRef} className="relative flex-1 overflow-y-auto overflow-x-hidden px-2 py-4">
        {/* Píldora activa — un solo elemento que se traslada con `transform`
            a la posición/ancho medidos de la fila activa, en vez de que cada
            fila prenda/apague su propio fondo. Se oculta (opacity, sin
            transición) mientras el sidebar colapsa/expande y reaparece con
            fade una vez que esa animación de ancho terminó — ver el efecto
            de `colapsado` arriba. `motion-reduce` apaga toda la animación
            para quien pidió menos movimiento. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0 rounded-lg bg-primary-light transition-[transform,opacity] duration-200 ease-out motion-reduce:transition-none"
          style={{
            transform: `translate(${indicador?.left ?? 0}px, ${indicador?.top ?? 0}px)`,
            width: indicador ? `${indicador.width}px` : 0,
            height: indicador ? `${indicador.height}px` : 0,
            opacity: indicador && !colapsando ? 1 : 0,
          }}
        />
        <div className="space-y-0.5">
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
                data-nav-key={item.key}
                type="button"
                onClick={() => {
                  onToggle();
                  setOverride({ path: pathname, key: item.key });
                }}
                title={`${item.label} (expandir para elegir)`}
                aria-label={`${item.label} — expandir menú para elegir`}
                className={`relative mt-1 flex w-full items-center justify-center rounded-lg px-3 py-2 transition-colors ${
                  grupoTieneActivo(hijos)
                    ? "text-primary"
                    : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                <span className="relative">
                  <Icon size={18} />
                  {grupoTieneAlerta(item.key) && (
                    <span
                      aria-hidden="true"
                      className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:bg-red-400 dark:ring-slate-900"
                    />
                  )}
                </span>
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
                <Icon size={18} strokeWidth={activo ? 2.5 : 2} className="shrink-0" />
                <span className="flex-1 text-left">{item.label}</span>
                {!abierto && grupoTieneAlerta(item.key) && (
                  <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-red-500 dark:bg-red-400" />
                )}
                <ChevronDown size={14} className={`transition-transform ${abierto ? "rotate-180" : ""}`} />
              </button>

              {/* Los hijos quedan SIEMPRE montados (nunca `{abierto && ...}`)
                  — cerrar/abrir el acordeón solo alterna la clase `hidden`,
                  no desmonta ni remonta el DOM. Así el nodo de cada hijo
                  (con su `data-nav-key`) es estable de entrada, sin
                  ventanas donde el indicador busque una fila que todavía
                  no existe. La línea vertical no va de borde a borde del
                  contenedor: arranca a la mitad de la primera fila y
                  termina a la mitad de la última (offset fijo ≈ mitad de
                  una fila de `py-2` + `text-sm`), como un conector de árbol
                  real en vez de un bloque completo. */}
              <div className={`relative ml-5 mt-0.5 space-y-0.5 pl-3 ${abierto ? "" : "hidden"}`}>
                <div aria-hidden="true" className="pointer-events-none absolute left-0 top-[18px] bottom-[18px] w-px bg-slate-200 dark:bg-slate-800" />
                {hijos.map((h) => (
                  <div key={h.href}>
                    {filaLink(h.href, h.label, h.icon, esActivo(h.href), true)}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        </div>
      </nav>

      {/* Identidad del negocio + plan — vivía como una línea de texto gris al
         fondo de Inicio (`dashboard/page.tsx`), suelta y sin diseño real.
         Se mudó acá porque es información constante del negocio, no de una
         página puntual — el sidebar está presente en todo el dashboard.
         Ahora es un link (mismo destino que "Ajustes" del nav — resolverHref
         ya manda a Facturación si no sos administrador) con el logo/iniciales
         del negocio, mismo círculo que ya usa DashboardTopbar.tsx — antes era
         solo texto, sin ninguna acción ni identidad visual real. Oculto en
         colapsado: no entra ni el nombre del negocio ni el badge en 64px, y
         ya queda accesible expandiendo. */}
      {!colapsado && negocio && (
        <Link
          href={resolverHref("/dashboard/ajustes")}
          className="flex items-center gap-2.5 border-t border-slate-100 px-3 py-3 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
        >
          {negocio.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={negocio.logoUrl} alt="" className="h-8 w-8 shrink-0 rounded-md object-cover" />
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary-light text-xs font-semibold text-primary">
              {negocio.nombre?.[0]?.toUpperCase() ?? "O"}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">{negocio.nombre}</p>
            <p className="truncate text-xs text-slate-400 dark:text-slate-500">{negocio.subdominio}</p>
            {suscripcion && (
              <span className={`badge mt-1 ${ESTADO_BADGE[suscripcion.estado] ?? "badge-neutral"}`}>
                {nombrePlanSuscripcion(suscripcion.plan)} · {nombreEstadoSuscripcion(suscripcion.estado)}
              </span>
            )}
          </div>
        </Link>
      )}
    </aside>
  );
}
