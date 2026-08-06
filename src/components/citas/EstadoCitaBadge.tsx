"use client";

import { ESTADO_CITA_LABEL, ESTADO_CITA_BADGE } from "@/lib/citas";

/* Badge de estado de cita reusado en citas/page.tsx (Lista), clientes/[id]
   (pestaña Citas), CalendarioMes.tsx y la vista de negocio del admin-panel —
   ancho fijo (no el inline-flex que se ajusta al texto de `.badge`) para que
   Programada/Atendida/Cancelada/No asistió pesen visualmente igual en vez de
   que la más corta ("Atendida") se vea como un chip menor al lado de las
   demás. w-24 alcanza para la etiqueta más larga ("No asistió") en text-xs
   sin partir línea. Pedido explícito del usuario. */
export function EstadoCitaBadge({ estado, className = "" }: { estado: string; className?: string }) {
  return (
    <span className={`badge w-24 shrink-0 justify-center whitespace-nowrap text-center ${ESTADO_CITA_BADGE[estado] ?? "badge-neutral"} ${className}`}>
      {ESTADO_CITA_LABEL[estado] ?? estado}
    </span>
  );
}
