import concurrent.futures
import os
import queue
import subprocess
import sys
import threading

from fastapi import APIRouter
from fastapi.responses import Response

from app.core import config
from app.engine import events
from app.engine.commands import CommandError, command

VIEW = {"width": 1280, "height": 800}
NAV_TIMEOUT = 30_000
ACT_TIMEOUT = 10_000
TEXT_CAP = 12_000
REFS_CAP = 250
INSTALL = "Install the built-in browser first with ./format install-browser"

router = APIRouter(tags=["browser"])
_jobs: "queue.Queue[tuple]" = queue.Queue()
_thread: threading.Thread | None = None
_lock = threading.Lock()
_state = {"open": False, "url": "", "title": "", "seq": 0, "error": "", "busy": False, "installing": False, "note": ""}
_frame = b""

SNAPSHOT_JS = """(cap) => {
  const seen = []; let n = 0;
  document.querySelectorAll('[data-ft-ref]').forEach((e) => e.removeAttribute('data-ft-ref'));
  const sel = 'a[href], button, input:not([type=hidden]), textarea, select, summary, [role=button], [role=link], [role=tab], [role=checkbox], [role=menuitem], [contenteditable=""], [contenteditable=true]';
  for (const e of document.querySelectorAll(sel)) {
    if (n >= cap) break;
    const r = e.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const s = getComputedStyle(e);
    if (s.visibility === 'hidden' || s.display === 'none') continue;
    n += 1;
    e.setAttribute('data-ft-ref', String(n));
    const tag = e.tagName.toLowerCase();
    const role = e.getAttribute('role') || (tag === 'a' ? 'link' : tag === 'input' ? (e.type === 'submit' || e.type === 'button' ? 'button' : e.type === 'checkbox' ? 'checkbox' : 'textbox') : tag === 'textarea' ? 'textbox' : tag === 'select' ? 'select' : tag === 'summary' ? 'button' : tag);
    const label = (e.getAttribute('aria-label') || e.innerText || e.getAttribute('placeholder') || e.getAttribute('title') || e.getAttribute('name') || e.value || '').replace(/\\s+/g, ' ').trim().slice(0, 80);
    const extra = tag === 'a' ? ' -> ' + (e.getAttribute('href') || '').slice(0, 120) : (tag === 'input' || tag === 'textarea') && e.value ? ' (value "' + String(e.value).slice(0, 40) + '")' : '';
    seen.push('[' + n + '] ' + role + ' "' + label + '"' + extra + (r.top > innerHeight || r.bottom < 0 ? ' (off screen)' : ''));
  }
  return { refs: seen, text: (document.body ? document.body.innerText : '').replace(/\\n{3,}/g, '\\n\\n') };
}"""


def available() -> bool:
    try:
        import playwright  # noqa: F401
    except ImportError:
        return False
    return True


def browsers_dir():
    from pathlib import Path
    custom = os.environ.get("PLAYWRIGHT_BROWSERS_PATH")
    if custom and custom != "0":
        return Path(custom)
    home = Path.home()
    if sys.platform == "darwin":
        return home / "Library" / "Caches" / "ms-playwright"
    if os.name == "nt":
        return Path(os.environ.get("LOCALAPPDATA") or home / "AppData" / "Local") / "ms-playwright"
    return Path(os.environ.get("XDG_CACHE_HOME") or home / ".cache") / "ms-playwright"


def installed() -> bool:
    root = browsers_dir()
    return root.is_dir() and any(p.name.startswith("chromium") for p in root.iterdir())


def _install_job() -> None:
    from playwright._impl._driver import compute_driver_executable, get_driver_env
    node, cli = compute_driver_executable()
    _state.update(installing=True, error="", note="Downloading Chromium for the built-in browser")
    _publish()
    try:
        proc = subprocess.run([node, cli, "install", "chromium"], env=get_driver_env(), capture_output=True, text=True, timeout=1800,
                              stdin=subprocess.DEVNULL)
        if proc.returncode != 0:
            import re
            lines = [re.sub(r"\x1b\[[0-9;]*m", "", ln).strip() for ln in ((proc.stderr or "") + "\n" + (proc.stdout or "")).splitlines()]
            causes = [ln for ln in lines if ln.startswith("Error:") and "code=1" not in ln]
            reason = (causes[-1][6:].strip() if causes else next((ln for ln in reversed(lines) if ln and not ln.startswith("at ")), "unknown error"))
            _state.update(error=f"Chromium did not install ({reason[:300]}). Check the network and choose Install the browser again.")
    except Exception as exc:
        _state.update(error=f"Chromium did not install: {type(exc).__name__}: {str(exc)[:300]}")
    finally:
        _state.update(installing=False, note="")
        _publish()


def _profile():
    p = config.data_dir() / "browser"
    p.mkdir(parents=True, exist_ok=True)
    return p


def _publish() -> None:
    events.publish("browser.frame", **status_dict())


def status_dict() -> dict:
    have = available()
    return {"available": have, "installed": have and installed(), "installing": _state["installing"], "note": _state["note"],
            "open": _state["open"], "url": _state["url"], "title": _state["title"],
            "seq": _state["seq"], "error": _state["error"], "busy": _state["busy"]}


def _worker() -> None:
    global _frame
    from playwright.sync_api import sync_playwright
    try:
        pw = sync_playwright().start()
        ctx = pw.chromium.launch_persistent_context(str(_profile()), headless=True, viewport=dict(VIEW), device_scale_factor=2, accept_downloads=False)
    except Exception as exc:
        hint = "Choose Install in the Browser pane to download Chromium" if not installed() else INSTALL
        _state.update(open=False, error=f"The browser did not start: {str(exc).splitlines()[0][:300]}. {hint}")
        _publish()
        while True:
            try:
                fn, fut = _jobs.get(timeout=1)
            except queue.Empty:
                return
            if fut is not None:
                fut.set_exception(CommandError(_state["error"], 503))
    page = ctx.pages[0] if ctx.pages else ctx.new_page()
    _state.update(open=True, error="")
    try:
        while True:
            fn, fut = _jobs.get()
            if fn is None:
                break
            _state["busy"] = True
            try:
                if page.is_closed():
                    page = ctx.new_page()
                fut.set_result(fn(page))
            except Exception as exc:
                fut.set_exception(exc)
            finally:
                _state["busy"] = False
                try:
                    _frame = page.screenshot(type="jpeg", quality=70, timeout=ACT_TIMEOUT)
                    _state.update(url=page.url if page.url != "about:blank" else "", title=page.title())
                except Exception:
                    pass
                _state["seq"] += 1
                _publish()
    finally:
        try:
            ctx.close()
            pw.stop()
        except Exception:
            pass
        _state.update(open=False, url="", title="")
        _publish()


def _do(fn, wait: float = 60):
    global _thread
    if not available():
        raise CommandError(INSTALL, 503)
    with _lock:
        if _thread is None or not _thread.is_alive():
            _thread = threading.Thread(target=_worker, name="format-browser", daemon=True)
            _thread.start()
    fut: concurrent.futures.Future = concurrent.futures.Future()
    _jobs.put((fn, fut))
    try:
        return fut.result(wait)
    except concurrent.futures.TimeoutError:
        raise CommandError("The browser did not answer in time", 504) from None


def _url(u: str) -> str:
    u = (u or "").strip()
    if not u:
        raise CommandError("Give a URL to open")
    if "://" not in u and not u.startswith(("about:", "data:")):
        u = ("http://" if u.startswith(("localhost", "127.0.0.1")) else "https://") + u
    if not u.startswith(("http://", "https://", "about:")):
        raise CommandError("The browser opens http and https pages")
    return u


def _settle(page) -> None:
    try:
        page.wait_for_load_state("domcontentloaded", timeout=5000)
    except Exception:
        pass
    page.wait_for_timeout(300)


def _snapshot(page) -> str:
    got = page.evaluate(SNAPSHOT_JS, REFS_CAP)
    text = got["text"].strip()
    if len(text) > TEXT_CAP:
        text = text[:TEXT_CAP] + f"\n[{len(got['text']) - TEXT_CAP} more characters; scroll or click to see more]"
    refs = "\n".join(got["refs"]) or "(none)"
    return f"Page: {page.title()}\nURL: {page.url}\n\nInteractive elements (pass ref to click or type):\n{refs}\n\nText:\n{text or '(no text)'}"


def _ref(page, ref):
    if ref in (None, ""):
        raise CommandError("Pass ref, the number of an element from the last snapshot")
    loc = page.locator(f'[data-ft-ref="{int(ref)}"]')
    if loc.count() == 0:
        raise CommandError(f"No element {ref} on the page now; take a new snapshot")
    return loc.first


def act(action: str, args: dict) -> str:
    action = (action or "").strip()

    def go(page):
        if action == "navigate":
            page.goto(_url(str(args.get("url") or "")), wait_until="domcontentloaded", timeout=NAV_TIMEOUT)
        elif action == "snapshot":
            pass
        elif action == "click":
            _ref(page, args.get("ref")).click(timeout=ACT_TIMEOUT)
        elif action == "type":
            loc = _ref(page, args.get("ref"))
            loc.fill(str(args.get("text") or ""), timeout=ACT_TIMEOUT)
            if args.get("submit"):
                loc.press("Enter", timeout=ACT_TIMEOUT)
        elif action == "select":
            _ref(page, args.get("ref")).select_option(label=str(args.get("text") or ""), timeout=ACT_TIMEOUT)
        elif action == "press":
            page.keyboard.press(str(args.get("key") or "Enter"))
        elif action == "scroll":
            page.mouse.wheel(0, -600 if args.get("direction") == "up" else 600)
        elif action == "back":
            page.go_back(timeout=NAV_TIMEOUT)
        elif action == "forward":
            page.go_forward(timeout=NAV_TIMEOUT)
        elif action == "reload":
            page.reload(timeout=NAV_TIMEOUT)
        elif action == "click_at":
            size = page.viewport_size or VIEW
            page.mouse.click(float(args.get("x", 0)) * size["width"], float(args.get("y", 0)) * size["height"])
        elif action == "resize":
            w = max(320, min(1920, int(args.get("width") or VIEW["width"])))
            h = max(240, min(1400, int(args.get("height") or VIEW["height"])))
            if page.viewport_size != {"width": w, "height": h}:
                page.set_viewport_size({"width": w, "height": h})
        elif action == "keys":
            text = str(args.get("text") or "")
            if text:
                page.keyboard.type(text)
        else:
            raise CommandError(f"Unknown browser action {action}; use navigate, snapshot, click, type, select, press, scroll, back, forward or reload")
        _settle(page)
        return _snapshot(page)

    return _do(go)


def stop() -> None:
    global _thread
    if _thread is not None and _thread.is_alive():
        _jobs.put((None, None))
        _thread.join(10)
    _thread = None


DEFINITION = {"name": "browser", "description": "Use Format's built-in browser, which the person can watch and use in the Browser pane beside the chat (its sign-ins stay in Format, apart from their own browser). Every action returns a text snapshot of the page: its title, URL, the visible interactive elements numbered as refs, and the page text. Use navigate to open a URL, then click and type with a ref from the latest snapshot; type with submit presses Enter after typing. Use web_fetch instead for simply reading a public page; use the browser for pages that need clicking, forms, scripts or a sign-in. Ask the person before buying, sending, posting or deleting anything.",
              "input_schema": {"type": "object", "properties": {
                  "action": {"type": "string", "enum": ["navigate", "snapshot", "click", "type", "select", "press", "scroll", "back", "forward", "reload"]},
                  "url": {"type": "string", "description": "For navigate"},
                  "ref": {"type": "integer", "description": "For click, type and select: an element number from the latest snapshot"},
                  "text": {"type": "string", "description": "For type: the text; for select: the option's label"},
                  "submit": {"type": "boolean", "description": "For type: press Enter after typing"},
                  "key": {"type": "string", "description": "For press, for example Enter, Escape, Tab, ArrowDown"},
                  "direction": {"type": "string", "enum": ["up", "down"], "description": "For scroll"}},
                  "required": ["action"]}}


def tool(args: dict) -> tuple[str, bool]:
    try:
        return act(str(args.get("action") or ""), args), False
    except CommandError as exc:
        return str(exc), True
    except Exception as exc:
        return f"The browser could not do that: {str(exc).splitlines()[0][:400]}", True


@router.get("/api/browser/frame")
def frame() -> Response:
    if not _frame:
        return Response(status_code=204)
    return Response(_frame, media_type="image/jpeg", headers={"cache-control": "no-store"})


@command("browser.status", "Built-in browser", mutates=False,
         description="Whether the built-in browser is installed and open, and its current page (url, title) and frame number.")
def status() -> dict:
    return status_dict()


@command("browser.open", "Open a page in the built-in browser", {"url": {"type": "string", "required": True}},
         description="Opens a URL in Format's built-in browser (starting it if needed) and returns a text snapshot of the page with numbered interactive elements.")
def open_(url: str) -> dict:
    return {"snapshot": act("navigate", {"url": url})} | status_dict()


@command("browser.act", "Act in the built-in browser",
         {"action": {"type": "string", "required": True, "description": "navigate, snapshot, click, type, select, press, scroll, back, forward, reload, click_at (x and y from 0 to 1), keys (text) or resize (width and height in CSS pixels)"},
          "url": {"type": "string"}, "ref": {"type": "integer"}, "text": {"type": "string"}, "submit": {"type": "boolean"},
          "key": {"type": "string"}, "direction": {"type": "string"}, "x": {"type": "number"}, "y": {"type": "number"},
          "width": {"type": "integer"}, "height": {"type": "integer"}},
         description="One action in the built-in browser, the same actions Claude's browser tool has plus click_at, keys and resize for the Browser pane; returns the page snapshot.")
def act_(action: str, url: str | None = None, ref: int | None = None, text: str | None = None, submit: bool | None = None,
         key: str | None = None, direction: str | None = None, x: float | None = None, y: float | None = None,
         width: int | None = None, height: int | None = None) -> dict:
    if action == "resize":
        VIEW.update(width=max(320, min(1920, int(width or VIEW["width"]))), height=max(240, min(1400, int(height or VIEW["height"]))))
        if not _state["open"]:
            return {"snapshot": ""} | status_dict()
        return {"snapshot": act("resize", dict(VIEW))} | status_dict()
    args = {k: v for k, v in {"url": url, "ref": ref, "text": text, "submit": submit, "key": key, "direction": direction, "x": x, "y": y}.items() if v is not None}
    return {"snapshot": act(action, args)} | status_dict()


@command("browser.install", "Install the built-in browser's Chromium",
         description="Downloads the Chromium the built-in browser runs on (about 150 MB, once) in the background; browser.status reports installing and then installed. Needs the Playwright package, which the desktop app bundles.")
def install() -> dict:
    if not available():
        raise CommandError(INSTALL, 503)
    if not _state["installing"]:
        threading.Thread(target=_install_job, name="format-browser-install", daemon=True).start()
        _state["installing"] = True
    return status_dict()


@command("browser.close", "Close the built-in browser", description="Closes the built-in browser; its sign-ins stay for next time.")
def close() -> dict:
    stop()
    return status_dict()
