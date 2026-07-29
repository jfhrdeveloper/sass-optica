import { ImageResponse } from "next/og";
import { RAZON_SOCIAL } from "@/lib/contacto";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/* Imagen de vista previa al compartir la landing (WhatsApp, Facebook,
   Twitter/X, LinkedIn) — generada en vez de un PNG subido a mano, para no
   depender de un logo real que todavía no existe (ver icon.tsx). Mismo
   gradiente azul que el CTA final de la landing (`bg-primary-dark` /
   `--color-primary`). */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 28,
          background: "linear-gradient(135deg, #2563eb 0%, #1e3a8a 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ width: 30, height: 30, borderRadius: "50%", border: "6px solid white" }} />
          <div style={{ width: 16, height: 6, background: "white" }} />
          <div style={{ width: 30, height: 30, borderRadius: "50%", border: "6px solid white" }} />
        </div>
        <div style={{ display: "flex", fontSize: 72, fontWeight: 700, color: "white" }}>{RAZON_SOCIAL}</div>
        <div style={{ display: "flex", fontSize: 32, color: "rgba(255,255,255,0.85)" }}>
          Software de gestión para ópticas peruanas
        </div>
      </div>
    ),
    { ...size },
  );
}
