use serde::Serialize;
use std::{fs, path::Path, thread, time::Duration};
use sysinfo::{ProcessesToUpdate, System};

#[derive(Serialize)]
struct SystemSnapshot {
    cpu_usage_percent: f32,
    used_memory_mb: u64,
    total_memory_mb: u64,
    process_count: usize,
    platform: String,
}

#[derive(Serialize)]
struct ActiveGame {
    name: String,
    process_name: String,
    source: String,
    confidence: u8,
    metadata_hint: String,
    detected: bool,
    note: String,
}

#[tauri::command]
fn get_system_snapshot() -> SystemSnapshot {
    let mut system = System::new_all();

    thread::sleep(Duration::from_millis(220));
    system.refresh_cpu_usage();
    system.refresh_memory();
    system.refresh_processes(ProcessesToUpdate::All, true);

    let platform = format!(
        "{} {}",
        System::name().unwrap_or_else(|| std::env::consts::OS.to_string()),
        System::os_version().unwrap_or_default()
    )
    .trim()
    .to_string();

    SystemSnapshot {
        cpu_usage_percent: system.global_cpu_usage(),
        used_memory_mb: system.used_memory() / 1024 / 1024,
        total_memory_mb: system.total_memory() / 1024 / 1024,
        process_count: system.processes().len(),
        platform,
    }
}

fn prettify_process_name(raw: &str) -> String {
    let without_extension = raw
        .trim_end_matches(".exe")
        .trim_end_matches(".x86_64")
        .trim_end_matches(".bin");

    without_extension
        .replace(['_', '-'], " ")
        .split_whitespace()
        .map(|part| {
            let mut chars = part.chars();

            match chars.next() {
                Some(first) => first.to_uppercase().collect::<String>() + chars.as_str(),
                None => String::new(),
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

fn title_from_path(raw: &str) -> Option<String> {
    let cleaned = raw.trim_matches('"').trim_matches('\'');
    let path = Path::new(cleaned);
    let extension = path
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or_default()
        .to_lowercase();
    let known_game_extensions = [
        "nes", "sfc", "smc", "n64", "z64", "v64", "gba", "gbc", "gb", "nds", "3ds", "cia",
        "nsp", "xci", "iso", "chd", "cue", "bin", "rvz", "wad", "zip", "7z",
    ];

    if !known_game_extensions.contains(&extension.as_str()) {
        return None;
    }

    path.file_stem()
        .and_then(|value| value.to_str())
        .map(|name| {
            name.replace(['_', '.', '-'], " ")
                .split('[')
                .next()
                .unwrap_or(name)
                .split('(')
                .next()
                .unwrap_or(name)
                .trim()
                .to_string()
        })
        .filter(|name| !name.is_empty())
}

fn title_from_args(args: &[String]) -> Option<(String, String)> {
    args.iter()
        .find_map(|arg| title_from_path(arg).map(|title| (title, arg.clone())))
}

fn title_from_retroarch_history() -> Option<(String, String)> {
    let home = std::env::var("HOME").ok()?;
    let candidates = [
        format!("{home}/.config/retroarch/content_history.lpl"),
        format!("{home}/.var/app/org.libretro.RetroArch/config/retroarch/content_history.lpl"),
    ];

    for candidate in candidates {
        let content = fs::read_to_string(&candidate).ok()?;
        let title = content
            .lines()
            .rev()
            .find_map(|line| {
                let trimmed = line.trim();
                if trimmed.starts_with("\"label\"") || trimmed.starts_with("label") {
                    trimmed
                        .split(':')
                        .nth(1)
                        .map(|value| value.trim().trim_matches(',').trim_matches('"').to_string())
                } else if trimmed.starts_with("\"path\"") || trimmed.starts_with("path") {
                    let value = trimmed
                        .split(':')
                        .skip(1)
                        .collect::<Vec<_>>()
                        .join(":")
                        .trim()
                        .trim_matches(',')
                        .trim_matches('"')
                        .to_string();

                    title_from_path(&value)
                } else {
                    None
                }
            })
            .filter(|value| !value.is_empty());

        if let Some(title) = title {
            return Some((title, candidate));
        }
    }

    None
}

#[tauri::command]
fn detect_active_game() -> ActiveGame {
    let mut system = System::new_all();
    system.refresh_processes(ProcessesToUpdate::All, true);

    if let Some((title, source)) = title_from_retroarch_history() {
        let retroarch_running = system.processes().values().any(|process| {
            process
                .name()
                .to_string_lossy()
                .to_lowercase()
                .contains("retroarch")
        });

        if retroarch_running {
            return ActiveGame {
                name: title,
                process_name: "retroarch".into(),
                source: "RetroArch history".into(),
                confidence: 86,
                metadata_hint: source,
                detected: true,
                note: "Detectado desde el historial reciente de RetroArch.".into(),
            };
        }
    }

    const LAUNCHERS: &[&str] = &[
        "steam",
        "steamwebhelper",
        "epicgameslauncher",
        "heroic",
        "lutris",
        "gamescope",
        "discord",
    ];
    const NON_GAMES: &[&str] = &[
        "snext",
        "vite",
        "node",
        "cargo",
        "rustc",
        "bash",
        "sh",
        "zsh",
        "fish",
        "systemd",
        "gnome-shell",
        "plasmashell",
        "xorg",
        "wayland",
        "firefox",
        "chrome",
        "chromium",
        "webkit",
    ];
    const GAME_HINTS: &[&str] = &[
        "game",
        "unity",
        "unreal",
        "wine",
        "proton",
        "godot",
        "minecraft",
        "retroarch",
        "dolphin-emu",
        "pcsx2",
        "rpcs3",
        "cemu",
        "ryujinx",
        "citra",
    ];

    let candidate = system
        .processes()
        .values()
        .filter_map(|process| {
            let name = process.name().to_string_lossy().to_string();
            let lower = name.to_lowercase();

            if LAUNCHERS.iter().any(|item| lower == *item)
                || NON_GAMES.iter().any(|item| lower.contains(item))
            {
                return None;
            }

            let executable_hint = process
                .exe()
                .map(|path| path.to_string_lossy().to_lowercase())
                .unwrap_or_default();
            let args: Vec<String> = process
                .cmd()
                .iter()
                .map(|value| value.to_string_lossy().to_string())
                .collect();

            if let Some((title, metadata_hint)) = title_from_args(&args) {
                let source = if lower.contains("retroarch") {
                    "RetroArch arguments"
                } else if lower.contains("ryujinx") {
                    "Ryujinx arguments"
                } else if lower.contains("citra") {
                    "Citra arguments"
                } else {
                    "Process arguments"
                };

                return Some((95.0 + process.cpu_usage(), title, name, source.to_string(), metadata_hint));
            }

            let looks_like_game = GAME_HINTS
                .iter()
                .any(|hint| lower.contains(hint) || executable_hint.contains(hint));

            looks_like_game.then_some((
                process.cpu_usage(),
                prettify_process_name(&name),
                name,
                "Process heuristic".into(),
                executable_hint,
            ))
        })
        .max_by(|left, right| {
            left.0
                .partial_cmp(&right.0)
                .unwrap_or(std::cmp::Ordering::Equal)
        });

    match candidate {
        Some((score, title, process_name, source, metadata_hint)) => ActiveGame {
            name: title,
            process_name,
            source,
            confidence: score.min(99.0).max(45.0) as u8,
            metadata_hint,
            detected: true,
            note: "Coincidencia heurística local; no confirma la ventana activa.".into(),
        },
        None => ActiveGame {
            name: "Sin detección".into(),
            process_name: String::new(),
            source: "none".into(),
            confidence: 0,
            metadata_hint: String::new(),
            detected: false,
            note: "No se encontró un proceso reconocible.".into(),
        },
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_system_snapshot,
            detect_active_game
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
