"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { MouseEvent, ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

/* Cuánto dura el fundido de SALIDA antes de navegar de verdad. La entrada
   (destapar) no tiene un valor propio: la clase de abajo comparte la misma
   `duration-300` para los dos sentidos, así el ida-y-vuelta se siente
   simétrico. */
const DURACION_SALIDA_MS = 220;

/* ================= TRANSICIÓN ENTRE PÁGINAS =================
   El overlay vive en el layout raíz (único punto del árbol que sobrevive al
   cambio de ruta) para poder taparse ANTES de navegar y destaparse DESPUÉS
   de que la página nueva ya montó — sin esto, cambiar de la landing a
   /login o /registro es un corte seco (Next desmonta una página y monta la
   otra sin transición propia). Pero el contexto solo lo consume quien use
   `<TransitionLink>` explícitamente: el resto de la app (dashboard,
   admin-panel) sigue con `<Link>` normal, sin este delay de 220ms ni el
   flash del overlay — ahí la navegación rápida importa más que el fundido. */
const NavegarConFundidoCtx = createContext<(href: string) => void>(() => {});

export function PageTransitionProvider({ children }: { children: ReactNode }) {
  const [tapado, setTapado] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const pathnameAnterior = useRef(pathname);

  function navegar(href: string) {
    setTapado(true);
    setTimeout(() => router.push(href), DURACION_SALIDA_MS);
  }

  /* La página nueva ya montó (cambió el pathname) → destapa. El pequeño
     delay evita destapar sobre un frame todavía en blanco/layout-shifting. */
  useEffect(() => {
    if (pathname === pathnameAnterior.current) return;
    pathnameAnterior.current = pathname;
    const t = setTimeout(() => setTapado(false), 50);
    return () => clearTimeout(t);
  }, [pathname]);

  return (
    <NavegarConFundidoCtx.Provider value={navegar}>
      {children}
      <div
        aria-hidden="true"
        className={`pointer-events-none fixed inset-0 z-[999] bg-white transition-opacity duration-300 ease-in-out dark:bg-slate-950 ${
          tapado ? "opacity-100" : "opacity-0"
        }`}
      />
    </NavegarConFundidoCtx.Provider>
  );
}

/* Mismo look de un <Link> normal (recibe href/className/children/onClick),
   pero al hacer click espera el fundido antes de navegar. Preserva
   Ctrl/Cmd/Shift/click-medio (abrir en pestaña nueva) sin interceptarlos —
   solo el click izquierdo "normal" dispara la animación. */
export function TransitionLink({
  href,
  className,
  children,
  onClick,
}: {
  href: string;
  className?: string;
  children: ReactNode;
  onClick?: () => void;
}) {
  const navegar = useContext(NavegarConFundidoCtx);

  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    onClick?.();
    navegar(href);
  }

  return (
    <Link href={href} className={className} onClick={handleClick}>
      {children}
    </Link>
  );
}
