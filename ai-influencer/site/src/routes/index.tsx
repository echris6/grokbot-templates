// One-page site for the guide. Replaces the index route that `whop apps init --app_type website`
// scaffolds (TanStack Start, file routes in src/routes/). All copy comes from ../site.config.
// Styles are inline in a <style> tag so the page needs no CSS wiring in the scaffold.
import { createFileRoute } from "@tanstack/react-router";
import { site } from "../site.config";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `${site.guideTitle} · ${site.priceLabel}` },
      { name: "description", content: site.subhead },
      { property: "og:title", content: site.guideTitle },
      { property: "og:description", content: site.subhead },
      { property: "og:image", content: site.heroImage },
    ],
  }),
  component: Landing,
});

const css = `
:root { --bg:#0e0e11; --fg:#f4f2ee; --muted:#a9a6a0; --card:#18181d; --line:#2a2a31; --accent:#e9d8a6; --accent-fg:#141414; }
* { box-sizing:border-box; }
body { margin:0; background:var(--bg); color:var(--fg);
  font-family: ui-sans-serif, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif; line-height:1.55; }
.wrap { max-width:1040px; margin:0 auto; padding:0 20px; }
.hero { display:grid; grid-template-columns:1.05fr 1fr; gap:40px; align-items:center; padding:64px 0 48px; }
.eyebrow { color:var(--accent); letter-spacing:.14em; text-transform:uppercase; font-size:12px; margin:0 0 12px; }
h1 { font-size:clamp(32px,5vw,54px); line-height:1.05; margin:0 0 16px; letter-spacing:-.02em; }
.sub { color:var(--muted); font-size:18px; margin:0 0 28px; max-width:34ch; }
.hero img { width:100%; border-radius:18px; border:1px solid var(--line); display:block; background:var(--card); }
.buy { display:inline-flex; align-items:center; gap:12px; background:var(--accent); color:var(--accent-fg);
  font-weight:700; text-decoration:none; padding:15px 26px; border-radius:999px; font-size:17px; }
.buy:hover { filter:brightness(1.06); }
.price { font-weight:800; }
.access { color:var(--muted); font-size:14px; margin:12px 0 0; }
section { padding:44px 0; border-top:1px solid var(--line); }
h2 { font-size:26px; margin:0 0 20px; letter-spacing:-.01em; }
.grid { display:grid; grid-template-columns:repeat(2,1fr); gap:14px; list-style:none; padding:0; margin:0; }
.grid li { background:var(--card); border:1px solid var(--line); border-radius:14px; padding:16px 18px; }
.chips { display:flex; flex-wrap:wrap; gap:10px; list-style:none; padding:0; margin:0; }
.chips li { border:1px solid var(--line); border-radius:999px; padding:8px 14px; color:var(--muted); }
.offer { display:flex; justify-content:space-between; align-items:center; gap:24px; background:var(--card);
  border:1px solid var(--line); border-radius:18px; padding:28px; }
.offer h2 { margin:0 0 6px; }
details { border-bottom:1px solid var(--line); padding:14px 0; }
summary { cursor:pointer; font-weight:600; }
details p { color:var(--muted); margin:10px 0 0; }
footer { color:var(--muted); font-size:13px; padding:28px 0 48px; border-top:1px solid var(--line); }
@media (max-width: 760px) {
  .hero { grid-template-columns:1fr; padding-top:36px; gap:28px; }
  .hero .art { order:-1; }
  .grid { grid-template-columns:1fr; }
  .offer { flex-direction:column; align-items:flex-start; }
}
`;

function BuyButton() {
  return (
    <a className="buy" href={site.purchaseUrl} rel="noopener">
      {site.buyLabel} <span className="price">{site.priceLabel}</span>
    </a>
  );
}

function Landing() {
  return (
    <main>
      <style>{css}</style>
      <div className="wrap">
        <header className="hero">
          <div>
            <p className="eyebrow">
              {site.characterName}
              {site.handle ? ` · ${site.handle}` : ""}
            </p>
            <h1>{site.headline}</h1>
            <p className="sub">{site.subhead}</p>
            <BuyButton />
            <p className="access">{site.accessPeriod}</p>
          </div>
          <div className="art">
            <img src={site.heroImage} alt={site.heroAlt} width={900} height={900} />
          </div>
        </header>

        <section>
          <h2>What the guide teaches</h2>
          <ul className="grid">
            {site.learn.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section>
          <h2>What you get</h2>
          <ul className="chips">
            {site.inside.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section>
          <div className="offer">
            <div>
              <h2>{site.guideTitle}</h2>
              <p className="access">
                {site.priceLabel} one-time · {site.accessPeriod}
              </p>
            </div>
            <BuyButton />
          </div>
        </section>

        <section>
          <h2>Questions</h2>
          {site.faq.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </section>

        <footer>{site.disclosure}</footer>
      </div>
    </main>
  );
}
