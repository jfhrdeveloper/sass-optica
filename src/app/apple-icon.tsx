import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/* Mismo diseño que icon.tsx, escalado para iOS (fondo sólido, sin
   transparencia — iOS le agrega sus propias esquinas redondeadas). */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", display: "flex",
          alignItems: "center", justifyContent: "center",
          background: "#2563eb",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 60, height: 60, borderRadius: "50%", border: "10px solid white" }} />
          <div style={{ width: 22, height: 10, background: "white" }} />
          <div style={{ width: 60, height: 60, borderRadius: "50%", border: "10px solid white" }} />
        </div>
      </div>
    ),
    { ...size },
  );
}
