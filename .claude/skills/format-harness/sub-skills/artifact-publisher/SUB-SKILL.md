---
name: artifact-publisher
description: "Artifacts in Format: publishing HTML pages from Claude or from an agent, versions, the sandboxed artifact panel beside the chat, the Artifacts gallery, code view, download and pop out, and the files pane that previews a chat's folder. Load to publish or revise pages, or to change these surfaces."
---

# Artifact publisher

## Purpose

Put pages in front of the person the way claude.ai does, safely sandboxed and versioned, and keep the panel flicker-free. Hands back a published artifact with its id and version, or a verified change.

## Preconditions

None for publishing. For build work, `engine-builder` and `ui-builder`.

## Procedure

1. **Publish.** Claude uses the `publish_artifact` tool; an agent or the CLI uses `artifact.publish` (conversationId, title, html, optional artifactId for a new version). Both go through `engine/artifacts.py` and publish `artifact.changed`, which updates an open gallery live.
2. **Serve.** Versions are served at `/api/artifacts/[id]/v/[n]` with a CSP that allows the common CDNs and, only when the setting allows, other origins. The iframe never gets allow-same-origin.
3. **Panel.** `artifact-panel.ts` double-buffers two frames and swaps only after the new page loads; the panel opens on click, after the first page has loaded, so the chat never reflows without input. The version picker takes room from the title so Preview and Code stay put.
4. **Gallery.** `views.ts` lists artifacts across chats; open, copy link, delete.
5. **Files pane.** `files.list` and `files.read` show the chat folder; previews swap in after loading, the back button keeps its slot, comments on a block go with the next `chat.send`.

## Gate

- A page published and versioned shows in the chat card, the panel and the gallery; switching versions shows no blank frame; layout shift 0.

## Hands back

Artifact id, version and URL, or the verified change.

## Owned resources

- `references/tool-map.md` the artifact tools
- `references/architecture.md` the artifacts and files rows
