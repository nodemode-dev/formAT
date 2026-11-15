# Contributing to FormAT

Thank you for helping. FormAT aims to be a free chat and agent workspace that runs on
your own computer, on your own key and with no account, and it gets there through
real use and real contributions.

## Where to start

- **Use it and report what goes wrong.** A clear bug report, with steps, the version
  and your platform, is one of the most useful things you can give.
- **Look at the open issues.** Comment on one before starting larger work, so nobody
  builds the same thing twice.
- **Documentation** is welcome: the manual for people using FormAT is in `docs/`,
  and the developer wiki's source is in `.docs/wiki`. FormAT's interface is in
  English only for now.

## Setting up

Clone the repository and run `./format install`, then `./format` (or
`.\format.bat install` and `.\format.bat` on Windows, never a bare `format`: that
name is Windows' disk formatter). The first creates the engine's Python
environment and installs the interface's packages; the second starts the engine on
127.0.0.1:8490 and the web interface on http://localhost:5490. `./format help` lists
every command, and the README's "Run it from source" has the details and the
requirements.

The code lives in:

| Folder | What is there |
| --- | --- |
| `backend/app` | the engine (Python, FastAPI): commands, chat, tools, artifacts, devices, the MCP server |
| `backend/tests` | the engine tests |
| `frontend/src` | the interface (TypeScript, Vite) |
| `frontend/tests/window` | the window smoke test |
| `src-tauri` | the desktop shell (Rust, Tauri) |
| `native/format-render` | the optional Rust renderer (off by default) |
| `setup` | install, boot, build, packaging, CLI and agent scripts |
| `docs` | the manual for people using FormAT |
| `.docs/wiki` | the developer wiki's source |

## Before you open a pull request

Run the same checks CI runs:

```sh
(cd frontend && npm ci && npm audit && npm run typecheck && npm run build)
(cd backend && pip install -r requirements.txt -r requirements-test.txt \
  && python -m compileall -q app format_engine.py \
  && python -m pytest tests -q -p no:cacheprovider)
python -m pytest frontend/tests/window -q -p no:cacheprovider
```

The window smoke tests need `pytest` and `playwright` with Chromium installed, and a
built interface. CI also boots the engine and probes `/api/health`, checks the shell
scripts with `bash -n`, and refuses an em dash or an emoji in tracked Markdown. The
wiki's [Checks](.docs/wiki/Checks.md) page says what else every interface change is
checked for.

- Keep each pull request to one change. The engine tests are in `backend/tests`.
- Write commit subjects the way the history does, in Conventional Commits:
  `feat(engine): ...`, `feat(window): ...`, `fix(...)`, `docs(...)` (see
  [BRANCHING.md](BRANCHING.md)). Leave the version alone; a maintainer bumps it when
  releasing.
- A feature is a command in `backend/app/engine/cmd_*.py`; the window, the CLI and
  the MCP server only dispatch it. After adding, renaming or re-describing a command,
  add it to `GUIDE` in `backend/app/agent_guide.py` and run `./format agents sync`,
  which regenerates the agent skills' references.
- Icons are inline `currentColor` SVG in `frontend/src/ui/icons-ft.ts`, and `z-index`
  comes only from the `--z-*` tokens in `frontend/src/styles/tokens.css`.
- Other vendors' product names appear only to name a file format or compatibility.
  Never copy vendor help text or icons.
- Every new dependency, binary, model, font or data file gets a row in `NOTICE.md`
  before it is used.

## Maintainers

FormAT is maintained by:

- the [nodemode-dev](https://github.com/nodemode-dev) organisation on GitHub
- [@nodemode-ai](https://github.com/nodemode-ai)
- [@gbarnai](https://github.com/gbarnai)

Reach them through issues and pull requests.

## How changes land

Only a maintainer pushes to `main`. Everyone else forks the repository and opens a pull request into `main`. A pull request merges when all five checks pass on an up-to-date branch and a maintainer has approved it after its last push.

## Releases

A release is a version, and only a maintainer makes one: after the version is bumped on
`main`, a maintainer cuts a `compile_vX.Y.Z` branch, and formcompiler
(`nodemode-dev/formcompiler`) builds every platform and publishes them together. No
push from a contributor starts a release. See [BRANCHING.md](BRANCHING.md) and the
wiki's [Releasing](.docs/wiki/Releasing.md) page.

## Licensing

FormAT is licensed under the Apache License 2.0 ([LICENSE](LICENSE), SPDX
`Apache-2.0`). By contributing, you agree that your contribution is licensed under the
same terms. Only add code you have the right to contribute, and name any third-party
code and its licence in the pull request.

## Patents and other people's IP

Some features are deliberately not built, or were taken out, because they come too close to someone else's patent, trademark, copyright or design. The maintainers hold that line with counsel; contributors do not decide it, and nobody here redesigns a feature on their own reading of a patent. This is engineering diligence, not legal advice.

### Features this project will not implement

The repository records none yet. The rules below apply to every contribution, and a feature the maintainers decline for patent, trademark or copyright reasons is listed here, with their written decision, before it counts as declined.

### Rules for every contribution

- Patents: do not add a feature, or a dependency that provides one, that reproduces a method you know to be patented. If you are unsure, open an issue that describes what the feature does, not which patent it resembles. Patent numbers stay out of code, commits, comments, logs and changelogs.
- Trademarks: other vendors' product and feature names appear only to name a file format or compatibility ("opens <format> files", "for use with"). No command, menu, panel, tool, preset, template, theme or agent tool takes another product's feature name, and no text says "like X" or "the way X does it". Describe what the feature does.
- Anthropic's marks: Claude, claude.ai and Anthropic are Anthropic's trademarks. Use them only to say FormAT runs on the Claude API with the person's own key, never to describe FormAT as a copy of claude.ai, and never use Anthropic's logo, wordmark, fonts or stylesheets. The notice in `README.md` and `NOTICE.md` stays.
- Copyright: never copy another product's help, tooltip, dialog or documentation text (link to it instead); never trace or import vendor icons; never bundle vendor templates, themes, presets, brushes, swatches, LUTs, materials, sample files, sound libraries, stock media or fonts; colour-book names only when reading a person's file. Compatibility layers carry names and signatures only. Test fixtures come from this repository's own scripts.
- Licences: every new dependency, binary, model, font, profile or data file gets a row in `NOTICE.md` before it is used. GPL stays outside the distributed bundle, AGPL nowhere, LGPL dynamically linked and replaceable, MPL files unedited. CC BY credited, CC BY-SA only unmodified, CC NC and ND never. Models with gated or non-commercial terms are optional downloads, never bundled.

## Conduct

Everyone taking part follows the [code of conduct](CODE_OF_CONDUCT.md). Security
problems go through [SECURITY.md](SECURITY.md), never a public issue.
