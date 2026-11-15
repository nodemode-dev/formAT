#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::collections::HashMap;
use std::io::Write;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};

use tauri::webview::{DownloadEvent, NewWindowResponse, PermissionKind, PermissionResponse};
use tauri::{Manager, RunEvent, Theme, Url, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons};
use tauri_plugin_opener::OpenerExt;
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
use tauri_plugin_shell::ShellExt;
use tauri_plugin_updater::UpdaterExt;

mod reveal;

struct Backend(Mutex<Option<CommandChild>>);

const FALLBACK_LOGICAL: (f64, f64) = (1440.0, 900.0);
const MIN_LOGICAL: (f64, f64) = (960.0, 620.0);
const SCREEN_FRACTION: f64 = 0.88;
const LOG_TAIL: usize = 40;

fn kill_backend(handle: &tauri::AppHandle) {
    if let Some(child) = handle.state::<Backend>().0.lock().unwrap().take() {
        let _ = child.kill();
    }
}

fn engine_log(handle: &tauri::AppHandle) -> Option<std::fs::File> {
    let dir = handle.path().app_log_dir().ok()?;
    std::fs::create_dir_all(&dir).ok()?;
    std::fs::File::create(dir.join("engine.log")).ok()
}

fn check_for_updates(handle: tauri::AppHandle) {
    let configured = handle
        .config()
        .plugins
        .0
        .get("updater")
        .and_then(|updater| updater.get("pubkey"))
        .and_then(|key| key.as_str())
        .map_or(false, |key| !key.is_empty());
    if !configured {
        return;
    }
    tauri::async_runtime::spawn(async move {
        let Ok(updater) = handle.updater() else { return };
        let Ok(Some(update)) = updater.check().await else { return };
        let install = handle
            .dialog()
            .message(format!("Format {} is available. Install it and restart?", update.version))
            .title("Update available")
            .buttons(MessageDialogButtons::OkCancel)
            .blocking_show();
        if install && update.download_and_install(|_, _| {}, || {}).await.is_ok() {
            kill_backend(&handle);
            handle.restart();
        }
    });
}

fn is_engine(url: &Url, port: u16) -> bool {
    matches!(url.host_str(), Some("127.0.0.1") | Some("localhost")) && url.port_or_known_default() == Some(port)
}

fn unique_in(dir: &PathBuf, name: &str) -> PathBuf {
    let first = dir.join(name);
    if !first.exists() {
        return first;
    }
    let (stem, ext) = match name.rfind('.') {
        Some(i) if i > 0 => (&name[..i], &name[i..]),
        _ => (name, ""),
    };
    (1..1000)
        .map(|n| dir.join(format!("{stem} ({n}){ext}")))
        .find(|p| !p.exists())
        .unwrap_or(first)
}

fn open_main(handle: &tauri::AppHandle, port: u16) {
    let url: Url = format!("http://127.0.0.1:{port}/").parse().expect("loopback url");
    let (width, height) = handle
        .primary_monitor()
        .ok()
        .flatten()
        .map(|monitor| {
            let size = monitor.size();
            let scale = monitor.scale_factor();
            ((size.width as f64 / scale) * SCREEN_FRACTION, (size.height as f64 / scale) * SCREEN_FRACTION)
        })
        .unwrap_or(FALLBACK_LOGICAL);
    let nav = handle.clone();
    let popup = handle.clone();
    let saver = handle.clone();
    let pending: Arc<Mutex<HashMap<String, PathBuf>>> = Arc::new(Mutex::new(HashMap::new()));
    let built = WebviewWindowBuilder::new(handle, "main", WebviewUrl::External(url))
        .title("FormAT")
        .visible(reveal::BUILD_VISIBLE)
        .inner_size(width.max(MIN_LOGICAL.0), height.max(MIN_LOGICAL.1))
        .min_inner_size(MIN_LOGICAL.0, MIN_LOGICAL.1)
        .center()
        .theme(Some(Theme::Dark))
        .background_color(reveal::BACKGROUND)
        .disable_drag_drop_handler()
        .on_navigation(move |target| {
            if is_engine(target, port) || matches!(target.scheme(), "about" | "blob" | "data") {
                return true;
            }
            if matches!(target.scheme(), "http" | "https" | "mailto") {
                let _ = nav.opener().open_url(target.as_str(), None::<&str>);
            }
            false
        })
        .on_new_window(move |target, _features| {
            if matches!(target.scheme(), "http" | "https" | "mailto") {
                let _ = popup.opener().open_url(target.as_str(), None::<&str>);
            }
            NewWindowResponse::Deny
        })
        .on_download(move |_webview, event| match event {
            DownloadEvent::Requested { url, destination } => {
                let Some(dir) = saver.path().download_dir().ok().or_else(|| saver.path().home_dir().ok().map(|h| h.join("Downloads"))) else {
                    return true;
                };
                let _ = std::fs::create_dir_all(&dir);
                let name = destination
                    .file_name()
                    .and_then(|n| n.to_str())
                    .filter(|n| !n.is_empty())
                    .map(str::to_owned)
                    .or_else(|| url.path_segments().and_then(|mut s| s.next_back()).filter(|n| !n.is_empty()).map(str::to_owned))
                    .unwrap_or_else(|| "download".into());
                let target = unique_in(&dir, &name);
                pending.lock().unwrap().insert(url.to_string(), target.clone());
                *destination = target;
                true
            }
            DownloadEvent::Finished { url, success, .. } => {
                let saved = pending.lock().unwrap().remove(url.as_str());
                if let (true, Some(path)) = (success, saved) {
                    let _ = saver.opener().reveal_item_in_dir(path);
                }
                true
            }
            _ => true,
        })
        .on_permission_request(|_webview, kind| match kind {
            PermissionKind::Microphone => PermissionResponse::Allow,
            _ => PermissionResponse::Default,
        })
        .build();
    match built {
        Ok(window) => reveal::conceal(&window),
        Err(_) => reveal::close_splash(handle),
    }
}

fn main() {
    reveal::mark_launch();
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(Backend(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![reveal::app_ready])
        .setup(|app| {
            let handle = app.handle().clone();
            reveal::round_splash(&handle);
            let (mut rx, child) = app
                .shell()
                .sidecar("format-engine")
                .expect("sidecar binary is bundled")
                .env("FORMAT_DESKTOP", "1")
                .env("FORMAT_PARENT_PID", std::process::id().to_string())
                .spawn()
                .expect("the Format engine failed to spawn");
            app.state::<Backend>().0.lock().unwrap().replace(child);

            tauri::async_runtime::spawn(async move {
                let pattern = regex::Regex::new(r"Uvicorn running on http://127\.0\.0\.1:(\d+)").unwrap();
                let mut log = engine_log(&handle);
                let mut tail: Vec<String> = Vec::new();
                let mut port: Option<u16> = None;
                while let Some(event) = rx.recv().await {
                    let line = match event {
                        CommandEvent::Stdout(bytes) | CommandEvent::Stderr(bytes) => String::from_utf8_lossy(&bytes).into_owned(),
                        CommandEvent::Terminated(status) => {
                            if port.is_none() {
                                tail.push(format!("engine exited ({:?})", status.code));
                            }
                            break;
                        }
                        _ => continue,
                    };
                    if let Some(file) = log.as_mut() {
                        let _ = file.write_all(line.as_bytes());
                        let _ = file.flush();
                    }
                    if port.is_some() {
                        continue;
                    }
                    tail.push(line.trim_end().to_owned());
                    if tail.len() > LOG_TAIL {
                        tail.remove(0);
                    }
                    if let Some(captures) = pattern.captures(&line) {
                        port = captures[1].parse().ok();
                        if let Some(found) = port {
                            open_main(&handle, found);
                            check_for_updates(handle.clone());
                        }
                    }
                }
                if port.is_none() {
                    reveal::close_splash(&handle);
                    handle
                        .dialog()
                        .message(format!("The Format engine failed to start. Please relaunch the app.\n\n{}", tail.join("\n")))
                        .title("Format")
                        .blocking_show();
                    kill_backend(&handle);
                    std::process::exit(1);
                }
            });
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("tauri app should build");

    app.run(|handle, event| {
        if let RunEvent::Exit = event {
            kill_backend(handle);
        }
    });
}
