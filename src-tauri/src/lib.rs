use base64::{engine::general_purpose::STANDARD as BASE64_STANDARD, Engine as _};
use serde::{Deserialize, Serialize};
use std::{
    fs,
    io::{Read, Write},
    net::TcpListener,
    path::{Path, PathBuf},
    process::Command,
    thread,
    time::{Duration, Instant},
};
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

#[derive(Deserialize)]
struct RetroAchievementsRequest {
    username: String,
    api_key: String,
    count: Option<u8>,
}

#[derive(Deserialize)]
struct SteamGridRequest {
    title: String,
    api_key: String,
    selected_game_id: Option<u64>,
    language: Option<String>,
}

#[derive(Deserialize)]
struct SteamGridSearchRequest {
    title: String,
    api_key: String,
}

#[derive(Serialize, Clone)]
struct SteamGridSearchResult {
    id: u64,
    name: String,
    release_date: Option<String>,
    types: Vec<String>,
}

#[derive(Deserialize)]
struct ScreenScraperRequest {
    title: String,
    platform: String,
    dev_id: String,
    dev_password: String,
    username: String,
    password: String,
    language: String,
}

#[derive(Deserialize)]
struct EsDeArtRequest {
    title: String,
    platform: String,
    metadata_hint: String,
}

#[derive(Deserialize)]
struct PublicGameArtRequest {
    title: String,
    platform: String,
    language: String,
}

#[derive(Serialize)]
struct SteamGridArtResponse {
    hero_image: Option<String>,
    hero_images: Vec<String>,
    cover_image: Option<String>,
    logo: Option<String>,
    description: Option<String>,
    matched_title: String,
    source: Option<String>,
}

#[derive(Deserialize)]
struct RemoteImageRequest {
    url: String,
}

#[derive(Serialize)]
struct RemoteImageResponse {
    data_url: String,
}

#[derive(Deserialize)]
struct SpotifyCallbackRequest {
    state: String,
}

#[derive(Serialize)]
struct SpotifyCallbackResponse {
    code: String,
}

#[derive(Deserialize)]
struct TranslationRequest {
    text: String,
    source_language: String,
    target_language: String,
}

#[derive(Deserialize)]
struct MyMemoryResponse {
    #[serde(rename = "responseData")]
    response_data: Option<MyMemoryResponseData>,
    #[serde(rename = "responseStatus")]
    response_status: Option<u16>,
}

#[derive(Deserialize)]
struct MyMemoryResponseData {
    #[serde(rename = "translatedText")]
    translated_text: Option<String>,
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
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(20))
        .build()
        .map_err(|error| error.to_string())?;

    if !request.ollama_url.trim().is_empty() && !request.ollama_model.trim().is_empty() {
        let url = format!("{}/api/generate", request.ollama_url.trim().trim_end_matches('/'));
        let response = client
            .post(url)
            .json(&serde_json::json!({
                "model": request.ollama_model,
                "prompt": prompt.clone(),
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
async fn fetch_retro_achievements(
    request: RetroAchievementsRequest,
) -> Result<Vec<serde_json::Value>, String> {
    if request.username.trim().is_empty() || request.api_key.trim().is_empty() {
        return Ok(Vec::new());
    }

    let client = reqwest::Client::builder()
        .user_agent("Snext/0.1 RetroAchievements integration")
        .build()
        .map_err(|error| error.to_string())?;

    let count = request.count.unwrap_or(8).min(50).to_string();
    let username = request.username.trim().to_string();
    let api_key = request.api_key.trim().to_string();
    let recent_response = client
        .get("https://retroachievements.org/API/API_GetUserRecentlyPlayedGames.php")
        .query(&[
            ("u", username.as_str()),
            ("y", api_key.as_str()),
            ("c", count.as_str()),
        ])
        .send()
        .await
        .map_err(|error| error.to_string())?;

    if !recent_response.status().is_success() {
        return Err(format!(
            "RetroAchievements respondió {} al consultar los juegos recientes",
            recent_response.status()
        ));
    }

    let recent_games = recent_response
        .json::<Vec<serde_json::Value>>()
        .await
        .map_err(|error| error.to_string())?;

    let mut enriched_games = Vec::with_capacity(recent_games.len());
    for game in recent_games.into_iter().take(8) {
        let game_id = game
            .get("GameID")
            .and_then(serde_json::Value::as_u64)
            .or_else(|| game.get("ID").and_then(serde_json::Value::as_u64));

        let Some(game_id) = game_id else {
            enriched_games.push(game);
            continue;
        };

        let details_response = client
            .get("https://retroachievements.org/API/API_GetGameInfoAndUserProgress.php")
            .query(&[
                ("g", game_id.to_string()),
                ("u", username.clone()),
                ("y", api_key.clone()),
                ("a", "1".to_string()),
            ])
            .send()
            .await
            .map_err(|error| error.to_string())?;

        if details_response.status().is_success() {
            if let Ok(mut details) = details_response.json::<serde_json::Value>().await {
                // Keep the user's progress fields from the recent-games response
                // when the game endpoint only returns set metadata.
                if let (Some(details_object), Some(recent_object)) =
                    (details.as_object_mut(), game.as_object())
                {
                    for (key, value) in recent_object {
                        details_object
                            .entry(key.clone())
                            .or_insert_with(|| value.clone());
                    }
                }
                enriched_games.push(details);
                continue;
            }
        }

        enriched_games.push(game);
    }

    Ok(enriched_games)
}

fn json_string_value(value: Option<&serde_json::Value>) -> Option<String> {
    value
        .and_then(serde_json::Value::as_str)
        .map(str::trim)
        .filter(|text| !text.is_empty())
        .map(str::to_string)
}

async fn steam_grid_json(
    client: &reqwest::Client,
    url: reqwest::Url,
    api_key: &str,
) -> Result<serde_json::Value, String> {
    let response = client
        .get(url)
        .bearer_auth(api_key)
        .header("Accept", "application/json")
        .send()
        .await
        .map_err(|error| error.to_string())?;

    if !response.status().is_success() {
        return Err(format!("SteamGridDB respondió {}", response.status()));
    }

    response
        .json::<serde_json::Value>()
        .await
        .map_err(|error| error.to_string())
}

fn normalized_game_title(title: &str) -> String {
    title
        .to_ascii_lowercase()
        .replace(&['’', '\'', '+', '&'][..], " ")
        .chars()
        .map(|character| if character.is_ascii_alphanumeric() { character } else { ' ' })
        .collect::<String>()
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

fn steam_grid_match_score(target: &str, candidate: &str) -> usize {
    let target = normalized_game_title(target);
    let candidate = normalized_game_title(candidate);
    if target == candidate {
        return 0;
    }
    let target_tokens: std::collections::HashSet<&str> = target.split_whitespace().collect();
    let candidate_tokens: std::collections::HashSet<&str> = candidate.split_whitespace().collect();
    let missing = target_tokens.difference(&candidate_tokens).count();
    let extra = candidate_tokens.difference(&target_tokens).count();
    1 + missing * 3 + extra
}

fn json_u64(value: Option<&serde_json::Value>) -> Option<u64> {
    value
        .and_then(serde_json::Value::as_u64)
        .or_else(|| value.and_then(serde_json::Value::as_str)?.parse().ok())
}

fn json_string_for_keys(value: &serde_json::Value, keys: &[&str]) -> Option<String> {
    match value {
        serde_json::Value::Object(object) => {
            for key in keys {
                if let Some(text) = object.get(*key).and_then(serde_json::Value::as_str) {
                    if !text.trim().is_empty() {
                        return Some(text.to_string());
                    }
                }
            }
            object.values().find_map(|child| json_string_for_keys(child, keys))
        }
        serde_json::Value::Array(items) => items.iter().find_map(|child| json_string_for_keys(child, keys)),
        _ => None,
    }
}

fn screen_scraper_media_url(
    value: &serde_json::Value,
    preferred_types: &[&str],
) -> Option<String> {
    match value {
        serde_json::Value::Object(object) => {
            let media_type = object
                .get("type")
                .or_else(|| object.get("nom"))
                .and_then(serde_json::Value::as_str)
                .unwrap_or_default()
                .to_ascii_lowercase();
            if let Some(url) = object.get("url").and_then(serde_json::Value::as_str) {
                if preferred_types.iter().any(|kind| media_type.contains(kind)) {
                    return Some(url.to_string());
                }
            }
            object.values().find_map(|child| screen_scraper_media_url(child, preferred_types))
        }
        serde_json::Value::Array(items) => items.iter().find_map(|child| screen_scraper_media_url(child, preferred_types)),
        _ => None,
    }
}

fn screen_scraper_system_id(platform: &str) -> Option<&'static str> {
    let platform = platform.to_ascii_lowercase();
    if platform.contains("switch") || platform.contains("ryujinx") {
        return Some("162");
    }
    if platform.contains("playstation 2") || platform.contains("pcsx2") {
        return Some("58");
    }
    if platform.contains("playstation") || platform.contains("psx") {
        return Some("57");
    }
    if platform.contains("gamecube") || platform.contains("dolphin") {
        return Some("13");
    }
    if platform.contains("nintendo 64") || platform.contains("n64") {
        return Some("14");
    }
    if platform.contains("super nintendo") || platform.contains("snes") {
        return Some("6");
    }
    if platform.contains("nes") {
        return Some("3");
    }
    None
}

fn xml_tag_value(entry: &str, tag: &str) -> Option<String> {
    let open = format!("<{tag}>");
    let close = format!("</{tag}>");
    let start = entry.find(&open)? + open.len();
    let end = entry[start..].find(&close)? + start;
    let value = entry[start..end]
        .trim()
        .strip_prefix("<![CDATA[")
        .unwrap_or(entry[start..end].trim())
        .strip_suffix("]]>")
        .unwrap_or(entry[start..end].trim())
        .trim();
    if value.is_empty() {
        None
    } else {
        Some(
            value
                .replace("&amp;", "&")
                .replace("&apos;", "'")
                .replace("&quot;", "\"")
                .replace("&lt;", "<")
                .replace("&gt;", ">"),
        )
    }
}

fn media_file_name(value: &str) -> Option<&str> {
    let path = value
        .trim()
        .split('?')
        .next()
        .unwrap_or_default()
        .trim_end_matches('/');
    Path::new(path).file_name().and_then(|name| name.to_str())
}

fn find_local_media_file(root: &Path, file_name: &str) -> Option<PathBuf> {
    if !root.is_dir() {
        return None;
    }

    let target = file_name.to_ascii_lowercase();
    let target_stem = Path::new(file_name)
        .file_stem()
        .and_then(|stem| stem.to_str())
        .map(normalized_game_title)
        .unwrap_or_default();
    let mut pending = vec![(root.to_path_buf(), 0usize)];
    let mut visited = 0usize;

    while let Some((directory, depth)) = pending.pop() {
        if depth > 7 || visited >= 25_000 {
            continue;
        }
        let Ok(entries) = fs::read_dir(&directory) else {
            continue;
        };
        for entry in entries.filter_map(Result::ok) {
            visited += 1;
            let path = entry.path();
            if path.is_dir() {
                pending.push((path, depth + 1));
                continue;
            }
            if !path.is_file() {
                continue;
            }
            let Some(name) = path.file_name().and_then(|name| name.to_str()) else {
                continue;
            };
            if name.eq_ignore_ascii_case(&target) {
                return Some(path);
            }
            let candidate_stem = path
                .file_stem()
                .and_then(|stem| stem.to_str())
                .map(normalized_game_title)
                .unwrap_or_default();
            if !target_stem.is_empty() && candidate_stem == target_stem {
                return Some(path);
            }
        }
    }
    None
}

fn local_media_roots() -> Vec<PathBuf> {
    let home = std::env::var("HOME").unwrap_or_else(|_| "/var/home/osanchez".into());
    let cache_root = std::env::var("XDG_CACHE_HOME")
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from(&home).join(".cache"));
    [
        PathBuf::from(&home).join("ES-DE"),
        PathBuf::from(&home).join("Emulation"),
        PathBuf::from(&home).join(".emulationstation"),
        PathBuf::from(&home).join(".local/share/snext"),
        cache_root.join("snext"),
    ]
    .into_iter()
    .collect()
}

fn allowed_local_media_path(path: &Path) -> bool {
    let Ok(canonical_path) = path.canonicalize() else {
        return false;
    };

    local_media_roots().into_iter().any(|root| {
        root.canonicalize()
            .map(|canonical_root| canonical_path.starts_with(canonical_root))
            .unwrap_or(false)
    })
}

fn path_to_file_url(path: &Path) -> Option<String> {
    if !allowed_local_media_path(path) {
        return None;
    }
    reqwest::Url::from_file_path(path).ok().map(|url| url.to_string())
}

fn image_content_type(path: &Path) -> &'static str {
    match path
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase()
        .as_str()
    {
        "jpg" | "jpeg" => "image/jpeg",
        "png" => "image/png",
        "webp" => "image/webp",
        "gif" => "image/gif",
        "avif" => "image/avif",
        "bmp" => "image/bmp",
        "svg" => "image/svg+xml",
        _ => "image/png",
    }
}

fn game_art_cache_dir() -> PathBuf {
    let home = std::env::var("HOME").unwrap_or_else(|_| "/var/home/osanchez".into());
    std::env::var("XDG_CACHE_HOME")
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from(home).join(".cache"))
        .join("snext")
        .join("game-art")
}

fn safe_art_cache_key(title: &str) -> String {
    let normalized = normalized_game_title(title);
    if normalized.is_empty() {
        "unknown-game".into()
    } else {
        normalized.replace(' ', "-")
    }
}

fn cache_file_extension(path: &Path) -> &str {
    path.extension()
        .and_then(|extension| extension.to_str())
        .filter(|extension| !extension.is_empty())
        .unwrap_or("img")
}

fn cached_game_art_url(title: &str, role: &str, index: usize) -> Option<String> {
    let cache_dir = game_art_cache_dir();
    let prefix = format!("{}-{}-{}.", safe_art_cache_key(title), role, index);
    fs::read_dir(cache_dir)
        .ok()?
        .filter_map(Result::ok)
        .map(|entry| entry.path())
        .find(|path| {
            path.is_file()
                && path
                    .file_name()
                    .and_then(|name| name.to_str())
                    .is_some_and(|name| name.starts_with(&prefix))
        })
        .and_then(|path| path_to_file_url(&path))
}

fn cache_local_game_art(source: &Path, title: &str, role: &str, index: usize) -> Option<String> {
    if !source.is_file() || !allowed_local_media_path(source) {
        return None;
    }
    let cache_dir = game_art_cache_dir();
    fs::create_dir_all(&cache_dir).ok()?;
    let file_name = format!(
        "{}-{}-{}.{}",
        safe_art_cache_key(title),
        role,
        index,
        cache_file_extension(source)
    );
    let target = cache_dir.join(file_name);
    if source != target {
        fs::copy(source, &target).ok()?;
    }
    path_to_file_url(&target)
}

fn cache_local_asset_url(url: &str, title: &str, role: &str, index: usize) -> Option<String> {
    let parsed = reqwest::Url::parse(url).ok()?;
    if parsed.scheme() != "file" {
        return Some(url.to_string());
    }
    let source = parsed.to_file_path().ok()?;
    cache_local_game_art(&source, title, role, index)
}

fn cache_local_art_response(response: &mut SteamGridArtResponse, title: &str) {
    if let Some(url) = response.cover_image.clone() {
        if let Some(cached) = cache_local_asset_url(&url, title, "cover", 0) {
            response.cover_image = Some(cached);
        }
    }
    if let Some(url) = response.logo.clone() {
        if let Some(cached) = cache_local_asset_url(&url, title, "logo", 0) {
            response.logo = Some(cached);
        }
    }
    let original_heroes = response.hero_images.clone();
    let original_hero = response.hero_image.clone();
    let cached_heroes: Vec<String> = original_heroes
        .iter()
        .enumerate()
        .filter_map(|(index, url)| cache_local_asset_url(url, title, "hero", index))
        .collect();
    if cached_heroes.is_empty() {
        response.hero_images = original_heroes;
        response.hero_image = original_hero.as_deref().and_then(|url| {
            cache_local_asset_url(url, title, "hero", 0).or_else(|| Some(url.to_string()))
        });
    } else {
        response.hero_images = cached_heroes;
        response.hero_image = response.hero_images.first().cloned();
    }
}

fn remote_game_art_host_allowed(url: &reqwest::Url) -> bool {
    let host = url.host_str().unwrap_or_default().to_ascii_lowercase();
    host == "steamgriddb.com"
        || host.ends_with(".steamgriddb.com")
        || (host == "s3.amazonaws.com" && url.path().starts_with("/steamgriddb/"))
        || host == "screenscraper.fr"
        || host.ends_with(".screenscraper.fr")
        || host.ends_with(".wikipedia.org")
        || host.ends_with(".wikimedia.org")
}

fn remote_image_extension(content_type: &str, url: &reqwest::Url) -> &str {
    if content_type.contains("png") {
        "png"
    } else if content_type.contains("webp") {
        "webp"
    } else if content_type.contains("gif") {
        "gif"
    } else if content_type.contains("avif") {
        "avif"
    } else if content_type.contains("jpeg") || content_type.contains("jpg") {
        "jpg"
    } else {
        url.path()
            .rsplit('.')
            .next()
            .filter(|extension| matches!(*extension, "jpg" | "jpeg" | "png" | "webp" | "gif" | "avif"))
            .unwrap_or("img")
    }
}

async fn cache_remote_game_art(
    client: &reqwest::Client,
    source_url: &str,
    title: &str,
    role: &str,
    index: usize,
) -> Option<String> {
    if let Some(cached) = cached_game_art_url(title, role, index) {
        return Some(cached);
    }
    let parsed = reqwest::Url::parse(source_url).ok()?;
    if parsed.scheme() == "file" {
        return cache_local_asset_url(source_url, title, role, index);
    }
    if parsed.scheme() != "https" || !remote_game_art_host_allowed(&parsed) {
        return None;
    }
    let response = client.get(parsed.clone()).send().await.ok()?;
    if !response.status().is_success() {
        return None;
    }
    let content_type = response
        .headers()
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .unwrap_or_default()
        .to_ascii_lowercase();
    if !content_type.starts_with("image/") {
        return None;
    }
    if response.content_length().is_some_and(|length| length > 12 * 1024 * 1024) {
        return None;
    }
    let bytes = response.bytes().await.ok()?;
    if bytes.is_empty() || bytes.len() > 12 * 1024 * 1024 {
        return None;
    }
    let cache_dir = game_art_cache_dir();
    fs::create_dir_all(&cache_dir).ok()?;
    let target = cache_dir.join(format!(
        "{}-{}-{}.{}",
        safe_art_cache_key(title),
        role,
        index,
        remote_image_extension(&content_type, &parsed)
    ));
    fs::write(&target, bytes).ok()?;
    path_to_file_url(&target)
}

async fn cache_remote_art_response(
    response: &mut SteamGridArtResponse,
    client: &reqwest::Client,
    title: &str,
) {
    if let Some(url) = response.cover_image.clone() {
        if let Some(cached) = cache_remote_game_art(client, &url, title, "cover", 0).await {
            response.cover_image = Some(cached);
        }
    }
    if let Some(url) = response.logo.clone() {
        if let Some(cached) = cache_remote_game_art(client, &url, title, "logo", 0).await {
            response.logo = Some(cached);
        }
    }
    let original_heroes = response.hero_images.clone();
    let original_hero = response.hero_image.clone();
    let mut cached_heroes = Vec::new();
    for (index, url) in original_heroes.iter().enumerate() {
        if let Some(cached) = cache_remote_game_art(client, &url, title, "hero", index).await {
            push_unique_url(&mut cached_heroes, cached);
        }
    }
    if cached_heroes.is_empty() {
        if let Some(url) = response.hero_image.clone() {
            if let Some(cached) = cache_remote_game_art(client, &url, title, "hero", 0).await {
                cached_heroes.push(cached);
            }
        }
    }
    if cached_heroes.is_empty() {
        response.hero_images = original_heroes;
        response.hero_image = original_hero;
    } else {
        response.hero_images = cached_heroes;
        response.hero_image = response.hero_images.first().cloned();
    }
}

fn resolve_es_de_media_path(gamelist_path: &Path, raw_value: &str) -> Option<String> {
    let value = raw_value.trim();
    if value.is_empty() {
        return None;
    }
    if value.starts_with("https://") {
        return Some(value.to_string());
    }
    if value.starts_with("file://") {
        return reqwest::Url::parse(value)
            .ok()
            .and_then(|url| url.to_file_path().ok())
            .and_then(|path| path_to_file_url(&path));
    }

    let system = gamelist_path
        .parent()
        .and_then(Path::file_name)
        .and_then(|value| value.to_str())
        .unwrap_or_default();
    let home = std::env::var("HOME").unwrap_or_else(|_| "/var/home/osanchez".into());
    let es_de_root = PathBuf::from(&home).join("ES-DE");
    let emulation_media_root = PathBuf::from(&home).join("Emulation/tools/downloaded_media");
    let gamelist_dir = gamelist_path.parent().unwrap_or_else(|| Path::new("/"));
    let trimmed = value.trim_start_matches("./");
    let mut candidates = Vec::new();

    if let Some(rest) = value.strip_prefix("~/") {
        candidates.push(PathBuf::from(&home).join(rest));
    } else if value.starts_with('/') {
        candidates.push(PathBuf::from(value));
    } else {
        candidates.push(gamelist_dir.join(value));
        candidates.push(es_de_root.join(value));
        candidates.push(es_de_root.join("downloaded_media").join(system).join(trimmed));
        candidates.push(es_de_root.join("downloaded_media").join(system).join("covers").join(trimmed));
        candidates.push(es_de_root.join("downloaded_media").join(system).join("marquees").join(trimmed));
        candidates.push(es_de_root.join("downloaded_media").join(system).join("fanart").join(trimmed));
        candidates.push(es_de_root.join("downloaded_media").join(system).join("screenshots").join(trimmed));
        candidates.push(es_de_root.join("downloaded_media").join(system).join("titlescreens").join(trimmed));
        candidates.push(emulation_media_root.join(system).join(trimmed));
        candidates.push(emulation_media_root.join(system).join("covers").join(trimmed));
        candidates.push(emulation_media_root.join(system).join("marquees").join(trimmed));
        candidates.push(emulation_media_root.join(system).join("fanart").join(trimmed));
        candidates.push(emulation_media_root.join(system).join("screenshots").join(trimmed));
    }

    if let Some(url) = candidates
        .into_iter()
        .find(|candidate| candidate.is_file())
        .and_then(|candidate| path_to_file_url(&candidate))
    {
        return Some(url);
    }

    // ES-DE gamelist.xml sometimes keeps an old relative media path after the
    // scraper has reorganised files. Resolve the file name inside the known
    // media trees so a valid local scrape remains useful to Snext.
    let file_name = media_file_name(value)?;
    [
        es_de_root.join("downloaded_media").join(system),
        es_de_root.join("media").join(system),
        es_de_root.join("gamelists").join(system),
        emulation_media_root.join(system),
    ]
    .into_iter()
    .find_map(|root| find_local_media_file(&root, file_name))
    .and_then(|candidate| path_to_file_url(&candidate))
}

fn is_supported_image_path(path: &Path) -> bool {
    matches!(
        path.extension()
            .and_then(|extension| extension.to_str())
            .unwrap_or_default()
            .to_ascii_lowercase()
            .as_str(),
        "jpg" | "jpeg" | "png" | "webp" | "gif" | "bmp" | "avif"
    )
}

fn es_de_title_match_score(path: &Path, normalized_title: &str) -> usize {
    let stem = path
        .file_stem()
        .and_then(|value| value.to_str())
        .map(normalized_game_title)
        .unwrap_or_default();
    if stem.is_empty() || normalized_title.is_empty() {
        return 0;
    }
    if stem == normalized_title {
        return 220;
    }
    if stem.contains(normalized_title) || normalized_title.contains(&stem) {
        return 160;
    }
    let matched_words = normalized_title
        .split_whitespace()
        .filter(|word| word.len() > 2 && stem.contains(word))
        .count();
    if matched_words >= 2 {
        75 + matched_words * 12
    } else {
        0
    }
}

fn collect_es_de_media_by_title(system: &str, title: &str) -> (Option<PathBuf>, Vec<PathBuf>, Option<PathBuf>) {
    let normalized_title = normalized_game_title(title);
    let home = std::env::var("HOME").unwrap_or_else(|_| "/var/home/osanchez".into());
    let roots = [
        PathBuf::from(&home).join("ES-DE/downloaded_media").join(system),
        PathBuf::from(&home).join("ES-DE/media").join(system),
        PathBuf::from(&home).join("Emulation/tools/downloaded_media").join(system),
    ];
    let mut covers: Vec<(usize, PathBuf)> = Vec::new();
    let mut heroes: Vec<(usize, PathBuf)> = Vec::new();
    let mut logos: Vec<(usize, PathBuf)> = Vec::new();
    let mut visited = 0usize;

    for root in roots {
        if !root.is_dir() {
            continue;
        }
        let mut pending = vec![(root, 0usize)];
        while let Some((directory, depth)) = pending.pop() {
            if depth > 7 || visited >= 40_000 {
                continue;
            }
            let Ok(entries) = fs::read_dir(&directory) else {
                continue;
            };
            for entry in entries.filter_map(Result::ok) {
                visited += 1;
                let path = entry.path();
                if path.is_dir() {
                    pending.push((path, depth + 1));
                    continue;
                }
                if !path.is_file() || !is_supported_image_path(&path) {
                    continue;
                }
                let score = es_de_title_match_score(&path, &normalized_title);
                if score == 0 {
                    continue;
                }
                let location = path.to_string_lossy().to_ascii_lowercase();
                if location.contains("marquee") || location.contains("wheel") || location.contains("logo") {
                    logos.push((score + 80, path));
                } else if location.contains("fanart")
                    || location.contains("background")
                    || location.contains("screenshot")
                    || location.contains("titleshot")
                    || location.contains("backdrop")
                {
                    heroes.push((score + 70, path));
                } else if location.contains("cover")
                    || location.contains("box")
                    || location.contains("image")
                    || location.contains("miximage")
                {
                    covers.push((score + 60, path));
                } else {
                    covers.push((score, path.clone()));
                    heroes.push((score, path));
                }
            }
        }
    }

    covers.sort_by(|left, right| right.0.cmp(&left.0));
    heroes.sort_by(|left, right| right.0.cmp(&left.0));
    logos.sort_by(|left, right| right.0.cmp(&left.0));
    let cover = covers.first().map(|(_, path)| path.clone());
    let mut hero_paths = Vec::new();
    for (_, path) in heroes {
        if !hero_paths.iter().any(|existing| existing == &path) {
            hero_paths.push(path);
        }
        if hero_paths.len() == 3 {
            break;
        }
    }
    let logo = logos.first().map(|(_, path)| path.clone());
    (cover, hero_paths, logo)
}

fn es_de_gamelist_paths() -> Vec<PathBuf> {
    local_media_roots()
        .into_iter()
        .flat_map(|root| [root.join("gamelists")])
        .filter_map(|gamelists| fs::read_dir(gamelists).ok())
        .flat_map(|entries| entries.filter_map(Result::ok))
        .map(|entry| entry.path().join("gamelist.xml"))
        .filter(|path| path.is_file())
        .collect()
}

fn es_de_entry_score(
    title: &str,
    platform: &str,
    metadata_hint: &str,
    gamelist_path: &Path,
    entry: &str,
) -> usize {
    let normalized_title = normalized_game_title(title);
    let name = xml_tag_value(entry, "name").unwrap_or_default();
    let path = xml_tag_value(entry, "path").unwrap_or_default();
    let normalized_name = normalized_game_title(&name);
    let normalized_path = normalized_game_title(
        Path::new(&path)
            .file_stem()
            .and_then(|value| value.to_str())
            .unwrap_or(&path),
    );
    let mut score = 0;

    if normalized_name == normalized_title {
        score += 120;
    } else if !normalized_name.is_empty()
        && (normalized_name.contains(&normalized_title) || normalized_title.contains(&normalized_name))
    {
        score += 80;
    }

    if normalized_path == normalized_title {
        score += 90;
    } else if !normalized_path.is_empty()
        && (normalized_path.contains(&normalized_title) || normalized_title.contains(&normalized_path))
    {
        score += 55;
    }

    let lower_hint = metadata_hint.to_ascii_lowercase();
    let lower_path = path.to_ascii_lowercase();
    if !lower_hint.is_empty() && !lower_path.is_empty()
        && (lower_hint.contains(&lower_path) || lower_path.contains(&lower_hint))
    {
        score += 120;
    }

    let system = gamelist_path
        .parent()
        .and_then(Path::file_name)
        .and_then(|value| value.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase();
    let lower_platform = platform.to_ascii_lowercase();
    if !system.is_empty()
        && (lower_platform.contains(&system)
            || lower_hint.contains(&format!("/roms/{system}/"))
            || lower_hint.contains(&format!("\\roms\\{system}\\")))
    {
        score += 35;
    }

    score
}

#[tauri::command]
fn fetch_es_de_art(request: EsDeArtRequest) -> Result<SteamGridArtResponse, String> {
    let title = request.title.trim();
    if title.is_empty() {
        return Err("Falta el título para buscar en ES-DE".into());
    }

    let mut best: Option<(usize, PathBuf, String)> = None;
    for gamelist_path in es_de_gamelist_paths() {
        let Ok(xml) = fs::read_to_string(&gamelist_path) else {
            continue;
        };
        let mut offset = 0;
        while let Some(start) = xml[offset..].find("<game") {
            let absolute_start = offset + start;
            let Some(open_end) = xml[absolute_start..].find('>') else {
                break;
            };
            if !xml[absolute_start..absolute_start + open_end + 1].starts_with("<game") {
                offset = absolute_start + open_end + 1;
                continue;
            }
            let Some(end) = xml[absolute_start..].find("</game>") else {
                break;
            };
            let absolute_end = absolute_start + end + "</game>".len();
            let entry = &xml[absolute_start..absolute_end];
            let score = es_de_entry_score(
                title,
                &request.platform,
                &request.metadata_hint,
                &gamelist_path,
                entry,
            );
            if score > best.as_ref().map(|current| current.0).unwrap_or(0) {
                best = Some((score, gamelist_path.clone(), entry.to_string()));
            }
            offset = absolute_end;
        }
    }

    let Some((score, gamelist_path, entry)) = best else {
        return Err(format!("ES-DE no encontró {title}"));
    };
    if score < 55 {
        return Err(format!("ES-DE no encontró una coincidencia confiable para {title}"));
    }

    let matched_title = xml_tag_value(&entry, "name").unwrap_or_else(|| title.to_string());
    let description = xml_tag_value(&entry, "desc");
    let mut cover_image = xml_tag_value(&entry, "image")
        .or_else(|| xml_tag_value(&entry, "thumbnail"))
        .and_then(|value| resolve_es_de_media_path(&gamelist_path, &value));
    let mut logo = xml_tag_value(&entry, "marquee")
        .and_then(|value| resolve_es_de_media_path(&gamelist_path, &value));
    let hero_candidates = [
        xml_tag_value(&entry, "fanart"),
        xml_tag_value(&entry, "titleshot"),
        xml_tag_value(&entry, "screenshot"),
        xml_tag_value(&entry, "thumbnail"),
        xml_tag_value(&entry, "image"),
    ];
    let mut hero_images = Vec::new();
    for candidate in hero_candidates.into_iter().flatten() {
        if let Some(url) = resolve_es_de_media_path(&gamelist_path, &candidate) {
            push_unique_url(&mut hero_images, url);
        }
    }
    if cover_image.is_none() || hero_images.is_empty() || logo.is_none() {
        let system = gamelist_path
            .parent()
            .and_then(Path::file_name)
            .and_then(|value| value.to_str())
            .unwrap_or_default();
        let (discovered_cover, discovered_heroes, discovered_logo) =
            collect_es_de_media_by_title(system, &matched_title);
        if cover_image.is_none() {
            cover_image = discovered_cover.and_then(|path| path_to_file_url(&path));
        }
        if logo.is_none() {
            logo = discovered_logo.and_then(|path| path_to_file_url(&path));
        }
        for path in discovered_heroes {
            if let Some(url) = path_to_file_url(&path) {
                push_unique_url(&mut hero_images, url);
            }
        }
    }
    let hero_image = hero_images.first().cloned();

    if cover_image.is_none() && hero_image.is_none() && logo.is_none() && description.is_none() {
        return Err(format!("ES-DE encontró {matched_title}, pero sin arte ni descripción"));
    }

    let mut response = SteamGridArtResponse {
        hero_image,
        hero_images,
        cover_image,
        logo,
        description,
        matched_title,
        source: Some("ES-DE local".into()),
    };
    cache_local_art_response(&mut response, title);
    Ok(response)
}

fn steam_grid_title_candidates(title: &str) -> Vec<String> {
    let without_metadata = title
        .split('(')
        .next()
        .unwrap_or(title)
        .split('[')
        .next()
        .unwrap_or(title)
        .trim();
    let normalized = normalized_game_title(without_metadata);
    let corrected = without_metadata
        .replace("Knigth", "Knight")
        .replace("knigth", "knight")
        .replace("Odissey", "Odyssey")
        .replace("odissey", "odyssey")
        .replace("Bros Wonder", "Bros. Wonder");
    let mut candidates = vec![
        title.to_string(),
        without_metadata.to_string(),
        corrected,
        without_metadata.replace("Bowsers Fury", "Bowser's Fury"),
        without_metadata.replace("Bowser's Fury", "+ Bowser's Fury"),
        normalized.clone(),
    ];
    let punctuation_variant = without_metadata
        .split_whitespace()
        .map(|word| match word.to_ascii_lowercase().as_str() {
            "bros" => "Bros.",
            "dr" => "Dr.",
            "mr" => "Mr.",
            "ms" => "Ms.",
            _ => word,
        })
        .collect::<Vec<_>>()
        .join(" ");
    candidates.push(punctuation_variant);
    let words: Vec<&str> = without_metadata.split_whitespace().collect();
    for count in (2..=words.len().min(5)).rev() {
        candidates.push(words[..count].join(" "));
    }
    if normalized.starts_with("super mario 3d world") {
        candidates.push("Super Mario 3D World + Bowser's Fury".into());
        candidates.push("Super Mario 3D World".into());
    }
    if normalized.contains("hollow knigth") {
        candidates.push("Hollow Knight".into());
    }
    candidates.sort();
    candidates.dedup_by(|left, right| left.eq_ignore_ascii_case(right));
    candidates
}

fn known_steam_grid_game(title: &str) -> Option<(u64, &'static str)> {
    match normalized_game_title(title).as_str() {
        "super mario bros wonder" => Some((5409928, "Super Mario Bros. Wonder")),
        "super mario odyssey" => Some((5245268, "Super Mario Odyssey")),
        "super mario 3d world bowsers fury" => {
            Some((5266526, "Super Mario 3D World + Bowser's Fury"))
        }
        "hollow knight" | "hollow knigth" => Some((7545, "Hollow Knight")),
        _ => None,
    }
}

fn known_steam_grid_public_cover(title: &str) -> Option<&'static str> {
    match normalized_game_title(title).as_str() {
        "super mario bros wonder" => Some(
            "https://cdn2.steamgriddb.com/thumb/66da3b21fe18692332284c64e08b8e02.jpg",
        ),
        "super mario odyssey" => Some(
            "https://cdn2.steamgriddb.com/thumb/505870c8848f2d550944bf64008c9472.jpg",
        ),
        "super mario 3d world bowsers fury" => Some(
            "https://cdn2.steamgriddb.com/thumb/f68d0f2ede0595c4f3b7932f082c7375.jpg",
        ),
        _ => None,
    }
}

async fn public_steam_grid_game_id(
    client: &reqwest::Client,
    candidate: &str,
) -> Option<(u64, String)> {
    let mut url = reqwest::Url::parse("https://www.steamgriddb.com/search/games").ok()?;
    url.query_pairs_mut().append_pair("term", candidate);
    let html = client.get(url).send().await.ok()?.text().await.ok()?;
    let marker = "/game/";
    let start = html.find(marker)? + marker.len();
    let id_text = html[start..].split(|character: char| !character.is_ascii_digit()).next()?;
    let id = id_text.parse().ok()?;
    Some((id, candidate.to_string()))
}

fn steam_grid_url(path: &[&str]) -> Result<reqwest::Url, String> {
    let mut url = reqwest::Url::parse("https://www.steamgriddb.com/api/v2/")
        .map_err(|error| error.to_string())?;
    {
        let mut segments = url
            .path_segments_mut()
            .map_err(|_| "No se pudo construir la URL de SteamGridDB".to_string())?;
        for segment in path {
            segments.push(segment);
        }
    }
    Ok(url)
}

fn steam_grid_asset_url(path: &[&str], dimensions: &[&str]) -> Result<reqwest::Url, String> {
    let mut url = steam_grid_url(path)?;
    if !dimensions.is_empty() {
        url.query_pairs_mut()
            .append_pair("dimensions", &dimensions.join(","));
    }
    Ok(url)
}

async fn steam_grid_search_results(
    client: &reqwest::Client,
    api_key: &str,
    title: &str,
) -> Vec<SteamGridSearchResult> {
    let mut results: Vec<SteamGridSearchResult> = Vec::new();
    for candidate in steam_grid_title_candidates(title) {
        let search = match steam_grid_json(
            client,
            match steam_grid_url(&["search", "autocomplete", &candidate]) {
                Ok(url) => url,
                Err(_) => continue,
            },
            api_key,
        )
        .await
        {
            Ok(value) => value,
            Err(_) => continue,
        };

        if let Some(matches) = search.get("data").and_then(serde_json::Value::as_array) {
            for item in matches {
                let Some(name) = item.get("name").and_then(serde_json::Value::as_str) else {
                    continue;
                };
                let Some(id) = json_u64(item.get("id")) else {
                    continue;
                };
                if results.iter().any(|result| result.id == id) {
                    continue;
                }
                let release_date = json_string_value(item.get("release_date"))
                    .or_else(|| json_string_value(item.get("releaseDate")));
                let types = item
                    .get("types")
                    .and_then(serde_json::Value::as_array)
                    .map(|values| {
                        values
                            .iter()
                            .filter_map(serde_json::Value::as_str)
                            .map(str::to_string)
                            .collect()
                    })
                    .unwrap_or_default();
                results.push(SteamGridSearchResult {
                    id,
                    name: name.to_string(),
                    release_date,
                    types,
                });
            }
        }
    }

    if let Some((id, name)) = known_steam_grid_game(title) {
        if !results.iter().any(|result| result.id == id) {
            results.push(SteamGridSearchResult {
                id,
                name: name.to_string(),
                release_date: None,
                types: Vec::new(),
            });
        }
    }

    results.sort_by_key(|result| steam_grid_match_score(title, &result.name));
    results.truncate(8);
    results
}

fn extract_steam_grid_cdn_urls(html: &str) -> Vec<String> {
    let mut urls = Vec::new();
    for marker in ["https:\\/\\/cdn", "https://cdn"] {
        let mut offset = 0;
        while let Some(start) = html[offset..].find(marker) {
            let absolute_start = offset + start;
            let tail = &html[absolute_start..];
            let raw = tail
            .split(|character| matches!(character, '"' | '\'' | '<' | '>' | ')' | ' '))
            .next()
            .unwrap_or_default()
            .replace("\\/", "/")
                .replace("\\u0026", "&")
                .trim_end_matches('\\')
                .to_string();
            let lower = raw.to_ascii_lowercase();
            if raw.contains("steamgriddb.com")
                && !raw.ends_with('/')
                && [".jpg", ".jpeg", ".png", ".webp"]
                    .iter()
                    .any(|extension| lower.contains(extension))
                && !urls.iter().any(|url| url == &raw)
            {
                urls.push(raw);
            }
            offset = absolute_start + marker.len();
        }
    }
    urls
}

async fn remote_image_url_ok(client: &reqwest::Client, url: &str) -> bool {
    let parsed = match reqwest::Url::parse(url) {
        Ok(value) => value,
        Err(_) => return false,
    };
    let host = parsed.host_str().unwrap_or_default().to_ascii_lowercase();
    let allowed = host == "media.retroachievements.org"
        || host == "steamgriddb.com"
        || host.ends_with(".steamgriddb.com")
        || (host == "s3.amazonaws.com" && parsed.path().starts_with("/steamgriddb/"))
        || host == "screenscraper.fr"
        || host.ends_with(".screenscraper.fr")
        || host.ends_with(".wikipedia.org")
        || host.ends_with(".wikimedia.org");
    if parsed.scheme() != "https" || !allowed {
        return false;
    }

    let head_ok = client
        .head(url)
        .send()
        .await
        .ok()
        .filter(|response| response.status().is_success())
        .and_then(|response| {
            response
                .headers()
                .get(reqwest::header::CONTENT_TYPE)
                .and_then(|value| value.to_str().ok())
                .map(|content_type| content_type.starts_with("image/"))
        })
        .unwrap_or(false);
    if head_ok {
        return true;
    }

    client
        .get(url)
        .header(reqwest::header::RANGE, "bytes=0-64")
        .send()
        .await
        .ok()
        .filter(|response| response.status().is_success())
        .and_then(|response| {
            response
                .headers()
                .get(reqwest::header::CONTENT_TYPE)
                .and_then(|value| value.to_str().ok())
                .map(|content_type| content_type.starts_with("image/"))
        })
        .unwrap_or(false)
}

async fn first_valid_asset_url(
    client: &reqwest::Client,
    data: Option<&serde_json::Value>,
) -> Option<String> {
    valid_asset_urls(client, data, 1).await.into_iter().next()
}

async fn valid_asset_urls(
    client: &reqwest::Client,
    data: Option<&serde_json::Value>,
    limit: usize,
) -> Vec<String> {
    if limit == 0 {
        return Vec::new();
    }

    let mut urls = Vec::new();
    let Some(assets) = data
        .and_then(|value| value.get("data"))
        .and_then(serde_json::Value::as_array)
    else {
        return urls;
    };
    for asset in assets {
        let Some(url) = asset.get("url").and_then(serde_json::Value::as_str) else {
            continue;
        };
        if urls.iter().any(|existing| existing == url) {
            continue;
        }
        if remote_image_url_ok(client, url).await {
            urls.push(url.to_string());
            if urls.len() >= limit {
                break;
            }
        }
    }
    urls
}

fn push_unique_url(urls: &mut Vec<String>, url: String) {
    if !urls.iter().any(|existing| existing == &url) {
        urls.push(url);
    }
}

fn wikipedia_title_candidates(title: &str, matched_title: &str) -> Vec<String> {
    let mut candidates = Vec::new();
    for candidate in [matched_title, title] {
        for value in [
            candidate.to_string(),
            candidate.replace(" + ", " "),
            candidate.replace(" + ", ": "),
            candidate
                .split(':')
                .next()
                .unwrap_or(candidate)
                .trim()
                .to_string(),
        ] {
            if !value.is_empty()
                && !candidates
                    .iter()
                    .any(|existing: &String| existing.eq_ignore_ascii_case(&value))
            {
                candidates.push(value);
            }
        }
    }

    for candidate in steam_grid_title_candidates(title) {
        if !candidates
            .iter()
            .any(|existing| existing.eq_ignore_ascii_case(&candidate))
        {
            candidates.push(candidate);
        }
    }

    candidates
}

async fn public_steam_grid_asset(
    client: &reqwest::Client,
    game_id: u64,
    section: &str,
) -> Option<String> {
    let url = format!("https://www.steamgriddb.com/game/{game_id}/{section}");
    let html = client.get(url).send().await.ok()?.text().await.ok()?;
    for url in extract_steam_grid_cdn_urls(&html) {
        if remote_image_url_ok(client, &url).await {
            return Some(url);
        }
    }
    None
}

async fn wikipedia_description(
    client: &reqwest::Client,
    title: &str,
    language: &str,
) -> Option<String> {
    let host_language = match language {
        "en" => "en",
        "pt" => "pt",
        _ => "es",
    };
    let mut url = reqwest::Url::parse(&format!(
        "https://{host_language}.wikipedia.org/api/rest_v1/page/summary/"
    ))
    .ok()?;
    url.path_segments_mut().ok()?.push(title);
    let data = client
        .get(url)
        .header("Accept", "application/json")
        .send()
        .await
        .ok()?
        .json::<serde_json::Value>()
        .await
        .ok()?;
    json_string_value(data.get("extract"))
}

async fn wikipedia_image(
    client: &reqwest::Client,
    title: &str,
    language: &str,
) -> Option<String> {
    let host_language = match language {
        "en" => "en",
        "pt" => "pt",
        _ => "es",
    };
    let mut url = reqwest::Url::parse(&format!(
        "https://{host_language}.wikipedia.org/api/rest_v1/page/summary/"
    ))
    .ok()?;
    url.path_segments_mut().ok()?.push(title);
    let data = client
        .get(url)
        .header("Accept", "application/json")
        .send()
        .await
        .ok()?
        .json::<serde_json::Value>()
        .await
        .ok()?;
    data.get("originalimage")
        .and_then(|value| value.get("source"))
        .and_then(serde_json::Value::as_str)
        .or_else(|| {
            data.get("thumbnail")
                .and_then(|value| value.get("source"))
                .and_then(serde_json::Value::as_str)
        })
        .map(str::to_string)
}

fn xml_escape(value: &str) -> String {
    value
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&apos;")
}

fn create_generated_game_art(title: &str, platform: &str) -> Option<String> {
    let cache_dir = game_art_cache_dir();
    fs::create_dir_all(&cache_dir).ok()?;
    let target = cache_dir.join(format!("{}-fallback.svg", safe_art_cache_key(title)));
    let display_title = xml_escape(title);
    let display_platform = xml_escape(platform);
    let svg = format!(
        r#"<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#11192f"/><stop offset="0.55" stop-color="#3b246f"/><stop offset="1" stop-color="#0e7186"/></linearGradient></defs>
<rect width="1200" height="630" fill="url(#bg)"/><circle cx="910" cy="165" r="125" fill="#46d9ef" fill-opacity=".25"/><circle cx="1030" cy="470" r="190" fill="#9c6bff" fill-opacity=".22"/>
<text x="76" y="110" fill="#5eeaff" font-family="sans-serif" font-size="25" font-weight="700" letter-spacing="4">SNEXT · ARTE LOCAL</text>
<text x="76" y="292" fill="white" font-family="sans-serif" font-size="78" font-weight="800">{display_title}</text>
<text x="76" y="360" fill="#c6d2e9" font-family="sans-serif" font-size="31">{display_platform}</text>
</svg>"#
    );
    fs::write(&target, svg).ok()?;
    path_to_file_url(&target)
}

#[tauri::command]
async fn fetch_public_game_art(
    request: PublicGameArtRequest,
) -> Result<SteamGridArtResponse, String> {
    let title = request.title.trim();
    if title.is_empty() {
        return Err("Falta el título del juego".into());
    }
    let client = reqwest::Client::builder()
        .user_agent("Snext/0.3 public game art")
        .build()
        .map_err(|error| error.to_string())?;
    let mut description = None;
    let mut image = None;
    for language in [request.language.as_str(), "en"] {
        for candidate in wikipedia_title_candidates(title, title) {
            if description.is_none() {
                description = wikipedia_description(&client, &candidate, language).await;
            }
            if image.is_none() {
                image = wikipedia_image(&client, &candidate, language).await;
            }
            if image.is_some() && description.is_some() {
                break;
            }
        }
        if image.is_some() && description.is_some() {
            break;
        }
    }

    let mut response = SteamGridArtResponse {
        hero_image: image.clone(),
        hero_images: image.into_iter().collect(),
        cover_image: None,
        logo: None,
        description,
        matched_title: title.to_string(),
        source: Some("Wikimedia".into()),
    };
    cache_remote_art_response(&mut response, &client, title).await;
    if response.hero_image.is_none() && response.cover_image.is_none() {
        let fallback = create_generated_game_art(title, &request.platform)
            .ok_or_else(|| "No se pudo crear el arte local de respaldo".to_string())?;
        response.hero_image = Some(fallback.clone());
        response.hero_images = vec![fallback.clone()];
        response.cover_image = Some(fallback);
        response.source = Some("Snext local".into());
    } else if response.cover_image.is_none() {
        response.cover_image = response.hero_image.clone();
    }
    Ok(response)
}

#[tauri::command]
async fn search_steam_grid_games(
    request: SteamGridSearchRequest,
) -> Result<Vec<SteamGridSearchResult>, String> {
    let api_key = request
        .api_key
        .trim()
        .strip_prefix("Bearer ")
        .unwrap_or(request.api_key.trim());
    let title = request.title.trim();
    if api_key.is_empty() || title.is_empty() {
        return Err("Faltan el título o la API key de SteamGridDB".into());
    }

    let client = reqwest::Client::builder()
        .user_agent("Snext/0.3 SteamGridDB search")
        .build()
        .map_err(|error| error.to_string())?;

    Ok(steam_grid_search_results(&client, api_key, title).await)
}

#[tauri::command]
async fn fetch_steam_grid_art(
    request: SteamGridRequest,
) -> Result<SteamGridArtResponse, String> {
    let api_key = request
        .api_key
        .trim()
        .strip_prefix("Bearer ")
        .unwrap_or(request.api_key.trim());
    let title = request.title.trim();
    if api_key.is_empty() || title.is_empty() {
        return Err("Faltan el título o la API key de SteamGridDB".into());
    }

    let client = reqwest::Client::builder()
        .user_agent("Snext/0.3 SteamGridDB integration")
        .build()
        .map_err(|error| error.to_string())?;
    let mut matched_title = title.to_string();
    let game_id = if let Some(selected_game_id) = request.selected_game_id {
        selected_game_id
    } else {
        let results = steam_grid_search_results(&client, api_key, title).await;
        if let Some(best_match) = results.first() {
            matched_title = best_match.name.clone();
            best_match.id
        } else if let Some((id, name)) = known_steam_grid_game(title) {
            matched_title = name.to_string();
            id
        } else {
            let mut public_match = None;
            for candidate in steam_grid_title_candidates(title) {
                if let Some((id, name)) = public_steam_grid_game_id(&client, &candidate).await {
                    public_match = Some((id, name));
                    break;
                }
            }
            let Some((id, name)) = public_match else {
                return Err(format!("SteamGridDB no encontró {title}"));
            };
            matched_title = name;
            id
        }
    };
    let id = game_id.to_string();
    let game_details = steam_grid_json(
        &client,
        steam_grid_url(&["games", "id", &id])?,
        api_key,
    )
    .await
    .ok();
    let heroes = steam_grid_json(
        &client,
        steam_grid_asset_url(&["heroes", "game", &id], &["1920x620", "3840x1240"])?,
        api_key,
    )
    .await
    .ok();
    let landscape_grids = steam_grid_json(
        &client,
        steam_grid_asset_url(&["grids", "game", &id], &["920x430", "1920x620"])?,
        api_key,
    )
    .await
    .ok();
    let poster_grids = steam_grid_json(
        &client,
        steam_grid_asset_url(&["grids", "game", &id], &["600x900", "342x482"])?,
        api_key,
    )
    .await
    .ok();
    let logos = steam_grid_json(
        &client,
        steam_grid_url(&["logos", "game", &id])?,
        api_key,
    )
    .await
    .ok();

    let mut hero_images = valid_asset_urls(&client, heroes.as_ref(), 3).await;
    if hero_images.len() < 3 {
        for url in valid_asset_urls(&client, landscape_grids.as_ref(), 3).await {
            push_unique_url(&mut hero_images, url);
            if hero_images.len() >= 3 {
                break;
            }
        }
    }
    let mut hero_image = hero_images.first().cloned();
    let mut cover_image = first_valid_asset_url(&client, poster_grids.as_ref()).await;
    let logo_candidates = valid_asset_urls(&client, logos.as_ref(), 6).await;
    let mut logo = logo_candidates
        .iter()
        .find(|url| !url.contains("/thumb/"))
        .cloned()
        .or_else(|| logo_candidates.first().cloned());
    let mut description = game_details
        .as_ref()
        .and_then(|value| value.get("data"))
        .and_then(|data| {
            json_string_value(data.get("description"))
                .or_else(|| json_string_value(data.get("summary")))
                .or_else(|| json_string_value(data.get("overview")))
        });
    if hero_image.is_none() {
        hero_image = public_steam_grid_asset(&client, game_id, "heroes").await;
        if let Some(url) = hero_image.clone() {
            push_unique_url(&mut hero_images, url);
        }
        if hero_image.is_none() {
            hero_image = public_steam_grid_asset(&client, game_id, "grids").await;
            if let Some(url) = hero_image.clone() {
                push_unique_url(&mut hero_images, url);
            }
        }
        if hero_image.is_none() {
            hero_image = known_steam_grid_public_cover(title).map(str::to_string);
            if let Some(url) = hero_image.clone() {
                push_unique_url(&mut hero_images, url);
            }
        }
    }
    if cover_image.is_none() {
        cover_image = public_steam_grid_asset(&client, game_id, "grids").await;
        if cover_image.is_none() {
            cover_image = known_steam_grid_public_cover(title).map(str::to_string);
        }
    }
    if logo.is_none() {
        logo = public_steam_grid_asset(&client, game_id, "logos").await;
    }
    if description.is_none() {
        let language = request.language.as_deref().unwrap_or("es");
        for description_language in [language, "en"] {
            for description_title in wikipedia_title_candidates(title, &matched_title) {
                if description.is_some() {
                    break;
                }
                description = wikipedia_description(&client, &description_title, description_language).await;
            }
        }
    }
    if hero_image.is_none() && cover_image.is_none() && logo.is_none() {
        return Err(format!("SteamGridDB no devolvió arte para {matched_title}"));
    }

    let mut response = SteamGridArtResponse {
        hero_image,
        hero_images,
        cover_image,
        logo,
        description,
        matched_title,
        source: Some("SteamGridDB".into()),
    };
    cache_remote_art_response(&mut response, &client, title).await;
    Ok(response)
}

#[tauri::command]
async fn fetch_screen_scraper_art(
    request: ScreenScraperRequest,
) -> Result<SteamGridArtResponse, String> {
    if request.dev_id.trim().is_empty()
        || request.dev_password.trim().is_empty()
        || request.title.trim().is_empty()
    {
        return Err("Faltan las credenciales o el título de ScreenScraper".into());
    }

    let mut url = reqwest::Url::parse("https://api.screenscraper.fr/api2/jeuInfos.php")
        .map_err(|error| error.to_string())?;
    {
        let mut query = url.query_pairs_mut();
        query
            .append_pair("devid", request.dev_id.trim())
            .append_pair("devpassword", request.dev_password.trim())
            .append_pair("softname", "Snext")
            .append_pair("output", "json")
            .append_pair("romnom", request.title.trim())
            .append_pair("langue", &request.language);
        if let Some(system_id) = screen_scraper_system_id(&request.platform) {
            query.append_pair("systemeid", system_id);
        }
        if !request.username.trim().is_empty() {
            query.append_pair("ssid", request.username.trim());
        }
        if !request.password.trim().is_empty() {
            query.append_pair("sspassword", request.password.trim());
        }
    }

    let response = reqwest::Client::builder()
        .user_agent("Snext/0.2 ScreenScraper integration")
        .build()
        .map_err(|error| error.to_string())?
        .get(url)
        .send()
        .await
        .map_err(|error| error.to_string())?;
    if !response.status().is_success() {
        return Err(format!("ScreenScraper respondió {}", response.status()));
    }
    let data = response
        .json::<serde_json::Value>()
        .await
        .map_err(|error| error.to_string())?;
    let matched_title = json_string_for_keys(&data, &["nom", "name", "title"])
        .unwrap_or_else(|| request.title.trim().to_string());
    let cover_image = screen_scraper_media_url(&data, &["box-2d", "box2d", "support"]);
    let hero_image = screen_scraper_media_url(&data, &["fanart", "background", "mix", "screenshot"]);
    let logo = screen_scraper_media_url(&data, &["wheel", "logo"]);
    if cover_image.is_none() && hero_image.is_none() && logo.is_none() {
        return Err(format!("ScreenScraper no devolvió arte para {matched_title}"));
    }

    let client = reqwest::Client::builder()
        .user_agent("Snext/0.3 ScreenScraper art cache")
        .build()
        .map_err(|error| error.to_string())?;
    let mut response = SteamGridArtResponse {
        hero_images: hero_image.iter().cloned().collect(),
        hero_image,
        cover_image,
        logo,
        description: json_string_for_keys(&data, &["descripcion", "description", "synopsis", "synopsis_en"]),
        matched_title,
        source: Some("ScreenScraper".into()),
    };
    cache_remote_art_response(&mut response, &client, request.title.trim()).await;
    Ok(response)
}

#[tauri::command]
async fn translate_text(request: TranslationRequest) -> Result<serde_json::Value, String> {
    if request.target_language == request.source_language || request.text.trim().is_empty() {
        return Ok(serde_json::json!({ "translated_text": request.text }));
    }

    let client = reqwest::Client::new();
    let mut google_url = reqwest::Url::parse("https://translate.googleapis.com/translate_a/single")
        .map_err(|error| error.to_string())?;
    google_url
        .query_pairs_mut()
        .append_pair("client", "gtx")
        .append_pair("sl", &request.source_language)
        .append_pair("tl", &request.target_language)
        .append_pair("dt", "t")
        .append_pair("q", &request.text);
    if let Ok(response) = client.get(google_url).send().await {
        if response.status().is_success() {
            if let Ok(data) = response.json::<serde_json::Value>().await {
                let translated = data
                    .get(0)
                    .and_then(serde_json::Value::as_array)
                    .map(|segments| {
                        segments
                            .iter()
                            .filter_map(|segment| segment.get(0).and_then(serde_json::Value::as_str))
                            .collect::<String>()
                    })
                    .filter(|value| !value.trim().is_empty());
                if let Some(translated) = translated {
                    return Ok(serde_json::json!({ "translated_text": translated }));
                }
            }
        }
    }

    let mut url = reqwest::Url::parse("https://api.mymemory.translated.net/get")
        .map_err(|error| error.to_string())?;
    url.query_pairs_mut()
        .append_pair("q", &request.text)
        .append_pair("langpair", &format!("{}|{}", request.source_language, request.target_language));
    let response = client
        .get(url)
        .header("User-Agent", "Snext/0.2.3")
        .send()
        .await
        .map_err(|error| error.to_string())?;
    if !response.status().is_success() {
        return Err(format!("El traductor respondió {}", response.status()));
    }
    let data = response
        .json::<MyMemoryResponse>()
        .await
        .map_err(|error| error.to_string())?;
    if data.response_status != Some(200) {
        return Err("Los traductores externos no están disponibles temporalmente".into());
    }
    let translated = data
        .response_data
        .and_then(|value| value.translated_text)
        .filter(|value| !value.trim().is_empty())
        .unwrap_or(request.text);
    Ok(serde_json::json!({ "translated_text": translated }))
}

#[tauri::command]
async fn fetch_remote_image(
    request: RemoteImageRequest,
) -> Result<RemoteImageResponse, String> {
    let url = reqwest::Url::parse(request.url.trim()).map_err(|error| error.to_string())?;
    if url.scheme() == "file" {
        let path = url
            .to_file_path()
            .map_err(|_| "La ruta local de imagen no es válida".to_string())?;
        if !allowed_local_media_path(&path) {
            return Err("La ruta local de imagen no está permitida".into());
        }
        let bytes = fs::read(&path).map_err(|error| error.to_string())?;
        if bytes.len() > 10 * 1024 * 1024 {
            return Err("La imagen supera el límite de 10 MB".into());
        }
        return Ok(RemoteImageResponse {
            data_url: format!(
                "data:{};base64,{}",
                image_content_type(&path),
                BASE64_STANDARD.encode(bytes)
            ),
        });
    }

    let host = url.host_str().unwrap_or_default().to_ascii_lowercase();
    let allowed = host == "media.retroachievements.org"
        || host == "steamgriddb.com"
        || host.ends_with(".steamgriddb.com")
        || (host == "s3.amazonaws.com" && url.path().starts_with("/steamgriddb/"))
        || host == "screenscraper.fr"
        || host.ends_with(".screenscraper.fr")
        || host.ends_with(".wikipedia.org")
        || host.ends_with(".wikimedia.org");
    if url.scheme() != "https" || !allowed {
        return Err("El origen de la imagen no está permitido".into());
    }
    if (host == "steamgriddb.com" || host.ends_with(".steamgriddb.com")) && url.path() == "/" {
        return Err("La URL de SteamGridDB no apunta a una imagen".into());
    }

    let response = reqwest::Client::builder()
        .user_agent("Snext/0.3 image proxy")
        .build()
        .map_err(|error| error.to_string())?
        .get(url)
        .send()
        .await
        .map_err(|error| error.to_string())?;
    if !response.status().is_success() {
        return Err(format!("La imagen respondió {}", response.status()));
    }

    let content_type = response
        .headers()
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .map(str::to_string)
        .ok_or_else(|| "La respuesta no declaró tipo de imagen".to_string())?;
    if !content_type.starts_with("image/") {
        return Err(format!("La respuesta no es imagen: {content_type}"));
    }
    let bytes = response.bytes().await.map_err(|error| error.to_string())?;
    if bytes.len() > 10 * 1024 * 1024 {
        return Err("La imagen supera el límite de 10 MB".into());
    }

    Ok(RemoteImageResponse {
        data_url: format!(
            "data:{content_type};base64,{}",
            BASE64_STANDARD.encode(bytes)
        ),
    })
}

fn listen_spotify_callback_blocking(
    request: SpotifyCallbackRequest,
) -> Result<SpotifyCallbackResponse, String> {
    let expected_state = request.state.trim().to_string();
    if expected_state.is_empty() {
        return Err("Falta el estado OAuth de Spotify".into());
    }

    let listener = TcpListener::bind("127.0.0.1:53127")
        .map_err(|error| format!("No se pudo abrir el callback local de Spotify: {error}"))?;
    listener
        .set_nonblocking(true)
        .map_err(|error| error.to_string())?;

    let started_at = Instant::now();
    while started_at.elapsed() < Duration::from_secs(120) {
        let Ok((mut stream, _address)) = listener.accept() else {
            thread::sleep(Duration::from_millis(120));
            continue;
        };
        let mut buffer = [0_u8; 4096];
        let bytes_read = stream.read(&mut buffer).map_err(|error| error.to_string())?;
        let request_text = String::from_utf8_lossy(&buffer[..bytes_read]);
        let first_line = request_text.lines().next().unwrap_or_default();
        let path = first_line
            .split_whitespace()
            .nth(1)
            .ok_or_else(|| "Spotify no devolvió una ruta válida".to_string())?;
        let callback_url = reqwest::Url::parse(&format!("http://127.0.0.1:53127{path}"))
            .map_err(|error| error.to_string())?;
        let mut code = None;
        let mut state = None;
        let mut oauth_error = None;
        for (key, value) in callback_url.query_pairs() {
            match key.as_ref() {
                "code" => code = Some(value.into_owned()),
                "state" => state = Some(value.into_owned()),
                "error" => oauth_error = Some(value.into_owned()),
                _ => {}
            }
        }

        let response_body = if oauth_error.is_some() {
            "Spotify no autorizó Snext. Puedes cerrar esta pestaña."
        } else {
            "Spotify conectado. Puedes volver a Snext."
        };
        let response = format!(
            "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
            response_body.len(),
            response_body,
        );
        let _ = stream.write_all(response.as_bytes());

        if let Some(error) = oauth_error {
            return Err(format!("Spotify devolvió {error}"));
        }
        if state.as_deref() != Some(expected_state.as_str()) {
            return Err("La respuesta de Spotify no coincide con esta sesión de Snext".into());
        }

        return code
            .filter(|value| !value.trim().is_empty())
            .map(|code| SpotifyCallbackResponse { code })
            .ok_or_else(|| "Spotify no devolvió código OAuth".to_string());
    }

    Err("Spotify no devolvió respuesta al callback local en 120 segundos".into())
}

#[tauri::command]
async fn listen_spotify_callback(
    request: SpotifyCallbackRequest,
) -> Result<SpotifyCallbackResponse, String> {
    tauri::async_runtime::spawn_blocking(move || listen_spotify_callback_blocking(request))
        .await
        .map_err(|error| error.to_string())?
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
        "cgamepadapi",
        "gameoverlayui",
        "steamwebhelper",
        "steamservice",
        "steam-runtime",
        "pressure-vessel",
        "srt-bwrap",
        "es-de",
        "squashfuse",
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
            fetch_retro_achievements,
            fetch_es_de_art,
            fetch_public_game_art,
            search_steam_grid_games,
            fetch_steam_grid_art,
            fetch_screen_scraper_art,
            fetch_remote_image,
            listen_spotify_callback,
            detect_active_game,
            translate_text
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
