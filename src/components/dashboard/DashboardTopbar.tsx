"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, LogOut, Search, Store, UserRound } from "lucide-react";
import { useData } from "@/components/providers/DataProvider";
import { useSession } from "@/components/providers/SessionProvider";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

function iniciales(nombres?: string, apellidos?: string): string {
  return `${nombres?.[0] ?? ""}${apellidos?.[0] ?? ""}`.toUpperCase() || "?";
}

const SUCURSAL_STORAGE_KEY = "sucursal_filtro";

/* Selector de sede — solo un filtro de CONVENIENCIA en el cliente sobre
   datos que RLS ya aprobó (nunca reemplaza ese chequeo, que vive 100% en
   `current_sucursal()` del lado de la base). Solo tiene sentido para un
   empleado cuyo `sucursalId` ya es null (puede ver todas) y quiere mirar
   una sede a la vez — un empleado con sede fija asignada ya está limitado
   por RLS, no necesita ni ve este selector. Persistido en localStorage,
   mismo patrón que CoachTooltip.tsx; lo consume cada página que liste
   citas/ventas filtrando por `sucursalId` (fuera del alcance de esta
   sesión — acá solo queda la infraestructura: el selector y dónde guarda
   su valor). */
function useSucursalFiltro(): [string | null, (id: string | null) => void] {
  const [valor, setValor] = useState<string | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage no existe en SSR
    setValor(window.localStorage.getItem(SUCURSAL_STORAGE_KEY));
  }, []);
  function cambiar(id: string | null) {
    if (id) window.localStorage.setItem(SUCURSAL_STORAGE_KEY, id);
    else window.localStorage.removeItem(SUCURSAL_STORAGE_KEY);
    setValor(id);
  }
  return [valor, cambiar];
}

/* Franja horizontal arriba del contenido (patrón Gmail/Notion/Linear): a la
   derecha identidad del negocio + tema + cuenta. Todo lo que antes vivía en
   el header del sidebar (DashboardNav.tsx) se mudó acá — el sidebar quedó
   solo con navegación. El rastro de navegación (Breadcrumbs) que iba a la
   izquierda se quitó a pedido del usuario. */
export function DashboardTopbar() {
  const { negocio, sucursales } = useData();
  const { empleado, signOut } = useSession();
  const [abierto, setAbierto] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [sucursalFiltro, setSucursalFiltro] = useSucursalFiltro();
  const mostrarSelectorSede = sucursales.length > 0 && !empleado?.sucursalId;

  useEffect(() => {
    function onClickFuera(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setAbierto(false);
    }
    document.addEventListener("mousedown", onClickFuera);
    return () => document.removeEventListener("mousedown", onClickFuera);
  }, []);

  return (
    <div className="sticky top-0 z-20 mb-4 flex items-center justify-end gap-4 border-b border-slate-200 bg-slate-50/80 px-6 py-3 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/80">
      <div className="flex shrink-0 items-center gap-3">
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event("abrir-command-palette"))}
          aria-label="Buscar secciones (Ctrl+K)"
          className="hidden items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-400 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-500 dark:hover:bg-slate-800 md:flex"
        >
          <Search size={14} />
          <span className="hidden lg:inline">Buscar</span>
          <kbd className="rounded border border-slate-200 px-1 dark:border-slate-700">Ctrl K</kbd>
        </button>

        <div className="hidden items-center gap-2 sm:flex">
          {negocio?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={negocio.logoUrl} alt="" className="h-7 w-7 rounded-md object-cover" />
          ) : (
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary-light text-xs font-semibold text-primary">
              {negocio?.nombre?.[0]?.toUpperCase() ?? "O"}
            </div>
          )}
          <span className="max-w-[140px] truncate text-sm font-medium text-slate-700 dark:text-slate-200">
            {negocio?.nombre ?? "Panel"}
          </span>
        </div>

        {mostrarSelectorSede && (
          <label className="hidden items-center gap-1.5 sm:flex">
            <Store size={14} className="shrink-0 text-slate-400" />
            <select
              value={sucursalFiltro ?? ""}
              onChange={(e) => setSucursalFiltro(e.target.value || null)}
              aria-label="Filtrar por sede"
              className="select max-w-[140px] py-1 text-xs"
            >
              <option value="">Todas las sedes</option>
              {sucursales.filter((s) => s.activo).map((s) => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>
          </label>
        )}

        <div className="h-5 w-px bg-slate-200 dark:bg-white/10" />

        <ThemeToggle />

        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setAbierto((v) => !v)}
            aria-expanded={abierto}
            aria-haspopup="true"
            className="flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {empleado?.avatarBase64 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={empleado.avatarBase64} alt="" className="h-7 w-7 rounded-full object-cover" />
            ) : (
              <span className="row-avatar h-7 w-7 text-xs font-semibold">
                {empleado ? iniciales(empleado.nombres, empleado.apellidos) : <UserRound size={14} />}
              </span>
            )}
            <ChevronDown size={14} className={`text-slate-400 transition-transform ${abierto ? "rotate-180" : ""}`} />
          </button>

          {abierto && (
            <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg shadow-black/[0.08] dark:border-slate-800 dark:bg-slate-900">
              <div className="border-b border-slate-100 px-3 pb-2 dark:border-slate-800">
                <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                  {empleado?.nombres} {empleado?.apellidos}
                </p>
                <p className="truncate text-xs text-slate-400 dark:text-slate-500">{empleado?.email}</p>
              </div>
              <Link
                href="/dashboard/perfil"
                onClick={() => setAbierto(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <UserRound size={15} /> Mi perfil
              </Link>
              <button
                type="button"
                onClick={signOut}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <LogOut size={15} /> Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
