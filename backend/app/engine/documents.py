import csv
import io
import re
from pathlib import Path

from app.core import config
from app.engine import artifacts, store
from app.engine.commands import CommandError, command

KINDS = ("doc", "sheet", "deck")
LABELS = {"html": "Page", "doc": "Document", "sheet": "Spreadsheet", "deck": "Slides"}
FORMATS = {"html": ("html",), "doc": ("md", "docx", "pdf"), "sheet": ("csv", "xlsx"), "deck": ("pptx", "pdf", "md")}
MIME = {"html": "text/html", "md": "text/markdown", "csv": "text/csv", "pdf": "application/pdf",
        "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation"}
BG, FG, MUTED, ACCENT = (0x11, 0x11, 0x11), (0xF7, 0xF7, 0xF7), (0xA3, 0xA3, 0xA3), (0xF9, 0x73, 0x16)


def split_doc(text: str) -> list[str]:
    parts, cur = [], []
    for line in text.replace("\r\n", "\n").split("\n"):
        if line.startswith("## ") and cur:
            parts.append("\n".join(cur).strip("\n"))
            cur = []
        cur.append(line)
    if cur:
        parts.append("\n".join(cur).strip("\n"))
    return [p for p in parts if p.strip()]


def split_deck(text: str) -> list[str]:
    return [s.strip("\n") for s in re.split(r"(?m)^---\s*$", text.replace("\r\n", "\n")) if s.strip()]


def heading(section: str) -> str:
    first = section.strip().split("\n", 1)[0]
    return re.sub(r"^#+\s*", "", first).strip()


def rows(text: str) -> list[list[str]]:
    return [r for r in csv.reader(io.StringIO(text.strip("\n")))]


def _check(kind: str, content: str) -> None:
    if kind not in KINDS:
        raise CommandError(f"kind must be one of {', '.join(KINDS)}")
    if not content.strip():
        raise CommandError("the content is empty")
    if kind == "sheet":
        try:
            r = rows(content)
        except csv.Error as exc:
            raise CommandError(f"the spreadsheet is not valid CSV: {exc}") from None
        if not r:
            raise CommandError("the spreadsheet has no rows")


def merge(kind: str, old: str, section: str, content: str) -> str:
    if kind == "doc":
        parts = split_doc(old)
        want = section.strip().lower()
        for i, p in enumerate(parts):
            if heading(p).lower() == want:
                parts[i] = content.strip("\n")
                return "\n\n".join(parts) + "\n"
        return "\n\n".join(parts + [content.strip("\n")]) + "\n"
    if kind == "deck":
        parts = split_deck(old)
        try:
            n = int(section)
        except ValueError:
            n = next((i + 1 for i, p in enumerate(parts) if heading(p).lower() == section.strip().lower()), len(parts) + 1)
        if 1 <= n <= len(parts):
            parts[n - 1] = content.strip("\n")
        else:
            parts.append(content.strip("\n"))
        return "\n\n---\n\n".join(parts) + "\n"
    raise CommandError("section applies to documents and slides; for a spreadsheet send the whole CSV")


def write(conversation_id: str, message_id: str | None, title: str, kind: str, content: str, artifact_id: str | None = None, section: str | None = None) -> dict:
    if artifact_id:
        a = artifacts.get(artifact_id)
        if a is None or a["conversationId"] != conversation_id:
            raise CommandError(f"no artifact {artifact_id} in this chat; omit artifact_id to start a new one")
        kind = a["kind"]
        if section:
            content = merge(kind, (artifacts.version(artifact_id) or {}).get("content") or "", section, content)
    _check(kind, content)
    try:
        return artifacts.publish(conversation_id, message_id, title or "", content, artifact_id, kind)
    except artifacts.ArtifactError as exc:
        raise CommandError(str(exc)) from None


def _md_lines(text: str):
    for line in text.replace("\r\n", "\n").split("\n"):
        s = line.rstrip()
        m = re.match(r"^(#{1,6})\s+(.*)$", s)
        if m:
            yield ("h", len(m.group(1)), m.group(2))
        elif re.match(r"^\s*[-*+]\s+", s):
            yield ("li", 0, re.sub(r"^\s*[-*+]\s+", "", s))
        elif re.match(r"^\s*\d+[.)]\s+", s):
            yield ("ol", 0, re.sub(r"^\s*\d+[.)]\s+", "", s))
        elif s.strip():
            yield ("p", 0, s.strip())
        else:
            yield ("blank", 0, "")


def _plain(s: str) -> str:
    s = re.sub(r"\*\*(.+?)\*\*", r"\1", s)
    s = re.sub(r"(?<![*\w])\*(.+?)\*(?!\w)", r"\1", s)
    s = re.sub(r"`([^`]+)`", r"\1", s)
    return re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r"\1 (\2)", s)


def _docx(text: str) -> bytes:
    import docx
    d = docx.Document()
    for kind, level, s in _md_lines(text):
        if kind == "h":
            d.add_heading(_plain(s), level=min(level, 4) if level > 1 else 0)
        elif kind == "li":
            d.add_paragraph(_plain(s), style="List Bullet")
        elif kind == "ol":
            d.add_paragraph(_plain(s), style="List Number")
        elif kind == "p":
            d.add_paragraph(_plain(s))
    out = io.BytesIO()
    d.save(out)
    return out.getvalue()


def _esc(s: str) -> str:
    return _plain(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def _doc_pdf(text: str, title: str) -> bytes:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.platypus import ListFlowable, ListItem, Paragraph, SimpleDocTemplate, Spacer
    styles = getSampleStyleSheet()
    flow, bullets = [], []

    def flush():
        if bullets:
            flow.append(ListFlowable([ListItem(Paragraph(b, styles["BodyText"])) for b in bullets], bulletType="bullet"))
            bullets.clear()
    for kind, level, s in _md_lines(text):
        if kind in ("li", "ol"):
            bullets.append(_esc(s))
            continue
        flush()
        if kind == "h":
            flow.append(Paragraph(_esc(s), styles["Title" if level == 1 else "Heading2" if level == 2 else "Heading3"]))
        elif kind == "p":
            flow.append(Paragraph(_esc(s), styles["BodyText"]))
        else:
            flow.append(Spacer(1, 4))
    flush()
    out = io.BytesIO()
    SimpleDocTemplate(out, pagesize=A4, title=title, leftMargin=56, rightMargin=56, topMargin=56, bottomMargin=56).build(flow)
    return out.getvalue()


def _slide_parts(slide: str) -> tuple[str, list[str], list[str]]:
    title, bullets, body = "", [], []
    for kind, level, s in _md_lines(slide):
        if kind == "h" and not title:
            title = _plain(s)
        elif kind in ("li", "ol"):
            bullets.append(_plain(s))
        elif kind in ("p", "h"):
            body.append(_plain(s))
    return title, bullets, body


def _pptx(text: str) -> bytes:
    from pptx import Presentation
    from pptx.dml.color import RGBColor
    from pptx.util import Inches, Pt
    prs = Presentation()
    prs.slide_width, prs.slide_height = Inches(13.333), Inches(7.5)
    blank = prs.slide_layouts[6]
    for slide_text in split_deck(text):
        title, bullets, body = _slide_parts(slide_text)
        s = prs.slides.add_slide(blank)
        s.background.fill.solid()
        s.background.fill.fore_color.rgb = RGBColor(*BG)
        tb = s.shapes.add_textbox(Inches(0.8), Inches(0.6), Inches(11.7), Inches(1.2)).text_frame
        tb.word_wrap = True
        tb.text = title
        r = tb.paragraphs[0].runs[0] if tb.paragraphs[0].runs else None
        if r:
            r.font.size, r.font.bold, r.font.color.rgb = Pt(36), True, RGBColor(*FG)
        bf = s.shapes.add_textbox(Inches(0.8), Inches(2.0), Inches(11.7), Inches(4.9)).text_frame
        bf.word_wrap = True
        lines = [("", b) for b in body] + [("• ", b) for b in bullets]
        for i, (mark, line) in enumerate(lines):
            p = bf.paragraphs[0] if i == 0 else bf.add_paragraph()
            run = p.add_run()
            run.text = mark + line
            run.font.size, run.font.color.rgb = Pt(22), RGBColor(*(FG if mark else MUTED))
            p.space_after = Pt(10)
        bar = s.shapes.add_shape(1, Inches(0.8), Inches(1.75), Inches(1.2), Inches(0.06))
        bar.fill.solid()
        bar.fill.fore_color.rgb = RGBColor(*ACCENT)
        bar.line.fill.background()
    out = io.BytesIO()
    prs.save(out)
    return out.getvalue()


def _deck_pdf(text: str, title: str) -> bytes:
    from reportlab.lib.colors import Color
    from reportlab.lib.utils import simpleSplit
    from reportlab.pdfgen import canvas
    w, h = 960, 540
    out = io.BytesIO()
    c = canvas.Canvas(out, pagesize=(w, h))
    c.setTitle(title)
    rgb = lambda t: Color(t[0] / 255, t[1] / 255, t[2] / 255)
    for n, slide_text in enumerate(split_deck(text), 1):
        stitle, bullets, body = _slide_parts(slide_text)
        c.setFillColor(rgb(BG))
        c.rect(0, 0, w, h, stroke=0, fill=1)
        c.setFillColor(rgb(FG))
        c.setFont("Helvetica-Bold", 34)
        y = h - 90
        for line in simpleSplit(stitle, "Helvetica-Bold", 34, w - 120)[:2]:
            c.drawString(60, y, line)
            y -= 42
        c.setFillColor(rgb(ACCENT))
        c.rect(60, y + 14, 80, 4, stroke=0, fill=1)
        y -= 30
        for mark, items, col in (("", body, MUTED), ("•  ", bullets, FG)):
            c.setFillColor(rgb(col))
            for item in items:
                for i, line in enumerate(simpleSplit(item, "Helvetica", 20, w - 150)):
                    if y < 50:
                        break
                    c.setFont("Helvetica", 20)
                    c.drawString(60 if not mark or i else 60, y, (mark if i == 0 else "   ") + line)
                    y -= 28
                y -= 6
        c.setFillColor(rgb(MUTED))
        c.setFont("Helvetica", 11)
        c.drawRightString(w - 30, 20, str(n))
        c.showPage()
    c.save()
    return out.getvalue()


def _xlsx(text: str) -> bytes:
    from openpyxl import Workbook
    from openpyxl.styles import Font
    wb = Workbook()
    ws = wb.active
    for i, r in enumerate(rows(text)):
        vals = []
        for v in r:
            try:
                vals.append(float(v) if re.fullmatch(r"-?\d+(\.\d+)?", v.strip()) else v)
            except ValueError:
                vals.append(v)
        ws.append(vals)
        if i == 0:
            for cell in ws[1]:
                cell.font = Font(bold=True)
    out = io.BytesIO()
    wb.save(out)
    return out.getvalue()


def render_export(kind: str, content: str, fmt: str, title: str) -> bytes:
    if fmt not in FORMATS.get(kind, ()):
        raise CommandError(f"a {LABELS.get(kind, kind).lower()} exports as {', '.join(FORMATS.get(kind, ()))}")
    if fmt in ("html", "md", "csv"):
        return content.encode()
    return {"docx": _docx, "xlsx": _xlsx, "pptx": _pptx}[fmt](content) if fmt in ("docx", "xlsx", "pptx") else (
        _doc_pdf(content, title) if kind == "doc" else _deck_pdf(content, title))


def _inline(s: str) -> str:
    s = s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    s = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", s)
    s = re.sub(r"`([^`]+)`", r"<code>\1</code>", s)
    return re.sub(r"\[([^\]]+)\]\((https?://[^)\s]+)\)", r'<a href="\2" target="_blank" rel="noopener">\1</a>', s)


def _md_html(text: str) -> str:
    out, list_tag = [], None
    for kind, level, s in _md_lines(text):
        tag = {"li": "ul", "ol": "ol"}.get(kind)
        if tag != list_tag:
            if list_tag:
                out.append(f"</{list_tag}>")
            if tag:
                out.append(f"<{tag}>")
            list_tag = tag
        if kind == "h":
            out.append(f"<h{level}>{_inline(s)}</h{level}>")
        elif tag:
            out.append(f"<li>{_inline(s)}</li>")
        elif kind == "p":
            out.append(f"<p>{_inline(s)}</p>")
    if list_tag:
        out.append(f"</{list_tag}>")
    return "\n".join(out)


def standalone_html(kind: str, content: str, title: str) -> str:
    css = ("body{margin:0;background:#111;color:#f7f7f7;font:16px/1.6 system-ui,sans-serif}main{max-width:760px;margin:0 auto;padding:40px 24px}"
           "h1,h2,h3{line-height:1.25}a{color:#f97316}code{font-family:ui-monospace,monospace;background:#1e1e1e;padding:1px 4px;border-radius:4px}"
           "table{border-collapse:collapse;font-size:14px}td,th{border:1px solid #333;padding:6px 10px;text-align:left}th{background:#1e1e1e}"
           ".slide{aspect-ratio:16/9;border:1px solid #333;border-radius:10px;padding:40px 48px;margin:0 0 24px;box-sizing:border-box;overflow:hidden}"
           ".slide h1,.slide h2{margin:0 0 18px}")
    t = title.replace("<", "&lt;")
    if kind == "doc":
        body = _md_html(content)
    elif kind == "sheet":
        r = rows(content)
        esc = lambda v: v.replace("&", "&amp;").replace("<", "&lt;")
        body = "<table>" + ("<tr>" + "".join(f"<th>{esc(v)}</th>" for v in r[0]) + "</tr>" if r else "") + "".join(
            "<tr>" + "".join(f"<td>{esc(v)}</td>" for v in row) + "</tr>" for row in r[1:]) + "</table>"
    else:
        body = "".join(f'<section class="slide">{_md_html(s)}</section>' for s in split_deck(content))
    return f'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{t}</title><style>{css}</style></head><body><main>{body}</main></body></html>'


def exports_dir() -> Path:
    d = config.data_dir() / "exports"
    d.mkdir(parents=True, exist_ok=True)
    return d


def filename(title: str, version: int, fmt: str) -> str:
    base = re.sub(r"[^\w\- ]+", "", title).strip().replace(" ", "-")[:60] or "artifact"
    return f"{base}-v{version}.{fmt}"


@command("artifact.export", "Export an artifact",
         {"id": {"type": "string", "required": True, "description": "artifact id"}, "format": {"type": "string", "required": True, "enum": ["html", "md", "docx", "pdf", "csv", "xlsx", "pptx"]},
          "version": {"type": "integer", "description": "default the latest"}},
         description="Writes an artifact version as a file: a document as md, docx or pdf; a spreadsheet as csv or xlsx; slides as pptx, pdf or md; a page as html. Returns the file's path and a download URL.")
def export(id: str, format: str, version: int | None = None) -> dict:
    a = artifacts.get(id)
    if a is None:
        raise CommandError(f"No artifact {id}; artifact.list gives the ids", 404)
    v = artifacts.version(id, version)
    if v is None:
        raise CommandError(f"Artifact {id} has no version {version}", 404)
    data = render_export(a["kind"], v["content"], format, a["title"])
    name = filename(a["title"], v["version"], format)
    path = exports_dir() / f"{id}-{name}"
    path.write_bytes(data)
    return {"id": id, "version": v["version"], "format": format, "path": str(path), "bytes": len(data),
            "url": f"/api/artifacts/{id}/v/{v['version']}/export/{format}"}


@command("artifact.write", "Write a document, spreadsheet or slides",
         {"conversationId": {"type": "string", "required": True}, "kind": {"type": "string", "enum": list(KINDS), "description": "doc, sheet or deck; needed for a new artifact"},
          "title": {"type": "string"}, "content": {"type": "string", "required": True, "description": "Markdown for a doc (## sections), CSV for a sheet, Markdown slides separated by --- lines for a deck"},
          "artifactId": {"type": "string", "description": "add a version to this artifact"}, "section": {"type": "string", "description": "with artifactId: replace only this doc section (its ## heading) or slide (its number), or append it when missing"}},
         description="Creates or revises a document, spreadsheet or slide deck in a chat, the way Claude's write_document tool does; each write is a new version shown live beside the chat. Returns the artifact with its id and version.")
def write_command(conversationId: str, content: str, kind: str | None = None, title: str | None = None, artifactId: str | None = None, section: str | None = None) -> dict:
    if store.row("SELECT id FROM conversations WHERE id = ?", (conversationId,)) is None:
        raise CommandError(f"No conversation {conversationId}; conversation.list gives the ids", 404)
    if not artifactId and not kind:
        raise CommandError("a new artifact needs kind: doc, sheet or deck")
    if not artifactId and not (title or "").strip():
        raise CommandError("a new artifact needs a title")
    return write(conversationId, None, title or "", kind or "", content, artifactId, section)
