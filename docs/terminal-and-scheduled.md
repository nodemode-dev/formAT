# Terminal, scheduled tasks and background work

## The terminal dock

Mod+J (or the terminal button in the top bar) opens a dock of real login shells on your computer. Add tabs, Restart a tab for a fresh shell in the same folder, Hide the dock. Inside it the shell keeps its own Ctrl keys, except Mod+J, which hides the dock again. The shells keep running while the dock is hidden and when the window reloads.

The **Claude** tab is read-only: Claude's commands run there live as it works, so you can watch their output.

Agents and the command line can use the same shells: `./format cli terminal.write` and `terminal.read`.

## Scheduled tasks

The Scheduled page runs a prompt on a schedule: hourly, daily, on weekdays, weekly, once, or only when you press Run now. Each run is a new chat, listed in the task's history. Pause, edit or delete a task there.

Tasks run while FormAT is running; there is no background service when it is closed.

## Background work

The Background button in the top bar shows a count of chats that are working or waiting for you, and opens a list with each chat, its scheduled task if any, how long it has run, and Stop.
