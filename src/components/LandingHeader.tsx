"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

const LINKS = [
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
  const [activo, setActivo] = useState<string | null>(null);
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

  /* Activo = fondo sólido primario + texto BLANCO. Antes era fondo azul
     claro con el texto también azul: todo del mismo tono, sin contraste —
     el link activo casi no se distinguía de los demás. Es el mismo
     tratamiento que el indicador del SegmentedControl, así "lo seleccionado"
     se ve igual en toda la landing. */
  const claseLink = (id: string) =>
    `rounded-full px-4 py-2 text-sm font-medium transition-colors ${
      activo === id
        ? "bg-primary font-semibold text-white shadow-sm"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
    }`;

  return (
    <nav ref={navRef} className="fixed inset-x-0 top-0 z-40" aria-label="Navegación principal">
      {/* ====== Desktop — píldora flotante ====== */}
      <div className={`hidden w-full justify-center transition-all duration-500 ease-in-out sm:flex ${scrolleado ? "pt-4" : "pt-6"}`}>
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
            <Link href="/login" className="btn-outline px-4 py-2 text-sm font-normal">
              Iniciar sesión
            </Link>
            <Link href="/registro" className="btn-primary px-4 py-2 text-sm font-normal">
              Prueba gratis
            </Link>
          </div>
        </div>
      </div>

      {/* ====== Mobile — píldora + hamburguesa ====== */}
      <div className={`flex w-full justify-center transition-all duration-500 ease-in-out sm:hidden ${scrolleado ? "pt-4" : "pt-0"}`}>
        <div
          className={`flex w-full items-center transition-all duration-500 ease-in-out ${
            scrolleado
              ? "mx-3 rounded-full border border-slate-200/60 bg-white/80 px-4 shadow-md shadow-black/[0.08] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80"
              : "border border-transparent bg-transparent px-6"
          }`}
        >
          <Link href="/" className="flex-1 font-display text-slate-900 dark:text-slate-100">SaaS Óptica</Link>
          <div className={`flex items-center gap-1 transition-all duration-500 ${scrolleado ? "h-14" : "h-16"}`}>
            <div className="scale-90"><ThemeToggle /></div>
            <button
              onClick={() => setMenuAbierto((v) => !v)}
              aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={menuAbierto}
              className="p-2 text-slate-700 dark:text-slate-200"
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
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 sm:hidden ${
          menuAbierto ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <div
        className={`fixed inset-y-0 right-0 z-50 flex w-[80vw] max-w-[320px] flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out dark:bg-slate-950 sm:hidden ${
          menuAbierto ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-100 px-5 dark:border-slate-800">
          <span className="font-display text-slate-900 dark:text-slate-100">SaaS Óptica</span>
          <button
            onClick={cerrar}
            aria-label="Cerrar menú"
            className="rounded-full bg-slate-100 p-2 text-slate-500 transition-colors hover:bg-slate-200 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10"
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
                  ? "bg-primary font-semibold text-white"
                  : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="flex shrink-0 flex-col gap-3 border-t border-slate-100 p-4 pb-8 dark:border-slate-800">
          <Link href="/login" onClick={cerrar} className="btn-outline w-full py-3">Iniciar sesión</Link>
          <Link href="/registro" onClick={cerrar} className="btn-primary w-full py-3">Prueba gratis</Link>
        </div>
      </div>
    </nav>
  );
}
