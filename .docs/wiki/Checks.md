# Checks

Format carries no test suite in the repository. Each change is verified by driving the real build in a browser and the engine through its API, and the result is written into the release's entry in the planning sidecar's BUILD_NOTES. The check scripts live outside the tree.

## What every window change is checked for

- On the production build (`npm run build`, preview on 5491), in Chromium with CPU throttled 4x and the network slowed (150 ms latency, 400 KB/s down).
- Layout shift 0, recorded with a `PerformanceObserver` on `layout-shift` from after first paint, with the shifting nodes named when it is not 0.
- No element with a visible scrollbar.
- No page errors.
- At 390 px wide: no horizontal overflow.
- The feature itself, end to end, with screenshots looked at.

## The engine

- `tsc --noEmit` and `vite build` for the window; importing `app.main` for the engine.
- Commands through REST and `./format cli`, including the error paths (a bad id names the command to call next).
- Claude's side against a local mock of the streaming Messages API that follows the documented event sequence, with scenarios that make Claude call each tool; a run with a real key is recorded separately.

## Gotchas

- A sandbox or corporate proxy can refuse `ws://` to a LAN address with its own 403; clear the proxy variables or launch Chromium with `--no-proxy-server` when checking paired devices.
- The sidebar defers row moves until input; a check waiting for a new row must press a key or touch first.
- Stop engines and servers from earlier runs with anchored patterns before starting new ones, or a stale engine answers on 8490.
