# Chatting

## The composer

Type and press Enter to send (Shift+Enter for a new line; Settings, Account can switch this to Mod+Enter). While Claude replies, the send button becomes Stop. Messages you send during a reply wait in a queue above the composer; Send now stops the reply and sends.

Under the box, left to right:

- **+** opens the menu: Add files or photos, Skills, Connectors, Research, and Create (Document, Spreadsheet or Slides).
- **Microphone**: dictation (see below).
- **Model and effort**: the model menu lists your key's models with a short description; Effort goes from Low to Max where the model supports it. Show thinking displays Claude's thinking summaries above each reply.
- **Permission mode**: Ask, Auto or Plan (see [Tools and approvals](tools-and-approvals.md)).
- The context meter shows how full the conversation is.

## Attachments

Pick, drag, drop or paste files. Images and PDFs go to Claude as such; text and code as text; a .zip as its list of files with the readable ones included. Files of 1 MB or more are uploaded once through Anthropic's Files API and referred to after that.

## Dictation

In Chrome, Edge and Safari the browser's own speech recognition writes as you speak. In Firefox the microphone records and Format transcribes: locally after `./format install-voice`, or through OpenAI with an OpenAI key in Settings, API keys. If neither is set up, Format says which to add.

## Editing, branches, retry

Hover a message you sent and choose Edit to change it; Claude answers again and the old version stays as a branch, with a pager (1 of 2) to move between versions. Retry asks again for the last reply. Copy copies a reply as Markdown.

## Long chats

When a chat nears its model's context window, Format summarizes the earlier part (compaction) and carries on. You can also run Summarize earlier messages from the palette. Settings, Long chats sets when it happens or turns it off.

## Find in page

Mod+F (or Find in page in the palette) searches the open chat or page. Every match is highlighted; Enter and Shift+Enter step through them, and a match inside a folded group of tool steps opens that group. Esc closes it.

## Search chats

The palette (Mod+K) finds chats by title at once and by message text after three characters.

## Research

Choose Research in the + menu. A pill beside the microphone shows it is on for the messages that follow (click it to turn it off). Claude plans the questions, searches and reads many sources, and writes a report with citations; the reply's footer says "research".

## Create: documents, spreadsheets and slides

Choose Create in the + menu and pick Document, Spreadsheet or Slides. The pill applies to your next message only. Claude answers with that kind of artifact beside the chat; see [Artifacts and documents](artifacts-and-documents.md).
