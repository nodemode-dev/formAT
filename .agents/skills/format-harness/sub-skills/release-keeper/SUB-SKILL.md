---
name: release-keeper
description: "Releasing Format: version bumps in every place, Conventional Commits as nodemode-ai with no session trailers, compile_v*.*.* branches, CHANGELOG, README status, CLAUDE.md, the HASHOUT logs, the planning sidecar, the two-row parity tracker, and the repo and sidecar zips handed back each turn. Load when cutting a version."
---

# Release keeper

## Purpose

Turn finished, gated work into a reviewable release. Hands back tagged commits, the zips, the tracker, and a ledger.

## Preconditions

The director's gate holds for every change in the release.

## Procedure

1. **Version** everywhere at once: `backend/app/__init__.py`, `frontend/src/version.ts`, `frontend/package.json`, both version fields in `frontend/package-lock.json`, the README badge, and the crate's `Cargo.toml` when the crate changed. Patch for fixes, minor for features, a new minor per DEV_PLAN phase.
2. **Docs.** CHANGELOG entry (what the person gets, then an Engine line with new commands and the count), README status, CLAUDE.md when architecture changed, HASHOUT header lines.
3. **Commits.** Conventional Commits, one per side (engine, frontend, native), then `chore(release): v[x.y.z]`. Author `nodemode-ai <mackin@nodemode.ai>` via `git -c user.name=nodemode-ai -c user.email=mackin@nodemode.ai`. Bodies say what changed and how it was verified, with numbers, and carry no Co-Authored-By or Claude-Session trailers.
4. **Compile branch.** After the version bump lands on main, push `compile_v[x.y.z]` cut from that commit; formcompiler (`nodemode-ai/formcompiler`) builds and drafts the release `format-v[x.y.z]`.
5. **Sidecar.** DEV_PLAN ticks with status, BUILD_NOTES version entry (commits, sources read, verification, found and fixed, parity), root HASHOUT sprint row.
6. **Tracker.** The parity page has exactly two rows, claude.ai and the current build; regrade the current row in place, relabel it, update its text; score history lives only in BUILD_NOTES.
7. **Hand back.** Repo zip with `.git` and without node_modules, dist, venv, data, .env, target and caches; the sidecar zip; the tracker; screenshots.

## Gate

- Working tree clean after the release commit, the compile branch cut from HEAD, versions identical in every place, no em dash in any changed markdown, and the zips list no excluded folders.

## Hands back

Commit ids, the compile branch, the zip paths, and the parity score.

## Owned resources

- `EVALS.json` includes a release evaluation to check this procedure
