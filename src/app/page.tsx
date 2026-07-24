import Link from "next/link";

/* Landing mínima y funcional (dominio raíz, pública, indexable). Diseño
   visual real pendiente — ver docs/pending-task.md: falta definir marca y
   paleta con la skill ui-ux-pro-max. Esta versión existe para que el flujo
   registro → subdominio → dashboard sea demostrable de punta a punta. */
export default function LandingPage() {
  return (
    <>
      <header className="flex items-center justify-between border-b px-6 py-4">
        <span className="font-semibold">SaaS Óptica</span>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="#precios">Precios</Link>
          <Link href="/login" className="underline">Iniciar sesión</Link>
          <Link href="/registro" className="rounded bg-black px-3 py-1.5 text-white">
            Prueba gratis
          </Link>
        </nav>
      </header>

      <main className="mx-auto flex max-w-2xl flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="text-3xl font-semibold">Deja el cuaderno. Gestiona tu óptica en un solo lugar.</h1>
        <p className="text-neutral-600">
          Clientes, citas, recetas, ventas e inventario — todo en un panel simple, pensado para
          ópticas peruanas de 3 a 10 trabajadores.
        </p>
        <Link href="/registro" className="rounded bg-black px-6 py-3 text-white">
          Prueba gratis 30 días
        </Link>
        <p className="text-xs text-neutral-500">Sin tarjeta de crédito · Cancela cuando quieras</p>
      </main>

      <section id="precios" className="border-t px-6 py-10 text-center text-sm text-neutral-600">
        Precios — pendiente de definir (ver brief-saas-proyecto.md §12).
      </section>

      <footer className="border-t px-6 py-6 text-center text-xs text-neutral-500">
        <Link href="/registro">Prueba gratis</Link> · <Link href="/login">Iniciar sesión</Link>
      </footer>
    </>
  );
}
