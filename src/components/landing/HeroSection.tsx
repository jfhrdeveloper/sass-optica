"use client";

import { m } from "framer-motion";
import { TransitionLink } from "@/components/landing/PageTransition";

/* Secuencia de entrada al cargar la página: eyebrow → título → subtítulo →
   CTA → nota → mockup, cada uno 130ms después del anterior
   (`staggerChildren`). El propio contenedor no anima nada por sí mismo
   (`hidden: {}`); solo coordina el delay de sus hijos. */
const CONTENEDOR = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.13, delayChildren: 0.1 } },
};

/* Fade + slide-up de 18px, mismo espíritu que el `fade-in` de
   `globals.css` (usado en las transiciones del dashboard) pero un poco más
   pronunciado — acá es el "momento wow" de la página, no una transición de
   ruta. `ease` cúbica de salida pronunciada (curva "expo-out") para que se
   sienta premium y no como un rebote genérico. */
const ITEM = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] as const } },
};

/* Retraso de la línea de escaneo del mockup: arranca justo cuando termina
   de entrar (el mockup es el 6º hijo, índice 5 → 0.1 + 0.13*5 = 0.75s de
   delay del stagger + sus propios 0.55s de duración ≈ 1.3s). Hardcodeado
   en vez de derivado en runtime porque son las mismas constantes de arriba
   y derivarlo con código no ganaba legibilidad. */
const DELAY_SCANLINE = 1.3;

export function HeroSection() {
  return (
    <m.section
      id="inicio"
      className="mx-auto flex max-w-3xl flex-col items-center gap-5 px-6 pb-20 pt-32 text-center"
      initial="hidden"
      animate="visible"
      variants={CONTENEDOR}
    >
      <m.p variants={ITEM} className="mb-3 text-sm font-semibold uppercase tracking-wide text-primary">
        Software para ópticas peruanas
      </m.p>
      <m.h1 variants={ITEM} className="text-4xl font-semibold leading-tight text-slate-900 dark:text-slate-100 sm:text-5xl">
        Deja el cuaderno.<br />Gestiona tu <span className="text-primary">óptica</span> en un solo lugar.
      </m.h1>
      <m.p variants={ITEM} className="max-w-xl text-lg text-slate-600 dark:text-slate-300">
        Clientes, citas, recetas, ventas e inventario. Todo en un panel simple, pensado para
        ópticas peruanas.
      </m.p>
      <m.div variants={ITEM} className="flex flex-wrap items-center justify-center gap-3">
        <TransitionLink href="/registro" className="btn-primary px-6 py-3 text-base transition-all hover:scale-105">Crear cuenta gratis</TransitionLink>
      </m.div>
      <m.p variants={ITEM} className="text-xs text-slate-500 dark:text-slate-500">
        Sin tarjeta de crédito · Gratis para siempre
      </m.p>

      {/* Resplandor detrás del mockup: radial en azul primario, difuminado
          (`blur-3xl`) y más intenso en dark mode, para despegar la imagen
          del fondo. `-z-10` lo manda detrás de `.card`; `aria-hidden` porque
          es puramente decorativo. Al reemplazar el placeholder por la
          captura real, mantenerla dentro de este mismo wrapper y con
          `rounded-xl` (el radio de `.card`) para que los bordes coincidan. */}
      <m.div variants={ITEM} className="relative mt-6 w-full max-w-2xl">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-8 top-6 -z-10 h-3/4 rounded-full bg-primary/20 blur-3xl dark:bg-primary/40"
        />
        <div className="card relative w-full overflow-hidden bg-slate-50 p-8 text-sm text-slate-400 dark:bg-slate-900 dark:text-slate-500">
          {/* Línea de escaneo — banda diagonal semitransparente que barre
              la card una sola vez, apenas termina de entrar el mockup.
              Puramente decorativa (`aria-hidden`): con reduced-motion
              activado, `MotionConfig` de `LandingMotionProvider` la reduce
              a un salto instantáneo sin el barrido. */}
          <m.div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/50 to-transparent dark:via-white/10"
            initial={{ x: "-40%" }}
            animate={{ x: "340%" }}
            transition={{ duration: 1, ease: "easeInOut", delay: DELAY_SCANLINE }}
          />
          [ mockup del dashboard, pendiente de capturas reales ]
        </div>
      </m.div>
    </m.section>
  );
}
