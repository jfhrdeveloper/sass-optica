import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { Providers } from "@/components/providers/Providers";
import { HydrationGate } from "@/components/ui/HydrationGate";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { isMockMode, MOCK_COOKIE } from "@/lib/mock/mock-mode";

/* Defensa en profundidad: el proxy ya exige sesión + tenant resuelto antes
   de dejar pasar a /dashboard/*, pero esta ruta solo debe existir dentro de
   un subdominio de negocio. Si por lo que sea se llega aquí sin el header
   x-negocio-id (p. ej. visitando el dominio raíz directo), no confiamos en
   la UI — redirigimos al login.

   En modo mock (ver src/lib/mock/mock-mode.ts) no hay proxy real resolviendo
   tenant, así que el gate es la cookie mock_session en su lugar — temporal,
   se quita junto con el resto del modo mock. */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  if (isMockMode()) {
    const c = await cookies();
    if (!c.get(MOCK_COOKIE)) redirect("/login");
  } else {
    const h = await headers();
    if (!h.get("x-negocio-id")) redirect("/login");
  }

  return (
    <Providers>
      <HydrationGate>
        <DashboardShell>{children}</DashboardShell>
      </HydrationGate>
    </Providers>
  );
}
