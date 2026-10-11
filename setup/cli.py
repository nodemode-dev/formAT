#!/usr/bin/env python3
import json
import os
import sys
import urllib.error
import urllib.request

BASE = os.environ.get("FORMAT_ENGINE_URL", f"http://127.0.0.1:{os.environ.get('FORMAT_PORT', '8490')}")
USAGE = """usage: ./format cli <command> [key=value ...] [--json '{...}']

  ./format cli list                      every engine command
  ./format cli describe <command>        one command's parameters
  ./format cli <command> key=value ...   run a command (values parse as JSON when they can)
"""


def call(method: str, path: str, body: dict | None = None) -> dict:
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, method=method, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=600) as r:
            return json.loads(r.read().decode() or "{}")
    except urllib.error.HTTPError as exc:
        return json.loads(exc.read().decode() or "{}")
    except (urllib.error.URLError, OSError):
        print(f"[format] the engine is not answering at {BASE}: start it with ./format backend", file=sys.stderr)
        raise SystemExit(1)


def parse(args: list[str]) -> dict:
    params: dict = {}
    i = 0
    while i < len(args):
        a = args[i]
        if a == "--json" and i + 1 < len(args):
            params.update(json.loads(args[i + 1]))
            i += 2
            continue
        if "=" not in a:
            raise SystemExit(f"[format] expected key=value, got: {a}")
        k, v = a.split("=", 1)
        try:
            params[k] = json.loads(v)
        except ValueError:
            params[k] = v
        i += 1
    return params


def main() -> None:
    argv = sys.argv[1:]
    if not argv or argv[0] in ("-h", "--help", "help"):
        print(USAGE)
        return
    if argv[0] == "list":
        out = call("GET", "/api/commands")
        width = max((len(c["id"]) for c in out.get("commands", [])), default=10)
        for c in out.get("commands", []):
            print(f"  {c['id'].ljust(width)}  {c['label']}")
        print(f"\n  {out.get('count', 0)} commands")
        return
    if argv[0] == "describe" and len(argv) > 1:
        print(json.dumps(call("GET", f"/api/commands/{argv[1]}"), indent=2))
        return
    out = call("POST", f"/api/commands/{argv[0]}", parse(argv[1:]))
    print(json.dumps(out, indent=2, default=str))
    if not out.get("ok"):
        raise SystemExit(1)


if __name__ == "__main__":
    main()
