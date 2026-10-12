use std::process::ExitCode;
use std::time::Instant;

use format_render::grid::{encode_png, snapshot, Screen, Theme};
use format_render::{budget, enabled, native_force};

fn json_str(s: &str) -> String {
    let mut out = String::from("\"");
    for ch in s.chars() {
        match ch {
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            c if (c as u32) < 0x20 => out.push_str(&format!("\\u{:04x}", c as u32)),
            c => out.push(c),
        }
    }
    out.push('"');
    out
}

fn arg(args: &[String], name: &str) -> Option<String> {
    args.iter().position(|a| a == name).and_then(|i| args.get(i + 1)).cloned()
}

fn fail(msg: &str) -> ExitCode {
    println!("{{\"ok\":false,\"error\":{}}}", json_str(msg));
    ExitCode::from(1)
}

fn main() -> ExitCode {
    let args: Vec<String> = std::env::args().collect();
    match args.get(1).map(String::as_str) {
        Some("info") => {
            let b = budget::system_budget();
            match native_force() {
                Some(n) => println!(
                    "{{\"ok\":true,\"enabled\":{},\"adapter\":{},\"backend\":{},\"device\":{},\"ramBytes\":{},\"budgetBytes\":{},\"maxTexture\":{}}}",
                    enabled(),
                    json_str(&n.gpu.info.name),
                    json_str(&format!("{:?}", n.gpu.info.backend)),
                    json_str(&format!("{:?}", n.gpu.info.device_type)),
                    b.ram,
                    b.bytes,
                    n.gpu.limits.max_texture_dimension_2d
                ),
                None => println!("{{\"ok\":false,\"enabled\":{},\"error\":\"no GPU adapter\",\"ramBytes\":{},\"budgetBytes\":{}}}", enabled(), b.ram, b.bytes),
            }
            ExitCode::SUCCESS
        }
        Some("snapshot") => {
            let cols: u16 = arg(&args, "--cols").and_then(|v| v.parse().ok()).unwrap_or(100).clamp(10, 500);
            let rows: u16 = arg(&args, "--rows").and_then(|v| v.parse().ok()).unwrap_or(30).clamp(4, 300);
            let px: f32 = arg(&args, "--px").and_then(|v| v.parse().ok()).unwrap_or(14.0f32).clamp(8.0, 48.0);
            let Some(input) = arg(&args, "--in") else { return fail("--in is required") };
            let Some(output) = arg(&args, "--out") else { return fail("--out is required") };
            let bytes = match std::fs::read(&input) {
                Ok(b) => b,
                Err(e) => return fail(&format!("cannot read {input}: {e}")),
            };
            let started = Instant::now();
            let Some(n) = native_force() else { return fail("no GPU adapter") };
            let theme = Theme::studio_dark();
            let screen = Screen::from_ansi(&bytes, cols, rows, &theme);
            let shot = snapshot(&n.gpu, &screen, px, &theme);
            if let Err(e) = std::fs::write(&output, encode_png(&shot)) {
                return fail(&format!("cannot write {output}: {e}"));
            }
            println!(
                "{{\"ok\":true,\"width\":{},\"height\":{},\"cols\":{},\"rows\":{},\"adapter\":{},\"backend\":{},\"ms\":{}}}",
                shot.width,
                shot.height,
                cols,
                rows,
                json_str(&n.gpu.info.name),
                json_str(&format!("{:?}", n.gpu.info.backend)),
                started.elapsed().as_millis()
            );
            ExitCode::SUCCESS
        }
        _ => {
            eprintln!("format-render info | snapshot --in screen.ansi --out screen.png [--cols 100] [--rows 30] [--px 14]");
            ExitCode::from(2)
        }
    }
}
