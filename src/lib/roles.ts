import type { Rol } from "@/components/providers/DataProvider";

/* Nombre visible del rol — "trabajador" (valor real del enum, no se toca:
   RLS y proxy.ts dependen de él) se mostraba como "Vendedor/Empleado" en la
   UI; a pedido del usuario se simplificó a un solo label, "Trabajador".
   Único lugar a tocar si se quiere ajustar el label de nuevo — no hay que
   buscar el string suelto en cada page.tsx. */
const ROL_LABEL: Record<Rol, string> = {
  administrador: "Administrador",
  encargado: "Encargado",
  trabajador: "Trabajador",
};

export function nombreRol(rol: string): string {
  return ROL_LABEL[rol as Rol] ?? rol;
}
