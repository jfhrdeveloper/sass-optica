"use client";

import { WhatsAppIcon } from "@/components/WhatsAppIcon";
import { urlWhatsAppContacto } from "@/lib/contacto";

/* Ícono que abre WhatsApp con el teléfono del cliente — junto al teléfono en
   la tabla y en la ficha. `stopPropagation` porque en la tabla vive dentro de
   una fila clickeable (abre la ficha); sin esto, el click también navegaría. */
export function BotonWhatsApp({ telefono }: { telefono: string }) {
  return (
    <a
      href={urlWhatsAppContacto(telefono)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      title="Escribir por WhatsApp"
      className="shrink-0 text-[#25D366] transition-opacity hover:opacity-75"
    >
      <WhatsAppIcon size={16} />
    </a>
  );
}
