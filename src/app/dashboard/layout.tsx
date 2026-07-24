import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Providers } from "@/components/providers/Providers";
import { HydrationGate } from "@/components/HydrationGate";

/* Defensa en profundidad: el middleware ya exige sesión + tenant resuelto
   antes de dejar pasar a /dashboard/*, pero esta ruta solo debe existir
   dentro de un subdominio de negocio. Si por lo que sea se llega aquí sin el
   header x-negocio-id (p. ej. visitando el dominio raíz directo), no
   confiamos en la UI — redirigimos al login. */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const h = await headers();
  if (!h.get("x-negocio-id")) {
    redirect("/login");
  }

  return (
    <Providers>
      <HydrationGate>{children}</HydrationGate>
    </Providers>
  );
}
