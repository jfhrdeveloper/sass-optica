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
