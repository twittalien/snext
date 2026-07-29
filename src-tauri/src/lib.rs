use serde::{Deserialize, Serialize};
use std::{fs, path::Path, process::Command, thread, time::Duration};
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
struct HardwareSnapshot {
    gpu_name: String,
    gpu_usage_percent: Option<f32>,
    gpu_temperature_c: Option<f32>,
    used_vram_mb: Option<u64>,
    total_vram_mb: Option<u64>,
    cpu_temperature_c: Option<f32>,
    battery_percent: Option<f32>,
    battery_state: String,
    source: String,
}

#[derive(Deserialize)]
struct AiTipRequest {
    provider: String,
    api_key: String,
    ollama_url: String,
    ollama_model: String,
    language: String,
    game_title: String,
    platform: String,
    description: String,
}

#[derive(Serialize)]
struct AiTipResponse {
    title: String,
    body: String,
    source: String,
}

#[derive(Deserialize)]
struct DiscordPresenceRequest {
    bot_token: String,
    guild_id: String,
}

#[derive(Serialize)]
struct DiscordFriend {
    name: String,
    activity: String,
    color: String,
}

#[derive(Serialize)]
struct DiscordPresenceResponse {
    friends: Vec<DiscordFriend>,
    source: String,
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

fn command_output(program: &str, args: &[&str]) -> Option<String> {
    let output = Command::new(program).args(args).output().ok()?;

    if !output.status.success() {
        return None;
    }

    Some(String::from_utf8_lossy(&output.stdout).to_string())
}

fn parse_metric_number(value: &str) -> Option<f32> {
    let cleaned: String = value
        .chars()
        .filter(|char| char.is_ascii_digit() || *char == '.')
        .collect();

    cleaned.parse::<f32>().ok()
}

fn parse_cpu_temperature() -> Option<f32> {
    let output = command_output("sensors", &[])?;

    output.lines().find_map(|line| {
        let lower = line.to_lowercase();

        if !(lower.contains("package id 0") || lower.contains("tctl") || lower.contains("cpu")) {
            return None;
        }

        line.find('+')
            .and_then(|index| parse_metric_number(&line[index..]))
    })
}

#[tauri::command]
fn get_hardware_snapshot() -> HardwareSnapshot {
    let mut source = Vec::new();
    let mut gpu_name = "No detectada".to_string();
    let mut gpu_usage_percent = None;
    let mut gpu_temperature_c = None;
    let mut used_vram_mb = None;
    let mut total_vram_mb = None;

    if let Some(output) = command_output(
        "nvidia-smi",
        &[
            "--query-gpu=name,utilization.gpu,temperature.gpu,memory.used,memory.total",
            "--format=csv,noheader,nounits",
        ],
    ) {
        source.push("nvidia-smi");

        let values = output
            .lines()
            .next()
            .unwrap_or_default()
            .split(',')
            .map(str::trim)
            .collect::<Vec<_>>();

        if values.len() >= 5 {
            gpu_name = values[0].to_string();
            gpu_usage_percent = values[1].parse::<f32>().ok();
            gpu_temperature_c = values[2].parse::<f32>().ok();
            used_vram_mb = values[3].parse::<u64>().ok();
            total_vram_mb = values[4].parse::<u64>().ok();
        }
    }

    let cpu_temperature_c = parse_cpu_temperature();
    if cpu_temperature_c.is_some() {
        source.push("sensors");
    }

    let battery_path = command_output("upower", &["-e"]).and_then(|output| {
        output
            .lines()
            .find(|line| line.contains("battery"))
            .map(str::to_string)
    });

    let (battery_percent, battery_state) = if let Some(path) = battery_path {
        source.push("upower");
        let info = command_output("upower", &["-i", &path]).unwrap_or_default();
        let percent = info
            .lines()
            .find(|line| line.trim_start().starts_with("percentage:"))
            .and_then(parse_metric_number);
        let state = info
            .lines()
            .find(|line| line.trim_start().starts_with("state:"))
            .and_then(|line| line.split(':').nth(1))
            .map(|value| value.trim().to_string())
            .unwrap_or_else(|| "unknown".into());

        (percent, state)
    } else {
        (None, "unknown".into())
    };

    HardwareSnapshot {
        gpu_name,
        gpu_usage_percent,
        gpu_temperature_c,
        used_vram_mb,
        total_vram_mb,
        cpu_temperature_c,
        battery_percent,
        battery_state,
        source: if source.is_empty() {
            "fallback".into()
        } else {
            source.join(", ")
        },
    }
}

fn ai_prompt(request: &AiTipRequest) -> String {
    let language = match request.language.as_str() {
        "en" => "English",
        "pt" => "Portuguese",
        _ => "Spanish",
    };

    [
        format!("Answer in {language}."),
        "You are Snext, a concise gaming companion shown on a secondary monitor.".into(),
        "Give one practical, non-spoiler gameplay tip for the detected game.".into(),
        "Avoid pretending you know the player's exact mission unless it is provided.".into(),
        "Keep the answer under 55 words.".into(),
        format!("Game title: {}", request.game_title),
        format!("Platform/source: {}", request.platform),
        format!("Description: {}", request.description),
    ]
    .join("\n")
}

fn local_ai_tip(request: &AiTipRequest) -> AiTipResponse {
    let (title, body) = match request.language.as_str() {
        "en" => (
            "Context tip",
            format!(
                "Snext detected {}. Check your next objective, inventory and difficulty before continuing; connected AI will make this advice more specific.",
                request.game_title
            ),
        ),
        "pt" => (
            "Dica contextual",
            format!(
                "Snext detectou {}. Revise objetivo, inventário e dificuldade antes de continuar; a IA conectada deixará a dica mais específica.",
                request.game_title
            ),
        ),
        _ => (
            "Consejo contextual",
            format!(
                "Snext detectó {}. Revisa objetivo, inventario y dificultad antes de continuar; la IA conectada volverá este consejo más específico.",
                request.game_title
            ),
        ),
    };

    AiTipResponse {
        title: title.into(),
        body,
        source: "local".into(),
    }
}

#[tauri::command]
async fn generate_ai_tip(request: AiTipRequest) -> Result<AiTipResponse, String> {
    let prompt = ai_prompt(&request);
    let client = reqwest::Client::new();

    if request.provider == "gemini" && !request.api_key.trim().is_empty() {
        let url = format!(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={}",
            request.api_key.trim()
        );

        let response = client
            .post(url)
            .json(&serde_json::json!({
                "contents": [{ "parts": [{ "text": prompt.clone() }] }]
            }))
            .send()
            .await
            .map_err(|error| error.to_string())?;

        if response.status().is_success() {
            let data = response
                .json::<serde_json::Value>()
                .await
                .map_err(|error| error.to_string())?;
            let body = data["candidates"][0]["content"]["parts"][0]["text"]
                .as_str()
                .unwrap_or_default()
                .trim()
                .to_string();

            if !body.is_empty() {
                return Ok(AiTipResponse {
                    title: "Snext AI".into(),
                    body,
                    source: "gemini".into(),
                });
            }
        }
    }

    if !request.ollama_url.trim().is_empty() && !request.ollama_model.trim().is_empty() {
        let url = format!("{}/api/generate", request.ollama_url.trim().trim_end_matches('/'));
        let response = client
            .post(url)
            .json(&serde_json::json!({
                "model": request.ollama_model,
                "prompt": prompt,
                "stream": false
            }))
            .send()
            .await;

        if let Ok(response) = response {
            if response.status().is_success() {
                let data = response
                    .json::<serde_json::Value>()
                    .await
                    .map_err(|error| error.to_string())?;
                let body = data["response"].as_str().unwrap_or_default().trim().to_string();

                if !body.is_empty() {
                    return Ok(AiTipResponse {
                        title: "Snext AI".into(),
                        body,
                        source: "ollama".into(),
                    });
                }
            }
        }
    }

    Ok(local_ai_tip(&request))
}

#[tauri::command]
async fn fetch_discord_presence(
    request: DiscordPresenceRequest,
) -> Result<DiscordPresenceResponse, String> {
    if request.bot_token.trim().is_empty() || request.guild_id.trim().is_empty() {
        return Ok(DiscordPresenceResponse {
            friends: Vec::new(),
            source: "not-configured".into(),
        });
    }

    let url = format!(
        "https://discord.com/api/v10/guilds/{}/members?limit=10",
        request.guild_id.trim()
    );
    let response = reqwest::Client::new()
        .get(url)
        .header(
            "Authorization",
            format!("Bot {}", request.bot_token.trim()),
        )
        .send()
        .await
        .map_err(|error| error.to_string())?;

    if !response.status().is_success() {
        return Err(format!("Discord respondió {}", response.status()));
    }

    let data = response
        .json::<serde_json::Value>()
        .await
        .map_err(|error| error.to_string())?;
    let friends = data
        .as_array()
        .map(|members| members.iter())
        .into_iter()
        .flatten()
        .take(5)
        .filter_map(|member| {
            let user = &member["user"];
            let name = user["global_name"]
                .as_str()
                .or_else(|| user["username"].as_str())?;
            let discriminator = user["discriminator"].as_str().unwrap_or_default();
            let suffix = if discriminator.is_empty() || discriminator == "0" {
                String::new()
            } else {
                format!("#{discriminator}")
            };

            Some(DiscordFriend {
                name: format!("{name}{suffix}"),
                activity: "Miembro del servidor".into(),
                color: "#5865f2".into(),
            })
        })
        .collect();

    Ok(DiscordPresenceResponse {
        friends,
        source: "discord-bot".into(),
    })
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
            get_hardware_snapshot,
            generate_ai_tip,
            fetch_discord_presence,
            detect_active_game
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
