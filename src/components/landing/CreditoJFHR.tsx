import { DESARROLLADOR, DESARROLLADOR_URL } from "@/lib/contacto";

/* Crédito de autoría — aparece en el footer de la landing y al pie de las
   tres pantallas de acceso (login/registro de negocios y login del panel del
   SaaS). Componente propio y no texto suelto repetido: son 4 lugares y el
   enlace/nombre salen de lib/contacto.ts.

   `variant`: mismo patrón que `Creditos.tsx` de tramys-rrhh —
     - "default": fondo claro/oscuro de la página (footer, y el fallback
       móvil de las pantallas de acceso, donde el panel de marca no cabe).
     - "brand": fondo sólido del degradado de marca (panel izquierdo/derecho
       de AuthPage.tsx y admin-panel/login), tonos blanco translúcido en vez
       de slate — el slate se leería casi invisible sobre el degradado.

   `align`: el footer y el fallback móvil van centrados; dentro del panel de
   marca va a la izquierda, apilado debajo del copyright (igual que tramys:
   copyright arriba, crédito debajo, ambos alineados a la izquierda).

   `font-mono text-[11px]`: mismo tratamiento de "sello/firma" que el
   componente equivalente de tramys-rrhh — la tipografía monoespaciada
   distingue el crédito del resto del texto sans del sitio. Usa el mono que
   ya trae el proyecto (`--font-mono` = Geist Mono en globals.css).

   `rel="noopener noreferrer"` con `target="_blank"`: sin `noopener`, la
   pestaña destino recibe una referencia a `window.opener` y puede redirigir
   esta pestaña (tabnabbing). */
export function CreditoJFHR({
  className = "",
  variant = "default",
  align = "center",
}: {
  className?: string;
  variant?: "default" | "brand";
  align?: "center" | "left";
}) {
  const colorPrefijo = variant === "brand" ? "text-white/50" : "text-slate-500 dark:text-slate-500";
  const colorLink = variant === "brand"
    ? "text-white/85 hover:text-white"
    : "text-slate-600 hover:text-primary dark:text-slate-200";

  return (
    <p className={`${align === "left" ? "text-left" : "text-center"} font-mono text-[11px] ${colorPrefijo} ${className}`}>
      Diseñado y desarrollado por{" "}
      <a
        href={DESARROLLADOR_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={`font-medium transition-colors ${colorLink}`}
      >
        {DESARROLLADOR}
      </a>
    </p>
  );
}
