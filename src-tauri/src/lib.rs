use base64::{engine::general_purpose::STANDARD as BASE64_STANDARD, Engine as _};
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

#[derive(Serialize)]
struct SteamGridArtResponse {
    hero_image: Option<String>,
    cover_image: Option<String>,
    logo: Option<String>,
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
    if data.response_status != Some(200) {
        return Err("Los traductores externos no están disponibles temporalmente".into());
    }
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

fn first_asset_url(data: &serde_json::Value) -> Option<String> {
    data.get("data")?
        .as_array()?
        .iter()
        .find_map(|asset| asset.get("url")?.as_str().map(str::to_string))
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
    let mut candidates = vec![
        title.to_string(),
        without_metadata.to_string(),
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
    candidates.sort();
    candidates.dedup_by(|left, right| left.eq_ignore_ascii_case(right));
    candidates
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
        .user_agent("Snext/0.1 SteamGridDB integration")
        .build()
        .map_err(|error| error.to_string())?;
    let mut game_id = None;
    let mut matched_title = title.to_string();
    for candidate in steam_grid_title_candidates(title) {
        let search = match steam_grid_json(
            &client,
            steam_grid_url(&["search", "autocomplete", &candidate])?,
            api_key,
        )
        .await {
            Ok(value) => value,
            Err(_) => continue,
        };
        if let Some(matches) = search.get("data").and_then(serde_json::Value::as_array) {
            let selected = matches
                .iter()
                .filter_map(|item| {
                    let name = item.get("name")?.as_str()?;
                    let id = json_u64(item.get("id"))?;
                    Some((id, name))
                })
                .min_by_key(|(_, name)| {
                    steam_grid_match_score(title, name)
                })
                .map(|(id, name)| (id, name.to_string()));
            if let Some((id, name)) = selected {
                game_id = Some(id);
                matched_title = name;
            }
        }
        if game_id.is_none() {
            if let Some((id, name)) = public_steam_grid_game_id(&client, &candidate).await {
                game_id = Some(id);
                matched_title = name;
            }
        }
        if game_id.is_some() {
            break;
        }
    }

    if game_id.is_none() {
        for candidate in steam_grid_title_candidates(title) {
            if let Some((id, name)) = public_steam_grid_game_id(&client, &candidate).await {
                game_id = Some(id);
                matched_title = name;
                break;
            }
        }
    }

    let game_id = game_id.ok_or_else(|| format!("SteamGridDB no encontró {title}"))?;
    let id = game_id.to_string();
    let heroes = steam_grid_json(
        &client,
        steam_grid_url(&["heroes", "game", &id])?,
        api_key,
    )
    .await
    .ok();
    let grids = steam_grid_json(
        &client,
        steam_grid_url(&["grids", "game", &id])?,
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

    let hero_image = heroes.as_ref().and_then(first_asset_url);
    let cover_image = grids.as_ref().and_then(first_asset_url);
    let logo = logos.as_ref().and_then(first_asset_url);
    if hero_image.is_none() && cover_image.is_none() && logo.is_none() {
        return Err(format!("SteamGridDB no devolvió arte para {matched_title}"));
    }

    Ok(SteamGridArtResponse {
        hero_image,
        cover_image,
        logo,
        matched_title,
        source: Some("SteamGridDB".into()),
    })
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

    Ok(SteamGridArtResponse {
        hero_image,
        cover_image,
        logo,
        matched_title,
        source: Some("ScreenScraper".into()),
    })
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
        .header("User-Agent", "Snext/0.2.0")
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
    let host = url.host_str().unwrap_or_default().to_ascii_lowercase();
    let allowed = host == "media.retroachievements.org"
        || host == "steamgriddb.com"
        || host.ends_with(".steamgriddb.com")
        || host == "screenscraper.fr"
        || host.ends_with(".screenscraper.fr");
    if url.scheme() != "https" || !allowed {
        return Err("El origen de la imagen no está permitido".into());
    }

    let response = reqwest::Client::new()
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
        .filter(|value| value.starts_with("image/"))
        .unwrap_or("image/png")
        .to_string();
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
            fetch_steam_grid_art,
            fetch_screen_scraper_art,
            fetch_remote_image,
            detect_active_game,
            translate_text
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
