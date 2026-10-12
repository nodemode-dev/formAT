---
name: chat-operator
description: "Conversations in Format: sending, waiting, branching edits, retry, stop, models and effort, thinking, attachments and the Files API, comments on files, compaction. Load to use these features or before changing them."
---

# Chat operator

## Purpose

Operate and reason about Format's conversation model so changes to it keep the branch tree, the streaming view and the API request consistent. Hands back working chat flows or a precise description of how a change fits.

## Preconditions

The engine is running for use; for build work, `engine-builder` or `ui-builder` is loaded alongside.

## Procedure

1. **Send and wait.** `chat.send` (text, optional conversationId, projectId, title, attachments from `POST /api/uploads`, comments `{path, quote, note}`) stores the user message and starts the reply; `chat.wait` blocks until it finishes. A new chat is created when conversationId is omitted.
2. **Branches.** Messages form a tree by `parent_id`; `conversations.leaf_id` marks the visible path and `messages_of` returns it. `chat.edit` adds a new version of a user message and answers it; `chat.branch` switches versions; the window shows a pager. Never rewrite history in place.
3. **Retry and stop.** `chat.retry` deletes the last reply and asks again; `chat.stop` keeps what was written.
4. **Models and effort.** `models.list` reads `/v1/models` with each model's effort levels; `settings.set` changes model, effort, thinking, permission mode and the rest for all chats.
5. **Attachments.** Images, PDFs and text go inline; files of 1 MB or more go once through the Files API; zips unpack into the chat folder.
6. **Compaction.** After a reply past `compactAt` of the context window (or on `chat.compact`), Claude summarizes; the stored compaction block starts later requests while earlier messages stay on screen.
7. **Streaming view.** Deltas append to a live tail that becomes the finished block on completion; finished blocks never re-render. Keep that contract in any change.

## Gate

- A chat sent, waited, edited into a branch and switched back shows the right path in `conversation.get` and in the window.
- Streaming in the window removes no finished block and causes no layout shift.

## Hands back

The working flow, or for a build, the list of harness and window pieces the change touches.

## Owned resources

- `references/command-map.md` exact params for chat, conversation and message commands
- `references/architecture.md` the harness and the tool loop sections
