import { DESARROLLADOR, DESARROLLADOR_URL } from "@/lib/contacto";

/* Crédito de autoría — aparece en el footer de la landing y al pie de las
   tres pantallas de acceso (login/registro de negocios y login del panel del
   SaaS). Componente propio y no texto suelto repetido: son 4 lugares y el
   enlace/nombre salen de lib/contacto.ts.

   `rel="noopener noreferrer"` con `target="_blank"`: sin `noopener`, la
   pestaña destino recibe una referencia a `window.opener` y puede redirigir
   esta pestaña (tabnabbing). */
export function CreditoJFHR({ className = "" }: { className?: string }) {
  return (
    <p className={`text-xs text-slate-400 dark:text-slate-500 ${className}`}>
      Desarrollado por{" "}
      <a
        href={DESARROLLADOR_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium transition-colors hover:text-primary"
      >
        {DESARROLLADOR}
      </a>
    </p>
  );
}
