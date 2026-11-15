# Troubleshooting

Start with `./format doctor`: it checks Node, Python, the installs, your key and whether the ports are free.

| Problem | What to do |
| --- | --- |
| "No API key yet" in the sidebar | add your Anthropic key in Settings, API keys, or `ANTHROPIC_API_KEY` in `backend/.env` |
| The models menu shows a short built-in list | your key could not reach the models endpoint; the message under the list says why |
| Port 8490 or 5490 in use | another FormAT, or another program, holds it; stop it, or set `FORMAT_PORT` for the engine |
| The window says the engine is not answering | the engine stopped; start it again with `./format` (the window reconnects by itself) |
| Dictation says no transcription engine | add an ElevenLabs key (Scribe v2) or an OpenAI key, or run `./format install-voice`; Chrome, Edge and Safari can also use the browser's recognition |
| Dictation says the local speech model could not be loaded | `./format install-voice` downloads large-v3-turbo from Hugging Face; check the network and run it again, or set `FORMAT_WHISPER_MODEL` to a model folder on this computer (an older `.env` may still say `base`) |
| Dictation says ElevenLabs transcription failed (401) | the ElevenLabs key is wrong or lacks speech to text; save a new one in Settings, API keys |
| The Browser pane says the browser is not installed | run `./format install-browser`, then restart FormAT |
| Claude's commands fail to install packages | the sandbox has no network by default; allow it in Settings, Tools, or turn the sandbox off |
| A phone cannot open the pairing link | both devices must be on the same network, and a firewall must allow port 8492 on the computer |
| A share link says "no longer shared" | sharing was stopped; Share again makes a new link |
| A plugin will not add | the .zip needs `.claude-plugin/plugin.json` with a name (lowercase, hyphens) and a description |
| A connector shows an error | open it in Customize and Reconnect; the message says what failed |
| An outside agent gets "blocked" | Settings, Outside agents |

On Windows use `.\format.bat`, never a bare `format`.
