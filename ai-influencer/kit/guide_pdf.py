#!/usr/bin/env python3
"""Turn the guide's markdown into a print-styled HTML file and a PDF.

  guide_pdf.py --md /workspace/ai-influencer/guide/guide.md --out /workspace/ai-influencer/guide/guide.pdf
               [--title "How <Name> is made"] [--cover /workspace/ai-influencer/character/sheet.png]

Markdown → HTML: the `markdown` package if it is installed, else pandoc, else the small
built-in converter below (headings, paragraphs, lists, bold/italic/code, links, images,
blockquotes, rules, code fences, pipe tables). HTML → PDF: headless Chromium/Chrome
(`--print-to-pdf`). On the Bot's Debian computer: `sudo apt-get install -y chromium`.
Relative image paths resolve from the markdown file's folder.
"""
import argparse
import html
import json
import os
import platform
import re
import shutil
import subprocess
import sys

CSS = """
@page { size: A4; margin: 18mm 16mm; }
body { font-family: -apple-system, "Segoe UI", "DejaVu Sans", Helvetica, Arial, sans-serif;
       font-size: 11pt; line-height: 1.55; color: #16161a; }
h1 { font-size: 24pt; line-height: 1.15; margin: 0 0 8pt; }
h2 { font-size: 16pt; margin: 22pt 0 6pt; page-break-after: avoid; border-bottom: 1px solid #ddd; padding-bottom: 3pt; }
h3 { font-size: 12.5pt; margin: 14pt 0 4pt; page-break-after: avoid; }
p, li { orphans: 3; widows: 3; }
img { max-width: 100%; max-height: 120mm; display: block; margin: 8pt auto; border-radius: 6px; }
code { font-family: "DejaVu Sans Mono", Menlo, monospace; font-size: 9.5pt; background: #f2f2f4; padding: 1px 4px; border-radius: 3px; }
pre { background: #f2f2f4; padding: 8pt 10pt; border-radius: 6px; white-space: pre-wrap; page-break-inside: avoid; }
pre code { background: none; padding: 0; }
blockquote { margin: 8pt 0; padding: 4pt 12pt; border-left: 3px solid #b9b9c3; color: #444; }
table { border-collapse: collapse; width: 100%; margin: 8pt 0; font-size: 10pt; page-break-inside: avoid; }
th, td { border: 1px solid #d6d6dc; padding: 4pt 6pt; text-align: left; vertical-align: top; }
th { background: #f2f2f4; }
.cover { height: 250mm; display: flex; flex-direction: column; justify-content: center; text-align: center; page-break-after: always; }
.cover img { max-height: 150mm; }
.cover .sub { color: #666; font-size: 11pt; }
"""


def inline(s):
    s = html.escape(s, quote=False)
    s = re.sub(r"`([^`]+)`", r"<code>\1</code>", s)
    s = re.sub(r"!\[([^\]]*)\]\(([^)\s]+)\)", r'<img alt="\1" src="\2">', s)
    s = re.sub(r"\[([^\]]+)\]\(([^)\s]+)\)", r'<a href="\2">\1</a>', s)
    s = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", s)
    # *x* is italic only when the asterisks hug the text, so "a * b * c" stays literal
    s = re.sub(r"(?<![*\w])\*(?=\S)([^*\n]*?\S)\*(?![*\w])", r"<em>\1</em>", s)
    return s


def builtin_md(text):
    out, para, lines, i = [], [], text.splitlines(), 0

    def flush():
        if para:
            out.append("<p>" + inline(" ".join(para)) + "</p>")
            para.clear()

    while i < len(lines):
        ln = lines[i]
        st = ln.strip()
        if st.startswith("```"):
            flush()
            j = i + 1
            while j < len(lines) and not lines[j].strip().startswith("```"):
                j += 1
            out.append("<pre><code>" + html.escape("\n".join(lines[i + 1:j])) + "</code></pre>")
            i = j + 1
            continue
        if not st:
            flush()
        elif m := re.match(r"(#{1,4})\s+(.*)", st):
            flush()
            n = len(m.group(1))
            out.append(f"<h{n}>{inline(m.group(2))}</h{n}>")
        elif re.fullmatch(r"(-{3,}|\*{3,})", st):
            flush()
            out.append("<hr>")
        elif st.startswith(">"):
            flush()
            q = []
            while i < len(lines) and lines[i].strip().startswith(">"):
                q.append(lines[i].strip()[1:].strip())
                i += 1
            out.append("<blockquote>" + inline(" ".join(q)) + "</blockquote>")
            continue
        elif st.startswith("|") and i + 1 < len(lines) and re.match(r"^\|?\s*:?-{2,}", lines[i + 1].strip()):
            flush()
            cells = lambda r: [c.strip() for c in r.strip().strip("|").split("|")]
            head = cells(st)
            rows = []
            i += 2
            while i < len(lines) and lines[i].strip().startswith("|"):
                rows.append(cells(lines[i]))
                i += 1
            out.append("<table><thead><tr>" + "".join(f"<th>{inline(c)}</th>" for c in head) + "</tr></thead><tbody>"
                       + "".join("<tr>" + "".join(f"<td>{inline(c)}</td>" for c in r) + "</tr>" for r in rows)
                       + "</tbody></table>")
            continue
        elif re.match(r"([-*+]|\d+[.)])\s+", st):
            flush()
            ordered = bool(re.match(r"\d+[.)]\s+", st))
            marker = r"\s*\d+[.)]\s+" if ordered else r"\s*[-*+]\s+"
            items = []
            while i < len(lines) and re.match(marker, lines[i]):   # a bullet ends a numbered list and vice versa
                items.append(re.sub(r"^\s*([-*+]|\d+[.)])\s+", "", lines[i]))
                i += 1
                while i < len(lines) and lines[i].startswith("  ") and lines[i].strip() \
                        and not re.match(r"\s*([-*+]|\d+[.)])\s+", lines[i]):
                    items[-1] += " " + lines[i].strip()
                    i += 1
            tag = "ol" if ordered else "ul"
            out.append(f"<{tag}>" + "".join(f"<li>{inline(x)}</li>" for x in items) + f"</{tag}>")
            continue
        else:
            para.append(st)
        i += 1
    flush()
    return "\n".join(out)


def md_to_html(text):
    try:
        import markdown  # type: ignore
        return markdown.markdown(text, extensions=["tables", "fenced_code"]), "markdown"
    except ImportError:
        pass
    if shutil.which("pandoc"):
        p = subprocess.run(["pandoc", "-f", "gfm", "-t", "html"], input=text, capture_output=True, text=True)
        if p.returncode == 0:
            return p.stdout, "pandoc"
    return builtin_md(text), "builtin"


def find_browser():
    for name in ("chromium", "chromium-browser", "google-chrome", "google-chrome-stable", "chrome"):
        if path := shutil.which(name):
            return path
    mac = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    return mac if os.path.exists(mac) else None


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--md", required=True)
    ap.add_argument("--out", required=True, help="PDF path; the HTML is written next to it")
    ap.add_argument("--title", default=None)
    ap.add_argument("--subtitle", default="")
    ap.add_argument("--cover", default=None, help="image for the cover page")
    a = ap.parse_args()

    with open(a.md) as f:
        text = f.read()
    title = a.title or next((ln[2:].strip() for ln in text.splitlines() if ln.startswith("# ")), "Guide")
    body, engine = md_to_html(text)
    cover = ""
    if a.cover:
        cover = (f'<section class="cover"><img src="file://{os.path.abspath(a.cover)}" alt="">'
                 f"<h1>{html.escape(title)}</h1><p class=\"sub\">{html.escape(a.subtitle)}</p></section>")
    md_dir = os.path.dirname(os.path.abspath(a.md))
    doc = (f'<!doctype html><html><head><meta charset="utf-8"><base href="file://{md_dir}/">'
           f"<title>{html.escape(title)}</title><style>{CSS}</style></head><body>{cover}{body}</body></html>")
    out_pdf = os.path.abspath(a.out)
    out_html = os.path.splitext(out_pdf)[0] + ".html"
    os.makedirs(os.path.dirname(out_pdf), exist_ok=True)
    with open(out_html, "w") as f:
        f.write(doc)

    browser = find_browser()
    if not browser:
        sys.exit(f"HTML written to {out_html}, but no Chromium/Chrome found for the PDF. "
                 f"Run: sudo apt-get install -y chromium")
    cmd = [browser, "--headless=new", "--disable-gpu", "--no-pdf-header-footer",
           "--allow-file-access-from-files", f"--print-to-pdf={out_pdf}", f"file://{out_html}"]
    if platform.system() == "Linux":
        cmd.insert(1, "--no-sandbox")
    for attempt in (1, 2):   # headless Chrome occasionally exits early on a cold start; retry once
        if os.path.exists(out_pdf):
            os.unlink(out_pdf)
        p = subprocess.run(cmd, capture_output=True, text=True, timeout=180)
        if p.returncode == 0 and os.path.exists(out_pdf) and os.path.getsize(out_pdf) >= 1000:
            break
    if p.returncode != 0 or not os.path.exists(out_pdf) or os.path.getsize(out_pdf) < 1000:
        sys.exit(f"PDF print failed ({p.returncode}): {p.stderr[-600:]}")
    with open(out_pdf, "rb") as f:
        pages = len(re.findall(rb"/Type\s*/Page[^s]", f.read()))
    print(json.dumps({"pdf": out_pdf, "html": out_html, "pages": pages, "md_engine": engine,
                      "bytes": os.path.getsize(out_pdf)}, indent=2))


if __name__ == "__main__":
    main()
