# Chatting

## The composer

Type and press Enter to send (Shift+Enter for a new line; Settings, Account can switch this to Mod+Enter). While Claude replies, the send button becomes Stop. Messages you send during a reply wait in a queue above the composer; Send now stops the reply and sends.

Under the box, left to right:

- **+** opens the menu: Add files or photos, Skills, Connectors, Research, and Create (Document, Spreadsheet or Slides).
- **Microphone**: dictation (see below).
- **Model and effort**: the model menu lists your key's models with a short description; Effort goes from Low to Max where the model supports it. Show thinking displays Claude's thinking summaries above each reply.
- **Permission mode**: Ask, Allow all or Plan, and Allow for this chat for the open chat only (see [Tools and approvals](tools-and-approvals.md)).
- **/** anywhere in a message (at the start or after a space) opens the command menu above the composer: Commands (add files, Research, create a document, spreadsheet or slides, Summarize earlier messages, Manage skills), your Skills, and each plugin's commands under its name. Keep typing to filter by name, description or plugin; Up and Down move, Enter or Tab picks, Escape closes. A skill you pick becomes a pill in the composer (click it, or Backspace at the start of the message, to remove it) and loads for that message; the sent message shows it as a chip.

The reply is followed to the bottom while it streams, approval cards included. Scroll up and it stays where you are; the arrow above the composer, or sending a message, follows again. Your messages sit on the right, Claude's replies on the left. Nothing in a chat is ever wider than its column, on any screen: long commands, paths, links and code lines wrap, and an approval card's buttons wrap under its question.
- The context meter shows how full the conversation is (hidden on screens under 480 px wide, together with the effort label; the effort is still in the model menu).

## Attachments

Pick, paste, or drag files from your desktop and drop them anywhere on the chat: a card says "Drop files to add them to the chat" while they are over it. Images and PDFs go to Claude as such; text and code as text; a .zip as its list of files with the readable ones included. Files of 1 MB or more are uploaded once through Anthropic's Files API and referred to after that.

Each file shows as a square tile, in the composer as soon as you add it and above your message once it is sent: a picture for images (SVG too), the first frame and length for a video, a waveform and length for audio, the first lines for text and code, and the name and type for PDFs, zips and other files. Click a tile (or press Enter on it) to open it full screen: images fit the window and a click shows them at full size, video and audio play with their controls, Markdown is rendered, code is coloured, a PDF opens in its own viewer, and long text files show their first 2 MB. The arrow keys move between the message's files, the download button saves the original, and Esc closes the view.

## Dictation

Click the microphone, speak, click again. Settings, Account, Dictation engine chooses who turns speech into text:

| Engine | Needs | Notes |
| --- | --- | --- |
| ElevenLabs Scribe v2 | an ElevenLabs key in Settings, API keys | the most accurate; audio goes to ElevenLabs |
| Local Whisper large-v3-turbo | `./format install-voice` (downloads the model once, about 1.6 GB) | runs on your computer; nothing leaves it |
| OpenAI | an OpenAI key | audio goes to OpenAI |
| The browser | Chrome, Edge or Safari | the browser's own recognition, words appear as you speak |

Automatic (the default) uses the first of Scribe v2, local Whisper and OpenAI that is set up, falling through to the next if one fails, and the browser's recognition when none is. The microphone's tooltip says which engine is recording.

## Editing, branches, retry

Hover a message you sent and choose Edit to change it; Claude answers again and the old version stays as a branch, with a pager (1 of 2) to move between versions. Retry asks again for the last reply. Copy copies a reply as Markdown.

## Long chats

When a chat nears its model's context window, FormAT summarizes the earlier part (compaction) and carries on. You can also run Summarize earlier messages from the palette. Settings, Long chats sets when it happens or turns it off.

## Find in page

Mod+F (or Find in page in the palette) searches the open chat or page. Every match is highlighted; Enter and Shift+Enter step through them, and a match inside a folded group of tool steps opens that group. Esc closes it.

## Search chats

The palette (Mod+K) finds chats by title at once and by message text after three characters.

## Research

Choose Research in the + menu. A pill beside the microphone shows it is on for the messages that follow (click it to turn it off). Claude plans the questions, searches and reads many sources, and writes a report with citations; the reply's footer says "research".

## Sources

When Claude answers from a web search, a page it read or a document you attached, each claim it backs with a source carries a small chip after it: the site's name for a web page (click it to open the page), or the document's title and page. Hover a chip to see the source's title and the passage Claude quoted. A claim backed by more than two sources shows two chips and "+N"; hover it for the rest. The chips appear as the reply streams, and Copy leaves them out.

## Create: documents, spreadsheets and slides

Choose Create in the + menu and pick Document, Spreadsheet or Slides. The pill applies to your next message only. Claude answers with that kind of artifact beside the chat; see [Artifacts and documents](artifacts-and-documents.md).
