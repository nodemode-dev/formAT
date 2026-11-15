# NOTICE

Format · Copyright 2026 NodeAgentc, Inc. · Licensed under the Apache License, Version 2.0 (see `LICENSE`).

## Vendored from the form family

`frontend/src/styles/tokens.css`, `scrollbars.css`, `fonts.css`, `light-mode.css`, `shell.css` and `dialogs.css` are the form family's Studio Dark sheets, copied unchanged from formvis v1.66.1 (Apache-2.0, nodemode-ai). The theme boot script in `frontend/index.html` is the family's `theme-boot.js` v1.0.0, as formlit carries it.

## Demo chats

`backend/app/demos/` holds the demo chats Format ships with: `northern-light` (the page Northern Light), `solar-system` (the page Orrery) and `harbour-ferries` (the page Harbour Ferries, season 2026, with a form.md import package of Markdown and CSV files and the same folder as a zip). They are original work made for Format and carry its licence (own work, Apache-2.0), except for the 26 NASA maps listed below. Northern Light and Harbour Ferries are drawn in code (canvas and inline SVG) and contain no image, font, script or data from anyone else. Harbour Ferries is not a real operator: its routes, vessels and every figure are invented. The messages in the three chats were written for the demos; opening one calls no model.

Orrery is drawn in code with WebGL and embeds surface maps of Venus, Earth, Mars, Jupiter, Saturn, Neptune and twenty moons, downscaled and in places edited, from NASA's repository `github.com/nasa/NASA-3D-Resources` (folder `Images and Textures`, commit `11ebb4ee043715aefbba6aeec8a61746fad67fa7`), whose README says of its assets: "These assets are free and without copyright." Each map's own credit line, source page and status are in the second table below. NASA's name is used to identify the maps only and implies no endorsement. Mercury, Uranus, the Sun, both ring systems and Earth's clouds are generated in code, and the far side of the Moon is not a real map. The figures in its information panels were checked against NASA's planetary fact sheets and NASA Science pages in November 2026 (the page and wording behind each are in `backend/app/demos/solar-system/files/FIGURES.md`), and the page lists the credit line of each map in its own Credits panel. The page's source (template, build script and map data) is in `tools/demos/orrery/`.

### Images used by the demo chats

Northern Light and Harbour Ferries use no image. Orrery embeds the 26 files below (six planet maps and twenty moon maps), and no other image from anyone else. All 26 come from the folder `Images and Textures` of `github.com/nasa/NASA-3D-Resources` at commit `11ebb4ee043715aefbba6aeec8a61746fad67fa7`, and each is published on NASA Science's 3D Resources catalogue (`https://science.nasa.gov/3d-resources/`), where its credit line was read on 15 November 2026. They are not all photographic: Venus is a radar map with filled gaps, and the Saturn, Neptune and Titan textures are painted or concept art, as their pages say. Status: NASA content, not subject to copyright in the United States (NASA media guidelines, `https://www.nasa.gov/nasa-brand-center/images-and-media/`: NASA content "generally are not subject to copyright in the United States" and "NASA should be acknowledged as the source of the material"). The repository's README says "These assets are free and without copyright", and its `meta.json` lists the licence of the repository as "NASA Open Source Agreement Version 1.3"; no map page states a licence of its own. Maps whose credit names the USGS are work of a US federal agency, which states that its own content is in the US public domain (`https://www.usgs.gov/information-policies-and-instructions/copyrights-and-credits`). Credit lines are given exactly as each page gives them; where a page gives none (Venus, Saturn, Titan and the six Saturn moons) none is invented, and JPL's own map tables (`https://maps.jpl.nasa.gov/tmaps/`) list the owner of those maps as JPL/Caltech (Caltech/JPL/USGS for the moons). The README credits NASA Ames, Goddard, JPL (including the JPL Solar System Simulator) and Johnson as contributors and does not credit individual files. Each file was downscaled and re-encoded as JPEG and embedded in the page as a data URI; no original file is distributed. The same list ships with the demo as `backend/app/demos/solar-system/files/CREDITS.md`.

| Body | Source file in `Images and Textures/` | Embedded as | Changes besides resizing |
| --- | --- | --- | --- |
| Earth | `Earth (A)/Earth (A).jpg` | 1024x512 colour | none. This is a shaded-relief colour map without clouds; the clouds on the page are generated |
| Mars | `Mars/Mars.jpg` | 1024x512 colour | none |
| Venus | `Venus/Venus.jpg` | 1024x512 colour | none (radar map of the surface) |
| Jupiter | `Jupiter/Jupiter.jpg` | 1024x512 colour | enlarged from 720x360 |
| Saturn | `Saturn/Saturn.jpg` | 1024x512 colour | enlarged from 720x360 |
| Neptune | `Neptune/Neptune.jpg` | 512x256 colour | none |
| Moon | `Moon/Moon.jpg` | 512x256 colour | the source is a photo of the near side as a disc, not a map. It is projected onto the near hemisphere; the far side, which the photo does not show, is a blurred mirror copy of the near side and is not real |
| Io | `Jupiter - Io (B)/Jupiter - Io (B).jpg` | 512x256 colour | none |
| Europa | `Jupiter - Europa/Jupiter - Europa.jpg` | 512x256 grey | tinted on the page; white no-data areas at the poles left as they are |
| Ganymede | `Jupiter - Ganymede/Jupiter - Ganymede.jpg` | 512x256 grey | white no-data areas filled with the average tone; tinted on the page |
| Callisto | `Jupiter - Callisto/Jupiter - Callisto.jpg` | 512x256 grey | white no-data areas filled with the average tone; tinted on the page |
| Phobos | `Mars - Phobos/Mars - Phobos.jpg` | 256x128 grey | tinted; drawn as a squashed sphere |
| Deimos | `Mars - Deimos/Mars - Deimos.jpg` | 256x128 grey | tinted; drawn as a squashed sphere |
| Mimas, Enceladus, Tethys, Dione, Rhea, Iapetus | `Saturn - <name>/Saturn - <name>.jpg` | 256x128 grey | none; white areas in the source are unmapped regions |
| Titan | `Saturn - Titan/Saturn - Titan.jpg` | 256x128 colour | none |
| Miranda, Ariel, Umbriel, Titania, Oberon | `Uranus - <name>/Uranus - <name>.jpg` | 256x128 grey | the source maps cover the southern half only (black elsewhere); the black is filled with the average tone, so the northern half is blank; tinted on the page |
| Triton | `Neptune - Triton/Neptune - Triton.jpg` | 256x128 colour | the source covers one region (black elsewhere); the black is filled with the average tone |

Credit and source page for each map, copied from the NASA Science 3D Resources page of that map ("none on the page" means the page has no credit line):

| Body | Credit line on the page | Source page | What the page says it is | Status |
| --- | --- | --- | --- | --- |
| Earth | USGS & NASA/Jet Propulsion Laboratory | https://science.nasa.gov/3d-resources/earth-a/ | "Nice topography-like map colored by land and ocean from the USGS." | NASA content, not subject to copyright in the United States (NASA media guidelines); USGS work is in the US public domain |
| Mars | NASA/Jet Propulsion Laboratory & Caltech | https://science.nasa.gov/3d-resources/mars/ | "From Viking images processed at the USGS." | NASA content, not subject to copyright in the United States (NASA media guidelines) |
| Venus | none on the page (JPL map table: owner JPL/Caltech) | https://science.nasa.gov/3d-resources/venus/ | "Stitched from Magellan RADAR imagery. Gaps filled in with global texture." | NASA content, not subject to copyright in the United States (NASA media guidelines) |
| Jupiter | JPL & Caltech | https://science.nasa.gov/3d-resources/jupiter/ | "From Voyager images." | NASA content, not subject to copyright in the United States (NASA media guidelines) |
| Saturn | none on the page (JPL map table: creator Don Davis, owner JPL/Caltech) | https://science.nasa.gov/3d-resources/saturn/ | "Fictional." An artist's texture, not a map of the planet | NASA content, not subject to copyright in the United States (NASA media guidelines) |
| Neptune | Don Davis & JPL/Caltech | https://science.nasa.gov/3d-resources/neptune/ | "Fictional. Texture created by Don Davis with cloud features." JPL's map table lists JPL/Caltech as owner | NASA content, not subject to copyright in the United States (NASA media guidelines) |
| Moon | Johnson Space Center | https://science.nasa.gov/3d-resources/apollo-11-view-of-the-moon/ | Apollo 11 photograph AS11-44-6665 (21 July 1969) of the entire nearside | NASA content, not subject to copyright in the United States (NASA media guidelines) |
| Io | USGS, JPL, & Caltech | https://science.nasa.gov/3d-resources/jupiter-io-b/ | "Mostly from the Caltech/JPL/USGS map with color taken from a recent Galileo global mosaic." | NASA content, not subject to copyright in the United States (NASA media guidelines); USGS work is in the US public domain |
| Europa | USGS, JPL, & Caltech | https://science.nasa.gov/3d-resources/jupiter-europa/ | "From the USGS, mosaicked with Voyager imagery." | NASA content, not subject to copyright in the United States (NASA media guidelines); USGS work is in the US public domain |
| Ganymede | USGS, JPL, & Caltech | https://science.nasa.gov/3d-resources/jupiter-ganymede/ | "From the USGS, mosaicked with Voyager imagery." | NASA content, not subject to copyright in the United States (NASA media guidelines); USGS work is in the US public domain |
| Callisto | USGS, JPL, & Caltech | https://science.nasa.gov/3d-resources/jupiter-callisto/ | "From the USGS, mosaicked with Voyager imagery." | NASA content, not subject to copyright in the United States (NASA media guidelines); USGS work is in the US public domain |
| Phobos | NASA/JPL/Solar System Simulator | https://science.nasa.gov/3d-resources/mars-phobos/ | "From Viking images processed at the USGS." | NASA content, not subject to copyright in the United States (NASA media guidelines) |
| Deimos | NASA/JPL/Solar System Simulator | https://science.nasa.gov/3d-resources/mars-deimos/ | "From Viking images, processed at the USGS." | NASA content, not subject to copyright in the United States (NASA media guidelines) |
| Mimas | none on the page (JPL map table: owner Caltech/JPL/USGS) | https://science.nasa.gov/3d-resources/saturn-mimas/ | "Mosaic from the Voyager imagery." | NASA content, not subject to copyright in the United States (NASA media guidelines) |
| Enceladus | none on the page (JPL map table: owner Caltech/JPL/USGS) | https://science.nasa.gov/3d-resources/saturn-enceladus/ | "Mosaic from the Voyager imagery." | NASA content, not subject to copyright in the United States (NASA media guidelines) |
| Tethys | none on the page (JPL map table: owner Caltech/JPL/USGS) | https://science.nasa.gov/3d-resources/saturn-tethys/ | "Mosaic from the Voyager imagery." | NASA content, not subject to copyright in the United States (NASA media guidelines) |
| Dione | none on the page (JPL map table: owner Caltech/JPL/USGS) | https://science.nasa.gov/3d-resources/saturn-dione/ | "Mosaic from the Voyager imagery." | NASA content, not subject to copyright in the United States (NASA media guidelines) |
| Rhea | none on the page (JPL map table: owner Caltech/JPL/USGS) | https://science.nasa.gov/3d-resources/saturn-rhea/ | "Mosaic from the Voyager imagery." | NASA content, not subject to copyright in the United States (NASA media guidelines) |
| Titan | none on the page (JPL map table: creator Seal, owner JPL/Caltech) | https://science.nasa.gov/3d-resources/saturn-titan/ | "Fictional. Titan concept with color from Voyager images." A concept texture, not a map of the surface | NASA content, not subject to copyright in the United States (NASA media guidelines) |
| Iapetus | none on the page (JPL map table: owner Caltech/JPL/USGS) | https://science.nasa.gov/3d-resources/saturn-iapetus/ | "Mosaic from the Voyager imagery." | NASA content, not subject to copyright in the United States (NASA media guidelines) |
| Miranda | USGS/Tammy Becker & JPL/Caltech | https://science.nasa.gov/3d-resources/uranus-miranda/ | "From the USGS; a mosaic using Voyager imagery." | NASA content, not subject to copyright in the United States (NASA media guidelines); USGS work is in the US public domain |
| Ariel | USGS/Tammy Becker & JPL/Caltech | https://science.nasa.gov/3d-resources/uranus-ariel/ | "From the USGS; a mosaic using Voyager imagery." | NASA content, not subject to copyright in the United States (NASA media guidelines); USGS work is in the US public domain |
| Umbriel | USGS/Tammy Becker & JPL/Caltech | https://science.nasa.gov/3d-resources/uranus-umbriel/ | "Mosaicked with Voyager imagery." | NASA content, not subject to copyright in the United States (NASA media guidelines); USGS work is in the US public domain |
| Titania | USGS/Tammy Becker & JPL/Caltech | https://science.nasa.gov/3d-resources/uranus-titania/ | "Mosaicked with Voyager imagery." | NASA content, not subject to copyright in the United States (NASA media guidelines); USGS work is in the US public domain |
| Oberon | USGS/Tammy Becker & JPL/Caltech | https://science.nasa.gov/3d-resources/uranus-oberon/ | "From the USGS; a mosaic using Voyager imagery." | NASA content, not subject to copyright in the United States (NASA media guidelines); USGS work is in the US public domain |
| Triton | USGS/Tammy Becker & JPL/Caltech | https://science.nasa.gov/3d-resources/neptune-triton/ | "Stitched together from limited Voyager imagery by the USGS." | NASA content, not subject to copyright in the United States (NASA media guidelines); USGS work is in the US public domain |

Two page quirks: the Miranda page lists its download under the name `Uranus - Ariel.jpg`, and the Oberon page shows Ariel's JPEG size; the files in the repository are `Uranus - Miranda.jpg` (313.74 KB) and `Uranus - Oberon.jpg` (50.01 KB), and the embedded maps were compared with them.

## Third-party packages

| Package | Licence | Where |
| --- | --- | --- |
| Inter (`@fontsource/inter`) | OFL-1.1 | frontend fonts |
| JetBrains Mono (`@fontsource/jetbrains-mono`) | OFL-1.1 | frontend fonts |
| Vite, TypeScript | MIT, Apache-2.0 | frontend build only |
| pytest 9.1.1 (`backend/requirements-test.txt`) | MIT | the test suite in `backend/tests` and CI only, never shipped; it also uses httpx, listed below |
| Playwright for Python 1.63.0 | Apache-2.0 | the window smoke in `frontend/tests/window` and CI only, never installed in the app |
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
| tauri-plugin-single-instance 2.5.5 | Apache-2.0 OR MIT | desktop shell: a second launch focuses the running window; every crate it needs was already in `src-tauri/Cargo.lock` |
| Other Python packages frozen into the engine | MIT: annotated-doc, annotated-types, anyio, attrs, charset-normalizer, docstring-parser, et-xmlfile, filelock, h11, httptools, jiter, jsonschema, jsonschema-specifications, mcp-types, pydantic-core, pyjwt, pyyaml, referencing, rpds-py, truststore, typing-inspection, watchfiles; MIT-0: cffi; MIT OR Apache-2.0: sniffio, uvloop; BSD-3-Clause: click, fsspec, httpcore, httpcore2, httpx2, idna, protobuf, python-dotenv, sse-starlette, websockets; Apache-2.0: flatbuffers, opentelemetry-api; Apache-2.0 OR BSD-2-Clause: packaging; Apache-2.0 OR BSD-3-Clause: cryptography (its wheel bundles OpenSSL 3, Apache-2.0); PSF-2.0: typing-extensions and the CPython runtime | read from the installed metadata of the desktop requirements, 2026-10-23 |

## FFmpeg source offer

The FFmpeg libraries in Format's desktop release are the unmodified 8.0.3 release named above, built by `setup/build_lgpl_av` (Linux and macOS) or `setup/build_lgpl_av.bat` (Windows, which runs `setup/build_lgpl_ffmpeg_msys2` in MSYS2 with Visual Studio's compiler) with the configure line written there. Every GitHub release of Format attaches that exact source tarball beside the bundles (`setup/ffmpeg_source`). The libraries stay separate shared files inside the frozen engine, and Format's own source and build scripts are public, so a person can build the engine against their own FFmpeg (set `LGPL_FFMPEG_PREFIX` to it before `setup/build_lgpl_av` and `./build_app`).

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
