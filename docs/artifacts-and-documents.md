# Artifacts and documents

## Artifacts

When Claude publishes a page, an app or a small tool, the reply shows a card. Open puts it beside the chat. The panel has:

- **Preview** and **Code** (highlighted), with **Copy**.
- **Version** picker: each revision is a new version; the panel follows the latest unless you pick an older one.
- **Download** (an .html file), **Share** (see below) and **Open in a new tab**.

Pages run in a sandbox: they cannot read FormAT or your files, and they load scripts only from the common CDNs. Settings, Tools can let them load images and data from the internet.

The Artifacts page in the sidebar lists every artifact from every chat.

## Documents, spreadsheets and slides

Ask for one, or use Create in the + menu. They open beside the chat in their own view:

- **Documents** are written section by section: first an outline, then each section, so you watch the document fill in. Hover a section and choose Comment: your note joins your next message as a chip, and Claude revises that section.
- **Spreadsheets** show as a grid, with numbers right-aligned.
- **Slides** show one at a time, with arrows, the keyboard and Present (full screen).

**Export** in the panel's header saves a document as Word, PDF or Markdown; a spreadsheet as Excel or CSV; slides as PowerPoint or PDF.

## Share links

Share in the panel's header makes a read-only link to the latest version of the artifact, with Copy link, Open link and Stop sharing. While Other devices is off the link opens only on this computer; with it on, anyone on your network who has the link can open it. Stopped links answer "no longer shared". See [Other devices](other-devices.md).

## The chat's files

The folder button in the top bar lists every file in the chat's folder and previews images, PDFs, video, audio, Markdown, code and HTML. A file Claude changes while it is open updates in place. In a Markdown or code preview, hover a block or select text and choose Comment to send Claude a note about that passage.

## Outputs

The Outputs button (Mod+.) opens a floating card: Progress (Claude's plan), the files Claude sent you, each with its caption and a Download arrow, and Download all (one .zip of everything in the list, saved as the chat's title followed by "- all files.zip", so it is never confused with a zip that is itself one of the files), and Used in this session (your uploads, the searches, pages, commands and file changes).
