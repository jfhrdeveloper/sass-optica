"use client";

import type { ReactNode } from "react";
import { LazyMotion, domAnimation, MotionConfig } from "framer-motion";

/* Único punto donde se carga framer-motion, para que el bundle NO se filtre
   al dashboard/admin-panel (ninguno de los dos lo usa) — solo se importa
   desde la landing (`src/app/page.tsx`), que la envuelve una sola vez acá
   arriba de todo.

   `domAnimation` (no el import completo `motion`) mantiene el peso bajo
   (~15kb gzip vs ~35kb) — alcanza para fade/slide/whileInView, que es todo
   lo que usa esta landing. `strict` fuerza a que todo el árbol de adentro
   use `m.*` en vez de `motion.*`, así no se cuela por error el import
   pesado en algún componente nuevo.

   `reducedMotion="user"` respeta `prefers-reduced-motion` automáticamente
   en TODOS los `m.*` de adentro (Reveal, HeroSection, LandingHeader) sin
   tener que chequearlo a mano en cada uno. */
export function LandingMotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
