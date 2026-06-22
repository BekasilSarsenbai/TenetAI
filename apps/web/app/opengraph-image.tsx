import { ImageResponse } from "next/og";

export const alt = "Tenet — never rewatch a recording again";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Branded social-share card (auto-wired to og:image + twitter:image).
export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0B0C0F",
          backgroundImage:
            "radial-gradient(900px 520px at 82% 118%, rgba(242,193,78,0.20), transparent 60%)",
          padding: "74px 80px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 26, height: 26, borderRadius: 8, background: "#F4F2EC", transform: "rotate(45deg)" }} />
          <div style={{ color: "#F4F2EC", fontSize: 36, fontWeight: 800, letterSpacing: -1 }}>
            Tenet
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              fontSize: 82,
              fontWeight: 800,
              lineHeight: 1.04,
              letterSpacing: -2.5,
              maxWidth: 980,
            }}
          >
            <span style={{ color: "#ECEDEF" }}>Never rewatch a recording&nbsp;</span>
            <span style={{ color: "#F2C14E" }}>again.</span>
          </div>
          <div style={{ color: "#9A9DA6", fontSize: 31, lineHeight: 1.4, maxWidth: 860 }}>
            An AI notetaker for every call — records, transcribes and summarizes in seconds.
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
