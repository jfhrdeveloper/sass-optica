import { AuthPage } from "@/components/auth/AuthPage";
import { esPlanIdValido } from "@/lib/precios";

/* Registro self-service (brief §4): nombre del negocio → subdominio en vivo,
   estilo Instagram (✅/❌ con debounce), formato junto/con-guiones. Al
   confirmar, /api/registro crea negocio + administrador + plan elegido de
   forma atómica; luego iniciamos sesión en el cliente y redirigimos al
   subdominio recién creado, ya logueado.

   El formulario en sí vive en AuthPage (compartido con /login), partido en
   2 pasos (Tu óptica → Tus datos) — ver el comentario ahí sobre el panel de
   marca deslizante. `?plan=` viene de qué tarjeta de precios se clickeó en
   la landing (PreciosSection.tsx) — si falta o es inválido, cae a "gratis"
   (el mismo default que ya prometen todos los demás CTA de "Crear cuenta
   gratis" sin ese query param). */
export default async function RegistroPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const { plan } = await searchParams;
  const planInicial = plan && esPlanIdValido(plan) ? plan : "gratis";
  return <AuthPage modoInicial="registro" planInicial={planInicial} />;
}
