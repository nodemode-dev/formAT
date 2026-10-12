---
name: native-render-builder
description: "Building native/format-render, Format's optional Rust crate on wgpu: Gpu, budget, native_start, the terminal glyph grid and its shader, the format-render binary, the winit window example, the engine's native.py bridge, and the Tauri desktop bridge to come. Load before editing anything under native/ or backend/app/engine/native.py."
---

# Native render builder

## Purpose

Keep the native crate to the family standard and used only where a measurement shows the browser is not enough. Hands back a built, checked crate and its engine bridge.

## Preconditions

Rust stable and cargo. The owner's rule: Rust where it is needed, scaffolded to the standard, used on measured need. Measure first; the window's xterm terminal was measured adequate and stays.

## Procedure

1. **Shape.** `src/lib.rs` (`Gpu`, `native_start` gated by FORMAT_NATIVE, `native_force` for probes), `src/budget.rs`, `src/grid.rs` and `src/grid.wgsl`, `src/bin/format-render.rs` (JSON `info` and `snapshot`), `examples/window.rs` behind the `window` feature.
2. **Portability.** Textures and `textureLoad` only, no storage buffers in fragment shaders, limits from the WebGL2 defaults raised to the adapter's resolution, so the OpenGL backend works as Metal, Vulkan and Direct3D 12 do.
3. **Pins.** Exact versions in `Cargo.toml` (wgpu, pollster, fontdue, vt100, png); confirm each licence from the package's repository when adding one; bundled fonts keep their licence file beside them.
4. **Engine bridge.** `backend/app/engine/native.py` runs the binary as a subprocess with JSON on stdout; nothing runs while FORMAT_NATIVE is unset, and refusals say how to turn it on.
5. **Commands.** `./format native build`, `./format native info`, `./format native window`.

## Gate

- `cargo check` with and without the `window` feature, `info` prints an adapter, a snapshot renders, the window example runs (Xvfb is fine in a container), and with FORMAT_NATIVE unset the window checks are unchanged.

## Hands back

The adapter line, the timings, the rendered images, and the check outputs.

## Owned resources

- `references/architecture.md` the native crate section
