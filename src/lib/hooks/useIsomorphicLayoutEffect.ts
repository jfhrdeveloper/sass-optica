import { useEffect, useLayoutEffect } from "react";

/* `useLayoutEffect` no hace nada en el servidor (y React tira un warning en
   consola si se usa igual durante el SSR). Este hook cae a `useEffect` en el
   servidor (donde de todos modos no llega a ejecutarse) y usa el real en el
   navegador — ahí corre de forma síncrona ANTES del primer paint, así que
   sirve para sincronizar estado de React con algo que un script inline ya
   aplicó al DOM (ver layout.tsx) sin que se alcance a ver un frame con el
   valor "de arranque" (p. ej. el ícono de ThemeToggle.tsx, o el indicador
   activo de DashboardNav.tsx). Un `useEffect` normal corre DESPUÉS del primer
   paint — ahí sí se alcanza a ver ese frame incorrecto. */
export const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;
