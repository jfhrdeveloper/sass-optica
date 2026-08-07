import type { NextConfig } from "next";

/* Defensa en profundidad a nivel de navegador — el modelo de amenaza
   multi-tenant real vive en RLS + proxy.ts, esto no lo reemplaza. Cubre
   clickjacking (X-Frame-Options/frame-ancestors), MIME sniffing y fuga de
   referrer entre negocios. Sin `script-src` restrictivo a un allowlist de
   hashes/nonces porque Next inyecta scripts inline en cada build; una CSP
   con `'unsafe-inline'` en script-src sigue bloqueando frames/objetos de
   terceros, que es el riesgo real acá. */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.culqi.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.culqi.com",
  "frame-src 'self' https://checkout.culqi.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  /* Permite acceder al dev server desde el túnel público de cloudflared
     (preview-publico) — sin esto, Next.js bloquea por defecto los recursos
     de dev (HMR/webpack) de cualquier origin que no sea localhost, lo que
     deja la página en blanco al abrirla desde el link público/el celular.
     Wildcard porque cloudflared genera un subdominio *.trycloudflare.com
     nuevo cada vez que se abre el túnel. Solo afecta `next dev`, no aplica
     en producción (`next build`/`next start`). */
  allowedDevOrigins: ["*.trycloudflare.com", "192.168.1.5", "192.168.1.2"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Content-Security-Policy", value: CSP },
        ],
      },
    ];
  },
};

export default nextConfig;
