"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, CheckCircle2 } from "lucide-react";

/* Botón de "Zona de peligro" del detalle de negocio — POST a
   /api/admin/negocios/toggle-activo y refresca el Server Component (la
   fuente de verdad sigue siendo la DB/mock, no estado local optimista). */
export function SuspenderNegocioButton({ id, activo }: { id: string; activo: boolean }) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);

  async function onClick() {
    const confirmado = window.confirm(
      activo
        ? "¿Suspender este negocio? Sus usuarios no podrán entrar al dashboard hasta reactivarlo."
        : "¿Reactivar este negocio? Sus usuarios podrán volver a entrar al dashboard.",
    );
    if (!confirmado) return;

    setEnviando(true);
    const res = await fetch("/api/admin/negocios/toggle-activo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, activo: !activo }),
    });
    setEnviando(false);
    if (res.ok) router.refresh();
    else window.alert("No se pudo actualizar el negocio.");
  }

  return (
    <button
      onClick={onClick}
      disabled={enviando}
      className={activo ? "btn-outline gap-1.5 text-red-600 dark:text-red-400" : "btn-primary gap-1.5"}
    >
      {activo ? <Ban size={16} /> : <CheckCircle2 size={16} />}
      {activo ? "Suspender negocio" : "Reactivar negocio"}
    </button>
  );
}
