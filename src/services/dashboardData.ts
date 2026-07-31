import { invoke } from "@tauri-apps/api/core";
import type {
  AchievementDetail,
  AchievementGame,
} from "../features/achievements";
import type { GameHeroData } from "../features/game";
import type { SpotifyTrack } from "../features/spotify";
import type {
  WeatherCondition,
  WeatherData,
} from "../features/weather";
import { getPlatformInfo } from "./platformCatalog";

export type SystemMetrics = {
  cpuLabel: string;
  cpuLoad: number;
  gpuLabel: string;
  gpuLoad: number;
  vramLabel?: string;
  vramLoad?: number;
  cpuTemperatureLabel?: string;
  batteryLabel?: string;
  batteryLoad?: number;
  memoryLabel: string;
  memoryLoad: number;
  networkLabel: string;
  networkLoad: number;
  processCount?: number;
  platform?: string;
};

export type DashboardData = {
  game: GameHeroData;
  track?: SpotifyTrack;
  achievements: AchievementItem[];
  achievementGames: AchievementGame[];
  friends: FriendActivity[];
  weather: WeatherData;
  system: SystemMetrics;
  dataMode: "live" | "fallback";
};

export type DashboardDataOptions = {
  weatherProvider: "open-meteo" | "openweathermap";
  openWeatherMapApiKey: string;
  steamGridDbApiKey: string;
  retroAchievementsUser: string;
  retroAchievementsApiKey: string;
  spotifyAccessToken: string;
  discordMode: "disabled" | "rpc" | "server";
  discordBotToken: string;
  discordGuildId: string;
};

export type AchievementItem = {
  name: string;
  progress: number;
  source: "steam" | "retroachievements" | "local";
  unlocked?: boolean;
};

export type FriendActivity = {
  name: string;
  activity: string;
  color: string;
  source: "discord" | "local";
};

type WeatherApiResponse = {
  current?: {
    temperature_2m?: number;
    apparent_temperature?: number;
    is_day?: number;
    weather_code?: number;
  };
  hourly?: {
    time?: string[];
    temperature_2m?: number[];
    weather_code?: number[];
  };
};

type GeocodeResponse = {
  results?: Array<{
    latitude: number;
    longitude: number;
    name: string;
    admin1?: string;
    country?: string;
  }>;
};

type OpenWeatherResponse = {
  name?: string;
  sys?: {
    country?: string;
  };
  weather?: Array<{
    id?: number;
    description?: string;
  }>;
  main?: {
    temp?: number;
    feels_like?: number;
  };
};

type SteamGridDbSearchResponse = {
  data?: Array<{
    id: number;
    name: string;
  }>;
};

type SteamGridDbAssetResponse = {
  data?: Array<{
    url: string;
  }>;
};

type RetroAchievementsRecentGame = {
  ID?: number;
  GameID?: number;
  Title?: string;
  ConsoleName?: string;
  ImageIcon?: string;
  ImageBoxArt?: string;
  ImageTitle?: string;
  NumPossibleAchievements?: number;
  NumAchieved?: number;
  PossibleScore?: number;
  UserScore?: number;
  UserCompletion?: number;
};

type RetroAchievementApiItem = {
  ID?: number;
  Title?: string;
  Description?: string;
  Points?: number;
  TrueRatio?: number;
  BadgeName?: string;
  DateEarned?: string | null;
  DateEarnedHardcore?: string | null;
  Flags?: number;
};

type RetroAchievementsGameDetails = RetroAchievementsRecentGame & {
  Achievements?: Record<string, RetroAchievementApiItem>;
};

type SpotifyPlaybackResponse = {
  is_playing?: boolean;
  progress_ms?: number;
  device?: {
    name?: string;
  };
  item?: {
    name?: string;
    duration_ms?: number;
    explicit?: boolean;
    artists?: Array<{ name?: string }>;
    album?: {
      name?: string;
      images?: Array<{ url?: string }>;
    };
  };
};

type SystemSnapshot = {
  cpu_usage_percent: number;
  used_memory_mb: number;
  total_memory_mb: number;
  process_count: number;
  platform: string;
};

type HardwareSnapshot = {
  gpu_name: string;
  gpu_usage_percent?: number | null;
  gpu_temperature_c?: number | null;
  used_vram_mb?: number | null;
  total_vram_mb?: number | null;
  cpu_temperature_c?: number | null;
  battery_percent?: number | null;
  battery_state: string;
  source: string;
};

type ActiveGame = {
  name: string;
  process_name: string;
  source: string;
  confidence: number;
  metadata_hint: string;
  detected: boolean;
  note: string;
};

type DiscordPresenceResponse = {
  friends: FriendActivity[];
  source: "discord-bot" | "not-configured";
};

const fallbackGame: GameHeroData = {
  title: "Snext Gaming Session",
  heroImage: "/demo/game/hero.svg",
  coverImage: "/demo/game/cover.svg",
  platform: "Bazzite · Desktop",
  source: "Sesión local",
  description:
    "Snext está listo para mostrar el juego activo, progreso, servicios y contexto ambiental mientras juegas.",
  playtimeHours: 0,
  progress: 12,
  rating: 4.5,
  ratingLabel: "Fundación activa",
  status: "playing",
};

const fallbackTrack: SpotifyTrack = {
  title: "Conecta Spotify",
  artist: "Integración pendiente",
  album: "Snext",
  artwork: "/demo/spotify/album.svg",
  progressMs: 42000,
  durationMs: 188000,
  isPlaying: false,
  device: "Snext",
  explicit: false,
};

const fallbackAchievements: AchievementItem[] = [
  { name: "El viaje comienza", progress: 100, source: "local", unlocked: true },
  { name: "Coleccionista", progress: 72, source: "local" },
  { name: "Maestro del combate", progress: 43, source: "local" },
];

const fallbackAchievementGames: AchievementGame[] = [
  {
    id: "local-switch-snext",
    title: "Snext Gaming Session",
    platform: "Nintendo Switch",
    provider: "local",
    image: "/demo/game/cover.svg",
    heroImage: "/demo/game/hero.svg",
    unlocked: 18,
    total: 42,
    points: 285,
    achievements: [
      {
        id: "journey",
        name: "El viaje comienza",
        description: "Inicia una nueva sesion de juego con Snext activo.",
        unlocked: true,
        points: 5,
        unlockedAt: "Hoy",
      },
      {
        id: "collector",
        name: "Coleccionista",
        description: "Completa una ruta secundaria o encuentra un secreto.",
        unlocked: true,
        points: 10,
        unlockedAt: "Reciente",
      },
      {
        id: "hidden",
        name: "Logro oculto",
        description: "Un objetivo especial del juego.",
        unlocked: false,
        hidden: true,
        points: 25,
      },
    ],
  },
  {
    id: "local-arcade-ra",
    title: "Marvel vs. Capcom",
    platform: "Arcade",
    provider: "retroachievements",
    image: "/demo/game/cover.svg",
    heroImage: "/demo/game/hero.svg",
    unlocked: 24,
    total: 92,
    points: 285,
    achievements: [
      {
        id: "first-hit",
        name: "Primer ataque",
        description: "Realiza el primer golpe del combo.",
        unlocked: true,
        points: 5,
        unlockedAt: "26 oct 2024",
      },
      {
        id: "perfect",
        name: "Ronda perfecta",
        description: "Gana una ronda sin recibir dano.",
        unlocked: false,
        points: 10,
        hardcore: true,
      },
    ],
  },
  {
    id: "local-pc-steam",
    title: "Hades II",
    platform: "PC Steam",
    provider: "steam",
    image: "/demo/game/cover.svg",
    heroImage: "/demo/game/hero.svg",
    unlocked: 31,
    total: 49,
    rarityPercent: 8.4,
    achievements: [
      {
        id: "rare",
        name: "Night Champion",
        description: "Completa un objetivo poco comun.",
        unlocked: true,
        rarityPercent: 8.4,
        unlockedAt: "Ayer",
      },
      {
        id: "pending",
        name: "Hidden Path",
        description: "Descubre una ruta alternativa.",
        unlocked: false,
        rarityPercent: 18.2,
      },
    ],
  },
];

const fallbackFriends: FriendActivity[] = [
  {
    name: "Nova",
    activity: "Jugando Helldivers 2",
    color: "#5ee7ff",
    source: "local",
  },
  {
    name: "Kiro",
    activity: "En línea",
    color: "#8467ff",
    source: "local",
  },
  {
    name: "Luz",
    activity: "Escuchando Spotify",
    color: "#ff6bb5",
    source: "local",
  },
];

const fallbackWeather: WeatherData = {
  condition: "partly-cloudy",
  conditionLabel: "Clima demostrativo",
  temperature: 18,
  feelsLike: 17,
  location: "Ubicación sin configurar",
  isDay: false,
  forecast: [
    { label: "AHORA", temperature: 18, condition: "partly-cloudy" },
    { label: "+1 H", temperature: 17, condition: "clear" },
    { label: "+2 H", temperature: 17, condition: "clear" },
    { label: "+3 H", temperature: 16, condition: "partly-cloudy" },
    { label: "+4 H", temperature: 16, condition: "cloudy" },
  ],
};

const fallbackSystem: SystemMetrics = {
  cpuLabel: "Disponible vía Tauri",
  cpuLoad: 22,
  gpuLabel: "Disponible vía Tauri",
  gpuLoad: 64,
  memoryLabel: "Navegador",
  memoryLoad: 35,
  networkLabel: "En línea",
  networkLoad: 76,
};

function formatHardwareTemperature(value?: number | null) {
  return typeof value === "number" ? `${Math.round(value)} °C` : undefined;
}

function weatherCodeToCondition(code = 0): WeatherCondition {
  if (code === 0) return "clear";
  if ([1, 2].includes(code)) return "partly-cloudy";
  if ([3, 45, 48].includes(code)) return code === 3 ? "cloudy" : "fog";
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "rain";
  if (code >= 71 && code <= 77) return "snow";
  if (code >= 95) return "storm";
  return "partly-cloudy";
}

function conditionLabel(condition: WeatherCondition, isDay: boolean) {
  const labels: Record<WeatherCondition, string> = {
    clear: isDay ? "Cielo despejado" : "Noche despejada",
    "partly-cloudy": "Parcialmente nublado",
    cloudy: "Nublado",
    rain: "Lluvia",
    storm: "Tormenta",
    snow: "Nieve",
    fog: "Niebla",
  };

  return labels[condition];
}

async function geocodeLocation(location: string) {
  const query = location.trim();

  if (!query || query === "Ubicación automática") {
    return null;
  }

  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", query);
  url.searchParams.set("count", "1");
  url.searchParams.set("language", "es");
  url.searchParams.set("format", "json");

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("No se pudo resolver la ubicación");
  }

  const data = (await response.json()) as GeocodeResponse;
  return data.results?.[0] ?? null;
}

async function loadWeather(location: string, locale: string): Promise<WeatherData> {
  const resolved = await geocodeLocation(location);

  if (!resolved) {
    return fallbackWeather;
  }

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(resolved.latitude));
  url.searchParams.set("longitude", String(resolved.longitude));
  url.searchParams.set("current", "temperature_2m,apparent_temperature,is_day,weather_code");
  url.searchParams.set("hourly", "temperature_2m,weather_code");
  url.searchParams.set("forecast_days", "1");
  url.searchParams.set("timezone", "auto");

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("No se pudo consultar el clima");
  }

  const data = (await response.json()) as WeatherApiResponse;
  const isDay = Boolean(data.current?.is_day);
  const condition = weatherCodeToCondition(data.current?.weather_code);
  const timeFormatter = new Intl.DateTimeFormat(locale, { hour: "2-digit" });
  const hourlyTimes = data.hourly?.time ?? [];
  const hourlyTemperatures = data.hourly?.temperature_2m ?? [];
  const hourlyCodes = data.hourly?.weather_code ?? [];

  const forecast = hourlyTimes.slice(0, 5).map((time, index) => ({
    label: index === 0 ? "AHORA" : timeFormatter.format(new Date(time)),
    temperature: Math.round(hourlyTemperatures[index] ?? data.current?.temperature_2m ?? 0),
    condition: weatherCodeToCondition(hourlyCodes[index]),
  }));

  return {
    condition,
    conditionLabel: conditionLabel(condition, isDay),
    temperature: Math.round(data.current?.temperature_2m ?? 0),
    feelsLike: Math.round(data.current?.apparent_temperature ?? data.current?.temperature_2m ?? 0),
    location: [resolved.name, resolved.admin1, resolved.country].filter(Boolean).join(", "),
    isDay,
    forecast: forecast.length > 0 ? forecast : fallbackWeather.forecast,
    updatedAt: new Date(),
  };
}

function openWeatherCodeToCondition(code = 800): WeatherCondition {
  if (code === 800) return "clear";
  if (code > 800) return code === 801 ? "partly-cloudy" : "cloudy";
  if (code >= 200 && code < 300) return "storm";
  if (code >= 300 && code < 600) return "rain";
  if (code >= 600 && code < 700) return "snow";
  if (code >= 700 && code < 800) return "fog";
  return "partly-cloudy";
}

async function loadOpenWeatherMapWeather(
  location: string,
  apiKey: string,
): Promise<WeatherData> {
  const query = location.trim();

  if (!query || !apiKey) {
    return fallbackWeather;
  }

  const url = new URL("https://api.openweathermap.org/data/2.5/weather");
  url.searchParams.set("q", query);
  url.searchParams.set("appid", apiKey);
  url.searchParams.set("units", "metric");
  url.searchParams.set("lang", "es");

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("No se pudo consultar OpenWeatherMap");
  }

  const data = (await response.json()) as OpenWeatherResponse;
  const condition = openWeatherCodeToCondition(data.weather?.[0]?.id);
  const hour = new Date().getHours();
  const isDay = hour >= 7 && hour < 20;
  const temperature = Math.round(data.main?.temp ?? 0);

  return {
    condition,
    conditionLabel:
      data.weather?.[0]?.description ?? conditionLabel(condition, isDay),
    temperature,
    feelsLike: Math.round(data.main?.feels_like ?? temperature),
    location: [data.name, data.sys?.country].filter(Boolean).join(", "),
    isDay,
    forecast: [
      { label: "AHORA", temperature, condition },
      { label: "+1 H", temperature, condition },
      { label: "+2 H", temperature, condition },
      { label: "+3 H", temperature, condition },
      { label: "+4 H", temperature, condition },
    ],
    updatedAt: new Date(),
  };
}

async function invokeOptional<T>(command: string): Promise<T | null> {
  try {
    return await invoke<T>(command);
  } catch {
    return null;
  }
}

function browserSystemMetrics(): SystemMetrics {
  const connection = navigator.connection;
  const memory = navigator.deviceMemory;

  return {
    ...fallbackSystem,
    memoryLabel: memory ? `${memory} GB aprox.` : fallbackSystem.memoryLabel,
    memoryLoad: memory ? Math.min(100, Math.round((memory / 16) * 100)) : fallbackSystem.memoryLoad,
    networkLabel: connection?.effectiveType
      ? connection.effectiveType.toUpperCase()
      : navigator.onLine
        ? "En línea"
        : "Sin conexión",
    networkLoad: navigator.onLine ? 76 : 0,
  };
}

async function loadSystemMetrics(): Promise<SystemMetrics> {
  const [snapshot, hardware] = await Promise.all([
    invokeOptional<SystemSnapshot>("get_system_snapshot"),
    invokeOptional<HardwareSnapshot>("get_hardware_snapshot"),
  ]);

  if (!snapshot) {
    return {
      ...browserSystemMetrics(),
      gpuLabel:
        hardware?.gpu_name && hardware.gpu_name !== "No detectada"
          ? hardware.gpu_name
          : fallbackSystem.gpuLabel,
      gpuLoad:
        typeof hardware?.gpu_usage_percent === "number"
          ? Math.round(hardware.gpu_usage_percent)
          : fallbackSystem.gpuLoad,
      cpuTemperatureLabel: formatHardwareTemperature(hardware?.cpu_temperature_c),
      batteryLabel:
        typeof hardware?.battery_percent === "number"
          ? `${Math.round(hardware.battery_percent)}% · ${hardware.battery_state}`
          : undefined,
      batteryLoad:
        typeof hardware?.battery_percent === "number"
          ? Math.round(hardware.battery_percent)
          : undefined,
    };
  }

  const memoryLoad =
    snapshot.total_memory_mb > 0
      ? Math.round((snapshot.used_memory_mb / snapshot.total_memory_mb) * 100)
      : fallbackSystem.memoryLoad;
  const vramLoad =
    hardware?.total_vram_mb && hardware.total_vram_mb > 0 && hardware.used_vram_mb
      ? Math.round((hardware.used_vram_mb / hardware.total_vram_mb) * 100)
      : undefined;

  return {
    ...fallbackSystem,
    cpuLabel: `${Math.round(snapshot.cpu_usage_percent)}%`,
    cpuLoad: Math.min(100, Math.max(0, Math.round(snapshot.cpu_usage_percent))),
    gpuLabel:
      hardware?.gpu_name && hardware.gpu_name !== "No detectada"
        ? `${hardware.gpu_name}${
            typeof hardware.gpu_temperature_c === "number"
              ? ` · ${Math.round(hardware.gpu_temperature_c)} °C`
              : ""
          }`
        : fallbackSystem.gpuLabel,
    gpuLoad:
      typeof hardware?.gpu_usage_percent === "number"
        ? Math.min(100, Math.max(0, Math.round(hardware.gpu_usage_percent)))
        : fallbackSystem.gpuLoad,
    vramLabel:
      hardware?.used_vram_mb && hardware.total_vram_mb
        ? `${(hardware.used_vram_mb / 1024).toFixed(1)} / ${(
            hardware.total_vram_mb / 1024
          ).toFixed(1)} GB`
        : undefined,
    vramLoad,
    cpuTemperatureLabel: formatHardwareTemperature(hardware?.cpu_temperature_c),
    batteryLabel:
      typeof hardware?.battery_percent === "number"
        ? `${Math.round(hardware.battery_percent)}% · ${hardware.battery_state}`
        : undefined,
    batteryLoad:
      typeof hardware?.battery_percent === "number"
        ? Math.min(100, Math.max(0, Math.round(hardware.battery_percent)))
        : undefined,
    memoryLabel: `${(snapshot.used_memory_mb / 1024).toFixed(1)} / ${(
      snapshot.total_memory_mb / 1024
    ).toFixed(0)} GB`,
    memoryLoad: Math.min(100, Math.max(0, memoryLoad)),
    platform: snapshot.platform,
    processCount: snapshot.process_count,
    networkLabel: navigator.onLine ? "En línea" : "Sin conexión",
    networkLoad: navigator.onLine ? 76 : 0,
  };
}

async function loadDiscordFriends(
  options: DashboardDataOptions,
): Promise<FriendActivity[]> {
  if (
    options.discordMode !== "server" ||
    !options.discordBotToken.trim() ||
    !options.discordGuildId.trim()
  ) {
    return fallbackFriends;
  }

  try {
    const response = await invoke<DiscordPresenceResponse>("fetch_discord_presence", {
      request: {
        bot_token: options.discordBotToken,
        guild_id: options.discordGuildId,
      },
    });

    if (!response.friends.length) {
      return fallbackFriends;
    }

    return response.friends.map((friend) => ({
      ...friend,
      source: "discord",
    }));
  } catch {
    return fallbackFriends;
  }
}

async function loadActiveGame(): Promise<GameHeroData> {
  const activeGame = await invokeOptional<ActiveGame>("detect_active_game");

  if (!activeGame?.detected) {
    return fallbackGame;
  }

  return {
    ...fallbackGame,
    title: activeGame.name,
    platform: getPlatformInfo(
      `${activeGame.name} ${activeGame.source} ${activeGame.metadata_hint}`,
    ).name,
    source: activeGame.source,
    platformHint: `${activeGame.name} ${activeGame.source} ${activeGame.metadata_hint}`,
    description: `${activeGame.note} Pista: ${activeGame.metadata_hint || activeGame.process_name}. Conecta SteamGridDB para enriquecer arte y metadatos.`,
    ratingLabel: `${activeGame.confidence}% confianza`,
    progress: activeGame.confidence,
  };
}

async function loadSteamGridDbArt(
  game: GameHeroData,
  apiKey: string,
): Promise<Partial<GameHeroData>> {
  if (!apiKey.trim() || game.title === fallbackGame.title) {
    return {};
  }

  const headers = {
    Accept: "application/json",
    Authorization: `Bearer ${apiKey.trim().replace(/^Bearer\s+/i, "")}`,
  };
  const queryCandidates = [
    game.title,
    game.title.replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim(),
  ].filter((value, index, list) => value && list.indexOf(value) === index);
  let gameId: number | undefined;

  for (const query of queryCandidates) {
    const searchResponse = await fetch(
      `https://www.steamgriddb.com/api/v2/search/autocomplete/${encodeURIComponent(query)}`,
      { headers },
    );
    if (searchResponse.ok) {
      const search = (await searchResponse.json()) as SteamGridDbSearchResponse;
      gameId = search.data?.find((item) =>
        item.name.toLowerCase() === query.toLowerCase(),
      )?.id ?? search.data?.[0]?.id;
    }
    if (gameId) break;
  }

  if (!gameId) {
    return {};
  }

  const [heroesResponse, gridsResponse, logosResponse] = await Promise.all([
    fetch(`https://www.steamgriddb.com/api/v2/heroes/game/${gameId}?dimensions=1920x620`, { headers }),
    fetch(`https://www.steamgriddb.com/api/v2/grids/game/${gameId}?dimensions=600x900`, { headers }),
    fetch(`https://www.steamgriddb.com/api/v2/logos/game/${gameId}`, { headers }),
  ]);

  const [heroes, grids, logos] = await Promise.all([
    heroesResponse.ok
      ? (heroesResponse.json() as Promise<SteamGridDbAssetResponse>)
      : Promise.resolve({ data: [] }),
    gridsResponse.ok
      ? (gridsResponse.json() as Promise<SteamGridDbAssetResponse>)
      : Promise.resolve({ data: [] }),
    logosResponse.ok
      ? (logosResponse.json() as Promise<SteamGridDbAssetResponse>)
      : Promise.resolve({ data: [] }),
  ]);

  return {
    heroImage: heroes.data?.[0]?.url ?? game.heroImage,
    coverImage: grids.data?.[0]?.url ?? game.coverImage,
    logo: logos.data?.[0]?.url,
    ratingLabel: "Arte por SteamGridDB",
  };
}

async function enrichGameWithProviders(
  game: GameHeroData,
  options: DashboardDataOptions,
): Promise<GameHeroData> {
  try {
    const art = await loadSteamGridDbArt(game, options.steamGridDbApiKey);
    return {
      ...game,
      ...art,
    };
  } catch {
    return game;
  }
}

async function loadRetroAchievements(
  options: DashboardDataOptions,
): Promise<{
  items: AchievementItem[];
  games: AchievementGame[];
}> {
  if (
    !options.retroAchievementsUser.trim() ||
    !options.retroAchievementsApiKey.trim()
  ) {
    return {
      items: fallbackAchievements,
      games: fallbackAchievementGames,
    };
  }

  try {
    const url = new URL(
      "https://retroachievements.org/API/API_GetUserRecentlyPlayedGames.php",
    );
    url.searchParams.set("u", options.retroAchievementsUser);
    url.searchParams.set("y", options.retroAchievementsApiKey);
    url.searchParams.set("c", "3");

    const response = await fetch(url);

    if (!response.ok) {
      return {
        items: fallbackAchievements,
        games: fallbackAchievementGames,
      };
    }

    const games = (await response.json()) as RetroAchievementsRecentGame[];

    if (!Array.isArray(games) || games.length === 0) {
      return {
        items: fallbackAchievements,
        games: fallbackAchievementGames,
      };
    }

    const items: AchievementItem[] = games.slice(0, 3).map((game, index) => ({
      name: game.Title ?? `RetroAchievement ${index + 1}`,
      progress: Math.min(
        100,
        Math.max(18, Math.round(((game.PossibleScore ?? 100) % 100) || 64)),
      ),
      source: "retroachievements",
      unlocked: index === 0,
    }));
    const achievementGames: AchievementGame[] = await Promise.all(games.slice(0, 8).map(async (game, index) => {
      const gameId = game.GameID ?? game.ID;
      let detailsResponse: Response | undefined;
      if (gameId) {
        detailsResponse = await fetch(
          `https://retroachievements.org/API/API_GetGame.php?i=${gameId}&y=${encodeURIComponent(options.retroAchievementsApiKey)}`,
        );
      }
      const detailsData = detailsResponse?.ok
        ? (await detailsResponse.json()) as RetroAchievementsGameDetails
        : undefined;
      const apiAchievements = Object.values(detailsData?.Achievements ?? {});
      const total = Math.max(
        1,
        game.NumPossibleAchievements ?? detailsData?.NumPossibleAchievements ?? apiAchievements.length ?? 30,
      );
      const unlocked = Math.max(0, game.NumAchieved ?? detailsData?.NumAchieved ?? apiAchievements.filter((item) => item.DateEarned).length);
      const details: AchievementDetail[] = apiAchievements.slice(0, 40).map((item, detailIndex) => ({
        id: String(item.ID ?? `${game.Title ?? "ra"}-${detailIndex}`),
        name: item.Title ?? `Logro ${detailIndex + 1}`,
        description: item.Description ?? "Sin descripción disponible.",
        unlocked: Boolean(item.DateEarned),
        hidden: Boolean(item.Flags && item.Flags > 0),
        points: item.Points ?? 0,
        rarityPercent: item.TrueRatio,
        hardcore: Boolean(item.DateEarnedHardcore),
        unlockedAt: item.DateEarned ?? undefined,
        image: item.BadgeName
          ? `https://media.retroachievements.org/Badge/${item.BadgeName}.png`
          : undefined,
      }));

      return {
        id: `ra-${game.Title ?? index}`,
        title: detailsData?.Title ?? game.Title ?? `RetroAchievement ${index + 1}`,
        platform: detailsData?.ConsoleName ?? game.ConsoleName ?? "RetroArch",
        provider: "retroachievements",
        image: detailsData?.ImageBoxArt
          ? `https://media.retroachievements.org${detailsData.ImageBoxArt.startsWith("/") ? "" : "/"}${detailsData.ImageBoxArt}`
          : game.ImageBoxArt
            ? `https://media.retroachievements.org${game.ImageBoxArt.startsWith("/") ? "" : "/"}${game.ImageBoxArt}`
            : "/demo/game/cover.svg",
        heroImage: detailsData?.ImageTitle
          ? `https://media.retroachievements.org${detailsData.ImageTitle.startsWith("/") ? "" : "/"}${detailsData.ImageTitle}`
          : "/demo/game/hero.svg",
        unlocked,
        total,
        points: Math.max(0, details.reduce((sum, detail) => sum + (detail.points ?? 0), 0)),
        recentAchievement: details.find((detail) => detail.unlocked) ?? details[0],
        achievements: details,
      };
    }));

    return {
      items,
      games: achievementGames,
    };
  } catch {
    return {
      items: fallbackAchievements,
      games: fallbackAchievementGames,
    };
  }
}

async function loadSpotifyTrack(
  accessToken: string,
): Promise<SpotifyTrack | undefined> {
  if (!accessToken.trim()) {
    return fallbackTrack;
  }

  try {
    const response = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.status === 204 || !response.ok) {
      return fallbackTrack;
    }

    const data = (await response.json()) as SpotifyPlaybackResponse;
    const item = data.item;

    if (!item?.name) {
      return fallbackTrack;
    }

    return {
      title: item.name,
      artist:
        item.artists
          ?.map((artist) => artist.name)
          .filter(Boolean)
          .join(", ") || "Spotify",
      album: item.album?.name,
      artwork: item.album?.images?.[0]?.url ?? fallbackTrack.artwork,
      progressMs: data.progress_ms ?? 0,
      durationMs: item.duration_ms ?? 1,
      isPlaying: Boolean(data.is_playing),
      device: data.device?.name ?? "Spotify",
      explicit: Boolean(item.explicit),
    };
  } catch {
    return fallbackTrack;
  }
}

export async function loadDashboardData(
  location: string,
  locale: string,
  options: DashboardDataOptions,
): Promise<DashboardData> {
  try {
    const weatherPromise =
      options.weatherProvider === "openweathermap"
        ? loadOpenWeatherMapWeather(location, options.openWeatherMapApiKey)
        : loadWeather(location, locale);

    const [weather, system, detectedGame, track, achievements, friends] = await Promise.all([
      weatherPromise,
      loadSystemMetrics(),
      loadActiveGame(),
      loadSpotifyTrack(options.spotifyAccessToken),
      loadRetroAchievements(options),
      loadDiscordFriends(options),
    ]);
    const game = await enrichGameWithProviders(detectedGame, options);

    return {
      game,
      track,
      achievements: achievements.items,
      achievementGames: achievements.games,
      friends,
      weather,
      system,
      dataMode:
        weather.location === fallbackWeather.location && game === fallbackGame
          ? "fallback"
          : "live",
    };
  } catch {
    return {
      game: fallbackGame,
      track: fallbackTrack,
      achievements: fallbackAchievements,
      achievementGames: fallbackAchievementGames,
      friends: fallbackFriends,
      weather: fallbackWeather,
      system: await loadSystemMetrics(),
      dataMode: "fallback",
    };
  }
}
