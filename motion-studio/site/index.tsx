// Motion Studio portfolio page for a Whop website (TanStack Start scaffold from `whop apps init --app_type website`).
// Copy this file over the scaffold's index route (usually src/routes/index.tsx; check the scaffold first),
// copy portfolio.json next to it, and put the videos and posters in public/videos/.
import { createFileRoute } from "@tanstack/react-router";
import data from "./portfolio.json";

export const Route = createFileRoute("/")({ component: Portfolio });

type Film = { title: string; file: string; poster: string; label: string; note: string };

function Portfolio() {
  const films = data.films as Film[];
  return (
    <main style={{ maxWidth: 1120, margin: "0 auto", padding: "64px 20px", fontFamily: "Inter, system-ui, sans-serif", color: "#16151a" }}>
      <p style={{ fontSize: 14, letterSpacing: 2, textTransform: "uppercase", opacity: 0.6, margin: 0 }}>{data.studio}</p>
      <h1 style={{ fontSize: "clamp(36px, 6vw, 64px)", lineHeight: 1.05, margin: "12px 0 16px" }}>{data.headline}</h1>
      <p style={{ fontSize: 20, maxWidth: 640, opacity: 0.8, margin: "0 0 40px" }}>{data.subhead}</p>
      <section style={{ display: "grid", gap: 32 }}>
        {films.map((f) => (
          <figure key={f.file} style={{ margin: 0 }}>
            <video src={f.file} poster={f.poster} controls muted playsInline preload="metadata"
              style={{ width: "100%", borderRadius: 14, background: "#000", display: "block" }} />
            <figcaption style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginTop: 10, fontSize: 15 }}>
              <strong>{f.title}</strong>
              <span style={{ opacity: 0.7 }}>{f.note}</span>
              <span style={{ width: "100%", fontSize: 13, opacity: 0.6 }}>{f.label}</span>
            </figcaption>
          </figure>
        ))}
      </section>
      <a href={`mailto:${data.contact}?subject=Launch%20film%20quote`}
        style={{ display: "inline-block", marginTop: 48, padding: "16px 28px", borderRadius: 999, background: "#16151a", color: "#fff", textDecoration: "none", fontSize: 18 }}>
        Ask for a quote
      </a>
      <p style={{ fontSize: 13, opacity: 0.55, marginTop: 32 }}>{data.footer}</p>
    </main>
  );
}
