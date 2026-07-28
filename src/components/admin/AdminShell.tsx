import { AdminNav } from "@/components/admin/AdminNav";

/* Contraparte de DashboardShell.tsx para el namespace admin-panel — sin
   estado de colapso (el menú es chico, no lo necesita). */
export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <AdminNav />
      <div className="ml-60 min-h-screen p-6">
        <div className="page-enter mx-auto max-w-5xl">{children}</div>
      </div>
    </div>
  );
}
