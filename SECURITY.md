# Security policy

## Supported versions

Security fixes go into the newest release. Please update before reporting, and
check whether the problem is still there.

| Version | Supported |
| --- | --- |
| 0.26.x (latest release) | Yes |
| Anything older | No |

## Reporting a vulnerability

**Do not open a public issue for a security problem.** Use GitHub's private
reporting instead: on the repository's **Security** tab, choose **Report a
vulnerability**. Include what you found, the steps to reproduce it, the version and
platform, and what an attacker could do with it.

You can expect an acknowledgement within a week. We will keep you informed while it
is fixed and credit you in the release notes, unless you would rather not be named.

## What counts

FormAT runs on your own machine, so the things that matter most are the ways
something outside it could get in:

- **The engine** listens on loopback (127.0.0.1): port 8490 in development, and
  port 8490 or another free loopback port in the desktop app. Anything that makes it
  reachable from another machine, or lets a web page on another origin drive it.
- **Other devices** (off by default): the second listener on port 8492 that opens
  only while the person turns it on. Reaching chats from a device that is not paired,
  guessing or reusing the pairing link, keeping access after Forget paired devices or
  Close to other devices, or a share link opening more than the one artifact it was
  made for, or still answering after Stop sharing.
- **Agents and the MCP server** (`/mcp`, and `./format mcp` over stdio): an agent
  acting before the person has allowed outside agents in Settings.
- **Approvals and Claude's tools**: a command, file change, browser action or local
  connector tool that runs without the approval the chat's mode asks for, or Claude's
  commands writing outside the chat's folder while the sandbox setting is on.
- **The terminal dock**: anything other than FormAT's own window, or a device the
  person has paired, reaching a shell.
- **Artifact pages**: a page getting out of its sandbox, or reaching the engine or
  the network when the person has not allowed it.
- **Plugins, skills and connectors**: an uploaded or downloaded plugin, skill or
  marketplace archive that writes outside its own folder, or a plugin's command that
  runs without the person choosing Run and add.
- **Provider keys** (Anthropic, OpenAI and ElevenLabs) kept in the data folder:
  anything that leaks them.
- **Files and downloads**: opening a zip dropped into a chat in a way that writes
  outside where it should, or anything downloaded (a plugin archive, the built-in
  browser's Chromium, the speech model, or an app update when its signing key is set)
  and installed without the checks it should have.

Bugs that need someone to already control your machine, or to run a modified build
of FormAT, are ordinary bugs: please open an issue for those.
