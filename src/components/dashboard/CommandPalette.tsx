"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useSession } from "@/components/providers/SessionProvider";
import { useData } from "@/components/providers/DataProvider";
import { NAV, aplanarNav } from "@/lib/dashboard-nav";
import { coincideBusqueda } from "@/lib/formato/texto";
import { puedeLeerModulo } from "@/lib/permisos";

/* Navegación rápida (Ctrl+K / ⌘K) entre las 13+ secciones del dashboard —
   con el sidebar + tab bar mobile ya cubriendo la navegación por clic, esto
   cubre al usuario que prefiere no soltar el teclado (patrón de
   ferdocs-web, proyecto hermano). `aplanarNav` (links sueltos + hijos de
   grupo en una sola lista) vive en lib/dashboard-nav.ts — misma fuente que
   reusa el editor de accesos rápidos de /dashboard. */

export function CommandPalette() {
  const router = useRouter();
  const { empleado } = useSession();
  const { rolesPersonalizados } = useData();
  const [abierto, setAbierto] = useState(false);
  const [q, setQ] = useState("");
  const [activo, setActivo] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const esAdmin = empleado?.rol === "administrador";
  const tienePermiso = (clave?: string) => !clave || puedeLeerModulo(empleado, rolesPersonalizados, clave);

  const todos = useMemo(() => aplanarNav(NAV), []);
  const filtrados = useMemo(() => {
    const base = todos.filter((i) => (!i.soloAdmin || esAdmin) && tienePermiso(i.permiso));
    if (!q.trim()) return base;
    return base.filter((i) => coincideBusqueda(`${i.label} ${i.grupo ?? ""}`, q));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tienePermiso se recalcula con empleado/esAdmin, ya listados
  }, [todos, q, esAdmin, empleado]);

  function abrir() {
    setAbierto(true);
    setActivo(0);
  }
  function cerrar() {
    setAbierto(false);
    setQ("");
    setActivo(0);
  }
  function cambiarQ(valor: string) {
    setQ(valor);
    setActivo(0);
  }

  /* Botón visible en DashboardTopbar (para quien no conoce el atajo) abre el
     palette disparando este evento en vez de levantar el estado a un
     contexto nuevo solo para esto — un `CustomEvent` global es más simple
     dado que solo hay un consumidor. */
  useEffect(() => {
    window.addEventListener("abrir-command-palette", abrir);
    return () => window.removeEventListener("abrir-command-palette", abrir);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (abierto) cerrar(); else abrir();
        return;
      }
      if (!abierto) return;
      if (e.key === "Escape") { cerrar(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setActivo((a) => Math.min(a + 1, filtrados.length - 1)); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setActivo((a) => Math.max(a - 1, 0)); return; }
      if (e.key === "Enter" && filtrados[activo]) { e.preventDefault(); ir(filtrados[activo].href); }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `abrir`/`cerrar`/`ir` son estables (solo llaman a setState/router)
  }, [abierto, filtrados, activo]);

  useEffect(() => {
    if (abierto) inputRef.current?.focus();
  }, [abierto]);

  function ir(href: string) {
    router.push(href);
    cerrar();
  }

  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" role="dialog" aria-modal="true" aria-label="Buscador de secciones">
      <div className="absolute inset-0 bg-slate-900/40" onClick={cerrar} />
      <div className="relative w-full max-w-lg rounded-xl bg-white shadow-2xl dark:bg-slate-900">
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          <Search size={16} className="shrink-0 text-slate-400" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => cambiarQ(e.target.value)}
            placeholder="Ir a una sección…"
            className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100"
          />
          <kbd className="hidden shrink-0 rounded border border-slate-200 px-1.5 py-0.5 text-[10px] text-slate-400 dark:border-slate-700 sm:block">Esc</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {filtrados.length === 0 ? (
            <p className="p-4 text-center text-sm text-slate-400 dark:text-slate-500">Sin resultados para &quot;{q}&quot;.</p>
          ) : (
            filtrados.map((item, i) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.href}
                  onMouseEnter={() => setActivo(i)}
                  onClick={() => ir(item.href)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm ${
                    i === activo ? "bg-primary-light text-primary" : "text-slate-700 dark:text-slate-200"
                  }`}
                >
                  <Icon size={16} className={i === activo ? "text-primary" : "text-slate-400"} />
                  {item.label}
                  {item.grupo && <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">{item.grupo}</span>}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
