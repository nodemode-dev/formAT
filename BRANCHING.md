# Branching

## Branches

| Branch | Holds |
| --- | --- |
| `main` | released work only; every commit on it builds, and every release is a `compile_vX.Y.Z` branch cut from it |
| `feat/<short-name>` | one feature or gap, branched from `main` |
| `fix/<short-name>` | one fix, branched from `main` (or from a release tag for a patch) |
| `docs/<short-name>` | documentation only |

Format has been built on `main` so far, one release at a time, with each release's commits checked before they were made. Branches are for work that spans sessions or people.

## From branch to main

1. Keep the branch to one change; rebase on `main` before merging rather than merging `main` in.
2. Run the checks in [`.docs/wiki/Checks.md`](.docs/wiki/Checks.md) on the branch's build.
3. Merge with a fast-forward when the history is clean, or squash into Conventional Commits (`feat(engine)`, `feat(window)`, `fix(...)`, `docs`, `chore(release)`).
4. Release from `main`: bump the version, update the changelog, commit `chore(release): vX.Y.Z`, then push the branch `compile_vX.Y.Z` cut from that commit.

## Tags

**Releases.** Format builds nothing in this repository. After the version bump lands on main, push a branch `compile_vX.Y.Z` cut from that commit. CI runs on it, and formcompiler (`nodemode-dev/formcompiler`) picks it up on its next 8-hourly watch run, or at once when its watch is run by hand. It builds macOS, Linux and Windows bundles and opens a draft release `format-vX.Y.Z` on formcompiler's release page. Review the draft, then publish it there. The compile branch is kept as the record of what was built. Patch releases (`vX.Y.Z+1`) carry fixes only; minor releases carry a DEV_PLAN phase or part of one.

## Authorship

Every commit has one author and committer, `nodemode-ai <mackin@nodemode.ai>`, and no `Co-Authored-By` or `Claude-Session` trailers.
