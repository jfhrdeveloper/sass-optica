import { AuthPage } from "@/components/auth/AuthPage";

/* Registro self-service (brief §4): nombre del negocio → subdominio en vivo,
   estilo Instagram (✅/❌ con debounce), formato junto/con-guiones. Al
   confirmar, /api/registro crea negocio + administrador + trial de forma
   atómica; luego iniciamos sesión en el cliente y redirigimos al subdominio
   recién creado, ya logueado.

   El formulario en sí vive en AuthPage (compartido con /login), partido en
   2 pasos (Tu óptica → Tus datos) — ver el comentario ahí sobre el panel de
   marca deslizante. */
export default function RegistroPage() {
  return <AuthPage modoInicial="registro" />;
}
