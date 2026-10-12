# NOTICE

Format · Copyright 2026 nodemode-ai · Licensed under the Apache License, Version 2.0 (see `LICENSE`).

## Vendored from the form family

`frontend/src/styles/tokens.css`, `scrollbars.css`, `fonts.css`, `light-mode.css`, `shell.css` and `dialogs.css` are the form family's Studio Dark sheets, copied unchanged from formvis v1.66.1 (Apache-2.0, nodemode-ai). The theme boot script in `frontend/index.html` is the family's `theme-boot.js` v1.0.0, as formlit carries it.

## Third-party packages

| Package | Licence | Where |
| --- | --- | --- |
| Inter (`@fontsource/inter`) | OFL-1.1 | frontend fonts |
| JetBrains Mono (`@fontsource/jetbrains-mono`) | OFL-1.1 | frontend fonts |
| Vite, TypeScript | MIT, Apache-2.0 | frontend build only |
| xterm.js (`@xterm/xterm`, `@xterm/addon-fit`) | MIT | terminal dock |
| ptyprocess | ISC | engine terminals on macOS and Linux |
| pywinpty | MIT | engine terminals on Windows |
| anthropic (Python SDK) | MIT | engine, the Claude API |
| markdown-it, linkify-it, mdurl, uc.micro, punycode.js | MIT | reply rendering |
| entities | BSD-2-Clause | reply rendering (markdown-it dependency) |
| argparse | PSF-2.0 | markdown-it's command line only, not used by Format |
| highlight.js (`lib/common`) | BSD-3-Clause | syntax colours in code blocks |
| KaTeX (with its fonts) | MIT | math in replies |
| faster-whisper (optional, `./format install-voice`) | MIT | local dictation |
| Playwright for Python with Chromium (optional, `./format install-browser`) | Apache-2.0, BSD-3-Clause | the built-in browser |
| python-docx, python-pptx, openpyxl | MIT | Word, PowerPoint and Excel export |
| ReportLab | BSD-3-Clause | PDF export |
| segno | BSD-3-Clause | the pairing QR code |
| FastAPI, Starlette, Pydantic | MIT | engine |
| Uvicorn, httpx | BSD-3-Clause | engine |
| wgpu, pollster, bytemuck, sysinfo | MIT or Apache-2.0 | native crate |

## Trademarks

Format is not affiliated with Anthropic. Claude and claude.ai are Anthropic's trademarks; Format uses no Anthropic logo, wordmark, font or stylesheet, and talks to Anthropic only through its public API with the person's own key.
