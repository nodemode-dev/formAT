# Releasing

## Version

`v*.*.*`. Bump all of these together:

- `backend/app/__init__.py` (`__version__`)
- `frontend/src/version.ts` (`VERSION`)
- `frontend/package.json` (`version`) and both `version` fields at the top of `frontend/package-lock.json`
- the README badge
- the `Current build version` and `Last updated` lines of both HASHOUT logs

## Before committing

1. HASHOUT entries for every file touched (refers-to, kind, logged).
2. `CHANGELOG.md`: what changed for people using Format, then an Engine line with new commands and the command count.
3. README, CLAUDE.md, NOTICE.md (any new dependency with its licence) and the manual in `docs/` where the change shows.
4. `./format agents sync` if any command changed.
5. The checks in [Checks](Checks.md).

## Commits and tags

Conventional Commits, authored as nodemode-ai:

```bash
git -c user.name=nodemode-ai -c user.email=mackin@nodemode.ai commit -m "feat(engine): ..." -m "body"
```

Usually three per release: `feat(engine)`, `feat(window)` and `chore(release): vX.Y.Z`, then `git tag vX.Y.Z`. See [`BRANCHING.md`](../../BRANCHING.md).

## Hand-back

Each release goes back as a repository zip (with `.git`, without `node_modules`, `dist`, `venv`, `data`, `.env`, `target`, `__pycache__`), the planning sidecar zip, the parity tracker and screenshots. The parity tracker keeps two rows, claude.ai and the current build, regraded in place; the score history lives in BUILD_NOTES.
