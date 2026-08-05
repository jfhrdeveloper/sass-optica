"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { m } from "framer-motion";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { TransitionLink } from "@/components/landing/PageTransition";

const LINKS = [
  { href: "#inicio", label: "Inicio", id: "inicio" },
  { href: "#funciones", label: "Funciones", id: "funciones" },
  { href: "#precios", label: "Precios", id: "precios" },
  { href: "#contacto", label: "Contacto", id: "contacto" },
];

/* Navbar de la landing — patrón "píldora flotante" tomado de ferdocs-web
   (src/components/layout/Navbar.tsx de ese proyecto), adaptado a la paleta
   de este:

   - `fixed` (no `sticky`): la píldora flota SOBRE el contenido desde el
     primer scroll. Con `sticky` ocuparía espacio en el flujo al inicio y
     empujaría el hero hacia abajo, rompiendo el efecto flotante — por eso
     el hero en page.tsx lleva `pt-32`, para compensar la altura del nav
     que ya no ocupa lugar.
   - Transparente arriba → al bajar gana fondo `bg-white/80` + `backdrop-blur`
     + sombra + borde y se cierra en `rounded-full`.
   - Estado activo por scroll-spy (IntersectionObserver): el link de la
     sección visible se marca con su propia píldora + ring, igual que
     ferdocs marca la ruta activa (allá es por `pathname`; acá la landing
     es una sola página con anclas, así que la sección visible es el
     equivalente).
   - Mobile: hamburguesa + panel lateral deslizante. Antes los links de
     sección directamente NO existían en mobile (`hidden sm:flex` sin
     alternativa), así que no había forma de llegar a Funciones/Precios
     desde el celular. */
export function LandingHeader() {
  const [scrolleado, setScrolleado] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [activo, setActivo] = useState<string | null>("inicio");
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    function onScroll() {
      setScrolleado(window.scrollY > 8);
      /* Al fondo de la página, la ÚLTIMA sección (el footer, `#contacto`)
         nunca llega a la franja central que mira el scroll-spy de abajo —
         se queda pegada al borde inferior. Sin esto, "Contacto" no se
         marcaría activo nunca. */
      const alFondo = window.innerHeight + window.scrollY >= document.body.scrollHeight - 4;
      if (alFondo) setActivo(LINKS[LINKS.length - 1].id);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* Scroll-spy. El `rootMargin` recorta la ventana a una franja central:
     así la sección "activa" es la que domina el centro de la pantalla, no
     la primera que asoma por abajo (que se sentiría adelantada). */
  useEffect(() => {
    const secciones = LINKS
      .map((l) => document.getElementById(l.id))
      .filter((el): el is HTMLElement => el !== null);
    if (secciones.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActivo(visible.target.id);
      },
      { rootMargin: "-30% 0px -55% 0px" },
    );
    secciones.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  /* Panel móvil abierto → bloquea el scroll de fondo (si no, se scrollea la
     página por detrás del panel). */
  useEffect(() => {
    document.body.style.overflow = menuAbierto ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuAbierto]);

  /* Click fuera del nav cierra el panel — complementa al overlay, que solo
     cubre el área por debajo del propio nav. */
  useEffect(() => {
    function onClickFuera(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setMenuAbierto(false);
      }
    }
    document.addEventListener("mousedown", onClickFuera);
    return () => document.removeEventListener("mousedown", onClickFuera);
  }, []);

  const cerrar = () => setMenuAbierto(false);

  /* Activo = fondo primario SUAVE (`bg-primary-light`, el mismo tono usado
     en `.row-avatar` del dashboard) + texto primario. Antes era fondo sólido
     + texto blanco, igual que el CTA "Crear cuenta gratis" del propio nav — se
     distinguía bien del resto de links, pero competía visualmente con el
     CTA (mismo peso, mismo azul sólido, a centímetros de distancia). Este
     tono intermedio sigue siendo legible (no es el azul-claro-sobre-azul
     original, que casi no se notaba) sin igualar al botón de conversión. */
  const claseLink = (id: string) =>
    `rounded-full px-4 py-2 text-sm font-medium transition-colors ${
      activo === id
        ? "bg-primary-light font-semibold text-primary"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
    }`;

  return (
    /* Un solo fade + slide-down al montar, NO un stagger por link — el nav
       es chrome fijo que persiste en cada scroll, no contenido; escalonar
       cada link cada vez que se monta se siente como ruido en vez de foco.
       El "momento wow" escalonado se reserva para el hero (`HeroSection.tsx`),
       que sí es contenido nuevo. */
    <m.nav
      ref={navRef}
      className="fixed inset-x-0 top-0 z-40"
      aria-label="Navegación principal"
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* ====== Desktop — píldora flotante ======
          Corte en 914px (no el `sm` de Tailwind, 640px): con logo + 4 links +
          toggle + 2 botones, la píldora no entra en el rango 640-913px y se
          rompe/desborda. Por eso el desktop arranca recién en 914px y hasta
          ahí se queda con la hamburguesa. */}
      <div className={`hidden w-full justify-center transition-all duration-500 ease-in-out min-[914px]:flex ${scrolleado ? "pt-4" : "pt-6"}`}>
        <div
          className={`flex items-center gap-1 transition-all duration-500 ease-in-out ${
            scrolleado
              ? "rounded-full border border-slate-200/60 bg-white/80 px-5 py-2.5 shadow-md shadow-black/[0.08] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80 dark:shadow-black/30"
              : "border border-transparent bg-transparent px-4 py-2"
          }`}
        >
          <Link href="/" className="mr-5 shrink-0 font-display text-slate-900 dark:text-slate-100">
            SaaS Óptica
          </Link>

          <div className={`mr-5 h-5 w-px bg-slate-300 transition-opacity duration-300 dark:bg-white/15 ${scrolleado ? "opacity-100" : "opacity-0"}`} />

          <div className="flex items-center gap-0.5">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className={claseLink(l.id)}>
                {l.label}
              </Link>
            ))}
          </div>

          <div className="mx-4 h-5 w-px bg-slate-200 dark:bg-white/10" />

          <div className="flex items-center gap-2">
            <div className="scale-90"><ThemeToggle /></div>
            {/* Sin `rounded-full` explícito: ya es el radio por defecto de
                `.btn-*` en globals.css (unificado en todo el sitio). */}
            <TransitionLink href="/login" className="btn-outline px-4 py-2 text-sm font-normal">
              Iniciar sesión
            </TransitionLink>
            <TransitionLink href="/registro" className="btn-primary px-4 py-2 text-sm font-normal">
              Crear cuenta gratis
            </TransitionLink>
          </div>
        </div>
      </div>

      {/* ====== Mobile — píldora + hamburguesa ====== */}
      <div className={`flex w-full justify-center transition-all duration-500 ease-in-out min-[914px]:hidden ${scrolleado ? "pt-4" : "pt-0"}`}>
        <div
          className={`flex w-full items-center transition-all duration-500 ease-in-out ${
            scrolleado
              ? "mx-3 rounded-full border border-slate-200/60 bg-white/80 px-4 shadow-md shadow-black/[0.08] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80"
              : "border border-transparent bg-transparent px-6"
          }`}
        >
          <Link href="/" className="flex-1 font-display text-slate-900 dark:text-slate-100">SaaS Óptica</Link>
          <div className={`flex items-center gap-1 transition-all duration-500 ${scrolleado ? "h-14" : "h-16"}`}>
            <ThemeToggle />
            <button
              onClick={() => setMenuAbierto((v) => !v)}
              aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={menuAbierto}
              className="flex h-11 w-11 items-center justify-center text-slate-700 dark:text-slate-200"
            >
              {menuAbierto ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* ====== Overlay + panel lateral (mobile) ====== */}
      <div
        onClick={cerrar}
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 min-[914px]:hidden ${
          menuAbierto ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <div
        className={`fixed inset-y-0 right-0 z-50 flex w-[80vw] max-w-[320px] flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out dark:bg-slate-950 min-[914px]:hidden ${
          menuAbierto ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-100 px-5 dark:border-slate-800">
          <span className="font-display text-slate-900 dark:text-slate-100">SaaS Óptica</span>
          <button
            onClick={cerrar}
            aria-label="Cerrar menú"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-1 overflow-y-auto p-4">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={cerrar}
              className={`rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                activo === l.id
                  ? "bg-primary-light font-semibold text-primary"
                  : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="flex shrink-0 flex-col gap-3 border-t border-slate-100 p-4 pb-8 dark:border-slate-800">
          <TransitionLink href="/login" onClick={cerrar} className="btn-outline w-full py-3">Iniciar sesión</TransitionLink>
          <TransitionLink href="/registro" onClick={cerrar} className="btn-primary w-full py-3">Crear cuenta gratis</TransitionLink>
        </div>
      </div>
    </m.nav>
  );
}
