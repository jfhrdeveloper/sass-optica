import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Providers } from "@/components/providers/Providers";
import { HydrationGate } from "@/components/HydrationGate";
import { DashboardNav } from "@/components/DashboardNav";

/* Defensa en profundidad: el proxy ya exige sesión + tenant resuelto antes
   de dejar pasar a /dashboard/*, pero esta ruta solo debe existir dentro de
   un subdominio de negocio. Si por lo que sea se llega aquí sin el header
   x-negocio-id (p. ej. visitando el dominio raíz directo), no confiamos en
   la UI — redirigimos al login. */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const h = await headers();
  if (!h.get("x-negocio-id")) {
    redirect("/login");
  }

  return (
    <Providers>
      <HydrationGate>
        <div className="min-h-screen">
          <DashboardNav />
          <div className="mx-auto max-w-4xl p-6">{children}</div>
        </div>
      </HydrationGate>
    </Providers>
  );
}
