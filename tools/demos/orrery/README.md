# Orrery: source of the demo page

`backend/app/demos/solar-system/artifact.html` is built from the files in this folder. Edit the template here, never the built page.

| File | What it is |
| --- | --- |
| `orrery.template.html` | the whole page (HTML, CSS and the WebGL script) with one placeholder, `/*__TEX__*/`, for the maps |
| `textures.json` | the 26 NASA maps, downscaled and re-encoded, as JPEG data URIs (key to `data:` string) |
| `build.py` | joins the two |
| `prep_textures.py` | makes `textures.json` from a clone of NASA's repository (only needed to change a map) |

## Rebuild the shipped page

From the repository root, with any Python 3 (standard library only):

```bash
python3 -I tools/demos/orrery/build.py backend/app/demos/solar-system
```

This writes `backend/app/demos/solar-system/artifact.html`. The blocks marked `/*T[*/ ... /*]T*/` in the template are test hooks (`window.__orrery`, `window.__lockq`, `window.__force2d`, frame counters); the shipped build leaves them out and asserts that no `window.__` name remains. A build that keeps them, for driving the page from a script, is `python3 -I tools/demos/orrery/build.py /some/path/artifact-test.html test`.

The engine refreshes a seeded demo chat from the shipped folder when the folder's content has changed and the person has not changed that chat, so a rebuilt page reaches existing data folders at the next start (`backend/app/engine/demos.py`, `update_if_stale`).

## Change a map

`prep_textures.py` needs Pillow and a clone of `https://github.com/nasa/NASA-3D-Resources` at the commit named in `NOTICE.md`:

```bash
python3 -I tools/demos/orrery/prep_textures.py /path/to/NASA-3D-Resources /path/to/output-folder
```

It writes `textures.json` and a contact sheet to the output folder; copy `textures.json` here. With Pillow 12.3.0 the regenerated file is byte for byte the one in the repository; another Pillow version may encode the JPEGs differently. Any change to a map also changes the credit tables in `NOTICE.md` and `backend/app/demos/solar-system/files/CREDITS.md`, and the `MAPS` list of the page's Credits panel in the template.

## Facts and credits

- Every figure and sentence of fact in the template is recorded, with the NASA page it comes from and the date it was read, in `backend/app/demos/solar-system/files/FIGURES.md`. Change the table when a figure changes.
- The credit line and source page of each map are in `NOTICE.md`, in `files/CREDITS.md`, and in the template (`MAPS`); the three must carry the same text.
- The recorded chat that goes with the page is `backend/app/demos/solar-system/chat.json`; its reply describes what the page does, so change it with the page.
