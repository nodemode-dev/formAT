#!/usr/bin/env python3
"""Builds the Orrery from orrery.template.html and textures.json.
  build.py OUT_DIR           the shipped page: every /*T[*/ ... /*]T*/ test block is left out
  build.py OUT_FILE test     a test build that keeps the test hooks (window.__orrery, __lockq, __force2d, counters)"""
import os, re, sys
W = os.path.dirname(os.path.abspath(__file__))
tpl = open(os.path.join(W, "orrery.template.html"), encoding="utf-8").read()
tex = open(os.path.join(W, "textures.json"), encoding="utf-8").read()
assert "/*__TEX__*/" in tpl and "</" not in tex
test = len(sys.argv) > 2 and sys.argv[2] == "test"
if not test:
    tpl = re.sub(r"/\*T\[\*/.*?/\*\]T\*/", "", tpl)
    assert "window.__" not in tpl and "/*T" not in tpl
out = sys.argv[1] if test else os.path.join(sys.argv[1], "artifact.html")
open(out, "w", encoding="utf-8").write(tpl.replace("/*__TEX__*/", tex))
print(out, os.path.getsize(out), "bytes", "(test build)" if test else "(shipped)")
