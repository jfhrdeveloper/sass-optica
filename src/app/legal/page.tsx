import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LegalHub } from "@/components/legal/LegalHub";

export const metadata: Metadata = {
  title: "Términos y privacidad · SaaS Óptica",
  description: "Términos y condiciones del servicio y política de privacidad y protección de datos personales.",
};

/* Página legal con sidebar + sub-índice (ver LegalHub.tsx), patrón tomado de
   ferdocs-web. El Server Component solo resuelve el tab inicial desde la URL
   (`/legal?tab=...`) y se lo pasa al componente cliente — así el link sigue
   siendo compartible/indexable aunque la navegación interna sea client-side.

   IMPORTANTE: este contenido es una base redactada según la Ley N° 29733
   (Protección de Datos Personales, Perú) y su reglamento, pero NO sustituye
   la revisión de un abogado — es obligatorio hacerla antes de operar con
   clientes reales, sobre todo por el tratamiento de datos de salud
   (graduaciones/recetas ópticas), que la ley clasifica como dato sensible.
   Ver docs/pending-task.md. */
export default async function LegalPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const tabInicial = tab === "privacidad" || tab === "proteccion" ? tab : "terminos";

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <header className="border-b border-slate-200 px-6 py-4 dark:border-slate-800">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link href="/" className="font-display text-slate-900 dark:text-slate-100">SaaS Óptica</Link>
          <Link href="/" className="flex items-center gap-1.5 text-sm font-medium link">
            <ArrowLeft size={15} /> Volver al inicio
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="mb-8 text-2xl text-slate-900 dark:text-slate-100">Términos y privacidad</h1>
        <LegalHub tabInicial={tabInicial} />
      </main>
    </div>
  );
}
