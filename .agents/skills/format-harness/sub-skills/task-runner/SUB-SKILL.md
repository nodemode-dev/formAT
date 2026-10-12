---
name: task-runner
description: "Work that runs over time in Format: Claude's task list in a chat, sub-agents, scheduled tasks with their run history, and the Background list of everything working or waiting. Load to schedule prompts, follow running work, or change these features."
---

# Task runner

## Purpose

Run and follow work beyond one reply. Hands back a scheduled task, a run's status, or a verified change.

## Preconditions

The engine is running. For build work, `engine-builder` and `ui-builder`.

## Procedure

1. **Task list.** Claude keeps a plan with `task_list`; `tasks.get` reads it; the Outputs card shows it.
2. **Scheduled tasks.** `schedule.create` (name, prompt, cadence manual, once with runAt, hourly, daily, weekdays, weekly; `at` local HH:MM; weekday 0 Monday; projectId), `schedule.update` (including enabled false to pause), `schedule.run` runs now without moving the schedule, `schedule.get` lists runs. The scheduler thread starts with the engine and ticks every 15 s (FORMAT_SCHEDULER_TICK for checks); a run missed while closed runs once at start. Each run is `chat.send` into a new chat titled with the task's name and follows the permission mode, so it may wait for the person.
3. **Background.** `background.list` reports every chat working or waiting with its scheduled task; the top-bar badge counts them from the window's own running and waiting sets.
4. **Sidebar rule.** Chats started in the background join the sidebar at the person's next click or key press, so the list never moves while they read. Keep that when touching the sidebar.

## Gate

- A once task fires within a tick, its run is a chat with the task's name, its status reads waiting, running or done correctly, and the Scheduled page and Background update without layout shift.

## Hands back

Task and run ids with status, or the verified change.

## Owned resources

- `references/command-map.md` schedule and background commands
- `references/architecture.md` the scheduled tasks row
