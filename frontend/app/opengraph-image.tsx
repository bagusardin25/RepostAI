import { ImageResponse } from "next/og";

// Link preview for Discord, X, and Slack. Rendered once at build time.
export const alt = "RepostAI: cut one YouTube video into TikTok, Reels and X clips";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const TALLY = "#f97316";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "radial-gradient(circle at 85% 15%, #2a1708 0%, #0c0b0a 55%)",
          color: "#f5f5f4",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 36, fontWeight: 700 }}>
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: 9999,
              background: TALLY,
              boxShadow: `0 0 28px ${TALLY}`,
            }}
          />
          <div style={{ display: "flex" }}>
            Repost<span style={{ color: "#a8a29e" }}>AI</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.1, letterSpacing: -1.5 }}>
            Cut one YouTube video into clips for TikTok, Reels and X.
          </div>
          <div style={{ fontSize: 30, color: "#a8a29e", lineHeight: 1.35 }}>
            3 vertical clips and 4 text drafts. You review everything before you post.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 24 }}>
          <div style={{ display: "flex", gap: 12 }}>
            {["TikTok 9:16", "Reels 9:16", "X 9:16"].map((label) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  padding: "8px 18px",
                  borderRadius: 9999,
                  border: "1px solid #3a3531",
                  color: "#d6d3d1",
                }}
              >
                {label}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", color: "#78716c" }}>Tested on every PR with TestSprite</div>
        </div>
      </div>
    ),
    size,
  );
}
