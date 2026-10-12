---
name: project-keeper
description: "Projects and memory in Format: project instructions and knowledge files shared by the chats in a project, moving chats in and out, and Claude's memory tool on a local folder, general or per project. Load to set up shared context or change how it reaches Claude."
---

# Project keeper

## Purpose

Give chats durable context: a project's instructions and files, and what Claude remembers across chats. Hands back a configured project or memory, or a verified change.

## Preconditions

None for use. For build work, `engine-builder` (harness) and `ui-builder` (Projects page, Settings memory section).

## Procedure

1. **Projects.** `project.create` (name, description, instructions), `project.addFile` with an upload id, `project.removeFile`, `project.update`, `project.delete` (chats are kept). Start a chat in a project with `chat.send` projectId, or move one with `conversation.move`.
2. **How it reaches Claude.** `projects.context` is read at the start of each reply: instructions go into the system prompt, knowledge files at the start of the first user turn (text inline, images and PDFs as blocks).
3. **Memory.** With setting `memory` on, the API's memory tool (`memory_20250818`) works on `data/memory/general` or `data/memory/projects/[id]`; `memory.list`, `memory.read`, `memory.write`, `memory.delete` edit it. Deleting a project deletes its memory.
4. **Window.** The Projects page renders tiles and chat rows keyed; the memory section sits last in Settings so its late-arriving list moves nothing.

## Gate

- A project chat's request carries the instructions and the files (check the mock's last request), and a memory written in one chat is read in the next.

## Hands back

Project or memory ids and what each chat will now receive.

## Owned resources

- `references/command-map.md` project and memory commands
- `references/architecture.md` the harness section
