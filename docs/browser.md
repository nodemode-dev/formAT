# The built-in browser

Format has its own browser, separate from the one you use every day. You can browse in it, and Claude can use it when a task needs clicking through a site, filling in a form or a page that needs scripts or a sign-in.

## Install

```bash
./format install-browser
```

This installs Playwright and its Chromium into Format's engine. Restart Format afterwards.

In the desktop app the package is already inside; the first time you open the Browser pane it offers Install the browser, which downloads Chromium once (about 150 MB).

## Using it

The globe in the top bar opens the Browser pane beside the chat. Type a URL and press Enter. Then use the page directly: click on it, type, press Enter or Tab, scroll with the wheel. Back, Forward and Reload are in the pane's header.

Sign-ins you make in this browser stay in Format (in its own profile in the data folder), apart from your everyday browser.

## Claude and the browser

With Settings, Tools, Claude can use the built-in browser on (the default), Claude can open pages, click, type and choose options. Each action shows in the reply as a step ("Opened a page in the browser", "Typed in the browser"). In Ask mode each action waits for your approval; Always allow lets it browse without asking. Claude reads pages as text with their buttons and fields numbered, not as screenshots.

Claude is told to ask you before buying, sending, posting or deleting anything. Watch the pane while it works: the globe shows a dot while the browser is open, and you can click into the page at any time.

For simply reading a public page, Claude uses web fetch instead, which is faster.
