"use client";

import type { ReactNode } from "react";
import { m } from "framer-motion";

const VARIANTS = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0 },
};

const TAGS = { section: m.section, div: m.div, footer: m.footer } as const;

/* Reveal-al-scroll genérico, reutilizado en cada sección de la landing
   debajo del hero. `whileInView` + `viewport.once` reemplaza al patrón de
   `IntersectionObserver` a mano que ya usa `LandingHeader.tsx` para el
   scroll-spy — acá no hace falta escribirlo de nuevo, framer-motion trae
   su propio observer interno.

   `as`: mismo componente por dentro pero renderiza la etiqueta HTML real
   (`m.section`/`m.footer`/`m.div`) en vez de forzar siempre un `<div>` —
   así no se pierde semántica en las secciones que ya eran `<section>`. */
export function Reveal({
  children,
  className,
  id,
  as = "div",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
  as?: keyof typeof TAGS;
  delay?: number;
}) {
  const Tag = TAGS[as];
  return (
    <Tag
      id={id}
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={VARIANTS}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay }}
    >
      {children}
    </Tag>
  );
}
