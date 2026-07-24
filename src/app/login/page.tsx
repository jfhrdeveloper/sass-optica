import { AuthPage } from "@/components/auth/AuthPage";

/* Login genérico en el dominio raíz — el usuario no necesita recordar su
   subdominio. Tras iniciar sesión, recargamos /login: el middleware detecta
   la cookie recién creada, identifica el negocio del empleado y redirige
   directo a [negocio].dominio/dashboard (ver src/middleware.ts).

   El formulario en sí vive en AuthPage (compartido con /registro) — ver el
   comentario ahí sobre el panel de marca deslizante. */
export default function LoginPage() {
  return <AuthPage modoInicial="login" />;
}
