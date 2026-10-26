# NOTICE

Format · Copyright 2026 NodeAgentc, Inc. · Licensed under the Apache License, Version 2.0 (see `LICENSE`).

## Vendored from the form family

`frontend/src/styles/tokens.css`, `scrollbars.css`, `fonts.css`, `light-mode.css`, `shell.css` and `dialogs.css` are the form family's Studio Dark sheets, copied unchanged from formvis v1.66.1 (Apache-2.0, nodemode-ai). The theme boot script in `frontend/index.html` is the family's `theme-boot.js` v1.0.0, as formlit carries it.

## Third-party packages

| Package | Licence | Where |
| --- | --- | --- |
| Inter (`@fontsource/inter`) | OFL-1.1 | frontend fonts |
| JetBrains Mono (`@fontsource/jetbrains-mono`) | OFL-1.1 | frontend fonts |
| Vite, TypeScript | MIT, Apache-2.0 | frontend build only |
| pytest 9.1.1 (`backend/requirements-test.txt`) | MIT | the test suite in `backend/tests` and CI only, never shipped; it also uses httpx, listed below |
| xterm.js (`@xterm/xterm`, `@xterm/addon-fit`) | MIT | terminal dock |
| ptyprocess | ISC | engine terminals on macOS and Linux |
| pywinpty | MIT | engine terminals on Windows |
| anthropic (Python SDK) | MIT | engine, the Claude API |
| markdown-it, linkify-it, mdurl, uc.micro, punycode.js | MIT | reply rendering |
| entities | BSD-2-Clause | reply rendering (markdown-it dependency) |
| argparse | PSF-2.0 | markdown-it's command line only, not used by Format |
| highlight.js (`lib/common`) | BSD-3-Clause | syntax colours in code blocks |
| KaTeX (with its fonts) | MIT (code); SIL Open Font License 1.1 (the KaTeX fonts) | math in replies |
| faster-whisper 1.2.1 (in the desktop release; from source, `./format install-voice`) | MIT | local dictation |
| PyAV 18.1.0 (`av`), built from source by `setup/build_lgpl_av` | BSD-3-Clause | faster-whisper's audio decoding. The desktop release does not use the PyAV binary wheel, which links GPL x264 and x265 |
| FFmpeg 8.0.3 libraries (libavcodec, libavformat, libavutil, libavfilter, libavdevice, libswscale, libswresample), the unmodified release `https://ffmpeg.org/releases/ffmpeg-8.0.3.tar.xz` (SHA-256 `6136812ea6d4e68bdba27e33c2a94382711cdf4f8602ffef056ff792bd6f9818`), configured with `--disable-gpl --disable-nonfree --disable-version3 --disable-autodetect` and no external libraries, as shared libraries PyAV loads at run time | LGPL-2.1-or-later | see "FFmpeg source offer" below |
| CTranslate2 4.8.3 (`ctranslate2`), with oneDNN, Intel oneMKL linked in, and libgomp | MIT (CTranslate2); Apache-2.0 (oneDNN); Intel Simplified Software License (oneMKL); GPL-3.0 with the GCC Runtime Library Exception (libgomp) | runs the dictation model |
| onnxruntime 1.31.0, tokenizers 0.23.3, huggingface_hub 2.3.0 with hf-xet, numpy, tqdm | MIT; Apache-2.0; Apache-2.0; BSD-3-Clause; MPL-2.0 AND MIT (tqdm, unedited) | dictation: voice detection, tokens, model download |
| Whisper large-v3-turbo weights (OpenAI, CTranslate2 conversion; downloaded by `./format install-voice`, not shipped) | MIT | local dictation model |
| Playwright for Python 1.56.0 (in the desktop release), with its driver: the Playwright Node.js package and a Node.js runtime binary | Apache-2.0 (Playwright); MIT and the licences in the driver's `node` LICENSE (Node.js) | the built-in browser |
| Chromium, downloaded by `playwright install chromium` on the person's request, not bundled | BSD-3-Clause and the licences Chromium lists | the built-in browser |
| greenlet, pyee | MIT AND PSF-2.0; MIT | Playwright dependencies |
| python-docx, python-pptx, openpyxl | MIT | Word, PowerPoint and Excel export |
| ReportLab 5.0.1 | BSD-3-Clause | PDF export. The freeze takes reportlab's modules only (`--collect-submodules reportlab`), so its `fonts/` folder (the GPL DarkGarden font and Type 1 files) is not in the bundle |
| lxml, XlsxWriter, Pillow | BSD-3-Clause; BSD-2-Clause; MIT-CMU | python-docx and python-pptx dependencies |
| Libraries inside the Pillow wheel | libjpeg, libpng, libtiff, libwebp, libavif, OpenJPEG, Little CMS, HarfBuzz, Brotli, zstd, xz, libxcb: permissive (see the wheel's LICENSE); FreeType 2.14.3 used under the FreeType License | Portions of this software are copyright (c) 2026 The FreeType Project (www.freetype.org). All rights reserved. |
| certifi | MPL-2.0 | engine: its `cacert.pem`, frozen unedited |
| segno | BSD-3-Clause | the pairing QR code |
| FastAPI, Starlette, Pydantic | MIT | engine |
| Uvicorn, httpx | BSD-3-Clause | engine |
| wgpu, pollster, bytemuck, sysinfo | MIT or Apache-2.0 | native crate |
| Other Python packages frozen into the engine | MIT: annotated-doc, annotated-types, anyio, attrs, charset-normalizer, docstring-parser, et-xmlfile, filelock, h11, httptools, jiter, jsonschema, jsonschema-specifications, mcp-types, pydantic-core, pyjwt, pyyaml, referencing, rpds-py, truststore, typing-inspection, watchfiles; MIT-0: cffi; MIT OR Apache-2.0: sniffio, uvloop; BSD-3-Clause: click, fsspec, httpcore, httpcore2, httpx2, idna, protobuf, python-dotenv, sse-starlette, websockets; Apache-2.0: flatbuffers, opentelemetry-api; Apache-2.0 OR BSD-2-Clause: packaging; Apache-2.0 OR BSD-3-Clause: cryptography (its wheel bundles OpenSSL 3, Apache-2.0); PSF-2.0: typing-extensions and the CPython runtime | read from the installed metadata of the desktop requirements, 2026-10-23 |

## FFmpeg source offer

The FFmpeg libraries in Format's desktop release are the unmodified 8.0.3 release named above, built by `setup/build_lgpl_av` (Linux and macOS) or `setup/build_lgpl_av.bat` (Windows) with the configure line written there. Every GitHub release of Format attaches that exact source tarball beside the bundles (`setup/ffmpeg_source`). The libraries stay separate shared files inside the frozen engine, and Format's own source and build scripts are public, so a person can build the engine against their own FFmpeg (set `LGPL_FFMPEG_PREFIX` to it before `setup/build_lgpl_av` and `./build_app`).

## Desktop shell: crates under other licences

Tauri links these crates unedited (no `[patch]` and no vendored copy):

| Crate | Licence | Why it is there |
| --- | --- | --- |
| cssparser, selectors, dtoa-short, option-ext | MPL-2.0 | Tauri's HTML handling (tauri-utils); used unmodified, source at crates.io |
| ring | Apache-2.0 AND ISC | TLS for the updater (rustls) |
| webpki-root-certs | CDLA-Permissive-2.0 | root certificates for the updater's TLS |
| r-efi | MIT OR Apache-2.0 OR LGPL-2.1-or-later | used under MIT |

The Linux AppImage also carries the build machine's WebKitGTK, GTK and GLib (LGPL-2.1-or-later) as separate shared libraries. The installers carry this file and `LICENSE`.

## Trademarks

Format is not affiliated with Anthropic. Claude and claude.ai are Anthropic's trademarks; Format uses no Anthropic logo, wordmark, font or stylesheet, and talks to Anthropic only through its public API with the person's own key.
