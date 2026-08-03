import { AdminNav } from "@/components/admin/AdminNav";
import { AdminMobileHeader } from "@/components/admin/AdminMobileHeader";
import { AdminBottomTabBar } from "@/components/admin/AdminBottomTabBar";

/* Contraparte de DashboardShell.tsx para el namespace admin-panel — sin
   estado de colapso (el menú es chico, no lo necesita), pero con el mismo
   patrón mobile: sidebar oculto bajo `md:`, header + tab bar propios para
   pantallas angostas (antes el sidebar de 240px quedaba fijo siempre y
   `ml-60` sin condición, dejando casi todo el ancho de un celular vacío
   detrás del panel — ver comentario en AdminNav.tsx). */
export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <AdminNav />
      <AdminMobileHeader />
      <div className="min-h-screen p-4 pb-24 sm:px-6 sm:pt-6 md:ml-60 md:pb-6">
        <div className="page-enter mx-auto max-w-5xl">{children}</div>
      </div>
      <AdminBottomTabBar />
    </div>
  );
}
