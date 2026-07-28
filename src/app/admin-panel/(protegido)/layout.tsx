import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { isMockMode, MOCK_ADMIN_COOKIE } from "@/lib/mock/mock-mode";
import { AdminShell } from "@/components/admin/AdminShell";

/* Defensa en profundidad, mismo patrón que src/app/dashboard/layout.tsx: el
   proxy ya exige sesión + membresía en super_admins antes de reescribir
   hacia aquí, pero si por lo que sea se llega sin el header x-super-admin
   (p. ej. navegando directo a /admin-panel sin pasar por admin.dominio), no
   confiamos en la UI. Route group (protegido) para que /admin-panel/login
   quede fuera de esta guardia — si no, redirigir a /login desde aquí mismo
   crearía un bucle infinito.

   En modo mock (ver src/lib/mock/mock-mode.ts) no hay proxy real resolviendo
   el subdominio admin ni una tabla super_admins real, así que el gate es la
   cookie mock_admin_session en su lugar — temporal, se quita junto con el
   resto del modo mock. */
export default async function AdminPanelProtegidoLayout({ children }: { children: React.ReactNode }) {
  if (isMockMode()) {
    const c = await cookies();
    if (!c.get(MOCK_ADMIN_COOKIE)) redirect("/admin-panel/login");
  } else {
    const h = await headers();
    if (!h.get("x-super-admin")) {
      redirect("/login");
    }
  }
  return <AdminShell>{children}</AdminShell>;
}
