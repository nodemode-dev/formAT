# Branching

## Branches

| Branch | Holds |
| --- | --- |
| `main` | released work only; every commit on it builds, and every release is a tag on it |
| `feat/<short-name>` | one feature or gap, branched from `main` |
| `fix/<short-name>` | one fix, branched from `main` (or from a release tag for a patch) |
| `docs/<short-name>` | documentation only |

Format has been built on `main` so far, one release at a time, with each release's commits checked before they were made. Branches are for work that spans sessions or people.

## From branch to main

1. Keep the branch to one change; rebase on `main` before merging rather than merging `main` in.
2. Run the checks in [`.docs/wiki/Checks.md`](.docs/wiki/Checks.md) on the branch's build.
3. Merge with a fast-forward when the history is clean, or squash into Conventional Commits (`feat(engine)`, `feat(window)`, `fix(...)`, `docs`, `chore(release)`).
4. Release from `main`: bump the version, update the changelog, commit `chore(release): vX.Y.Z`, tag `vX.Y.Z`.

## Tags

Every release is an annotated or lightweight tag `vX.Y.Z` on `main`. Patch releases (`vX.Y.Z+1`) carry fixes only; minor releases carry a DEV_PLAN phase or part of one.

## Authorship

Commits are made as `nodemode-ai <mackin@nodemode.ai>`. Work done with Claude ends its commit body with the `Co-Authored-By` and `Claude-Session` lines.
