import { headers } from "next/headers";
import { redirect } from "next/navigation";

/* Defensa en profundidad, mismo patrón que src/app/dashboard/layout.tsx: el
   proxy ya exige sesión + membresía en super_admins antes de reescribir
   hacia aquí, pero si por lo que sea se llega sin el header x-super-admin
   (p. ej. navegando directo a /admin-panel sin pasar por admin.dominio), no
   confiamos en la UI. Route group (protegido) para que /admin-panel/login
   quede fuera de esta guardia — si no, redirigir a /login desde aquí mismo
   crearía un bucle infinito. */
export default async function AdminPanelProtegidoLayout({ children }: { children: React.ReactNode }) {
  const h = await headers();
  if (!h.get("x-super-admin")) {
    redirect("/login");
  }
  return <>{children}</>;
}
